// Histórico: tudo o que a equipe, o Claude e o sistema mudaram, do mais novo para o mais antigo.
import { useEffect, useState } from 'react';
import { get } from '../nucleo/api';
import { Carregando, ErroCarga, Grupo, Paginacao, Titulo, Vazio, useCarregar } from '../nucleo/ui';
import { LinhaEvento } from './comum';

export default function Historico() {
  const [pagina, setPagina] = useState(1);
  useEffect(() => { document.title = 'Histórico | Painel Agência Setup'; }, []);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/historico?pagina=${pagina}`), [pagina]);
  return (
    <div className="tela tela-estreita">
      <Titulo titulo="Histórico" sub="Quem fez o quê, e por onde (painel, Claude ou sistema)." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.itens?.length ? <>
        <Grupo><div style={{ margin: '-6px -16px' }}>{dados.itens.map((e: any) => <LinhaEvento key={e.id} e={e} />)}</div></Grupo>
        <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 50} mudar={setPagina} />
      </> : <Vazio titulo="Nada registrado ainda." />)}
    </div>
  );
}
