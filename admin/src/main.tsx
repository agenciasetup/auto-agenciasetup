// Painel da Agência Setup, no mesmo sistema de design do site (docs/design-system.md).
// Computador: menu lateral com seções que recolhem, item ativo aceso, busca ⌘K (paleta para pular entre telas),
// cartão da pessoa no rodapé e opção de menu fino (só ícones). Celular: topo de vidro com busca e abas embaixo
// (Início, Em alta, Fila, Desempenho, Mais), o resto no "Mais". Login pelo Supabase; dados pela API do Worker.
// Modelo: admin/src/main.tsx do olharondoniense.
import { StrictMode, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3, Bot, Building2, CalendarDays, ChevronDown, ChevronRight, ChevronsUpDown, Ellipsis, ExternalLink, FileText, Flame, GraduationCap, Headset, Hexagon, History, House, ListChecks, LogOut,
  MessageCircle, MessageCircleHeart, Megaphone, MessagesSquare, MonitorPlay, Plug, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Send, Settings, Share2, ShoppingBag, Smartphone, Sparkles, Sun, TrendingUp, UserRound, Users, UsersRound, X,
} from 'lucide-react';
import './painel.css';
import './posts.css';
import { Roteador, casa, useRota, Link } from './nucleo/roteador';
import { get, quandoSair } from './nucleo/api';
import { sair, supabase } from './nucleo/auth';
import { Avisos, Carregando, Faixa, Logo, SemPermissao, SessaoCtx, useTema, type Eu } from './nucleo/ui';
import { limparGuardado } from './telas/CelularBase';
import { iniciais } from './nucleo/util';
import Entrar from './nucleo/Entrar';

const Inicio = lazy(() => import('./telas/Inicio'));
const Plano = lazy(() => import('./telas/Plano'));
const Escritorio = lazy(() => import('./telas/Escritorio'));
const Colmeia = lazy(() => import('./telas/Colmeia'));
const Recuperar = lazy(() => import('./telas/Recuperar'));
const Followup = lazy(() => import('./telas/Followup'));
const Fila = lazy(() => import('./telas/Fila'));
const Peca = lazy(() => import('./telas/Peca'));
const Conteudo = lazy(() => import('./telas/Conteudo'));
const Seo = lazy(() => import('./telas/Seo'));
const Editor = lazy(() => import('./telas/Editor'));
const Cursos = lazy(() => import('./telas/Cursos'));
const LandingPage = lazy(() => import('./telas/LandingPage'));
const Pautas = lazy(() => import('./telas/Pautas'));
const Desempenho = lazy(() => import('./telas/Desempenho'));
const Comenta = lazy(() => import('./telas/Comenta'));
const Redes = lazy(() => import('./telas/Redes'));
const Claude = lazy(() => import('./telas/Claude'));
const Equipe = lazy(() => import('./telas/Equipe'));
const Config = lazy(() => import('./telas/Config'));
const Historico = lazy(() => import('./telas/Historico'));
const Conectar = lazy(() => import('./telas/Conectar'));
const Vendas = lazy(() => import('./telas/Vendas'));
const Alunos = lazy(() => import('./telas/Alunos'));
const Suporte = lazy(() => import('./telas/Suporte'));
const Area = lazy(() => import('./telas/Area'));
const Comunidade = lazy(() => import('./telas/Comunidade'));
const Comunicacao = lazy(() => import('./telas/Comunicacao'));
const Integracoes = lazy(() => import('./telas/Integracoes'));
const Numeros = lazy(() => import('./telas/Numeros'));
const Agenda = lazy(() => import('./telas/Agenda'));
const NovoPost = lazy(() => import('./telas/NovoPost'));
const Resultados = lazy(() => import('./telas/Resultados'));
const PostDetalhe = lazy(() => import('./telas/PostDetalhe'));
const Celular = lazy(() => import('./telas/Celular'));

// O service worker do painel só cuida dos avisos no celular (Web Push); páginas e dados continuam vindo da rede.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});

