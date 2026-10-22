// Kit de componentes do painel. Enxuto: o que as telas usam e nada mais.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Info, Loader2, X } from 'lucide-react';
import { copiar } from './util';
import { Link } from './roteador';

// ---------------------------------------------------------------- sessão
export type Eu = {
  usuario: { id: string; nome: string; email: string; papel: string; nome_papel: string };
  permissoes: string[];
  site: { nome: string; dominio: string; url: string };
  mcp_url: string;
};
export const SessaoCtx = createContext<{ eu: Eu; pode: (a: string) => boolean; recarregarEu: () => void }>(null as any);
export const useSessao = () => useContext(SessaoCtx);

// ---------------------------------------------------------------- tema (escuro por padrão)
const CHAVE_TEMA = 'agenciasetup-painel-tema';
function lerTema(): 'escuro' | 'claro' {
  try { return localStorage.getItem(CHAVE_TEMA) === 'claro' ? 'claro' : 'escuro'; } catch { return 'escuro'; }
}
export function useTema() {
  const [tema, setTemaEstado] = useState<'escuro' | 'claro'>(lerTema);
  useEffect(() => { document.documentElement.dataset.tema = tema; }, [tema]);
  const setTema = (t: 'escuro' | 'claro') => {
    setTemaEstado(t);
    try { localStorage.setItem(CHAVE_TEMA, t); } catch {}
  };
  return { tema, setTema };
}
document.documentElement.dataset.tema = lerTema();

// ---------------------------------------------------------------- avisos rápidos (toast)
type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' };
let ouvinte: ((t: Toast) => void) | null = null;
let seq = 0;
export function avisar(texto: string, tipo: 'ok' | 'erro' = 'ok') { ouvinte && ouvinte({ id: ++seq, texto, tipo }); }
export function Avisos() {
  const [lista, setLista] = useState<Toast[]>([]);
  useEffect(() => {
    ouvinte = (t) => {
      setLista((l) => [...l, t]);
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== t.id)), t.tipo === 'erro' ? 6000 : 3000);
    };
    return () => { ouvinte = null; };
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {lista.map((t) => <div key={t.id} className={`toast toast-${t.tipo}`}>{t.tipo === 'ok' ? <Check /> : <AlertTriangle />}<span>{t.texto}</span></div>)}
    </div>
  );
}

