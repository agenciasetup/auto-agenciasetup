// Navegação sem biblioteca: endereços de verdade (/cursos/x, /aulas/y), botão voltar funciona. Igual ao painel.
import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

type Rota = { caminho: string; busca: URLSearchParams };
const Ctx = createContext<{ rota: Rota; ir: (c: string, opcoes?: { trocar?: boolean; manterRolagem?: boolean }) => void }>(null as any);

function atual(): Rota {
  return { caminho: location.pathname.replace(/\/+$/, '') || '/', busca: new URLSearchParams(location.search) };
}

export function Roteador({ children }: { children: ReactNode }) {
  const [rota, setRota] = useState(atual);
  useEffect(() => {
    const f = () => setRota(atual());
    addEventListener('popstate', f);
    return () => removeEventListener('popstate', f);
  }, []);
  const ir = (c: string, opcoes: { trocar?: boolean; manterRolagem?: boolean } = {}) => {
    if (opcoes.trocar) history.replaceState(null, '', c); else history.pushState(null, '', c);
    setRota(atual());
    if (!opcoes.manterRolagem) window.scrollTo({ top: 0 });
  };
  return <Ctx.Provider value={{ rota, ir }}>{children}</Ctx.Provider>;
}

export function useRota() { return useContext(Ctx); }

export function Link({ para, children, ...resto }: { para: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { ir } = useRota();
  return (
    <a href={para} {...resto} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      resto.onClick && resto.onClick(e);
      ir(para);
    }}>{children}</a>
  );
}

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
