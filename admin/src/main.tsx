// Painel da Agência Setup.
// Computador: menu lateral (Conteúdo e Sistema). Celular: abas embaixo (Início, Fila, Conteúdo, Claude, Mais),
// o resto fica no "Mais". Login pelo Supabase; os dados passam sempre pela API do Worker (docs/api-painel.md).
// Modelo: admin/src/main.tsx do olharondoniense.
import { StrictMode, Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot, Ellipsis, ExternalLink, FileText, GraduationCap, History, House, Lightbulb, ListChecks, LogOut, Moon, Settings, Share2, Sun, UserRound, Users, X,
} from 'lucide-react';
import './painel.css';
import { Roteador, casa, useRota, Link } from './nucleo/roteador';
import { get, quandoSair } from './nucleo/api';
import { sair, supabase } from './nucleo/auth';
import { Avisos, Carregando, Faixa, Logo, SemPermissao, SessaoCtx, useTema, type Eu } from './nucleo/ui';
import { iniciais } from './nucleo/util';
import Entrar from './nucleo/Entrar';

const Inicio = lazy(() => import('./telas/Inicio'));
const Fila = lazy(() => import('./telas/Fila'));
const Peca = lazy(() => import('./telas/Peca'));
const Conteudo = lazy(() => import('./telas/Conteudo'));
const Editor = lazy(() => import('./telas/Editor'));
const Cursos = lazy(() => import('./telas/Cursos'));
const LandingPage = lazy(() => import('./telas/LandingPage'));
const Pautas = lazy(() => import('./telas/Pautas'));
const Redes = lazy(() => import('./telas/Redes'));
const Claude = lazy(() => import('./telas/Claude'));
const Equipe = lazy(() => import('./telas/Equipe'));
const Config = lazy(() => import('./telas/Config'));
const Historico = lazy(() => import('./telas/Historico'));
const Conectar = lazy(() => import('./telas/Conectar'));

// exige: o cargo precisa disso para abrir a tela (quem não tem vê um aviso claro, não um erro).
type Rota = { padrao: string; tela: any; aba: string; exige?: string };
const ROTAS: Rota[] = [
  { padrao: '/', tela: Inicio, aba: 'inicio' },
  { padrao: '/fila', tela: Fila, aba: 'fila', exige: 'pecas.ver' },
  { padrao: '/fila/:id', tela: Peca, aba: 'fila', exige: 'pecas.ver' },
  { padrao: '/conteudo', tela: Conteudo, aba: 'conteudo', exige: 'conteudo.ver' },
  { padrao: '/conteudo/:tipo/:id', tela: Editor, aba: 'conteudo', exige: 'conteudo.ver' },
  { padrao: '/cursos', tela: Cursos, aba: 'cursos', exige: 'cursos.ver' },
  { padrao: '/cursos/landing-pages/:id', tela: LandingPage, aba: 'cursos', exige: 'cursos.ver' },
  { padrao: '/pautas', tela: Pautas, aba: 'pautas', exige: 'pautas.ver' },
  { padrao: '/redes', tela: Redes, aba: 'redes', exige: 'redes.ver' },
  { padrao: '/claude', tela: Claude, aba: 'claude' },
  { padrao: '/equipe', tela: Equipe, aba: 'equipe' },
  { padrao: '/config', tela: Config, aba: 'config', exige: 'config.editar' },
  { padrao: '/historico', tela: Historico, aba: 'historico', exige: 'historico.ver' },
];

type Item = { id: string; para: string; t: string; i: ReactNode; n?: number; secao: string };

