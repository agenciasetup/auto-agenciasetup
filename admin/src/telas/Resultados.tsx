// Resultados (pedido do dono em 24/10/2026: "ver por post as automações, as métricas de forma organizada, qual post
// vendeu mais, qual engajou melhor, qual foi uma merda"). Por post: o resumo do período, os destaques e a tabela de
// todos os posts (ordena por qualquer número, filtra pela classe e pelo formato). "O que funciona": formato, assunto,
// horário e o Comenta X (a antiga tela de Desempenho).
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, ImageOff, RefreshCw } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Abas, Carregando, ErroCarga, Etiqueta, Faixa, Grupo, Titulo, Vazio, useAcao, useCarregar } from '../nucleo/ui';
import { FORMATOS, REDES, compacto, data, limparLegenda, numero, perfilDe, porcento } from '../nucleo/util';
import Desempenho from './Desempenho';
import { FiltroPerfil } from './comum';

const PERIODOS = [{ d: 7, t: '7 dias' }, { d: 30, t: '30 dias' }, { d: 90, t: '90 dias' }, { d: 365, t: '1 ano' }, { d: 3650, t: 'Tudo' }];
export const CLASSE: Record<string, { t: string; cor: string }> = {
  acima: { t: 'Acima da média', cor: 'verde' }, normal: { t: 'Na média', cor: 'cinza' }, abaixo: { t: 'Abaixo da média', cor: 'vermelho' },
};
export const vezes = (v: number) => `${String(v).replace('.', ',')}×`;
export const reais = (c?: number | null) => ((c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: (c || 0) % 100 ? 2 : 0 });

type Col = { id: string; t: string; v: (p: any) => number | null; f?: (p: any) => string; so?: (d: any) => boolean };
const COLUNAS: Col[] = [
  { id: 'publicado_em', t: 'Data', v: (p) => Date.parse(p.publicado_em) || 0 },
  { id: 'alcance', t: 'Alcance', v: (p) => p.alcance, f: (p) => compacto(p.alcance) },
  { id: 'curtidas', t: 'Curtidas', v: (p) => p.curtidas, f: (p) => compacto(p.curtidas) },
  { id: 'comentarios', t: 'Coment.', v: (p) => p.comentarios, f: (p) => compacto(p.comentarios) },
  { id: 'salvos', t: 'Salvos', v: (p) => p.salvos, f: (p) => compacto(p.salvos) },
  { id: 'compartilhamentos', t: 'Compart.', v: (p) => p.compartilhamentos, f: (p) => compacto(p.compartilhamentos) },
  { id: 'nota', t: 'Engaj.', v: (p) => (p.nota != null ? Number(p.nota) : null), f: (p) => porcento(p.nota) },
  { id: 'directs', t: 'Directs', v: (p) => (p.comenta ? p.comenta.directs : null), f: (p) => (p.comenta ? numero(p.comenta.directs) : '·') },
  { id: 'cliques', t: 'Cliques', v: (p) => (p.comenta ? p.comenta.cliques : null), f: (p) => (p.comenta ? numero(p.comenta.cliques) : '·') },
  { id: 'vendas', t: 'Vendas', v: (p) => p.vendas_centavos ?? null, f: (p) => (p.vendas ? reais(p.vendas_centavos) : '·'), so: (d) => d.ve_vendas },
];

