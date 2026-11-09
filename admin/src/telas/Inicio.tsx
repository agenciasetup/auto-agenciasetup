// Início: saudação, atalhos, números em bento (o motor de engajamento primeiro), o que está quente agora,
// os melhores do mês, o que vai sair nas redes, o que deu erro e o que aconteceu.
import { useEffect } from 'react';
import { BarChart3, CalendarDays, Flame, ListChecks, MessageCircleHeart, Plug, Plus, Share2 } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, Celula, ErroCarga, Etiqueta, Grupo, Vazio, useCarregar, useSessao } from '../nucleo/ui';
import { FERRAMENTA, REDES, compacto, haQuanto, numero, perfilDe } from '../nucleo/util';
import { Calor, LinhaEvento, LinhaPeca, LinhaPost } from './comum';
import { CartaoIdeia, ItemAgora } from './planoComum';

export default function Inicio() {
  const { eu, pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/inicio'));
  const plano = useCarregar<any>(() => (pode('plano.ver') ? get('/plano') : Promise.resolve(null)), []);
  const ideias = (plano.dados?.plano?.ideias || []).filter((i: any) => i.status === 'nova');
  useEffect(() => { document.title = 'Início | Painel Agência Setup'; }, []);
  const n = dados?.numeros || {};
  const m = dados?.motor || {};
  const primeiroNome = eu.usuario.nome.split(' ')[0];
  const semPostar = n.ultimo_post ? Math.floor((Date.now() - new Date(n.ultimo_post).getTime()) / 86400_000) : null;
  // Com o perfil em inglês conectado, os números do início dizem que são os do Brasil.
  const temEn = (dados?.redes || []).some((r: any) => (r.conexoes || []).some((c: any) => c.perfil === 'en' && c.status !== 'desligada'));

  // Só o que pede atenção hoje (pedido do dono em 24/10/2026: "ta muito confuso o painel").
  const cards = [
    { t: `${temEn ? 'seguidores no Brasil' : n.ultimo_post ? 'seguidores' : 'seguidores no Instagram'}${n.ultimo_post ? ` · último post ${haQuanto(n.ultimo_post)}` : ''}`, v: n.seguidores, compacto: true, para: '/resultados', mostra: pode('desempenho.ver') },
    { t: 'posts para revisar', v: n.pecas_rascunho, para: '/posts', destaque: n.pecas_rascunho > 0, mostra: pode('pecas.ver') },
    { t: 'posts agendados', v: n.pecas_agendadas, para: '/posts', mostra: pode('pecas.ver') },
    { t: 'posts com erro', v: n.pecas_erro, para: '/posts?vista=lista&status=erro', destaque: true, mostra: pode('pecas.ver') && n.pecas_erro > 0 },
    { t: 'directs do Comenta X em 7 dias', v: n.dms_7d, para: '/comenta', mostra: pode('gatilhos.ver') },
    { t: `downloads em 7 dias · ${numero(n.downloads_total)} no total`, v: n.downloads_7d, para: '/conteudo?aba=recursos', mostra: true },
    { t: 'assuntos quentes nas últimas 24 h', v: n.em_alta_24h, para: '/pautas', mostra: pode('pautas.ver') },
  ].filter((c) => c.mostra);

  const atalhos = [
    pode('pecas.editar') && { t: 'Novo post', para: '/posts/novo', i: <Plus />, cor: 'laranja' },
    pode('pecas.ver') && { t: 'Agenda', para: '/posts', i: <CalendarDays />, cor: 'azul' },
    pode('desempenho.ver') && { t: 'Resultados', para: '/resultados', i: <BarChart3 />, cor: 'ambar' },
    pode('gatilhos.ver') && { t: 'Automações', para: '/comenta', i: <MessageCircleHeart />, cor: 'rosa' },
    pode('pautas.ver') && { t: 'Em alta', para: '/pautas', i: <Flame />, cor: 'laranja' },
  ].filter(Boolean) as { t: string; para: string; i: any; cor: string }[];

  return (
    <div className="tela">
      <header className="ola">
        <h1>Olá, <span className="serifa">{primeiroNome}</span></h1>
        <p>O que está acontecendo no site e nas redes.</p>
      </header>

      <div className="atalhos-rapidos">
        {atalhos.map((a) => (
          <Link key={a.t} para={a.para} className="atalho-rapido"><span className={`celula-icone cor-${a.cor}`}>{a.i}</span>{a.t}</Link>
        ))}
      </div>

      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {/* Primeiro o que fazer, depois os números (pedido do dono em 30/10/2026). Carrega à parte: se falhar, o início continua. */}
      {plano.dados && (plano.dados.recomendacoes.length > 0 || ideias.length > 0) && (
        <Grupo titulo="O que fazer agora" acoes={<Link className="bt bt-texto bt-mini" para="/plano">Ver o plano</Link>}>
          {plano.dados.recomendacoes.length > 0 && <div className="plano-agora-lista">{plano.dados.recomendacoes.slice(0, 3).map((r: any) => <ItemAgora key={r.id} r={r} />)}</div>}
          {ideias.length > 0 && <>
            <h3 className="plano-sub">Próximas ideias de posts</h3>
            <div className="plano-ideias">{ideias.slice(0, 3).map((i: any) => <CartaoIdeia key={i.id} i={i} />)}</div>
          </>}
        </Grupo>
      )}
      {dados && <>
        <div className="numeros">
          {cards.map((c, i) => {
            const classe = `numero ${i === 0 ? 'grande' : ''} ${c.destaque ? 'destaque' : ''}`;
            const corpo = <><b>{c.compacto ? compacto(c.v) : numero(c.v)}</b><span>{c.t}</span></>;
            return c.para ? <Link key={c.t} para={c.para} className={classe}>{corpo}</Link> : <div key={c.t} className={classe}>{corpo}</div>;
          })}
        </div>

        {semPostar !== null && semPostar >= 3 && pode('pautas.ver') && (
          <Grupo titulo={`${semPostar} dias sem postar`} acoes={<><Link className="bt bt-mini" para="/pautas"><Flame />Em alta</Link>{pode('pecas.editar') && <Link className="bt bt-tinta bt-mini" para="/posts/novo"><Plus />Novo post</Link>}</>}>
            <p className="mudo" style={{ margin: 0, fontSize: 14 }}>A conta engaja quando aparece. Poste você mesmo em Novo post, ou pegue uma pauta quente e mande para o Claude: ele cria o material, o post e a automação do direct.</p>
          </Grupo>
        )}

        <div className="colunas">
          <div>
            {pode('pautas.ver') && (
              <Grupo titulo="Quente agora" acoes={<Link className="bt bt-texto bt-mini" para="/pautas">Ver tudo</Link>}>
                {m.assuntos?.length > 0 && <div className="assuntos" style={{ marginBottom: 12 }}>{m.assuntos.map((a: any) => <span className="assunto" key={a.ferramenta}>{FERRAMENTA[a.ferramenta] || a.ferramenta}<span>{a.mencoes}</span></span>)}</div>}
                {m.em_alta?.length ? <div style={{ margin: '0 -18px -18px' }}>{m.em_alta.map((p: any) => (
                  <article className="pauta" key={p.id}>
                    <Calor v={p.calor} />
                    <div style={{ minWidth: 0 }}>
                      <h3>{p.fonte_url ? <a href={p.fonte_url} target="_blank" rel="noopener noreferrer">{p.titulo}</a> : p.titulo}</h3>
                      <div className="post-meta" style={{ marginTop: 4 }}><span>{p.fonte_nome} · {haQuanto(p.publicado_na_fonte || p.criado_em)}</span></div>
                    </div>
                  </article>
                ))}</div> : <Vazio icone={<Flame />} titulo="O radar ainda está lendo as fontes" texto="Em alguns minutos as primeiras pautas aparecem." />}
              </Grupo>
            )}
            {pode('desempenho.ver') && m.melhores?.length > 0 && (
              <Grupo titulo={temEn ? 'Melhores do mês no Brasil' : 'Melhores do mês'} acoes={<Link className="bt bt-texto bt-mini" para="/resultados">Ver resultados</Link>}>
                <div style={{ margin: '-14px -18px -18px' }}>{m.melhores.map((p: any) => <LinhaPost key={p.id} p={p} />)}</div>
              </Grupo>
            )}
          </div>
          <div>
            <Grupo titulo="Atividade recente" acoes={pode('historico.ver') ? <Link className="bt bt-texto bt-mini" para="/historico">Ver histórico</Link> : undefined}>
              {dados.atividade?.length ? <div style={{ margin: '-6px -18px' }}>{dados.atividade.map((e: any) => <LinhaEvento key={e.id} e={e} />)}</div>
                : <Vazio titulo="Nada por aqui ainda" texto="O que a equipe e o Claude fizerem aparece aqui." />}
            </Grupo>
            {pode('pecas.ver') && (
              <Grupo titulo="Próximas nas redes" acoes={<Link className="bt bt-texto bt-mini" para="/posts">Ver agenda</Link>}>
                {dados.proximas?.length ? dados.proximas.map((p: any) => <LinhaPeca key={p.id} p={p} />)
                  : <Vazio icone={<ListChecks />} titulo="Nada agendado" texto="Quando um post for agendado, ele aparece aqui." />}
              </Grupo>
            )}
            {pode('pecas.ver') && dados.erros?.length > 0 && (
              <Grupo titulo="Não saíram (erro ao publicar)">
                {dados.erros.map((p: any) => <LinhaPeca key={p.id} p={p} />)}
              </Grupo>
            )}
            {pode('redes.ver') && (
              <Grupo titulo="Contas conectadas" acoes={<Link className="bt bt-texto bt-mini" para="/redes">Ver contas</Link>}>
                {(dados.redes || []).map((r: any) => {
                  const ativas = (r.conexoes || []).filter((c: any) => c.status === 'ativa');
                  const contas = ativas.length;
                  const etq = contas ? <Etiqueta cor="verde">{contas === 1 ? '1 conta' : `${contas} contas`}</Etiqueta>
                    : !r.disponivel ? <Etiqueta>Em breve</Etiqueta> : !r.configurada ? <Etiqueta cor="ambar">Falta configurar</Etiqueta> : <Etiqueta cor="azul">Pronta para conectar</Etiqueta>;
                  // Cada conta com o perfil dela: "@agenciasetup (Brasil) · @setupagency_eng (Inglês)".
                  const sub = contas ? ativas.map((c: any) => `${c.conta_nome || 'Conta'} (${perfilDe(c.perfil).curto})`).join(' · ') : (r.formatos || []).join(', ');
                  return <Celula key={r.id} icone={contas ? <Share2 /> : <Plug />} corHex={r.cor || REDES[r.id]?.cor} titulo={r.nome} sub={sub} direita={etq} para="/redes" />;
                })}
                {!dados.redes?.length && <Vazio titulo="Nenhuma rede cadastrada" />}
              </Grupo>
            )}
          </div>
        </div>
      </>}
    </div>
  );
}
