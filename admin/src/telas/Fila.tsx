// Fila das redes: todas as peças, por situação e por rede.
import { useEffect, useState } from 'react';
import { get } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Carregando, ErroCarga, Grupo, Paginacao, Titulo, Vazio, useCarregar } from '../nucleo/ui';
import { REDES, STATUS_PECA } from '../nucleo/util';
import { LinhaPeca } from './comum';

const FILTROS = ['', 'rascunho', 'aprovado', 'agendado', 'publicado', 'erro', 'cancelado'];

export default function Fila() {
  const { rota, ir } = useRota();
  const [status, setStatus] = useState(rota.busca.get('status') || '');
  const [rede, setRede] = useState(rota.busca.get('rede') || '');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { document.title = 'Fila das redes | Painel Agência Setup'; }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (rede) p.set('rede', rede);
    ir(`/fila${p.toString() ? `?${p}` : ''}`, { trocar: true });
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rede]);

  const { dados, erro, carregando, recarregar } = useCarregar(() => {
    const p = new URLSearchParams({ pagina: String(pagina) });
    if (status) p.set('status', status);
    if (rede) p.set('rede', rede);
    return get(`/pecas?${p}`);
  }, [status, rede, pagina]);

  return (
    <div className="tela">
      <Titulo titulo="Fila das redes" sub="Cada peça é um formato numa rede. Nada sai sem aprovação." />
      <div className="filtros">
        <div className="chips">
          {FILTROS.map((s) => (
            <button key={s || 'todas'} className={`chip ${status === s ? 'ativo' : ''}`} onClick={() => setStatus(s)}>{s ? STATUS_PECA[s].t : 'Todas'}</button>
          ))}
        </div>
        <select value={rede} onChange={(e) => setRede(e.target.value)} aria-label="Rede">
          <option value="">Todas as redes</option>
          {Object.entries(REDES).map(([id, r]) => <option key={id} value={id}>{r.t}</option>)}
        </select>
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (
        dados.itens?.length ? <>
          <Grupo>{dados.itens.map((p: any) => <LinhaPeca key={p.id} p={p} />)}</Grupo>
          <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 20} mudar={setPagina} />
        </> : <Vazio titulo={status || rede ? 'Nenhuma peça com esse filtro.' : 'A fila está vazia.'}
          texto="Peça ao Claude: “transforma esse recurso em carrossel para o Instagram e thread para o X”. As peças aparecem aqui como rascunho." />
      )}
    </div>
  );
}
