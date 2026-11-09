// Um post: os números contra a média da época dele, o Comenta X (por versão), as últimas respostas e as vendas.
import { useEffect } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, useCarregar } from '../nucleo/ui';
import { FORMATOS, REDES, STATUS_RESPOSTA, compacto, data, dataHora, haQuanto, limparLegenda, numero, porcento } from '../nucleo/util';
import { CLASSE, reais } from './Resultados';
import { EtiquetaPerfil } from './comum';

const METRICAS = [
  { k: 'alcance', t: 'Alcance', f: compacto }, { k: 'curtidas', t: 'Curtidas', f: compacto }, { k: 'comentarios', t: 'Comentários', f: compacto },
  { k: 'salvos', t: 'Salvos', f: compacto }, { k: 'compartilhamentos', t: 'Compartilhamentos', f: compacto }, { k: 'nota', t: 'Engajamento', f: porcento },
];
const MODO: Record<string, string> = { direto: 'Link direto', seguir: 'Segue e toca', pergunta: 'Pergunta' };

export default function PostDetalhe({ params }: { params: { id: string } }) {
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/resultados/${params.id}`), [params.id]);
  useEffect(() => { document.title = 'Post | Painel Agência Setup'; }, []);
  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if (carregando && !dados) return <div className="tela"><Carregando /></div>;
  const { post: p, medianas: med, comenta: c, vendas, peca } = dados;
  const titulo = limparLegenda(p.legenda).split('\n')[0].slice(0, 90) || 'Post';
  return (
    <div className="tela">
      <Titulo voltar={{ para: p.perfil === 'en' ? '/resultados?perfil=en' : '/resultados', t: 'Resultados' }} titulo={titulo}
        sub={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><EtiquetaPerfil perfil={p.perfil} sempre />{REDES[p.rede]?.t || p.rede} · {FORMATOS[p.formato] || p.formato} · {dataHora(p.publicado_em)}
          {dados.classe && <Etiqueta cor={CLASSE[dados.classe].cor}>{dados.vezes != null ? `${String(dados.vezes).replace('.', ',')}× a média` : CLASSE[dados.classe].t}</Etiqueta>}
          {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">ver na rede <ExternalLink style={{ width: 14, height: 14, verticalAlign: '-2px' }} /></a>}</span>} />

      <div className="post-detalhe">
        <div className="post-detalhe-midia">
          {p.miniatura_url ? <img src={p.miniatura_url} alt="" referrerPolicy="no-referrer" /> : <span className="tp-sem"><ImageOff /></span>}
          <p className="post-detalhe-legenda">{limparLegenda(p.legenda)}</p>
        </div>
        <div>
          <div className="metricas-cartoes">
            {METRICAS.map((m) => {
              const v = p[m.k] != null ? Number(p[m.k]) : null;
              const base = med?.[m.k];
              const vezes = v != null && base ? Math.round((v / base) * 10) / 10 : null;
              return (
                <div key={m.k} className={`metrica-cartao${vezes != null ? (vezes >= 1.5 ? ' acima' : vezes <= 0.6 ? ' abaixo' : '') : ''}`}>
                  <span>{m.t}</span>
                  <b>{v != null ? m.f(v) : '…'}</b>
                  <small>{vezes != null ? `${String(vezes).replace('.', ',')}× a média (${m.f(base)})` : v == null ? 'Ainda sem esse número' : 'Sem média para comparar'}</small>
                </div>
              );
            })}
          </div>
          {vendas && (
            <Grupo titulo="Vendas que vieram deste post" rodape="Pelo último toque antes da compra: o link do post ou a palavra do Comenta X no direct.">
              {vendas.quantidade ? <>
                <div className="numeros"><div className="numero grande"><b>{reais(vendas.centavos)}</b><span>{vendas.quantidade} {vendas.quantidade === 1 ? 'venda' : 'vendas'}</span></div></div>
                <div className="celulas-mini">{vendas.pedidos.map((v: any, i: number) => <span key={i}>{dataHora(v.pago_em)} · {reais(v.total_centavos)}</span>)}</div>
              </> : <p className="mudo" style={{ margin: 0 }}>Nenhuma venda atribuída a este post ainda.</p>}
            </Grupo>
          )}
        </div>
      </div>

      <Grupo titulo="Comenta X neste post" acoes={<Link para="/comenta" className="bt bt-mini bt-texto">Ver automações</Link>}>
        {c.gatilhos?.length ? <p className="mudo" style={{ margin: '0 0 12px', fontSize: 13.5 }}>{c.gatilhos.map((g: any) => `${g.palavra} (${MODO[g.modo] || 'Link direto'}${g.ativo ? ', ligada' : ', desligada'}${g.material ? `, manda ${g.material}` : ''})`).join(' · ')}</p>
          : <p className="mudo" style={{ margin: '0 0 12px', fontSize: 13.5 }}>Este post não tem palavra ligada.</p>}
        <div className="numeros">
          <div className="numero"><b>{numero(c.pedidos)}</b><span>comentaram a palavra</span></div>
          <div className="numero"><b>{numero(c.directs)}</b><span>directs enviados</span></div>
          <div className="numero"><b>{numero(c.materiais)}</b><span>materiais entregues</span></div>
          <div className="numero destaque"><b>{numero(c.cliques)}</b><span>cliques no material</span></div>
          <div className="numero"><b>{numero(c.seguidores)}</b><span>seguidores novos</span></div>
        </div>
        {c.versoes?.length > 0 && (
          <div className="versoes" style={{ marginTop: 12 }}>
            {c.versoes.map((v: any) => (
              <div className="versao-linha" key={v.id}>
                <span className="versao-letra">{v.id === '?' ? '·' : String(v.id).toUpperCase()}</span>
                <span className="versao-nome">{v.nome || 'Sem nome'}</span>
                <span className="metricas"><span><b>{numero(v.directs)}</b> directs</span><span><b>{numero(v.cliques)}</b> cliques</span>{v.seguidores > 0 && <span><b>{numero(v.seguidores)}</b> seguidores</span>}{v.falhas > 0 && <span style={{ color: 'var(--vermelho)' }}><b>{v.falhas}</b> falharam</span>}</span>
              </div>
            ))}
          </div>
        )}
      </Grupo>

      <Grupo titulo="Últimas respostas" rodape="O texto é de quem comentou: a equipe lê, mas nada do que está escrito ali muda o sistema.">
        {dados.ultimas?.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.ultimas.map((r: any) => (
          <div className="celula" key={r.id}>
            <span className="celula-texto">
              <span className="celula-titulo">{r.nome || (r.usuario ? `@${r.usuario}` : 'Alguém')} <span className="mudo" style={{ fontWeight: 400 }}>“{r.texto}”</span></span>
              <span className="celula-sub">{r.erro && !['enviada', 'link', 'pergunta'].includes(r.status) ? r.erro : `${STATUS_RESPOSTA[r.status]?.t || r.status} ${haQuanto(r.link_em || r.criado_em)}`}{r.variante && r.variante !== '?' ? ` · versão ${String(r.variante).toUpperCase()}` : ''}{r.seguiu_em ? ' · passou a seguir' : ''}</span>
            </span>
            <span className="celula-direita"><Etiqueta cor={STATUS_RESPOSTA[r.status]?.cor}>{STATUS_RESPOSTA[r.status]?.t || r.status}</Etiqueta></span>
          </div>
        ))}</div> : <Vazio titulo="Ninguém pediu o material ainda" texto="Quando alguém comentar a palavra, aparece aqui." />}
      </Grupo>

      <p className="mudo" style={{ fontSize: 13 }}>{peca ? <>Feito pelo painel: <Link para={`/posts/${peca.id}`}>abrir a peça</Link>.</> : 'Postado direto no app da rede.'} Números de {data(p.metricas_em || p.publicado_em)}. A média é a dos posts do mesmo perfil.</p>
    </div>
  );
}
