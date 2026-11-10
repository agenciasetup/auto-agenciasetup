// Vídeos fora da curva (setor de vídeo): os Shorts que passaram muito da média do próprio canal, achados pelo Caçador
// de virais. A Roteirista lê esta lista e põe os roteiros na mesa do Escritório. Título de fora é só referência.
import { useState } from 'react';
import { ExternalLink, RotateCcw, Video, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Grupo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { haQuanto } from '../nucleo/util';

const milhar = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n || 0));
const vezes = (v: any) => `${String(Number(v) >= 10 ? Math.round(Number(v)) : v).replace('.', ',')}x`;
const FILTROS = [{ s: 'novo', t: 'Novos' }, { s: 'roteiro', t: 'Viraram roteiro' }, { s: 'usado', t: 'Viraram vídeo' }, { s: 'descartado', t: 'Descartados' }];
const VAZIO: Record<string, string> = {
  novo: 'O Caçador de virais lê 4 canais por hora, em rodízio. Quando um Short passa da régua, ele aparece aqui.',
  roteiro: 'Quando a Roteirista escreve um roteiro a partir de um viral, ele vem para cá. O roteiro fica na mesa do Escritório.',
  usado: 'Os virais que já viraram vídeo nosso.',
  descartado: 'Os virais que não servem para vender o curso, com o motivo.',
};

export function VideosVirais() {
  const { pode } = useSessao();
  const [status, setStatus] = useState('novo');
  const { ocupado, rodar } = useAcao();
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/video/virais?status=${status}&dias=30&limite=40`), [status]);
  const podeEditar = pode('pautas.editar');
  const marcar = (id: string, s: string) => rodar(id, async () => {
    await post(`/video/virais/${id}`, { status: s });
    setDados((d: any) => ({ ...d, itens: d.itens.filter((v: any) => v.video_id !== id) }));
  }, s === 'descartado' ? 'Vídeo descartado.' : 'Voltou para a fila da Roteirista.');

  const r = dados?.regua;
  const rodape = dados
    ? `O Caçador de virais segue ${dados.canais} ${dados.canais === 1 ? 'canal' : 'canais'}. Entra aqui o Short com pelo menos ${String(r.vezes).replace('.', ',')} vezes a média do próprio canal e ${milhar(r.views)} visualizações (${milhar(r.views_pt)} nos canais em português), publicado nos últimos ${r.dias} dias.${dados.ultima_rodada ? ` Última leitura ${haQuanto(dados.ultima_rodada)}.` : ''}`
    : undefined;
  return <>
    <div className="filtros">
      <div className="chips">
        {FILTROS.map((c) => <button key={c.s} className={`chip ${status === c.s ? 'ativo' : ''}`} onClick={() => setStatus(c.s)}>{c.t}</button>)}
      </div>
    </div>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && (
      <Grupo titulo="Shorts fora da curva" rodape={rodape}>
        {dados.itens.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.itens.map((v: any) => (
          <article className="pauta" key={v.video_id}>
            <span className="calor fervendo video-vezes" title="Quantas vezes a média de visualizações do próprio canal">{vezes(v.vezes)}</span>
            <div style={{ minWidth: 0 }}>
              <h3><a href={v.url} target="_blank" rel="noopener noreferrer">{v.titulo}</a></h3>
              <div className="post-meta" style={{ marginTop: 6 }}>
                <span>{v.canal} · publicado {haQuanto(v.publicado_em)}</span>
                <span>{milhar(v.views)} visualizações</span>
                {v.por_dia ? <span>{milhar(v.por_dia)} por dia</span> : null}
                <span>média do canal: {milhar(v.base)}</span>
                <Etiqueta>{v.idioma === 'en' ? 'Inglês' : 'Português'}</Etiqueta>
              </div>
              {v.leitura?.padrao && <p className="angulo"><b>O que fez sair da curva:</b> {v.leitura.padrao}</p>}
              {v.leitura?.roteiro && <p className="angulo"><b>Nosso roteiro ({v.leitura.roteiro.formato}, palavra {v.leitura.roteiro.palavra}):</b> {v.leitura.roteiro.gancho}</p>}
              {v.leitura?.motivo && <p className="angulo"><b>Por que não serve:</b> {v.leitura.motivo}</p>}
              <div className="pauta-acoes">
                <a className="bt bt-mini bt-tinta" href={v.url} target="_blank" rel="noopener noreferrer"><ExternalLink />Ver o Short</a>
                {podeEditar && status !== 'descartado' && <button className="bt bt-texto bt-mini" disabled={ocupado === v.video_id} onClick={() => marcar(v.video_id, 'descartado')}><X />Descartar</button>}
                {podeEditar && status === 'descartado' && <button className="bt bt-mini" disabled={ocupado === v.video_id} onClick={() => marcar(v.video_id, 'novo')}><RotateCcw />Voltar para a fila</button>}
              </div>
            </div>
          </article>
        ))}</div> : <Vazio icone={<Video />} titulo="Nada aqui por enquanto" texto={VAZIO[status]} />}
      </Grupo>
    )}
  </>;
}