function itensDoMenu(pode: (a: string) => boolean, p: any): Item[] {
  const fila = (p?.pecas_rascunho || 0) + (p?.pecas_erro || 0);
  return [
    { id: 'inicio', para: '/', t: 'Início', i: <House />, secao: 'Conteúdo' },
    ...(pode('pecas.ver') ? [{ id: 'fila', para: '/fila', t: 'Fila das redes', i: <ListChecks />, secao: 'Conteúdo', n: fila }] : []),
    ...(pode('conteudo.ver') ? [{ id: 'conteudo', para: '/conteudo', t: 'Recursos e novidades', i: <FileText />, secao: 'Conteúdo', n: (p?.recursos_rascunho || 0) + (p?.artigos_rascunho || 0) }] : []),
    ...(pode('pautas.ver') ? [{ id: 'pautas', para: '/pautas', t: 'Pautas', i: <Lightbulb />, secao: 'Conteúdo', n: p?.pautas_novas || 0 }] : []),
    ...(pode('cursos.ver') ? [{ id: 'cursos', para: '/cursos', t: 'Cursos e anúncios', i: <GraduationCap />, secao: 'Conteúdo' }] : []),
    ...(pode('redes.ver') ? [{ id: 'redes', para: '/redes', t: 'Redes', i: <Share2 />, secao: 'Sistema' }] : []),
    { id: 'claude', para: '/claude', t: 'Claude', i: <Bot />, secao: 'Sistema' },
    { id: 'equipe', para: '/equipe', t: pode('equipe.ver') ? 'Equipe' : 'Minha conta', i: pode('equipe.ver') ? <Users /> : <UserRound />, secao: 'Sistema' },
    ...(pode('config.editar') ? [{ id: 'config', para: '/config', t: 'Configuração', i: <Settings />, secao: 'Sistema' }] : []),
    ...(pode('historico.ver') ? [{ id: 'historico', para: '/historico', t: 'Histórico', i: <History />, secao: 'Sistema' }] : []),
  ];
}

