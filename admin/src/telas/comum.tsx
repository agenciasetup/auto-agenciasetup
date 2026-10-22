// Pedaços que mais de uma tela usa: etiquetas de status, linha de peça, linha de evento do histórico.
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Send, XCircle } from 'lucide-react';
import { Celula, Etiqueta } from '../nucleo/ui';
import { Link } from '../nucleo/roteador';
import { ACOES_HISTORICO, FORMATOS, REDES, STATUS_CONTEUDO, STATUS_PECA, dataHora, haQuanto } from '../nucleo/util';

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
const COR_PECA: Record<string, string> = { aprovado: 'azul', agendado: 'laranja', publicando: 'laranja', publicado: 'verde', erro: 'vermelho' };

export function LinhaPeca({ p }: { p: any }) {
  const rede = REDES[p.rede] || { t: p.rede };
  const quando = p.status === 'publicado' ? `Publicada ${dataHora(p.publicado_em)}` : p.status === 'agendado' || p.status === 'publicando' ? `Agendada para ${dataHora(p.agendado_para)}`
    : p.status === 'erro' ? (p.erro || 'Falhou ao publicar') : `Mexida ${haQuanto(p.atualizado_em || p.criado_em)}`;
  return (
    <Celula para={`/fila/${p.id}`} icone={ICONE_PECA[p.status] || <CircleDashed />} cor={COR_PECA[p.status]}
      titulo={p.titulo || (p.legenda ? String(p.legenda).split('\n')[0] : 'Peça sem título')}
      sub={`${rede.t} · ${FORMATOS[p.formato] || p.formato} · ${quando}`}
      direita={<EtiquetaPeca status={p.status} />} />
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
  pecas: { t: 'peça', para: (id) => `/fila/${id}` },
  landing_pages: { t: 'landing page', para: (id) => `/cursos/landing-pages/${id}` },
  produtos: { t: 'produto' }, anuncios: { t: 'anúncio' }, pautas: { t: 'pauta' }, equipe: { t: 'pessoa da equipe' },
  chave: { t: 'chave do Claude' }, config: { t: 'configuração' }, midia: { t: 'imagem' },
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