export default function Resultados() {
  const { rota } = useRota();
  const [aba, setAba] = useState(rota.busca.get('aba') === 'analise' ? 'analise' : 'posts');
  const [dias, setDias] = useState(30);
  const [rede, setRede] = useState('instagram');
  // Um perfil por vez: a média e a classe de cada post são as do perfil dele (Brasil e Inglês não se misturam).
  const [perfil, setPerfil] = useState(rota.busca.get('perfil') === 'en' ? 'en' : 'br');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/resultados?dias=${dias}&rede=${rede}&perfil=${perfil}`), [dias, rede, perfil]);
  const { ocupado, rodar } = useAcao();
  const [pulou, setPulou] = useState(false);
  useEffect(() => { document.title = 'Resultados | Painel Agência Setup'; }, []);
  // Mês sem post (conta parada): abre direto no último ano.
  useEffect(() => { if (dados && !dados.posts.length && dias === 30 && !pulou) { setPulou(true); setDias(365); } }, [dados, dias, pulou]);
  const atualizar = () => rodar('atualizar', async () => {
    const r = await post('/desempenho/atualizar', { rede, perfil });
    recarregar();
    const aviso = [...(r.posts || []), ...(r.metricas || [])].find((x: any) => x.aviso || x.erro);
    if (aviso) throw new Error(aviso.aviso || aviso.erro);
  }, 'Números atualizados.');

  return (
    <div className="tela tela-larga">
      <Titulo titulo="Resultados" sub="Cada post com o que trouxe: alcance, engajamento, comentários, directs do Comenta X e vendas. O relógio atualiza os números sozinho."
        acoes={<button className="bt" disabled={!!ocupado} onClick={atualizar}><RefreshCw className={ocupado ? 'girar' : ''} />{ocupado ? 'Atualizando…' : 'Atualizar agora'}</button>} />
      <div className="filtros">
        <FiltroPerfil valor={perfil} mudar={setPerfil} todos={false} />
        {(dados?.redes || []).length > 1 && <div className="chips">{dados.redes.map((r: string) => <button key={r} className={`chip ${rede === r ? 'ativo' : ''}`} onClick={() => setRede(r)}>{REDES[r]?.t || r}</button>)}</div>}
        <div className="chips">{PERIODOS.map((p) => <button key={p.d} className={`chip ${dias === p.d ? 'ativo' : ''}`} onClick={() => setDias(p.d)}>{p.t}</button>)}</div>
      </div>
      <Abas abas={[{ id: 'posts', t: 'Por post' }, { id: 'analise', t: 'O que funciona' }]} atual={aba} mudar={setAba} />
      {aba === 'analise' ? <Desempenho embutido dias={dias} rede={rede} perfil={perfil} /> : <>
        {erro && <ErroCarga erro={erro} tentar={recarregar} />}
        {carregando && !dados && <Carregando />}
        {dados && !dados.contas?.length && <Faixa tipo="aviso">Nenhuma conta conectada no perfil {perfilDe(perfil).t}. <Link para="/redes">Conecte em Contas conectadas</Link> para os números aparecerem aqui.</Faixa>}
        {dados && (dados.posts.length ? <PorPost d={dados} /> : <Vazio icone={<BarChart3 />} titulo="Nenhum post neste período" texto="Escolha um período maior ou toque em Atualizar agora." />)}
      </>}
    </div>
  );
}

function PorPost({ d }: { d: any }) {
  const r = d.resumo;
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({ col: 'publicado_em', desc: true });
  const [classe, setClasse] = useState('');
  const [formato, setFormato] = useState('');
  const [busca, setBusca] = useState('');
  const colunas = COLUNAS.filter((c) => !c.so || c.so(d));
  const lista = useMemo(() => {
    const col = COLUNAS.find((c) => c.id === ordem.col)!;
    const b = busca.trim().toLowerCase();
    return d.posts
      .filter((p: any) => (!classe || p.classe === classe) && (!formato || p.formato === formato) && (!b || String(p.legenda || '').toLowerCase().includes(b) || String(p.palavra_chave || '').toLowerCase().includes(b)))
      .sort((a: any, b2: any) => { const va = col.v(a), vb = col.v(b2); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return ordem.desc ? vb - va : va - vb; });
  }, [d.posts, ordem, classe, formato, busca]);
  const contaClasse = (c: string) => d.posts.filter((p: any) => p.classe === c).length;
  const formatos = [...new Set(d.posts.map((p: any) => p.formato).filter(Boolean))] as string[];
  const ordenar = (col: string) => setOrdem((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: true }));
  const ds = d.destaques || {};

  return <>
    <div className="numeros">
      <div className="numero"><b>{numero(r.posts)}</b><span>posts no período</span></div>
      <div className="numero"><b>{compacto(r.alcance)}</b><span>de alcance somado</span></div>
      <div className="numero destaque"><b>{compacto(r.comentarios)}</b><span>comentários · {compacto(r.salvos)} salvos · {compacto(r.compartilhamentos)} compart.</span></div>
      <div className="numero"><b>{numero(r.directs)}</b><span>directs do Comenta X · {numero(r.cliques)} cliques no material</span></div>
      {d.ve_vendas && <div className="numero destaque"><b>{reais(r.vendas_centavos)}</b><span>{numero(r.vendas)} {r.vendas === 1 ? 'venda vinda' : 'vendas vindas'} dos posts</span></div>}
    </div>

    <div className="destaques">
      <Destaque titulo="Mais engajou" p={ds.engajamento} valor={ds.engajamento && `${porcento(ds.engajamento.nota)}${ds.engajamento.vezes ? ` · ${vezes(ds.engajamento.vezes)} a média` : ''}`} cor="verde" />
      {d.ve_vendas && <Destaque titulo="Mais vendeu" p={ds.vendas} valor={ds.vendas && `${reais(ds.vendas.vendas_centavos)} · ${ds.vendas.vendas} ${ds.vendas.vendas === 1 ? 'venda' : 'vendas'}`} cor="laranja" vazio="Nenhuma venda atribuída a post no período." />}
      <Destaque titulo="Mais comentado" p={ds.comentarios} valor={ds.comentarios && `${compacto(ds.comentarios.comentarios)} comentários`} />
      <Destaque titulo="Mais directs" p={ds.directs} valor={ds.directs && `${numero(ds.directs.directs)} directs do Comenta X`} vazio="Nenhum direct no período." />
      <Destaque titulo="Foi mal" p={ds.pior} valor={ds.pior && `${porcento(ds.pior.nota)}${ds.pior.vezes != null ? ` · ${vezes(ds.pior.vezes)} a média` : ''}`} cor="vermelho" vazio="Nenhum post bem abaixo da média." />
    </div>

    <Grupo titulo="Todos os posts" rodape={`Engajamento = (curtidas + 3 comentários + 2 salvos + 2 compartilhamentos) sobre o alcance. Média do período: ${porcento(d.medianas?.nota)}. Acima da média: 1,5 vez ou mais; abaixo: 60% ou menos. Vendas: o último toque antes da compra (link do post ou palavra do direct).`}>
      <div className="filtros">
        <div className="chips">
          <button className={`chip ${!classe ? 'ativo' : ''}`} onClick={() => setClasse('')}>Todos ({d.posts.length})</button>
          {Object.entries(CLASSE).map(([k, c]) => <button key={k} className={`chip ${classe === k ? 'ativo' : ''}`} onClick={() => setClasse(k)}>{c.t} ({contaClasse(k)})</button>)}
        </div>
        {formatos.length > 1 && <select value={formato} onChange={(e) => setFormato(e.target.value)} aria-label="Formato"><option value="">Todos os formatos</option>{formatos.map((f) => <option key={f} value={f}>{FORMATOS[f] || f}</option>)}</select>}
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar na legenda ou palavra" aria-label="Procurar" />
      </div>
      <div className="tabela-posts" role="table" style={{ ['--cols' as any]: colunas.length - 1 }}>
        <div className="tp-linha tp-cab" role="row">
          <button role="columnheader" className={`tp-titulo${ordem.col === 'publicado_em' ? ' ativo' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => ordenar('publicado_em')}
            aria-sort={ordem.col === 'publicado_em' ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>Post (data){ordem.col === 'publicado_em' && (ordem.desc ? <ArrowDown /> : <ArrowUp />)}</button>
          {colunas.filter((c) => c.id !== 'publicado_em').map((c) => (
            <button key={c.id} role="columnheader" className={`tp-num${ordem.col === c.id ? ' ativo' : ''}`} onClick={() => ordenar(c.id)} aria-sort={ordem.col === c.id ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
              {c.t}{ordem.col === c.id && (ordem.desc ? <ArrowDown /> : <ArrowUp />)}
            </button>
          ))}
        </div>
        {lista.map((p: any) => (
          <Link key={p.id} para={`/resultados/${p.id}`} className={`tp-linha${p.classe ? ` cl-${p.classe}` : ''}`} role="row">
            <span className="tp-post" role="cell">
              {p.miniatura_url ? <img src={p.miniatura_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} /> : <span className="tp-sem"><ImageOff /></span>}
              <span className="tp-texto">
                <span className="tp-legenda">{limparLegenda(p.legenda) || 'Sem legenda'}</span>
                <span className="tp-meta">{FORMATOS[p.formato] || p.formato || 'Post'} · {data(p.publicado_em)}{p.palavra_chave ? ` · Comenta ${p.palavra_chave}` : ''}
                  {p.classe && p.classe !== 'normal' && <Etiqueta cor={CLASSE[p.classe].cor}>{p.classe === 'acima' && p.vezes ? `${vezes(p.vezes)} a média` : CLASSE[p.classe].t}</Etiqueta>}</span>
              </span>
            </span>
            {colunas.filter((c) => c.id !== 'publicado_em').map((c) => <span key={c.id} role="cell" className={`tp-num${c.id === 'vendas' && p.vendas ? ' tp-venda' : ''}${c.id === 'nota' ? ' tp-nota' : ''}`} data-rotulo={c.t}>{c.f ? c.f(p) : c.v(p)}</span>)}
          </Link>
        ))}
        {!lista.length && <p className="mudo" style={{ padding: '16px 0', margin: 0 }}>Nenhum post com esse filtro.</p>}
      </div>
    </Grupo>
  </>;
}

function Destaque({ titulo, p, valor, cor, vazio }: { titulo: string; p: any; valor?: string | null; cor?: string; vazio?: string }) {
  if (!p) return <div className="destaque-cartao vazio"><span className="destaque-t">{titulo}</span><p className="mudo">{vazio || 'Ainda sem números.'}</p></div>;
  return (
    <Link para={`/resultados/${p.id}`} className={`destaque-cartao${cor ? ` c-${cor}` : ''}`}>
      <span className="destaque-t">{titulo}</span>
      <span className="destaque-corpo">
        {p.miniatura_url ? <img src={p.miniatura_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} /> : <span className="tp-sem"><ImageOff /></span>}
        <span><b>{valor}</b><span className="destaque-legenda">{limparLegenda(p.legenda) || 'Sem legenda'}</span></span>
      </span>
    </Link>
  );
}
