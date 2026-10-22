// Início: números do sistema, o que vai sair nas redes, o que deu erro e o que aconteceu por último.
import { useEffect } from 'react';
import { Plug, Share2 } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, Celula, ErroCarga, Grupo, Titulo, Vazio, Etiqueta, useCarregar, useSessao } from '../nucleo/ui';
import { numero } from '../nucleo/util';
import { LinhaEvento, LinhaPeca } from './comum';

export default function Inicio() {
  const { eu, pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/inicio'));
  useEffect(() => { document.title = 'Início | Painel Agência Setup'; }, []);
  const n = dados?.numeros || {};
  const primeiroNome = eu.usuario.nome.split(' ')[0];

  const cards = [
    { t: 'peças para revisar', v: n.pecas_rascunho, para: '/fila?status=rascunho', destaque: n.pecas_rascunho > 0, mostra: pode('pecas.ver') },
    { t: 'peças agendadas', v: n.pecas_agendadas, para: '/fila?status=agendado', mostra: pode('pecas.ver') },
    { t: 'publicadas em 7 dias', v: n.pecas_publicadas_7d, para: '/fila?status=publicado', mostra: pode('pecas.ver') },
    { t: 'peças com erro', v: n.pecas_erro, para: '/fila?status=erro', destaque: n.pecas_erro > 0, mostra: pode('pecas.ver') },
    { t: 'recursos no ar', v: n.recursos_publicados, para: '/conteudo?aba=recursos', mostra: pode('conteudo.ver') },
    { t: 'novidades no ar', v: n.artigos_publicados, para: '/conteudo?aba=artigos', mostra: pode('conteudo.ver') },
    { t: 'downloads em 7 dias', v: n.downloads_7d, mostra: true },
    { t: 'downloads no total', v: n.downloads_total, mostra: true },
    { t: 'pautas novas', v: n.pautas_novas, para: '/pautas', destaque: n.pautas_novas > 0, mostra: pode('pautas.ver') },
    { t: 'cliques nos anúncios', v: n.anuncios_cliques_total, para: '/cursos?aba=anuncios', mostra: pode('cursos.ver') },
  ].filter((c) => c.mostra);

  return (
    <div className="tela">
      <Titulo titulo={`Olá, ${primeiroNome}`} sub="O que está acontecendo no site e nas redes." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && <>
        <div className="numeros">
          {cards.map((c) => {
            const corpo = <><b>{numero(c.v)}</b><span>{c.t}</span></>;
            return c.para ? <Link key={c.t} para={c.para} className={`numero ${c.destaque ? 'destaque' : ''}`}>{corpo}</Link>
              : <div key={c.t} className="numero">{corpo}</div>;
          })}
        </div>

        <div className="colunas">
          <div>
            {pode('pecas.ver') && (
              <Grupo titulo="Próximas nas redes" acoes={<Link className="bt bt-texto bt-mini" para="/fila?status=agendado">Ver fila</Link>}>
                {dados.proximas?.length ? dados.proximas.map((p: any) => <LinhaPeca key={p.id} p={p} />)
                  : <Vazio titulo="Nada agendado." texto="Quando uma peça for aprovada e agendada, ela aparece aqui." />}
              </Grupo>
            )}
            {pode('pecas.ver') && dados.erros?.length > 0 && (
              <Grupo titulo="Deram erro ao publicar">
                {dados.erros.map((p: any) => <LinhaPeca key={p.id} p={p} />)}
              </Grupo>
            )}
            {pode('redes.ver') && (
              <Grupo titulo="Redes" acoes={<Link className="bt bt-texto bt-mini" para="/redes">Ver redes</Link>}>
                {(dados.redes || []).map((r: any) => {
                  const contas = (r.conexoes || []).filter((c: any) => c.status === 'ativa').length;
                  const etq = contas ? <Etiqueta cor="verde">{contas === 1 ? '1 conta' : `${contas} contas`}</Etiqueta>
                    : !r.disponivel ? <Etiqueta>Em breve</Etiqueta> : !r.configurada ? <Etiqueta cor="ambar">Falta configurar</Etiqueta> : <Etiqueta cor="azul">Pronta para conectar</Etiqueta>;
                  return <Celula key={r.id} icone={contas ? <Share2 /> : <Plug />} cor={contas ? 'verde' : undefined} titulo={r.nome} sub={(r.formatos || []).join(', ')} direita={etq} para="/redes" />;
                })}
                {!dados.redes?.length && <Vazio titulo="Nenhuma rede cadastrada." />}
              </Grupo>
            )}
          </div>
          <div>
            <Grupo titulo="Atividade recente" acoes={pode('historico.ver') ? <Link className="bt bt-texto bt-mini" para="/historico">Ver histórico</Link> : undefined}>
              {dados.atividade?.length ? <div style={{ margin: '-6px -16px' }}>{dados.atividade.map((e: any) => <LinhaEvento key={e.id} e={e} />)}</div>
                : <Vazio titulo="Nada por aqui ainda." texto="O que a equipe e o Claude fizerem aparece aqui." />}
            </Grupo>
          </div>
        </div>
      </>}
    </div>
  );
}
