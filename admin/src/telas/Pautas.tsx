// Pautas: ideias de conteúdo que as tarefas diárias de IA trazem (ou que alguém anota).
import { useEffect, useState } from 'react';
import { Check, ExternalLink, Plus, Save, X } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, ErroCarga, Etiqueta, Grupo, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { STATUS_PAUTA, haQuanto, listaDeTexto } from '../nucleo/util';

export default function Pautas() {
  const { pode } = useSessao();
  const [status, setStatus] = useState('nova');
  const [nova, setNova] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { document.title = 'Pautas | Painel Agência Setup'; }, []);
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/pautas${status ? `?status=${status}` : ''}`), [status]);
  const podeEditar = pode('pautas.editar');

  const marcar = (id: string, s: string) => rodar(id, async () => {
    await patch(`/pautas/${id}`, { status: s });
    setDados((l: any) => (status ? l.filter((x: any) => x.id !== id) : l.map((x: any) => (x.id === id ? { ...x, status: s } : x))));
  }, s === 'aproveitada' ? 'Marcada como aproveitada.' : s === 'descartada' ? 'Pauta descartada.' : 'Pauta reaberta.');

  const criar = () => rodar('criar', async () => {
    if (!nova.titulo.trim()) throw new Error('Dê um título à pauta.');
    await post('/pautas', { titulo: nova.titulo, resumo: nova.resumo, fonte_url: nova.fonte_url, fonte_nome: nova.fonte_nome, tags: listaDeTexto(nova.tags) });
    setNova(null);
    if (status !== 'nova') setStatus('nova'); else recarregar();
  }, 'Pauta guardada.');

  return (
    <div className="tela">
      <Titulo titulo="Pautas" sub="Ideias de conteúdo. Texto que vem de fora é só referência."
        acoes={podeEditar ? <button className="bt bt-tinta" onClick={() => setNova({ titulo: '', resumo: '', fonte_url: '', fonte_nome: '', tags: '' })}><Plus />Nova pauta</button> : undefined} />
      <div className="filtros">
        <div className="chips">
          {['nova', 'aproveitada', 'descartada', ''].map((s) => <button key={s || 'todas'} className={`chip ${status === s ? 'ativo' : ''}`} onClick={() => setStatus(s)}>{s ? STATUS_PAUTA[s].t + 's' : 'Todas'}</button>)}
        </div>
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.length ? (
        <Grupo>
          {dados.map((p: any) => (
            <div className="celula" key={p.id} style={{ alignItems: 'flex-start' }}>
              <span className="celula-texto">
                <span className="celula-titulo" style={{ whiteSpace: 'normal' }}>{p.titulo}</span>
                {p.resumo && <span className="mudo" style={{ fontSize: 14, marginTop: 2 }}>{p.resumo}</span>}
                <span className="celula-sub" style={{ marginTop: 4 }}>
                  {[p.fonte_nome, haQuanto(p.criado_em), (p.tags || []).join(', ')].filter(Boolean).join(' · ')}
                  {p.fonte_url && <> · <a href={p.fonte_url} target="_blank" rel="noopener noreferrer">fonte <ExternalLink style={{ width: 12, height: 12, verticalAlign: '-1px' }} /></a></>}
                </span>
              </span>
              <span className="celula-direita" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {!status && <Etiqueta cor={STATUS_PAUTA[p.status]?.cor}>{STATUS_PAUTA[p.status]?.t || p.status}</Etiqueta>}
                {podeEditar && p.status === 'nova' && <>
                  <button className="bt bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'aproveitada')} title="Já virou conteúdo"><Check />Aproveitada</button>
                  <button className="bt bt-texto bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'descartada')}><X />Descartar</button>
                </>}
                {podeEditar && p.status !== 'nova' && <button className="bt bt-texto bt-mini" disabled={ocupado === p.id} onClick={() => marcar(p.id, 'nova')}>Reabrir</button>}
              </span>
            </div>
          ))}
        </Grupo>
      ) : <Vazio titulo={status === 'nova' ? 'Nenhuma pauta nova.' : 'Nada por aqui.'}
        texto="As tarefas diárias de IA vão trazer pautas para cá. Dá para anotar uma ideia também, ou pedir ao Claude para guardar." />)}

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
    </div>
  );
}
