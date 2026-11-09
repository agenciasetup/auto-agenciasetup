// Peças comuns do app do aluno: ícones, topo, abas do celular, pôster, cartão de aula, estados (carregando, erro, vazio) e avisos.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, useRota } from './nucleo/rota';

const P: Record<string, string> = {
  busca: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.3-4.3"/>',
  inicio: '<path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>',
  curso: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  usuario: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  tocar: '<path d="M6 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 6 4.5z"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  esquerda: '<path d="m15 18-6-6 6-6"/>',
  seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  cadeado: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  relogio: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  video: '<rect width="18" height="14" x="3" y="5" rx="3"/><path d="m10 9.5 4.5 2.5-4.5 2.5z"/>',
  pacote: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/>',
  medalha: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  brilho: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/>',
  listas: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  arquivo: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  pasta: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  pular: '<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
  nota: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5.5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  email: '<rect width="20" height="16" x="2" y="4" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  ferramenta: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  modelo: '<rect width="18" height="7" x="3" y="3" rx="1.5"/><rect width="9" height="7" x="3" y="14" rx="1.5"/><rect width="5" height="7" x="16" y="14" rx="1.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  externo: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  pix: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="m8.5 12 3.5-3.5 3.5 3.5-3.5 3.5z"/>',
  cartao: '<rect width="20" height="14" x="2" y="5" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  recibo: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12H8"/><path d="M13 16H8"/>',
  sino: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  fogo: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  volta: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  avanca: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  coracao: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  enviar: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  clipe: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  trofeu: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  polegar: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  compartilhar: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  presente: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  imagem: '<rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  calendario: '<rect width="18" height="18" x="3" y="4" rx="3"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  lixo: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  drive: '<path d="m8 3 8 0 6 10-4 7H6l-4-7z"/><path d="M8 3l6 10H2"/><path d="m16 3-6 10"/>',
};

export function I({ n, className = '', style }: { n: string; className?: string; style?: any }) {
  return <svg className={`i ${className}`} viewBox="0 0 24 24" aria-hidden="true" style={style} dangerouslySetInnerHTML={{ __html: P[n] || P.arquivo }} />;
}

export const LOGO = <img className="logo-img" src="/aluno/logo.png" alt="" />;

