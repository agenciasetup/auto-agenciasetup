// Em alta: o radar (25 fontes de IA e design) com o calor de cada pauta, o ângulo e o formato sugeridos,
// e as pautas guardadas (do radar que viraram conteúdo, ou anotadas por alguém). Texto de fora é só referência.
import { useEffect, useState } from 'react';
import { Check, ExternalLink, Flame, Lightbulb, Plus, RefreshCw, Save, X } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Abas, AreaTexto, BotaoCopiar, Campo, Carregando, Celula, ErroCarga, Etiqueta, Grupo, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FERRAMENTA, FORMATOS, TIPO_PAUTA, haQuanto, listaDeTexto } from '../nucleo/util';
import { Calor } from './comum';
import { VideosVirais } from './VideosVirais';

export default function Pautas() {
  const { rota, ir } = useRota();
  const daRota = rota.busca.get('aba');
  const [aba, setAba] = useState(daRota === 'guardadas' || daRota === 'videos' ? daRota : 'alta');
  useEffect(() => { document.title = 'Em alta | Painel Agência Setup'; }, []);
  const trocar = (a: string) => { setAba(a); ir(`/pautas${a === 'alta' ? '' : `?aba=${a}`}`, { trocar: true }); };
  return (
    <div className="tela">
      <Titulo titulo="Em alta" sub="O que está quente agora em IA e design, lido de 25 fontes. Texto de fora é só referência." />
      <Abas abas={[{ id: 'alta', t: 'Em alta agora' }, { id: 'videos', t: 'Vídeos fora da curva' }, { id: 'guardadas', t: 'Pautas guardadas' }]} atual={aba} mudar={trocar} />
      {aba === 'alta' ? <EmAlta /> : aba === 'videos' ? <VideosVirais /> : <Guardadas />}
    </div>
  );
}

// O pedido pronto para colar no Claude: ele já sabe o resto do fluxo (material grátis + Comenta X).
const pedido = (p: any) => [
  `Quero um post sobre isto que está em alta: "${p.titulo}"${p.fonte_url ? ` (${p.fonte_url})` : ''}.`,
  p.angulo ? `Ângulo sugerido: ${p.angulo}` : '',
  p.formato_sugerido ? `Formato: ${FORMATOS[p.formato_sugerido] || p.formato_sugerido}.` : '',
  'Siga o fluxo da Agência Setup: veja ver_desempenho, crie o material grátis no site e a peça com "Comenta PALAVRA".',
].filter(Boolean).join('\n');

