// Pesquisar nas aulas: acha o minuto em que cada assunto foi falado (busca na transcrição das aulas).
import { useEffect, useRef, useState } from 'react';
import { I, mmss } from '../comum';
import { get } from '../nucleo/api';
import { useRota } from '../nucleo/rota';

export function Busca({ aoFechar }: { aoFechar: () => void }) {
  const { ir } = useRota();
  const [q, setQ] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current && campo.current.focus();
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);
  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 3) { setItens([]); return; }
    setBuscando(true);
    const t = setTimeout(() => { get(`/busca?q=${encodeURIComponent(termo)}`).then((r) => setItens(r.itens || []), () => setItens([])).finally(() => setBuscando(false)); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const marca = (texto: string) => {
    const termo = q.trim();
    const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const i = sem(texto).indexOf(sem(termo));
    if (i < 0) return texto;
    return <>{texto.slice(0, i)}<mark>{texto.slice(i, i + termo.length)}</mark>{texto.slice(i + termo.length)}</>;
  };

  return (
    <div className="busca-folha" onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="busca-caixa" role="dialog" aria-label="Pesquisar nas aulas">
        <div className="campo-b"><I n="busca" className="fraco" /><label htmlFor="q" className="sr">Pesquisar</label><input id="q" ref={campo} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: tarefa agendada, skill, Pix" autoComplete="off" /><button className="bt-icone" onClick={aoFechar} aria-label="Fechar"><I n="fechar" /></button></div>
        <small className="fraco" style={{ padding: '0 6px' }}>{q.trim().length < 3 ? 'Busca no que foi falado em todas as suas aulas.' : buscando ? 'Procurando...' : itens.length ? `${itens.length} trechos encontrados` : 'Nada encontrado. Tente outra palavra.'}</small>
        <div className="res-lista">
          {itens.map((r, i) => (
            <a key={i} className="res" href={`/aulas/${r.aula_id}`} onClick={(e) => { e.preventDefault(); aoFechar(); ir(`/aulas/${r.aula_id}?t=${r.s}`); }}>
              <div className="capa">{r.capa_url ? <img src={r.capa_url} alt="" /> : null}<span className="dur num">{mmss(r.s)}</span></div>
              <span><b>{r.codigo} · {r.titulo}</b><p>{marca(r.texto)}</p></span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