// exige: o cargo precisa disso para abrir a tela (quem não tem vê um aviso claro, não um erro).
type Rota = { padrao: string; tela: any; aba: string; exige?: string };
const ROTAS: Rota[] = [
  { padrao: '/', tela: Inicio, aba: 'inicio' },
  { padrao: '/plano', tela: Plano, aba: 'plano', exige: 'plano.ver' },
  { padrao: '/escritorio', tela: Escritorio, aba: 'escritorio', exige: 'escritorio.ver' },
  // Posts: agenda (calendário e lista), novo post e cada peça. /fila continua valendo (links antigos).
  { padrao: '/posts', tela: Agenda, aba: 'posts', exige: 'pecas.ver' },
  { padrao: '/posts/novo', tela: NovoPost, aba: 'posts', exige: 'pecas.editar' },
  { padrao: '/posts/:id', tela: Peca, aba: 'posts', exige: 'pecas.ver' },
  { padrao: '/fila', tela: Agenda, aba: 'posts', exige: 'pecas.ver' },
  { padrao: '/fila/:id', tela: Peca, aba: 'posts', exige: 'pecas.ver' },
  // Resultados: cada post com números, Comenta X e vendas; "O que funciona" é o antigo Desempenho.
  { padrao: '/resultados', tela: Resultados, aba: 'resultados', exige: 'desempenho.ver' },
  { padrao: '/resultados/:id', tela: PostDetalhe, aba: 'resultados', exige: 'desempenho.ver' },
  { padrao: '/conteudo', tela: Conteudo, aba: 'conteudo', exige: 'conteudo.ver' },
  { padrao: '/seo', tela: Seo, aba: 'seo', exige: 'conteudo.ver' },
  { padrao: '/conteudo/:tipo/:id', tela: Editor, aba: 'conteudo', exige: 'conteudo.ver' },
  { padrao: '/cursos', tela: Cursos, aba: 'cursos', exige: 'cursos.ver' },
  { padrao: '/cursos/landing-pages/:id', tela: LandingPage, aba: 'cursos', exige: 'cursos.ver' },
  { padrao: '/pautas', tela: Pautas, aba: 'pautas', exige: 'pautas.ver' },
  { padrao: '/desempenho', tela: Desempenho, aba: 'resultados', exige: 'desempenho.ver' },
  { padrao: '/comenta', tela: Comenta, aba: 'comenta', exige: 'gatilhos.ver' },
  { padrao: '/numeros', tela: Numeros, aba: 'numeros', exige: 'numeros.ver' },
  { padrao: '/vendas', tela: Vendas, aba: 'vendas', exige: 'vendas.ver' },
  { padrao: '/recuperar', tela: Recuperar, aba: 'recuperar', exige: 'recuperar.ver' },
  { padrao: '/followup', tela: Followup, aba: 'followup', exige: 'followup.ver' },
  { padrao: '/colmeia', tela: Colmeia, aba: 'colmeia', exige: 'colmeia.ver' },
  { padrao: '/alunos', tela: Alunos, aba: 'alunos', exige: 'alunos.ver' },
  { padrao: '/suporte', tela: Suporte, aba: 'suporte', exige: 'suporte.ver' },
  { padrao: '/area', tela: Area, aba: 'area', exige: 'cursos.ver' },
  { padrao: '/comunidade', tela: Comunidade, aba: 'comunidade', exige: 'comunidade.ver' },
  { padrao: '/comunicacao', tela: Comunicacao, aba: 'comunicacao', exige: 'comunidade.ver' },
  { padrao: '/integracoes', tela: Integracoes, aba: 'integracoes', exige: 'integracoes.configurar' },
  { padrao: '/redes', tela: Redes, aba: 'redes', exige: 'redes.ver' },
  { padrao: '/claude', tela: Claude, aba: 'claude' },
  { padrao: '/equipe', tela: Equipe, aba: 'equipe' },
  { padrao: '/config', tela: Config, aba: 'config', exige: 'config.editar' },
  { padrao: '/historico', tela: Historico, aba: 'historico', exige: 'historico.ver' },
];

type Item = { id: string; para: string; t: string; i: ReactNode; n?: number; secao: string; novo?: boolean };

