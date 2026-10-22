// Navegação do painel sem biblioteca: endereços de verdade (/admin/fila/123), botão voltar funciona.
// Modelo: admin/src/nucleo/roteador.tsx do olharondoniense.
import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

const BASE = '/admin';
type Rota = { caminho: string; busca: URLSearchParams };
const Ctx = createContext<{ rota: Rota; ir: (c: string, opcoes?: { trocar?: boolean }) => void }>(null as any);

function atual(): Rota {
  const c = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || '/' : '/';
  return { caminho: c.replace(/\/+$/, '') || '/', busca: new URLSearchParams(location.search) };
}

let guardas: (() => string | null)[] = [];
// Tela com alteração não salva registra uma guarda: sair pede confirmação.
export function guardarSaida(fn: () => string | null) {
  guardas.push(fn);
  return () => { guardas = guardas.filter((g) => g !== fn); };
}

export function Roteador({ children }: { children: ReactNode }) {
  const [rota, setRota] = useState(atual);
  useEffect(() => {
    const f = () => setRota(atual());
    addEventListener('popstate', f);
    return () => removeEventListener('popstate', f);
  }, []);
  const ir = (c: string, opcoes: { trocar?: boolean } = {}) => {
    for (const g of guardas) { const m = g(); if (m && !confirm(m)) return; }
    const destino = c.startsWith('/') ? BASE + (c === '/' ? '/' : c) : c;
    if (opcoes.trocar) history.replaceState(null, '', destino); else history.pushState(null, '', destino);
    setRota(atual());
    window.scrollTo({ top: 0 });
  };
  return <Ctx.Provider value={{ rota, ir }}>{children}</Ctx.Provider>;
}

export function useRota() { return useContext(Ctx); }

export function Link({ para, children, ...resto }: { para: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { ir } = useRota();
  return (
    <a href={BASE + (para === '/' ? '/' : para)} {...resto} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      resto.onClick && resto.onClick(e);
      ir(para);
    }}>{children}</a>
  );
}

// "/fila/:id" casa com "/fila/12" -> { id: '12' }
export function casa(padrao: string, caminho: string): Record<string, string> | null {
  const p = padrao.split('/'), c = caminho.split('/');
  if (p.length !== c.length) return null;
  const r: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) r[p[i].slice(1)] = decodeURIComponent(c[i]);
    else if (p[i] !== c[i]) return null;
  }
  return r;
}
