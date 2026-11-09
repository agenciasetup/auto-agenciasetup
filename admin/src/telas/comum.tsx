// Pedaços que mais de uma tela usa: etiquetas de status, linha de peça, linha de post, calor, linha de evento do histórico.
import { useState } from 'react';
import { AlertTriangle, Bookmark, CalendarClock, CheckCircle2, CircleDashed, ExternalLink, Eye, Heart, ImageOff, MessageCircle, Send, XCircle } from 'lucide-react';
import { Celula, Etiqueta } from '../nucleo/ui';
import { Link } from '../nucleo/roteador';
import { ACOES_HISTORICO, FORMATOS, PERFIS, REDES, STATUS_CONTEUDO, STATUS_PECA, compacto, data, dataHora, dinheiro, haQuanto, limparLegenda, perfilDe, porcento } from '../nucleo/util';

// O perfil de uma peça, palavra ou post. Nas listas só o em inglês leva a etiqueta "EN" (o do Brasil é o padrão);
// "sempre" mostra também o "BR" (no topo de uma peça, por exemplo).
export function EtiquetaPerfil({ perfil, sempre }: { perfil?: string | null; sempre?: boolean }) {
  const en = perfil === 'en';
  if (!en && !sempre) return null;
  const p = perfilDe(perfil);
  return <span className={`etiqueta etiqueta-perfil${en ? ' perfil-en' : ''}`} title={p.t} aria-label={`Perfil ${p.t}`}>{p.sigla}</span>;
}

// Filtro de perfil das listas. Sem "todos": um perfil por vez (desempenho e resultados não misturam os números).
export function FiltroPerfil({ valor, mudar, todos = true }: { valor: string; mudar: (v: string) => void; todos?: boolean }) {
  const opcoes = [...(todos ? [{ v: '', t: 'Todos os perfis' }] : []), ...Object.entries(PERFIS).map(([v, p]) => ({ v, t: p.curto }))];
  return (
    <div className="chips" role="group" aria-label="Perfil">
      {opcoes.map((o) => <button key={o.v || 'todos'} type="button" className={`chip ${valor === o.v ? 'ativo' : ''}`} aria-pressed={valor === o.v} onClick={() => mudar(o.v)}>{o.t}</button>)}
    </div>
  );
}

// O período das telas de dinheiro: atalhos e datas livres. Devolve o intervalo em dias inteiros do horário de quem olha
// (o "ate" é a meia-noite do dia seguinte); sem as duas datas no personalizado, null.
const ATALHOS_PERIODO = [{ id: 'hoje', t: 'Hoje' }, { id: '7', t: '7 dias' }, { id: '15', t: '15 dias' }, { id: '30', t: '30 dias' }, { id: '60', t: '60 dias' }, { id: '90', t: '90 dias' }, { id: 'livre', t: 'Personalizado' }];
export type Periodo = { id: string; de: string; ate: string };
export function faixaDoPeriodo(p: Periodo): { de: string; ate: string } | null {
  const dia = (a: number, m: number, d: number) => new Date(a, m, d).toISOString();
  if (p.id === 'livre') {
    if (!p.de || !p.ate || p.de > p.ate) return null;
    const [a1, m1, d1] = p.de.split('-').map(Number);
    const [a2, m2, d2] = p.ate.split('-').map(Number);
    return { de: dia(a1, m1 - 1, d1), ate: dia(a2, m2 - 1, d2 + 1) };
  }
  const h = new Date();
  const voltar = p.id === 'hoje' ? 0 : Number(p.id) - 1;
  return { de: dia(h.getFullYear(), h.getMonth(), h.getDate() - voltar), ate: dia(h.getFullYear(), h.getMonth(), h.getDate() + 1) };
}
export function FiltroPeriodo({ valor, mudar }: { valor: Periodo; mudar: (p: Periodo) => void }) {
  return <>
    <div className="chips" role="group" aria-label="Período">
      {ATALHOS_PERIODO.map((o) => <button key={o.id} type="button" className={`chip ${valor.id === o.id ? 'ativo' : ''}`} aria-pressed={valor.id === o.id} onClick={() => mudar({ ...valor, id: o.id })}>{o.t}</button>)}
    </div>
    {valor.id === 'livre' && (
      <div className="periodo-livre">
        <label>De <input type="date" value={valor.de} max={valor.ate || undefined} onChange={(e) => mudar({ ...valor, de: e.target.value })} /></label>
        <label>Até <input type="date" value={valor.ate} min={valor.de || undefined} onChange={(e) => mudar({ ...valor, ate: e.target.value })} /></label>
      </div>
    )}
  </>;
}

