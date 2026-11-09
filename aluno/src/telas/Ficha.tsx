// A ficha do arquivo: o que é, quando usar, como usar, prévia, versão e o botão de baixar (link que vence em 10 minutos).
import { useState } from 'react';
import { I, TIPOS, useToast } from '../comum';
import { get } from '../nucleo/api';

export async function baixar(id: string, toast: (m: string) => void) {
  try {
    const r = await get<{ url: string }>(`/arquivos/${id}`);
    location.href = r.url;
  } catch (e: any) {
    toast(e.message);
  }
}

export function Ficha({ f }: { f: any }) {
  const t = TIPOS[f.tipo] || TIPOS.guia;
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);
  const como: string[] = Array.isArray(f.como) ? f.como : [];
  // Google Docs, Planilhas e Apresentações: a cópia fica no Drive da pessoa e o original continua protegido.
  async function drive(copia: boolean) {
    setBaixando(true);
    try { const r = await get<any>(`/arquivos/${f.id}`); window.open(copia && r.copia ? r.copia : r.url, '_blank', 'noopener'); } catch (e: any) { toast(e.message); } finally { setBaixando(false); }
  }
  return (
    <article className="ficha">
      <div className="ficha-topo"><span className="ic-arq" style={{ ['--c' as any]: t.c }}><I n={t.n} /></span><div><b>{f.nome}</b><small>{t.t}{f.tempo ? ` · ${f.tempo}` : ''}</small></div></div>
      <dl>
        {f.o_que ? <div><dt>O que é</dt><dd>{f.o_que}</dd></div> : null}
        {f.quando ? <div><dt>Quando usar</dt><dd>{f.quando}</dd></div> : null}
        {como.length ? <div><dt>Como usar</dt><dd><ol>{como.map((c, i) => <li key={i}>{c}</li>)}</ol></dd></div> : null}
      </dl>
      {f.previa ? <div className="previa">{f.previa}</div> : null}
      <div className="acoes">
        {f.drive ? (
          <>
            <button className="bt bt-marca bt-p" disabled={baixando} onClick={() => drive(true)}><I n="drive" />Fazer cópia no meu Drive</button>
            <button className="bt bt-p" disabled={baixando} onClick={() => drive(false)}><I n="externo" />Abrir</button>
          </>
        ) : f.bloqueado ? <button className="bt bt-p" disabled><I n="cadeado" />Libera no dia {f.libera_dia} da sua conquista</button>
        : <button className="bt bt-p" disabled={baixando} onClick={async () => { setBaixando(true); await baixar(f.id, toast); setBaixando(false); }}><I n="baixar" />{baixando ? 'Preparando...' : 'Baixar'}</button>}
        {f.bonus ? <span className="etiqueta" style={{ ['--c' as any]: '#ff9b42' }}><I n="presente" />Bônus da conquista</span> : null}
        {f.recompensa ? <span className="etiqueta" style={{ ['--c' as any]: '#ffd60a' }}><I n="presente" />Presente pelo seu depoimento</span> : null}
      </div>
      {f.versao ? <div className="pe"><I n="relogio" /><span>Atualizado em {f.versao}</span></div> : null}
    </article>
  );
}
