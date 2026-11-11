// Peças comuns do app do celular (/admin/celular, pedido do dono em 10/11/2026: "bem imersivo, fluido, pensado na
// navegação do celular"): o dado guardado no aparelho (a tela abre na hora com o último número e atualiza por trás), o
// puxar para atualizar, o cartão de arrastar e as cores das salas do Escritório.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent as Toque } from 'react';
import { RefreshCw } from 'lucide-react';

// As cores das salas (as mesmas de COR_SALA em Escritorio.tsx e das bolinhas dos avisos em worker/lib/push.js).
export const COR_SALA: Record<string, string> = { direcao: 'ambar', vendas: 'verde', conteudo: 'azul', video: 'vermelho', design: 'laranja', sistema: 'cinza', produto: 'azul', receita: 'ambar' };
const VAR_DA_COR: Record<string, string> = { ambar: 'var(--ambar)', verde: 'var(--verde)', azul: 'var(--azul)', vermelho: 'var(--vermelho)', laranja: 'var(--laranja)', cinza: 'var(--fraco)' };
export const corDaSala = (sala?: string | null) => VAR_DA_COR[COR_SALA[sala || ''] || 'cinza'];
export const estiloCor = (cor: string) => ({ '--cor': cor }) as CSSProperties;

// ---------------------------------------------------------------- o dado guardado no aparelho
// Fica só neste aparelho e some quando a pessoa sai do painel (limparGuardado, chamado no main.tsx).
const PREFIXO = 'setup-cel:';
function ler(chave: string) {
  try { const t = localStorage.getItem(PREFIXO + chave); return t ? JSON.parse(t).d : undefined; } catch { return undefined; }
}
function guardar(chave: string, d: any) {
  try { localStorage.setItem(PREFIXO + chave, JSON.stringify({ em: Date.now(), d })); } catch {}
}
export function limparGuardado() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIXO)) localStorage.removeItem(k); } catch {}
}

