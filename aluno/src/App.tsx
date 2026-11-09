// A casca do app do aluno: login, topo, abas e a tela da vez.
import { useEffect, useState } from 'react';
import { Abas, Carregando, ToastProvider, Topo } from './comum';
import { quandoSair, get } from './nucleo/api';
import { sair, temSessao } from './nucleo/auth';
import { Roteador, casa, useRota } from './nucleo/rota';
import { Entrar } from './telas/Entrar';
import { Inicio } from './telas/Inicio';
import { MeusCursos, Curso } from './telas/Curso';
import { Aula } from './telas/Aula';
import { Perfil } from './telas/Perfil';
import { Compras } from './telas/Compras';
import { Busca } from './telas/Busca';
import { Turma } from './telas/Turma';
import { BoasVindas, Sino } from './telas/Sino';
import { Leitor, type Marca } from './leitor/Leitor';

// No endereço de um curso com marca própria, o Worker põe a marca na página (window.__MARCA): o app abre o leitor.
const marca: Marca | null = (window as any).__MARCA || null;

export function App() {
  return (
    <ToastProvider>
      <Roteador>
        {marca && marca.tema === 'leitura' ? <Leitor marca={marca} /> : <Casca />}
      </Roteador>
    </ToastProvider>
  );
}

function Casca() {
  const { rota, ir } = useRota();
  const [eu, setEu] = useState<any>(null);
  const [falha, setFalha] = useState<any>(null);
  const [busca, setBusca] = useState(false);
  const publico = rota.caminho === '/entrar';

  useEffect(() => {
    quandoSair(() => { setEu(null); ir(`/entrar?volta=${encodeURIComponent(location.pathname)}`, { trocar: true }); });
  }, []);

  useEffect(() => {
    if (publico) return;
    let vivo = true;
    (async () => {
      if (!(await temSessao())) { ir(`/entrar?volta=${encodeURIComponent(rota.caminho)}`, { trocar: true }); return; }
      try { const e = await get('/eu'); if (vivo) { setEu(e); setFalha(null); } } catch (e: any) { if (vivo) setFalha(e); }
    })();
    return () => { vivo = false; };
  }, [publico]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBusca(true); } };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);

  if (publico) return <Entrar aoEntrar={(volta) => { setEu(null); ir(volta || '/', { trocar: true }); }} />;
  if (falha) {
    return (
      <div className="entrar-tela gutter">
        <div className="entrar-caixa">
          <h1>Não deu para abrir</h1>
          <p className="mudo">{falha.message}</p>
          <button className="bt" onClick={async () => { await sair(); setFalha(null); ir('/entrar', { trocar: true }); }}>Entrar com outro e-mail</button>
        </div>
      </div>
    );
  }
  if (!eu) return <Carregando texto="Abrindo seus cursos..." />;

  let tela: any = null, p: any;
  if (rota.caminho === '/') tela = <Inicio eu={eu} />;
  else if (rota.caminho === '/cursos') tela = <MeusCursos />;
  else if ((p = casa('/cursos/:slug', rota.caminho))) tela = <Curso slug={p.slug} />;
  else if ((p = casa('/aulas/:id', rota.caminho))) tela = <Aula key={p.id} id={p.id} />;
  else if (rota.caminho === '/perfil') tela = <Perfil eu={eu} aoMudar={setEu} />;
  else if (rota.caminho === '/compras') tela = <Compras />;
  else if (rota.caminho === '/turma') tela = <Turma eu={eu} aoMudarEu={setEu} />;
  else tela = <div className="estado gutter largura"><p>Esta página não existe.</p><button className="bt bt-p" onClick={() => ir('/')}>Ir para o início</button></div>;

  return (
    <div id="app">
      <Topo eu={eu} aoBuscar={() => setBusca(true)} sino={<Sino naoLidas={eu.nao_lidas || 0} aoLer={() => setEu({ ...eu, nao_lidas: 0 })} />} />
      <main>{tela}</main>
      <Abas aoBuscar={() => setBusca(true)} />
      {busca ? <Busca aoFechar={() => setBusca(false)} /> : null}
      {!eu.boas_vindas_em && !eu.equipe ? <BoasVindas eu={eu} aoFim={setEu} /> : null}
    </div>
  );
}
