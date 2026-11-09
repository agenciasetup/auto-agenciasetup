// Lista das peças, por situação, rede e perfil (aba "Lista" de Posts e agenda; era a Fila das redes).
import { useEffect, useState } from 'react';
import { get } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Carregando, ErroCarga, Grupo, Paginacao, Titulo, Vazio, useCarregar } from '../nucleo/ui';
import { REDES, STATUS_PECA } from '../nucleo/util';
import { FiltroPerfil, LinhaPeca } from './comum';

const FILTROS = ['', 'rascunho', 'aprovado', 'agendado', 'publicado', 'erro', 'cancelado'];

export default function Fila({ embutida }: { embutida?: boolean }) {
  const { rota, ir } = useRota();
  const [status, setStatus] = useState(rota.busca.get('status') || '');
  const [rede, setRede] = useState(rota.busca.get('rede') || '');
  const [perfil, setPerfil] = useState(rota.busca.get('perfil') || '');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { if (!embutida) document.title = 'Posts | Painel Agência Setup'; }, [embutida]);
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('vista', 'lista');
    if (status) p.set('status', status);
    if (rede) p.set('rede', rede);
    if (perfil) p.set('perfil', perfil);
    ir(`${rota.caminho}?${p}`, { trocar: true });
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rede, perfil]);

  const { dados, erro, carregando, recarregar } = useCarregar(() => {
    const p = new URLSearchParams({ pagina: String(pagina) });
    if (status) p.set('status', status);
    if (rede) p.set('rede', rede);
    if (perfil) p.set('perfil', perfil);
    return get(`/pecas?${p}`);
  }, [status, rede, perfil, pagina]);

  return (
    <div className={embutida ? '' : 'tela'}>
      {!embutida && <Titulo titulo="Posts" sub="Cada peça é um formato numa rede. Nada sai sem aprovação." />}
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
        <FiltroPerfil valor={perfil} mudar={setPerfil} />
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (
        dados.itens?.length ? <>
          <Grupo>{dados.itens.map((p: any) => <LinhaPeca key={p.id} p={p} />)}</Grupo>
          <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 20} mudar={setPagina} />
        </> : <Vazio titulo={status || rede || perfil ? 'Nenhuma peça com esse filtro.' : 'Nenhum post ainda.'}
          texto={<>Crie em <Link para="/posts/novo">Novo post</Link> ou peça ao Claude: “transforma esse recurso em carrossel para o Instagram”. Os rascunhos aparecem aqui.</>} />
      )}
    </div>
  );
}