// Igual ao useCarregar do painel, mas começa com o que estava guardado: a tela abre na hora e troca pelo dado novo quando
// ele chega. Sem rede, continua mostrando o último dado (erro vem junto, para a tela avisar).
export function useGuardado<T = any>(chave: string, fn: () => Promise<T>, deps: any[] = []) {
  const [dados, setCru] = useState<T | undefined>(() => ler(chave));
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const vez = useRef(0);
  const chaveAtual = useRef(chave);
  const setDados = useCallback((d: T) => { setCru(d); guardar(chaveAtual.current, d); }, []);
  const recarregar = useCallback(() => {
    const minha = ++vez.current;
    setCarregando(true);
    setErro(null);
    return fn().then((d) => { if (minha === vez.current) { setCru(d); guardar(chave, d); } })
      .catch((e) => { if (minha === vez.current) setErro(e.message || 'Não consegui carregar.'); })
      .finally(() => { if (minha === vez.current) setCarregando(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ...deps]);
  useEffect(() => {
    if (chaveAtual.current !== chave) { chaveAtual.current = chave; setCru(ler(chave)); }
    recarregar();
  }, [recarregar]);
  return { dados, setDados, erro, carregando, recarregar };
}

// O aviso de que o número na tela é o último guardado (sem rede ou o servidor não respondeu).
export function SemRede({ erro, tentar }: { erro: string | null; tentar: () => void }) {
  if (!erro) return null;
  return <button type="button" className="cel-sem-rede" onClick={tentar}>Não consegui atualizar agora. Você está vendo o último dado guardado. Toque para tentar de novo.</button>;
}

// ---------------------------------------------------------------- puxar para atualizar
// Com a tela no topo, puxar para baixo atualiza. Não vale dentro de folha aberta, de conversa nem de campo de texto.
export function Puxar({ acao }: { acao: () => void }) {
  const [y, setY] = useState(0);
  const [girando, setGirando] = useState(false);
  const acaoRef = useRef(acao);
  acaoRef.current = acao;
  useEffect(() => {
    let inicio: number | null = null;
    let puxou = 0;
    const comeco = (e: TouchEvent) => {
      const alvo = e.target as HTMLElement | null;
      const fora = !!document.querySelector('.modal-fundo') || !!(alvo && alvo.closest && alvo.closest('[data-sem-puxar], textarea, input, .cel-arrastar'));
      inicio = window.scrollY <= 0 && !fora ? e.touches[0].clientY : null;
      puxou = 0;
    };
    const move = (e: TouchEvent) => {
      if (inicio === null) return;
      const d = e.touches[0].clientY - inicio;
      if (d <= 0 || window.scrollY > 0) { if (puxou) { puxou = 0; setY(0); } return; }
      puxou = Math.min(96, d * 0.45);
      setY(puxou);
    };
    const fim = () => {
      if (inicio === null) return;
      inicio = null;
      if (puxou >= 62) { setGirando(true); acaoRef.current(); setTimeout(() => { setGirando(false); setY(0); }, 750); } else setY(0);
      puxou = 0;
    };
    addEventListener('touchstart', comeco, { passive: true });
    addEventListener('touchmove', move, { passive: true });
    addEventListener('touchend', fim);
    addEventListener('touchcancel', fim);
    return () => { removeEventListener('touchstart', comeco); removeEventListener('touchmove', move); removeEventListener('touchend', fim); removeEventListener('touchcancel', fim); };
  }, []);
  const desce = girando ? 62 : y;
  return (
    <div className={`cel-puxar ${girando ? 'girando' : ''}`} style={{ transform: `translate(-50%, ${desce - 46}px)`, opacity: girando ? 1 : Math.min(1, y / 50) }} aria-hidden="true">
      <RefreshCw style={girando ? undefined : { transform: `rotate(${y * 3.6}deg)` }} />
    </div>
  );
}

// ---------------------------------------------------------------- cartão de arrastar
// Arrastar para o lado decide; os botões continuam no cartão (nada fica escondido). O dedo que começa num botão, link ou
// campo não arrasta. Na vertical a tela rola normal (touch-action: pan-y no CSS).
export function Arrastar({ direita, esquerda, seloDireita, seloEsquerda, children, travado }: { direita?: () => void; esquerda?: () => void; seloDireita?: string; seloEsquerda?: string; children: ReactNode; travado?: boolean }) {
  const [dx, setDx] = useState(0);
  const [solto, setSolto] = useState(true);
  const inicio = useRef<{ x: number; y: number; eixo: 'h' | 'v' | null } | null>(null);
  const comeco = (e: Toque) => {
    if (travado || (e.target as HTMLElement).closest('button, a, textarea, input, summary')) { inicio.current = null; return; }
    const t = e.touches[0];
    inicio.current = { x: t.clientX, y: t.clientY, eixo: null };
    setSolto(false);
  };
  const move = (e: Toque) => {
    const i = inicio.current;
    if (!i) return;
    const t = e.touches[0];
    const mx = t.clientX - i.x;
    const my = t.clientY - i.y;
    if (!i.eixo) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      i.eixo = Math.abs(mx) > Math.abs(my) * 1.3 ? 'h' : 'v';
    }
    if (i.eixo === 'h') setDx((mx > 0 && !direita) || (mx < 0 && !esquerda) ? mx * 0.15 : mx);
  };
  const fim = () => {
    const i = inicio.current;
    inicio.current = null;
    setSolto(true);
    if (!i || i.eixo !== 'h') { setDx(0); return; }
    if (dx > 110 && direita) { setDx(640); setTimeout(direita, 190); }
    else if (dx < -110 && esquerda) { setDx(-640); setTimeout(esquerda, 190); }
    else setDx(0);
  };
  const forca = Math.min(1, Math.abs(dx) / 110);
  return (
    <div className="cel-arrastar" onTouchStart={comeco} onTouchMove={move} onTouchEnd={fim} onTouchCancel={fim}
      style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 30}deg)` : undefined, transition: solto ? 'transform 240ms var(--suave)' : 'none' }}>
      {dx > 14 && seloDireita && <span className="cel-selo sim" style={{ opacity: forca }}>{seloDireita}</span>}
      {dx < -14 && seloEsquerda && <span className="cel-selo nao" style={{ opacity: forca }}>{seloEsquerda}</span>}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- miúdos
export function Barra({ usado, teto, cor }: { usado: number; teto: number; cor?: string }) {
  const pct = teto > 0 ? Math.max(0, Math.min(100, (usado / teto) * 100)) : 0;
  return <div className="cel-barra" role="img" aria-label={`${Math.round(pct)} por cento`}><i style={{ width: `${pct}%`, background: cor || (pct >= 100 ? 'var(--vermelho)' : pct >= 80 ? 'var(--ambar)' : 'var(--verde)') }} /></div>;
}

export function Secao({ titulo, lado, children }: { titulo: ReactNode; lado?: ReactNode; children: ReactNode }) {
  return <section className="cel-secao"><header><h2>{titulo}</h2>{lado}</header>{children}</section>;
}

// Texto comprido: mostra as primeiras linhas e abre inteiro no toque.
export function Trecho({ texto, linhas = 4 }: { texto?: string | null; linhas?: number }) {
  const [aberto, setAberto] = useState(false);
  const t = String(texto || '').trim();
  if (!t) return null;
  const longo = t.length > linhas * 42 || t.split('\n').length > linhas;
  const fechado = longo && !aberto;
  return (
    <div className="cel-trecho">
      <p className={fechado ? 'fechado' : ''} style={fechado ? ({ WebkitLineClamp: linhas } as CSSProperties) : undefined}>{t}</p>
      {longo && <button type="button" className="cel-trecho-mais" onClick={() => setAberto((v) => !v)}>{aberto ? 'Ver menos' : 'Ver tudo'}</button>}
    </div>
  );
}

export const dolar = (v?: number | null) => `US$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