// ---------------------------------------------------------------- carregar dados
export function useCarregar<T = any>(fn: () => Promise<T>, deps: any[] = []) {
  const [dados, setDados] = useState<T | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const vez = useRef(0);
  const recarregar = useCallback(() => {
    const minha = ++vez.current;
    setCarregando(true);
    setErro(null);
    fn().then((d) => { if (minha === vez.current) setDados(d); })
      .catch((e) => { if (minha === vez.current) setErro(e.message || 'Não consegui carregar.'); })
      .finally(() => { if (minha === vez.current) setCarregando(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, setDados, erro, carregando, recarregar };
}

// Roda uma ação com "ocupado" e mostra o erro num aviso.
export function useAcao() {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const rodar = async (nome: string, fn: () => Promise<any>, ok?: string) => {
    setOcupado(nome);
    try {
      const r = await fn();
      if (ok) avisar(ok);
      return r;
    } catch (e: any) {
      avisar(e.message || 'Não deu certo. Tente de novo.', 'erro');
      return undefined;
    } finally {
      setOcupado(null);
    }
  };
  return { ocupado, rodar };
}

// ---------------------------------------------------------------- estrutura
export function Logo() {
  return <span className="logo-marca" aria-label="Agência Setup"><span className="logo-calango">Calango</span><span className="logo-sep">|</span><span>Agência Setup</span></span>;
}

export function Titulo({ titulo, sub, acoes, voltar }: { titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode; voltar?: { para: string; t: string } }) {
  return (
    <header className="titulo">
      {voltar && <Link className="voltar" para={voltar.para}><ChevronLeft />{voltar.t}</Link>}
      <div className="titulo-linha">
        <div>
          <h1>{titulo}</h1>
          {sub && <p className="mudo">{sub}</p>}
        </div>
        {acoes && <div className="titulo-acoes">{acoes}</div>}
      </div>
    </header>
  );
}

export function Grupo({ titulo, rodape, acoes, children, className }: { titulo?: ReactNode; rodape?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`grupo ${className || ''}`}>
      {(titulo || acoes) && <div className="grupo-topo">{titulo && <h2>{titulo}</h2>}{acoes && <div className="grupo-acoes">{acoes}</div>}</div>}
      <div className="grupo-corpo">{children}</div>
      {rodape && <p className="grupo-rodape">{rodape}</p>}
    </section>
  );
}

export function Celula({ icone, cor, titulo, sub, direita, para, onClick }: { icone?: ReactNode; cor?: string; titulo: ReactNode; sub?: ReactNode; direita?: ReactNode; para?: string; onClick?: () => void }) {
  const corpo = (
    <>
      {icone && <span className={`celula-icone ${cor ? `cor-${cor}` : ''}`}>{icone}</span>}
      <span className="celula-texto"><span className="celula-titulo">{titulo}</span>{sub && <span className="celula-sub">{sub}</span>}</span>
      {direita && <span className="celula-direita">{direita}</span>}
      {(para || onClick) && <ChevronRight className="celula-seta" />}
    </>
  );
  if (para) return <Link className="celula celula-link" para={para}>{corpo}</Link>;
  if (onClick) return <button type="button" className="celula celula-link" onClick={onClick}>{corpo}</button>;
  return <div className="celula">{corpo}</div>;
}

// ---------------------------------------------------------------- campos
let idCampo = 0;
const useId = () => useRef(`c${++idCampo}`).current;

export function Campo({ rotulo, valor, mudar, tipo = 'text', dica, placeholder, autoFocus, desativado, mono, min, max }: {
  rotulo: string; valor: any; mudar: (v: string) => void; tipo?: string; dica?: ReactNode; placeholder?: string; autoFocus?: boolean; desativado?: boolean; mono?: boolean; min?: number; max?: number;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} type={tipo} value={valor ?? ''} onChange={(e) => mudar(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} disabled={desativado}
        className={mono ? 'mono' : undefined} min={min} max={max} autoComplete={tipo === 'password' ? 'current-password' : tipo === 'email' ? 'email' : undefined} />
      {dica && <p className="campo-dica">{dica}</p>}
    </div>
  );
}

export function AreaTexto({ rotulo, valor, mudar, linhas = 4, dica, placeholder, mono, desativado }: {
  rotulo: string; valor: any; mudar: (v: string) => void; linhas?: number; dica?: ReactNode; placeholder?: string; mono?: boolean; desativado?: boolean;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <textarea id={id} rows={linhas} value={valor ?? ''} onChange={(e) => mudar(e.target.value)} placeholder={placeholder} className={mono ? 'mono' : undefined} disabled={desativado} />
      {dica && <p className="campo-dica">{dica}</p>}
    </div>
  );
}

export function Escolha({ rotulo, valor, mudar, opcoes, dica, desativado }: {
  rotulo: string; valor: any; mudar: (v: string) => void; opcoes: { v: string; t: string }[]; dica?: ReactNode; desativado?: boolean;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} value={valor ?? ''} onChange={(e) => mudar(e.target.value)} disabled={desativado}>
        {opcoes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      {dica && <p className="campo-dica">{dica}</p>}
    </div>
  );
}

export function Marcar({ rotulo, valor, mudar, dica, desativado }: { rotulo: string; valor: boolean; mudar: (v: boolean) => void; dica?: ReactNode; desativado?: boolean }) {
  return (
    <label className="marcar">
      <input type="checkbox" checked={!!valor} onChange={(e) => mudar(e.target.checked)} disabled={desativado} />
      <span><span>{rotulo}</span>{dica && <span className="campo-dica">{dica}</span>}</span>
    </label>
  );
}

// ---------------------------------------------------------------- estados
export function Faixa({ tipo = 'info', children }: { tipo?: 'erro' | 'ok' | 'info' | 'aviso'; children: ReactNode }) {
  const i = tipo === 'erro' ? <AlertTriangle /> : tipo === 'ok' ? <CheckCircle2 /> : tipo === 'aviso' ? <AlertTriangle /> : <Info />;
  return <div className={`faixa faixa-${tipo}`} role={tipo === 'erro' ? 'alert' : undefined}>{i}<div>{children}</div></div>;
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <div className="carregando"><Loader2 className="girar" />{texto}</div>;
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return <div className="vazio"><p className="vazio-titulo">{titulo}</p>{texto && <p className="mudo">{texto}</p>}{acao}</div>;
}

export function ErroCarga({ erro, tentar }: { erro: string; tentar?: () => void }) {
  return <Faixa tipo="erro">{erro} {tentar && <button className="bt bt-texto bt-mini" onClick={tentar}>Tentar de novo</button>}</Faixa>;
}

export function SemPermissao({ texto }: { texto?: string }) {
  return (
    <div className="tela">
      <Titulo titulo="Sem acesso" />
      <Faixa tipo="aviso">{texto || 'Seu cargo não abre esta tela. Se precisar, peça ao administrador.'}</Faixa>
    </div>
  );
}

export function Etiqueta({ cor = 'cinza', children }: { cor?: string; children: ReactNode }) {
  return <span className={`etiqueta etiqueta-${cor}`}>{children}</span>;
}

export function Abas({ abas, atual, mudar }: { abas: { id: string; t: string; n?: number }[]; atual: string; mudar: (id: string) => void }) {
  return (
    <div className="abas" role="tablist">
      {abas.map((a) => (
        <button key={a.id} role="tab" aria-selected={atual === a.id} className={atual === a.id ? 'ativa' : ''} onClick={() => mudar(a.id)}>
          {a.t}{a.n ? <span className="abas-n">{a.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Paginacao({ pagina, total, porPagina, mudar }: { pagina: number; total: number; porPagina: number; mudar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil((total || 0) / (porPagina || 20)));
  if (paginas <= 1) return null;
  return (
    <nav className="paginacao">
      <button className="bt bt-texto" disabled={pagina <= 1} onClick={() => mudar(pagina - 1)}><ChevronLeft />Anterior</button>
      <span className="mudo">Página {pagina} de {paginas}</span>
      <button className="bt bt-texto" disabled={pagina >= paginas} onClick={() => mudar(pagina + 1)}>Próxima<ChevronRight /></button>
    </nav>
  );
}

export function Modal({ titulo, aberto, fechar, children, rodape }: { titulo: string; aberto: boolean; fechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo"><h2>{titulo}</h2><button className="bt-icone" onClick={fechar} aria-label="Fechar"><X /></button></div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

export function BotaoCopiar({ texto, rotulo = 'Copiar', classe = 'bt' }: { texto: string; rotulo?: string; classe?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={classe} onClick={async () => { if (await copiar(texto)) { setOk(true); setTimeout(() => setOk(false), 1800); } else avisar('Não consegui copiar. Selecione e copie à mão.', 'erro'); }}>
      {ok ? <Check /> : <Copy />}{ok ? 'Copiado' : rotulo}
    </button>
  );
}

// Texto que só aparece uma vez (chave, link de convite): caixa de código com copiar.
export function Segredo({ texto, aviso }: { texto: string; aviso?: ReactNode }) {
  return (
    <div className="segredo">
      <code>{texto}</code>
      <BotaoCopiar texto={texto} classe="bt bt-tinta" />
      {aviso && <p className="campo-dica">{aviso}</p>}
    </div>
  );
}