// Quanto espera a decisão do dono em cada lugar (GET /esperando): { mesa: 3, duvidas: 1 }. Só entra número maior que
// zero. Resposta estranha, cargo sem acesso ou leitura que falhou dão um objeto vazio: o menu fica sem o contador.
function esperandoPorLugar(e: any): Record<string, number> {
  const r: Record<string, number> = {};
  for (const i of Array.isArray(e?.itens) ? e.itens : []) {
    if (i && typeof i.id === 'string' && typeof i.n === 'number' && i.n > 0) r[i.id] = i.n;
  }
  return r;
}

function itensDoMenu(pode: (a: string) => boolean, p: any, esperando: any): Item[] {
  const posts = (p?.pecas_rascunho || 0) + (p?.pecas_erro || 0);
  const espera = esperandoPorLugar(esperando);
  // Organizado pelo que a pessoa faz (pedido do dono em 24/10/2026: "ta muito confuso o painel"): redes (postar,
  // agenda, resultados, automações), site, vendas, alunos e sistema. Sem selo "Novo" em tudo.
  return [
    { id: 'inicio', para: '/', t: 'Início', i: <House />, secao: 'Hoje' },
    ...(pode('plano.ver') ? [{ id: 'plano', para: '/plano', t: 'Plano', i: <Sparkles />, secao: 'Hoje' }] : []),
    ...(pode('escritorio.ver') ? [{ id: 'escritorio', para: '/escritorio', t: 'Escritório', i: <Building2 />, secao: 'Hoje', n: espera.mesa }] : []),
    ...(pode('pecas.ver') ? [{ id: 'posts', para: '/posts', t: 'Posts e agenda', i: <CalendarDays />, secao: 'Redes sociais', n: posts || undefined }] : []),
    ...(pode('desempenho.ver') ? [{ id: 'resultados', para: '/resultados', t: 'Resultados', i: <BarChart3 />, secao: 'Redes sociais' }] : []),
    ...(pode('gatilhos.ver') ? [{ id: 'comenta', para: '/comenta', t: 'Automações', i: <MessageCircleHeart />, secao: 'Redes sociais' }] : []),
    ...(pode('pautas.ver') ? [{ id: 'pautas', para: '/pautas', t: 'Em alta', i: <Flame />, secao: 'Redes sociais' }] : []),
    ...(pode('redes.ver') ? [{ id: 'redes', para: '/redes', t: 'Contas conectadas', i: <Share2 />, secao: 'Redes sociais' }] : []),
    ...(pode('conteudo.ver') ? [{ id: 'conteudo', para: '/conteudo', t: 'Recursos e artigos', i: <FileText />, secao: 'Site', n: (p?.recursos_rascunho || 0) + (p?.artigos_rascunho || 0) }] : []),
    ...(pode('conteudo.ver') ? [{ id: 'seo', para: '/seo', t: 'SEO e Google', i: <Search />, secao: 'Site' }] : []),
    ...(pode('cursos.ver') ? [{ id: 'cursos', para: '/cursos', t: 'Cursos e páginas de venda', i: <GraduationCap />, secao: 'Site' }] : []),
    ...(pode('vendas.ver') ? [{ id: 'vendas', para: '/vendas', t: 'Vendas', i: <ShoppingBag />, secao: 'Vendas' }] : []),
    ...(pode('vendas.ver') ? [{ id: 'celular', para: '/celular', t: 'App do celular e avisos', i: <Smartphone />, secao: 'Vendas' }] : []),
    ...(pode('followup.ver') ? [{ id: 'followup', para: '/followup', t: 'Follow-up do direct', i: <Send />, secao: 'Vendas', n: espera.duvidas }] : []),
    ...(pode('recuperar.ver') ? [{ id: 'recuperar', para: '/recuperar', t: 'Recuperar vendas', i: <MessageCircle />, secao: 'Vendas' }] : []),
    ...(pode('colmeia.ver') ? [{ id: 'colmeia', para: '/colmeia', t: 'Colmeia', i: <Hexagon />, secao: 'Vendas', n: espera.colmeia }] : []),
    ...(pode('numeros.ver') ? [{ id: 'numeros', para: '/numeros', t: 'Números do curso', i: <TrendingUp />, secao: 'Vendas' }] : []),
    ...(pode('suporte.ver') ? [{ id: 'suporte', para: '/suporte', t: 'Suporte', i: <Headset />, secao: 'Alunos', n: espera.chamados }] : []),
    ...(pode('alunos.ver') ? [{ id: 'alunos', para: '/alunos', t: 'Alunos', i: <UsersRound />, secao: 'Alunos' }] : []),
    ...(pode('cursos.ver') ? [{ id: 'area', para: '/area', t: 'Área de membros', i: <MonitorPlay />, secao: 'Alunos' }] : []),
    ...(pode('comunidade.ver') ? [{ id: 'comunidade', para: '/comunidade', t: 'Comunidade', i: <MessagesSquare />, secao: 'Alunos', n: (p?.comunidade || 0) || undefined }] : []),
    ...(pode('comunidade.ver') ? [{ id: 'comunicacao', para: '/comunicacao', t: 'Avisos e e-mails', i: <Megaphone />, secao: 'Alunos' }] : []),
    ...(pode('integracoes.configurar') ? [{ id: 'integracoes', para: '/integracoes', t: 'Integrações', i: <Plug />, secao: 'Sistema' }] : []),
    { id: 'claude', para: '/claude', t: 'Claude', i: <Bot />, secao: 'Sistema' },
    { id: 'equipe', para: '/equipe', t: pode('equipe.ver') ? 'Equipe' : 'Minha conta', i: pode('equipe.ver') ? <Users /> : <UserRound />, secao: 'Sistema' },
    ...(pode('config.editar') ? [{ id: 'config', para: '/config', t: 'Configuração', i: <Settings />, secao: 'Sistema' }] : []),
    ...(pode('historico.ver') ? [{ id: 'historico', para: '/historico', t: 'Histórico', i: <History />, secao: 'Sistema' }] : []),
  ];
}