function Moldura({ eu, aoSair }: { eu: Eu; aoSair: () => void }) {
  const { rota } = useRota();
  const { tema, setTema } = useTema();
  const [p, setP] = useState<any>(null);
  const [mais, setMais] = useState(false);

  // Contadores do menu: ao abrir, a cada minuto e quando a pessoa volta para a aba.
  useEffect(() => {
    const carregar = () => get('/pendencias').then(setP).catch(() => {});
    carregar();
    const t = setInterval(carregar, 60_000);
    const vis = () => document.visibilityState === 'visible' && carregar();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [rota.caminho]);
  useEffect(() => { setMais(false); }, [rota.caminho]);

  let achada: { r: Rota; params: Record<string, string> } | null = null;
  for (const r of ROTAS) { const pr = casa(r.padrao, rota.caminho); if (pr) { achada = { r, params: pr }; break; } }
  const pode = (a: string) => eu.permissoes.includes(a);
  const itens = itensDoMenu(pode, p);
  const secoes = [...new Set(itens.map((i) => i.secao))];
  const aba = achada ? achada.r.aba : '';
  const Tela = achada ? achada.r.tela : null;
  const baixo = ['inicio', 'fila', 'conteudo', 'claude'].filter((id) => itens.some((i) => i.id === id));
  const noMais = itens.filter((i) => !baixo.includes(i.id));

  const conta = (
    <div className="conta">
      <span className="avatar">{iniciais(eu.usuario.nome)}</span>
      <span className="conta-texto"><b>{eu.usuario.nome}</b><span className="mudo">{eu.usuario.nome_papel}</span></span>
    </div>
  );
  const acoesConta = (
    <div className="conta-acoes">
      <a className="bt bt-texto" href="/" target="_blank" rel="noopener"><ExternalLink />Ver o site</a>
      <button className="bt bt-texto" onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}>{tema === 'escuro' ? <Sun /> : <Moon />}{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</button>
      <button className="bt bt-texto" onClick={aoSair}><LogOut />Sair</button>
    </div>
  );

  return (
    <div className="moldura">
      <aside className="lateral">
        <div className="lateral-topo"><Link para="/" className="lateral-logo"><Logo /></Link></div>
        <nav className="lateral-menu" aria-label="Menu">
          {secoes.map((s) => (
            <div key={s} className="menu-secao">
              <p className="menu-secao-t">{s}</p>
              {itens.filter((i) => i.secao === s).map((i) => (
                <Link key={i.id} para={i.para} className={`menu-item ${aba === i.id ? 'ativo' : ''}`} aria-current={aba === i.id ? 'page' : undefined}>
                  {i.i}<span>{i.t}</span>{i.n ? <span className="menu-n">{i.n}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="lateral-pe">{conta}{acoesConta}</div>
      </aside>

      <main className="principal" id="conteudo">
        <Suspense fallback={<Carregando />}>
          {!achada ? (
            <div className="tela"><Faixa tipo="aviso">Esta tela não existe. <Link para="/">Voltar ao início</Link></Faixa></div>
          ) : achada.r.exige && !pode(achada.r.exige) ? <SemPermissao /> : <Tela params={achada.params} />}
        </Suspense>
      </main>

      <nav className="abas-baixo" aria-label="Menu">
        {baixo.map((id) => {
          const i = itens.find((x) => x.id === id)!;
          return (
            <Link key={id} para={i.para} className={aba === id && !mais ? 'ativo' : ''}>
              {i.i}<span>{id === 'conteudo' ? 'Conteúdo' : id === 'fila' ? 'Fila' : i.t}</span>{i.n ? <span className="menu-n">{i.n}</span> : null}
            </Link>
          );
        })}
        <button className={mais || noMais.some((i) => i.id === aba) ? 'ativo' : ''} onClick={() => setMais(!mais)}><Ellipsis /><span>Mais</span></button>
      </nav>

      {mais && (
        <div className="folha-fundo" onClick={() => setMais(false)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div className="folha-topo">{conta}<button className="bt-icone" onClick={() => setMais(false)} aria-label="Fechar"><X /></button></div>
            <div className="folha-lista">
              {noMais.map((i) => (
                <Link key={i.id} para={i.para} className={`menu-item ${aba === i.id ? 'ativo' : ''}`}>{i.i}<span>{i.t}</span>{i.n ? <span className="menu-n">{i.n}</span> : null}</Link>
              ))}
            </div>
            {acoesConta}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { rota, ir } = useRota();
  useTema();
  // undefined: conferindo; null: sem login.
  const [eu, setEu] = useState<Eu | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEu = useCallback(() => {
    setErro(null);
    get<Eu>('/eu').then(setEu).catch((e) => {
      if (e.status === 401 || e.status === 403) { setEu(null); if (e.status === 403) setErro(e.message); }
      else { setErro(e.message); setEu(null); }
    });
  }, []);

  useEffect(() => {
    carregarEu();
    quandoSair(() => setEu(null));
    const { data } = supabase.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') setEu(null); });
    return () => data.subscription.unsubscribe();
  }, [carregarEu]);

  const aoSair = async () => {
    await sair().catch(() => {});
    setEu(null);
    ir('/entrar', { trocar: true });
  };

  const depoisDeEntrar = () => { setEu(undefined); carregarEu(); };
  if (rota.caminho === '/entrar') {
    return <Entrar logado={!!eu} aoEntrar={() => { depoisDeEntrar(); ir('/', { trocar: true }); }} />;
  }
  if (eu === undefined) return <div className="tela-cheia"><Carregando texto="Abrindo o painel…" /></div>;
  // Sem login: entra aqui mesmo, sem mudar o endereço (a tela "Permitir" do Claude continua depois do login).
  if (eu === null) {
    return (
      <>
        {erro && <div className="erro-topo"><Faixa tipo="erro">{erro}</Faixa></div>}
        <Entrar logado={false} aoEntrar={depoisDeEntrar} />
      </>
    );
  }

  const ctx = { eu, pode: (a: string) => eu.permissoes.includes(a), recarregarEu: carregarEu };
  if (rota.caminho === '/conectar') {
    return <SessaoCtx.Provider value={ctx}><Suspense fallback={<Carregando />}><Conectar /></Suspense></SessaoCtx.Provider>;
  }
  return <SessaoCtx.Provider value={ctx}><Moldura eu={eu} aoSair={aoSair} /></SessaoCtx.Provider>;
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <Roteador>
      <App />
      <Avisos />
    </Roteador>
  </StrictMode>,
);