function EmAlta() {
  const { pode } = useSessao();
  const [horas, setHoras] = useState(48);
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/em-alta?horas=${horas}&limite=40`), [horas]);
  const { ocupado, rodar } = useAcao();
  const podeEditar = pode('pautas.editar');

  const atualizar = () => rodar('radar', async () => {
    const r = await post('/em-alta/atualizar');
    recarregar();
    return r;
  }, 'Radar atualizado.');
  const marcar = (id: string, status: string) => rodar(id, async () => {
    await patch(`/pautas/${id}`, { status });
    setDados((d: any) => ({ ...d, pautas: d.pautas.filter((p: any) => p.id !== id) }));
  }, status === 'aproveitada' ? 'Guardada em pautas aproveitadas.' : 'Pauta descartada.');

  const comErro = (dados?.fontes || []).filter((f: any) => f.ultimo_erro);
  return <>
    <div className="filtros">
      <div className="chips">{[{ h: 24, t: '24 horas' }, { h: 48, t: '48 horas' }, { h: 168, t: '7 dias' }].map((x) => <button key={x.h} className={`chip ${horas === x.h ? 'ativo' : ''}`} onClick={() => setHoras(x.h)}>{x.t}</button>)}</div>
      {podeEditar && <button className="bt" disabled={!!ocupado} onClick={atualizar} style={{ marginLeft: 'auto' }}><RefreshCw className={ocupado === 'radar' ? 'girar' : ''} />{ocupado === 'radar' ? 'Lendo fontes…' : 'Atualizar agora'}</button>}
    </div>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && <>
      {dados.assuntos?.length > 0 && (
        <Grupo titulo="Assuntos do momento" rodape="Ferramentas mais citadas no período. Quanto mais fontes falam, mais quente.">
          <div className="assuntos">{dados.assuntos.map((a: any) => <span className="assunto" key={a.ferramenta}>{FERRAMENTA[a.ferramenta] || a.ferramenta}<span>{a.mencoes} · {a.fontes} {a.fontes === 1 ? 'fonte' : 'fontes'}</span></span>)}</div>
        </Grupo>
      )}
      <Grupo titulo="Pautas quentes">
        {dados.pautas?.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.pautas.map((p: any) => (
          <article className="pauta" key={p.id}>
            <Calor v={p.calor} />
            <div style={{ minWidth: 0 }}>
              <h3>{p.fonte_url ? <a href={p.fonte_url} target="_blank" rel="noopener noreferrer">{p.titulo}</a> : p.titulo}</h3>
              <div className="post-meta" style={{ marginTop: 6 }}>
                <span>{p.fonte_nome} · {haQuanto(p.publicado_na_fonte || p.criado_em)}</span>
                {TIPO_PAUTA[p.tipo] && <Etiqueta cor={TIPO_PAUTA[p.tipo].cor}>{TIPO_PAUTA[p.tipo].t}</Etiqueta>}
                {(p.ferramentas || []).slice(0, 3).map((f: string) => <Etiqueta key={f}>{FERRAMENTA[f] || f}</Etiqueta>)}
                {p.sinais?.pontos ? <span>{p.sinais.pontos} pontos no HN</span> : null}
                {p.sinais?.estrelas ? <span>{p.sinais.estrelas} estrelas</span> : null}
              </div>
              {p.angulo && <p className="angulo"><b>{FORMATOS[p.formato_sugerido] || 'Ideia'}:</b> {p.angulo}</p>}
              <div className="pauta-acoes">
                <BotaoCopiar texto={pedido(p)} rotulo="Copiar pedido para o Claude" classe="bt bt-mini bt-tinta" />
                {podeEditar && <>
                  <button className="bt bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'aproveitada')} title="Já virou conteúdo"><Check />Virou conteúdo</button>
                  <button className="bt bt-texto bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'descartada')}><X />Descartar</button>
                </>}
              </div>
            </div>
          </article>
        ))}</div> : <Vazio icone={<Flame />} titulo="Nada quente neste período" texto="O relógio lê as fontes a cada 20 minutos. Toque em Atualizar agora para ler algumas na hora." />}
      </Grupo>
      <Grupo titulo={`Fontes do radar${comErro.length ? ` · ${comErro.length} com problema` : ''}`} rodape="O relógio lê as que estão há mais tempo sem leitura. Fonte que recusa leitura fica marcada e tenta de novo depois.">
        <div style={{ margin: '-14px -18px -18px' }}>
          {(dados.fontes || []).map((f: any) => (
            <Celula key={f.id} titulo={f.nome} sub={f.ultimo_erro ? `Não leu: ${f.ultimo_erro}` : f.lido_em ? `Lida ${haQuanto(f.lido_em)}` : 'Ainda não lida'}
              direita={f.ultimo_erro ? <Etiqueta cor="vermelho">Com problema</Etiqueta> : f.lido_em ? <Etiqueta cor="verde">{f.itens} {f.itens === 1 ? 'pauta' : 'pautas'}</Etiqueta> : <Etiqueta>Na fila</Etiqueta>} />
          ))}
        </div>
      </Grupo>
    </>}
  </>;
}

function Guardadas() {
  const { pode } = useSessao();
  const [status, setStatus] = useState('aproveitada');
  const [nova, setNova] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  // "Anotadas" são as pautas novas que alguém guardou à mão; as novas do radar ficam em "Em alta agora".
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/pautas?status=${status}${status === 'nova' ? '&manuais=1' : ''}`), [status]);
  const podeEditar = pode('pautas.editar');

  const marcar = (id: string, s: string) => rodar(id, async () => {
    await patch(`/pautas/${id}`, { status: s });
    setDados((l: any) => l.filter((x: any) => x.id !== id));
  }, s === 'aproveitada' ? 'Marcada como aproveitada.' : s === 'descartada' ? 'Pauta descartada.' : 'Pauta reaberta.');

  const criar = () => rodar('criar', async () => {
    if (!nova.titulo.trim()) throw new Error('Dê um título à pauta.');
    await post('/pautas', { titulo: nova.titulo, resumo: nova.resumo, fonte_url: nova.fonte_url, fonte_nome: nova.fonte_nome, tags: listaDeTexto(nova.tags) });
    setNova(null);
    if (status !== 'nova') setStatus('nova'); else recarregar();
  }, 'Pauta guardada.');

  return <>
    <div className="filtros">
      <div className="chips">
        {[{ s: 'aproveitada', t: 'Viraram conteúdo' }, { s: 'nova', t: 'Anotadas' }, { s: 'descartada', t: 'Descartadas' }].map((c) => <button key={c.s} className={`chip ${status === c.s ? 'ativo' : ''}`} onClick={() => setStatus(c.s)}>{c.t}</button>)}
      </div>
      {podeEditar && <button className="bt bt-tinta" style={{ marginLeft: 'auto' }} onClick={() => setNova({ titulo: '', resumo: '', fonte_url: '', fonte_nome: '', tags: '' })}><Plus />Nova pauta</button>}
    </div>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && (dados.length ? (
      <Grupo>
        {dados.map((p: any) => (
          <div className="celula" key={p.id} style={{ alignItems: 'flex-start' }}>
            <span className={`celula-icone ${p.status === 'nova' ? 'cor-ambar' : p.status === 'aproveitada' ? 'cor-verde' : ''}`}><Lightbulb /></span>
            <span className="celula-texto">
              <span className="celula-titulo" style={{ whiteSpace: 'normal' }}>{p.titulo}</span>
              {p.resumo && <span className="mudo" style={{ fontSize: 14, marginTop: 2 }}>{p.resumo}</span>}
              <span className="celula-sub" style={{ marginTop: 4 }}>
                {[p.fonte_nome, haQuanto(p.criado_em), (p.tags || []).join(', ')].filter(Boolean).join(' · ')}
                {p.fonte_url && <> · <a href={p.fonte_url} target="_blank" rel="noopener noreferrer">fonte <ExternalLink style={{ width: 12, height: 12, verticalAlign: '-1px' }} /></a></>}
              </span>
            </span>
            <span className="celula-direita" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {podeEditar && p.status === 'nova' && <>
                <button className="bt bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'aproveitada')} title="Já virou conteúdo"><Check />Aproveitada</button>
                <button className="bt bt-texto bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'descartada')}><X />Descartar</button>
              </>}
              {podeEditar && p.status !== 'nova' && <button className="bt bt-texto bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'nova')}>Reabrir</button>}
            </span>
          </div>
        ))}
      </Grupo>
    ) : <Vazio icone={<Lightbulb />} titulo={status === 'aproveitada' ? 'Nenhuma pauta aproveitada ainda.' : 'Nada por aqui.'}
      texto="Pauta do radar que virou conteúdo vem para cá. Dá para anotar uma ideia também, ou pedir ao Claude para guardar." />)}

    <Modal titulo="Nova pauta" aberto={!!nova} fechar={() => setNova(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setNova(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={criar}><Save />Guardar</button></>}>
      {nova && <>
        <Campo rotulo="Título" valor={nova.titulo} mudar={(v) => setNova({ ...nova, titulo: v })} autoFocus />
        <AreaTexto rotulo="Resumo" valor={nova.resumo} mudar={(v) => setNova({ ...nova, resumo: v })} linhas={3} />
        <div className="linha-campos">
          <Campo rotulo="Fonte" valor={nova.fonte_nome} mudar={(v) => setNova({ ...nova, fonte_nome: v })} placeholder="Nome do site" />
          <Campo rotulo="Endereço da fonte" valor={nova.fonte_url} mudar={(v) => setNova({ ...nova, fonte_url: v })} placeholder="https://" />
        </div>
        <Campo rotulo="Tags" valor={nova.tags} mudar={(v) => setNova({ ...nova, tags: v })} dica="Separadas por vírgula." />
      </>}
    </Modal>
  </>;
}