// Preferências do menu guardadas no aparelho (sem quebrar quando o navegador não deixa guardar).
function lerPref<T>(chave: string, padrao: T): T {
  try { const v = localStorage.getItem(chave); return v === null ? padrao : JSON.parse(v); } catch { return padrao; }
}
function guardarPref(chave: string, v: any) {
  try { localStorage.setItem(chave, JSON.stringify(v)); } catch {}
}
const ehMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const TECLA = ehMac ? '⌘K' : 'Ctrl K';

// ---------------------------------------------------------------- paleta (⌘K): pular para qualquer tela ou ação
type Acao = { id: string; t: string; i: ReactNode; grupo: string; para?: string; fazer?: () => void; busca?: string };

function Paleta({ acoes, fechar }: { acoes: Acao[]; fechar: () => void }) {
  const { ir } = useRota();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const achadas = useMemo(() => acoes.filter((a) => !q.trim() || norm(`${a.t} ${a.busca || ''} ${a.grupo}`).includes(norm(q.trim()))), [acoes, q]);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { campo.current?.focus(); }, []);
  useEffect(() => {
    const el = lista.current?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);
  const executar = (a?: Acao) => {
    if (!a) return;
    fechar();
    if (a.fazer) a.fazer();
    else if (a.para) ir(a.para);
  };
  const teclas = (e: any) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(achadas.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); executar(achadas[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); fechar(); }
  };
  const grupos = [...new Set(achadas.map((a) => a.grupo))];
  let n = -1;
  return (
    <div className="paleta-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="paleta" role="dialog" aria-modal="true" aria-label="Ir para">
        <div className="paleta-campo">
          <Search />
          <input ref={campo} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={teclas} placeholder="Ir para uma tela ou fazer algo…" aria-label="Buscar no painel" enterKeyHint="go" />
          <button className="bt bt-texto bt-mini" onClick={fechar}>Fechar</button>
        </div>
        <div className="paleta-lista" ref={lista} role="listbox">
          {!achadas.length && <div className="paleta-vazio">Nada com “{q}”.</div>}
          {grupos.map((g) => (
            <div key={g}>
              <p className="paleta-grupo">{g}</p>
              {achadas.filter((a) => a.grupo === g).map((a) => {
                n += 1;
                const i = n;
                return (
                  <button key={a.id} className="paleta-item" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => executar(a)}>
                    <span className="celula-icone cor-laranja">{a.i}</span><b>{a.t}</b><ChevronRight className="seta" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="paleta-dica"><span><kbd>↑</kbd> <kbd>↓</kbd> para escolher</span><span><kbd>Enter</kbd> para abrir</span><span><kbd>Esc</kbd> para fechar</span></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- moldura
function Moldura({ eu, aoSair }: { eu: Eu; aoSair: () => void }) {
  const { rota } = useRota();
  const { tema, setTema } = useTema();
  const [p, setP] = useState<any>(null);
  const [esperando, setEsperando] = useState<any>(null);
  const [mais, setMais] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [menuPessoa, setMenuPessoa] = useState(false);
  const [fina, setFina] = useState<boolean>(() => lerPref('agenciasetup-painel-fino', false));
  const [fechadas, setFechadas] = useState<string[]>(() => lerPref('agenciasetup-painel-secoes', []));

  // Contadores do menu: ao abrir, a cada minuto e quando a pessoa volta para a aba.
  useEffect(() => {
    const carregar = () => {
      get('/pendencias').then(setP).catch(() => {});
      // O que espera a decisão do dono (mesa do Escritório, dúvidas do direct, Colmeia). Leitura à parte: se falhar,
      // o menu continua com os números que já tinha.
      get('/esperando').then(setEsperando).catch(() => {});
    };
    carregar();
    const t = setInterval(carregar, 60_000);
    const vis = () => document.visibilityState === 'visible' && carregar();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [rota.caminho]);
  useEffect(() => { setMais(false); setMenuPessoa(false); }, [rota.caminho]);

  // ⌘K / Ctrl K abre a paleta de qualquer lugar; "/" também, quando não está digitando.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement as HTMLElement)?.tagName || '') || (document.activeElement as HTMLElement)?.isContentEditable;
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !digitando)) { e.preventDefault(); setPaleta(true); }
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);

  let achada: { r: Rota; params: Record<string, string> } | null = null;
  for (const r of ROTAS) { const pr = casa(r.padrao, rota.caminho); if (pr) { achada = { r, params: pr }; break; } }
  const pode = (a: string) => eu.permissoes.includes(a);
  const itens = itensDoMenu(pode, p, esperando);
  const secoes = [...new Set(itens.map((i) => i.secao))];
  const aba = achada ? achada.r.aba : '';
  const Tela = achada ? achada.r.tela : null;
  // Quem não vê as telas das redes (cargo Suporte) ganha Suporte e Alunos nas abas de baixo.
  const baixo = ['inicio', 'posts', 'resultados', 'comenta', 'suporte', 'alunos'].filter((id) => itens.some((i) => i.id === id)).slice(0, 4);
  const noMais = itens.filter((i) => !baixo.includes(i.id));
  // No celular, Escritório, Follow-up e Colmeia ficam dentro de "Mais": o botão mostra a soma dos contadores de lá, para
  // o que espera o dono aparecer sem abrir a folha. São os mesmos números de cada item, sem leitura nova.
  const nMais = noMais.reduce((s, i) => s + (i.n || 0), 0);

  const alternarFina = () => { setFina((f) => { guardarPref('agenciasetup-painel-fino', !f); return !f; }); setMenuPessoa(false); };
  const alternarSecao = (s: string) => setFechadas((l) => { const n = l.includes(s) ? l.filter((x) => x !== s) : [...l, s]; guardarPref('agenciasetup-painel-secoes', n); return n; });
  const trocarTema = () => setTema(tema === 'escuro' ? 'claro' : 'escuro');

  const acoes: Acao[] = [
    ...itens.map((i) => ({ id: `ir-${i.id}`, t: i.t, i: i.i, grupo: 'Ir para', para: i.para })),
    ...(pode('pecas.editar') ? [{ id: 'novo-post', t: 'Novo post', i: <Plus />, grupo: 'Criar', para: '/posts/novo', busca: 'postar agendar carrossel reels story publicar instagram' }] : []),
    ...(pode('conteudo.editar') ? [
      { id: 'novo-recurso', t: 'Novo recurso', i: <Plus />, grupo: 'Criar', para: '/conteudo/recursos/novo', busca: 'criar prompt template planilha' },
      { id: 'novo-agente', t: 'Novo agente de IA', i: <Sparkles />, grupo: 'Criar', para: '/conteudo/recursos/novo?tipo=agente', busca: 'criar agente gpt' },
      { id: 'nova-novidade', t: 'Novo artigo', i: <FileText />, grupo: 'Criar', para: '/conteudo/artigos/novo', busca: 'criar artigo' },
    ] : []),
    ...(pode('gatilhos.editar') ? [{ id: 'nova-palavra', t: 'Nova palavra do Comenta X', i: <MessageCircleHeart />, grupo: 'Criar', para: '/comenta', busca: 'comenta dm gatilho palavra' }] : []),
    { id: 'site', t: 'Ver o site', i: <ExternalLink />, grupo: 'Geral', fazer: () => window.open('/', '_blank', 'noopener') },
    { id: 'tema', t: tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro', i: tema === 'escuro' ? <Sun /> : <Moon />, grupo: 'Geral', fazer: trocarTema },
    { id: 'sair', t: 'Sair do painel', i: <LogOut />, grupo: 'Geral', fazer: aoSair },
  ];

  const acoesConta = (
    <div className="conta-acoes">
      <a className="bt bt-texto" href="/" target="_blank" rel="noopener"><ExternalLink />Ver o site</a>
      <button className="bt bt-texto" onClick={trocarTema}>{tema === 'escuro' ? <Sun /> : <Moon />}{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</button>
      <button className="bt bt-texto bt-perigo" onClick={aoSair}><LogOut />Sair</button>
    </div>
  );
  const itemMenu = (i: Item) => (
    <Link key={i.id} para={i.para} className={`menu-item ${aba === i.id ? 'ativo' : ''}`} aria-current={aba === i.id ? 'page' : undefined} title={fina ? i.t : undefined}>
      {i.i}<span className="menu-item-t">{i.t}</span>
      {i.n ? <span className="menu-n">{i.n}</span> : i.novo && !fina ? <span className="menu-novo">Novo</span> : null}
    </Link>
  );

  return (
    <div className={`moldura ${fina ? 'fina' : ''}`}>
      <aside className="lateral">
        <div className="lateral-topo">
          <Link para="/" className="lateral-logo"><Logo /></Link>
          <button className="recolher" onClick={alternarFina} aria-label={fina ? 'Abrir o menu' : 'Recolher o menu'} title={fina ? 'Abrir o menu' : 'Recolher o menu'}>{fina ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
        </div>
        <button className="gatilho-paleta" onClick={() => setPaleta(true)} title={`Buscar (${TECLA})`}><Search /><span>Buscar ou ir para…</span><kbd>{TECLA}</kbd></button>
        {pode('pecas.editar') && <Link para="/posts/novo" className="bt bt-tinta novo-post-lateral" title={fina ? 'Novo post' : undefined}><Plus /><span>Novo post</span></Link>}
        <nav className="lateral-menu" aria-label="Menu">
          {secoes.map((s) => {
            const fechada = fechadas.includes(s);
            return (
              <div key={s} className={`menu-secao ${fechada ? 'fechada' : ''}`}>
                <button className="menu-secao-t" onClick={() => alternarSecao(s)} aria-expanded={!fechada}>{s}<ChevronDown /></button>
                <div className="menu-itens">{itens.filter((i) => i.secao === s).map(itemMenu)}</div>
              </div>
            );
          })}
        </nav>
        <div className="lateral-pe">
          <div className="pessoa">
            {menuPessoa && <div className="pessoa-menu">{acoesConta}</div>}
            <button className="pessoa-cartao" onClick={() => setMenuPessoa((m) => !m)} aria-expanded={menuPessoa} title={fina ? eu.usuario.nome : undefined}>
              <span className="avatar">{iniciais(eu.usuario.nome)}</span>
              <span className="conta-texto"><b>{eu.usuario.nome}</b><span>{eu.usuario.email || eu.usuario.nome_papel}</span></span>
              <ChevronsUpDown />
            </button>
          </div>
        </div>
      </aside>

      <header className="topo-celular">
        <Link para="/" className="lateral-logo"><Logo /></Link>
        <button className="bt-icone" onClick={() => setPaleta(true)} aria-label="Buscar"><Search /></button>
      </header>

      <main className="principal" id="conteudo">
        <Suspense fallback={<div className="tela"><Carregando /></div>}>
          {!achada ? (
            <div className="tela"><Faixa tipo="aviso">Esta tela não existe. <Link para="/">Voltar ao início</Link></Faixa></div>
          ) : achada.r.exige && !pode(achada.r.exige) ? <SemPermissao /> : <Tela key={rota.caminho} params={achada.params} />}
        </Suspense>
      </main>

      <nav className="abas-baixo" aria-label="Menu">
        {baixo.map((id) => {
          const i = itens.find((x) => x.id === id)!;
          return (
            <Link key={id} para={i.para} className={aba === id && !mais ? 'ativo' : ''}>
              {i.i}<span>{id === 'posts' ? 'Posts' : id === 'comenta' ? 'Automação' : i.t}</span>{i.n ? <span className="menu-n">{i.n}</span> : null}
            </Link>
          );
        })}
        <button className={mais || noMais.some((i) => i.id === aba) ? 'ativo' : ''} onClick={() => setMais(!mais)}><Ellipsis /><span>Mais</span>{nMais ? <span className="menu-n">{nMais}</span> : null}</button>
      </nav>

      {mais && (
        <div className="folha-fundo" onClick={() => setMais(false)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div className="folha-topo">
              <div className="pessoa-cartao" style={{ cursor: 'default', flex: 1 }}>
                <span className="avatar">{iniciais(eu.usuario.nome)}</span>
                <span className="conta-texto"><b>{eu.usuario.nome}</b><span>{eu.usuario.nome_papel}</span></span>
              </div>
              <button className="bt-icone" onClick={() => setMais(false)} aria-label="Fechar"><X /></button>
            </div>
            <div className="folha-lista">{noMais.map(itemMenu)}</div>
            {acoesConta}
          </div>
        </div>
      )}

      {paleta && <Paleta acoes={acoes} fechar={() => setPaleta(false)} />}
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
    const { data } = supabase.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') { limparGuardado(); setEu(null); } });
    return () => data.subscription.unsubscribe();
  }, [carregarEu]);

  // Toque num aviso com o painel já aberto: o service worker pede para abrir o pedido aqui mesmo.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const f = (e: MessageEvent) => {
      const alvo = e.data && e.data.abrir;
      if (typeof alvo !== 'string') return;
      const u = new URL(alvo, location.origin);
      if (u.origin === location.origin && u.pathname.startsWith('/admin')) ir(`${u.pathname.slice('/admin'.length) || '/'}${u.search}`);
    };
    navigator.serviceWorker.addEventListener('message', f);
    return () => navigator.serviceWorker.removeEventListener('message', f);
  }, []);

  const aoSair = async () => {
    await sair().catch(() => {});
    limparGuardado(); // o que o app do celular guardou neste aparelho some junto com o login
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
    return <SessaoCtx.Provider value={ctx}><Suspense fallback={<div className="tela-cheia"><Carregando texto="Abrindo…" /></div>}><Conectar /></Suspense></SessaoCtx.Provider>;
  }
  // O app do celular (Hoje, Escritório, Direct, Colmeia e Vendas): tela cheia, fora da moldura do painel.
  if (rota.caminho === '/celular') {
    return <SessaoCtx.Provider value={ctx}><Suspense fallback={<div className="tela-cheia"><Carregando texto="Abrindo o app…" /></div>}><Celular /></Suspense></SessaoCtx.Provider>;
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