// Colunas de uma série só (a cor da marca). Passe o mouse ou toque para ver o valor de cada dia.
// formatar: para números que não são dinheiro (ex.: cliques do Google na tela SEO).
export function Colunas({ itens, moeda = 'brl', formatar, nome = 'Vendas' }: { itens: { rotulo: string; valor: number; detalhe: string }[]; moeda?: string; formatar?: (n: number) => string; nome?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(1, ...itens.map((i) => i.valor));
  const passo = Math.ceil(itens.length / 6);
  const f = formatar || ((n: number) => dinheiro(n, moeda));
  return (
    <div className="colunas-grafico" onMouseLeave={() => setAtivo(null)}>
      <div className="colunas-area" role="img" aria-label={`${nome}: maior valor ${f(max)}`}>
        {itens.map((i, n) => (
          <button key={n} type="button" className={`coluna ${ativo === n ? 'ativa' : ''}`} onMouseEnter={() => setAtivo(n)} onFocus={() => setAtivo(n)} onClick={() => setAtivo(n)} aria-label={i.detalhe}>
            <span style={{ height: i.valor ? `${Math.max(3, (i.valor / max) * 100)}%` : 0 }} />
          </button>
        ))}
      </div>
      <div className="colunas-eixo">{itens.map((i, n) => <span key={n}>{n % passo === 0 ? i.rotulo : ''}</span>)}</div>
      <p className="colunas-dica" aria-live="polite">{ativo === null ? `Maior dia: ${f(max)}` : itens[ativo].detalhe}</p>
    </div>
  );
}

// A moeda do faturamento (Vendas e Números): real ou dólar (o curso em inglês). Um por vez: os dois nunca somam juntos.
export function FiltroMoeda({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  const opcoes = [{ v: 'brl', t: 'Real (R$)' }, { v: 'usd', t: 'Dólar (US$)' }];
  return (
    <div className="chips" role="group" aria-label="Moeda">
      {opcoes.map((o) => <button key={o.v} type="button" className={`chip ${valor === o.v ? 'ativo' : ''}`} aria-pressed={valor === o.v} onClick={() => mudar(o.v)}>{o.t}</button>)}
    </div>
  );
}

// Um post da conta com os números. A nota é o engajamento ponderado (comentário vale 3, salvo e compartilhamento valem 2).
export function LinhaPost({ p, rede = 'instagram' }: { p: any; rede?: string }) {
  return (
    <div className="post">
      {p.miniatura_url ? <img className="post-mini" src={p.miniatura_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
        : <span className="post-mini"><ImageOff /></span>}
      <div className="post-texto">
        <p className="post-legenda">{limparLegenda(p.legenda) || 'Sem legenda'}</p>
        <div className="metricas">
          <span title="Curtidas"><Heart /><b>{compacto(p.curtidas)}</b></span>
          <span title="Comentários"><MessageCircle /><b>{compacto(p.comentarios)}</b></span>
          {p.salvos != null && <span title="Salvos"><Bookmark /><b>{compacto(p.salvos)}</b></span>}
          {p.compartilhamentos != null && <span title="Compartilhamentos"><Send /><b>{compacto(p.compartilhamentos)}</b></span>}
          {p.alcance != null && <span title="Alcance (contas que viram)"><Eye /><b>{compacto(p.alcance)}</b></span>}
        </div>
        <div className="post-meta">
          <span>{FORMATOS[p.formato] || p.formato || 'Post'} · {data(p.publicado_em)}</span>
          {p.palavra_chave && <Etiqueta cor="laranja">Comenta {p.palavra_chave}</Etiqueta>}
          {p.vendas ? <Etiqueta cor="verde">{p.vendas} {p.vendas === 1 ? 'venda' : 'vendas'} · {(p.vendas_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Etiqueta> : null}
          {p.nota != null && <span className="nota" title={p.alcance != null ? 'Engajamento sobre o alcance' : 'Engajamento sobre os seguidores (sem alcance medido)'}>{porcento(p.nota)}</span>}
          {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">ver no {REDES[rede]?.t || rede}<ExternalLink /></a>}
        </div>
      </div>
    </div>
  );
}

// Calor de 0 a 100: a cor muda com a temperatura.
export function Calor({ v }: { v: number }) {
  const classe = v >= 75 ? 'fervendo' : v >= 55 ? 'quente' : v >= 35 ? '' : 'morno';
  return <span className={`calor ${classe}`} title="Calor: força da pauta, quão recente é e quantas fontes falam do mesmo assunto">{v}</span>;
}

// Barras horizontais simples (formato, tema, horário).
export function Barras({ itens, valor, rotulo, detalhe }: { itens: any[]; valor: (i: any) => number; rotulo: (i: any) => string; detalhe: (i: any) => string }) {
  const max = Math.max(0.0001, ...itens.map((i) => Number(valor(i)) || 0));
  return (
    <div className="barras">
      {itens.map((i, n) => (
        <div className="barra-item" key={n}>
          <span>{rotulo(i)}</span>
          <span className="barra-fundo"><span className="barra-cheia" style={{ width: `${Math.max(3, ((Number(valor(i)) || 0) / max) * 100)}%` }} /></span>
          <small>{detalhe(i)}</small>
        </div>
      ))}
    </div>
  );
}

export function EtiquetaPeca({ status }: { status: string }) {
  const s = STATUS_PECA[status] || { t: status, cor: 'cinza' };
  return <Etiqueta cor={s.cor}>{s.t}</Etiqueta>;
}

export function EtiquetaConteudo({ status }: { status: string }) {
  const s = STATUS_CONTEUDO[status] || { t: status, cor: 'cinza' };
  return <Etiqueta cor={s.cor}>{s.t}</Etiqueta>;
}

export function NomeRede({ rede }: { rede: string }) {
  const r = REDES[rede] || { t: rede, cor: '#888' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="ponto-rede" style={{ background: r.cor }} />{r.t}</span>;
}

const ICONE_PECA: Record<string, any> = {
  rascunho: <CircleDashed />, aprovado: <CheckCircle2 />, agendado: <CalendarClock />, publicando: <Send />, publicado: <CheckCircle2 />, erro: <AlertTriangle />, cancelado: <XCircle />,
};

export function LinhaPeca({ p }: { p: any }) {
  const rede = REDES[p.rede] || { t: p.rede };
  const quando = p.status === 'publicado' ? `Publicada ${dataHora(p.publicado_em)}` : p.status === 'agendado' || p.status === 'publicando' ? `Agendada para ${dataHora(p.agendado_para)}`
    : p.status === 'erro' ? (p.erro || 'Falhou ao publicar') : `Mexida ${haQuanto(p.atualizado_em || p.criado_em)}`;
  return (
    <Celula para={`/posts/${p.id}`} icone={ICONE_PECA[p.status] || <CircleDashed />} cor={p.status === 'erro' ? 'vermelho' : undefined} corHex={p.status === 'erro' ? undefined : REDES[p.rede]?.cor}
      titulo={p.titulo || (p.legenda ? String(p.legenda).split('\n')[0] : 'Peça sem título')}
      sub={`${rede.t} · ${FORMATOS[p.formato] || p.formato} · ${quando}`}
      direita={<span className="etiquetas-juntas"><EtiquetaPerfil perfil={p.perfil} /><EtiquetaPeca status={p.status} /></span>} />
  );
}

export function textoEvento(e: any) {
  const acao = ACOES_HISTORICO[e.acao] || e.acao;
  return acao;
}

// "recursos:<uuid>" vira "recurso" com link para a tela dele; o código interno nunca aparece.
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const ALVOS: Record<string, { t: string; para?: (id: string) => string }> = {
  recursos: { t: 'recurso', para: (id) => `/conteudo/recursos/${id}` },
  artigos: { t: 'novidade', para: (id) => `/conteudo/artigos/${id}` },
  pecas: { t: 'peça', para: (id) => `/posts/${id}` },
  landing_pages: { t: 'landing page', para: (id) => `/cursos/landing-pages/${id}` },
  produtos: { t: 'produto' }, anuncios: { t: 'anúncio' }, pautas: { t: 'pauta' }, equipe: { t: 'pessoa da equipe' },
  chave: { t: 'chave do Claude' }, config: { t: 'configuração' }, midia: { t: 'imagem' },
  gatilhos: { t: 'palavra do Comenta X', para: () => '/comenta' }, radar: { t: 'radar' }, desempenho: { t: 'desempenho' },
};
function Alvo({ alvo, detalhes }: { alvo: string; detalhes: any }) {
  const [tipo, id = ''] = String(alvo).split(/:(.*)/s);
  if (tipo === 'rede') return <span className="mudo">{REDES[id] ? REDES[id].t : id}</span>;
  if (tipo === 'pecas' && !id) return <span className="mudo">{detalhes && detalhes.quantas ? `${detalhes.quantas} ${detalhes.quantas === 1 ? 'peça' : 'peças'}` : 'peças'}</span>;
  const a = ALVOS[tipo];
  if (!a) return <span className="mudo">{tipo}</span>;
  if (!UUID.test(id)) return <span className="mudo">{tipo === 'recursos' || tipo === 'midia' ? 'arquivo' : a.t}</span>;
  return a.para ? <Link para={a.para(id)} className="mudo">{a.t}</Link> : <span className="mudo">{a.t}</span>;
}

export function LinhaEvento({ e }: { e: any }) {
  return (
    <div className="evento">
      <span className="evento-quando">{dataHora(e.quando)}</span>
      <span className="evento-texto">
        <b>{e.quem || 'Sistema'}</b> {textoEvento(e).toLowerCase()}{e.alvo ? <> · <Alvo alvo={e.alvo} detalhes={e.detalhes} /></> : null}
        {e.via && e.via !== 'painel' && <small>pelo {e.via === 'mcp' ? 'Claude' : e.via}</small>}
      </span>
    </div>
  );
}