export const mmss = (s: number) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
export const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const duracao = (s: number) => { const m = Math.round((s || 0) / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min` : `${m} min`; };
export const inicial = (nome: string) => (nome || '?').trim().charAt(0).toUpperCase();

// Tipos de arquivo: ícone, cor e nome (as mesmas cores do sistema de design).
export const TIPOS: Record<string, { n: string; c: string; t: string }> = {
  receita: { n: 'arquivo', c: '#ff7a00', t: 'Receita' },
  guia: { n: 'arquivo', c: '#ffd60a', t: 'Guia' },
  skill: { n: 'pasta', c: '#bf5af2', t: 'Skill' },
  modelo: { n: 'modelo', c: '#0a84ff', t: 'Modelo' },
  ferramenta: { n: 'ferramenta', c: '#64d2ff', t: 'Ferramenta' },
  pacote: { n: 'pacote', c: '#30d158', t: 'Pacote' },
  pdf: { n: 'arquivo', c: '#ff453a', t: 'PDF' },
  link: { n: 'link', c: '#8e8e93', t: 'Link' },
};

// ---------------------------------------------------------------- aviso rápido (toast)
const ToastCtx = createContext<(m: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [ver, setVer] = useState(false);
  useEffect(() => { if (!ver) return; const t = setTimeout(() => setVer(false), 2600); return () => clearTimeout(t); }, [ver, msg]);
  return (
    <ToastCtx.Provider value={(m) => { setMsg(m); setVer(true); }}>
      {children}
      <div className={`toast${ver ? ' ver' : ''}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export async function copiar(texto: string, toast: (m: string) => void) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado'); } catch { toast('Não consegui copiar. Selecione o texto e copie.'); }
}

// ---------------------------------------------------------------- topo e abas
export function Topo({ eu, aoBuscar, sino }: { eu: any; aoBuscar: () => void; sino?: ReactNode }) {
  const { rota } = useRota();
  const ativo = (p: string) => (p === '/' ? rota.caminho === '/' : rota.caminho.startsWith(p));
  return (
    <header className="topo">
      <div className="topo-faixa gutter largura">
        <Link className="logo" para="/" aria-label="Início">{LOGO}<span>Setup</span><small>Cursos</small></Link>
        <nav className="nav" aria-label="Principal">
          <Link para="/" aria-current={ativo('/') ? 'page' : undefined}>Início</Link>
          <Link para="/cursos" aria-current={ativo('/cursos') || ativo('/aulas') ? 'page' : undefined}>Meus cursos</Link>
          <Link para="/turma" aria-current={ativo('/turma') ? 'page' : undefined}>Turma</Link>
        </nav>
        <div className="topo-acoes">
          <button className="busca-pilula" type="button" onClick={aoBuscar}><I n="busca" />Pesquisar nas aulas</button>
          <button className="bt-icone so-cel" type="button" onClick={aoBuscar} aria-label="Pesquisar nas aulas"><I n="busca" /></button>
          {sino}
          <Link para="/perfil" className="avatar" aria-label="Seu perfil">{eu && eu.foto_url ? <img src={eu.foto_url} alt="" /> : inicial(eu && eu.nome)}</Link>
        </div>
      </div>
    </header>
  );
}

export function Abas({ aoBuscar }: { aoBuscar: () => void }) {
  const { rota } = useRota();
  const ativo = (p: string) => (p === '/' ? rota.caminho === '/' : rota.caminho.startsWith(p));
  return (
    <nav className="abas" aria-label="Abas">
      <Link para="/" aria-current={ativo('/') ? 'page' : undefined}><I n="inicio" />Início</Link>
      <Link para="/cursos" aria-current={ativo('/cursos') || ativo('/aulas') ? 'page' : undefined}><I n="curso" />Cursos</Link>
      <a href="#" onClick={(e) => { e.preventDefault(); aoBuscar(); }}><I n="busca" />Buscar</a>
      <Link para="/turma" aria-current={ativo('/turma') ? 'page' : undefined}><I n="trofeu" />Turma</Link>
      <Link para="/perfil" aria-current={ativo('/perfil') ? 'page' : undefined}><I n="usuario" />Perfil</Link>
    </nav>
  );
}

// ---------------------------------------------------------------- pôster (capa feita em código) e cartão de aula
export function Poster({ titulo, tipo = 'Curso', pe, cor = '#ff7a00', bloq = false, grande = false }: { titulo: string; tipo?: string; pe?: string; cor?: string; bloq?: boolean; grande?: boolean }) {
  const p = titulo.split(' ');
  const a = p.length > 2 ? p.slice(0, -2).join(' ') : p[0];
  const b = p.length > 2 ? p.slice(-2).join(' ') : p.slice(1).join(' ');
  return (
    <div className={`poster${grande ? ' poster-g' : ''}${bloq ? ' bloq' : ''}`} style={{ ['--c' as any]: cor }}>
      <span className="tipo">{tipo}</span>
      <span className="nome">{a}{b && <span className="serifa">{b}</span>}</span>
      <span className="pe">{pe}{bloq && <I n="cadeado" />}</span>
      <div className="grao" />
    </div>
  );
}

export function CardAula({ a, para }: { a: any; para: string }) {
  return (
    <Link className="c-aula" para={para}>
      <div className="capa">
        {a.capa_url ? <img src={a.capa_url} alt="" loading="lazy" /> : null}
        <span className="dur num">{mmss(a.duracao_s)}</span>
        {a.pct > 0 && !a.concluida ? <div className="barra"><i style={{ width: `${Math.max(4, a.pct)}%` }} /></div> : null}
        {!a.liberada ? <div className="cadeado"><I n="cadeado" /></div> : null}
      </div>
      <div><small>Aula {a.codigo}{a.concluida ? ' · concluída' : a.pct > 0 ? ' · em andamento' : ''}</small><h3>{a.titulo}</h3></div>
    </Link>
  );
}

// ---------------------------------------------------------------- estados
export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return <div className="estado gutter largura"><span className="giro" />{texto}</div>;
}
export function ErroTela({ erro, aoTentar }: { erro: any; aoTentar?: () => void }) {
  return (
    <div className="estado gutter largura">
      <p>{(erro && erro.message) || 'Algo deu errado.'}</p>
      {aoTentar ? <button className="bt bt-p" onClick={aoTentar}>Tentar de novo</button> : null}
    </div>
  );
}

// Carrega dados da API com estado de carregando/erro e um "recarregar".
export function useDados<T = any>(fn: () => Promise<T>, deps: any[]) {
  const [estado, setEstado] = useState<{ dados: T | null; erro: any; carregando: boolean }>({ dados: null, erro: null, carregando: true });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    fn().then((d) => vivo && setEstado({ dados: d, erro: null, carregando: false }), (e) => vivo && setEstado({ dados: null, erro: e, carregando: false }));
    return () => { vivo = false; };
  }, [...deps, vez]);
  return { ...estado, recarregar: () => setVez((v) => v + 1), setDados: (d: T) => setEstado((e) => ({ ...e, dados: d })) };
}
