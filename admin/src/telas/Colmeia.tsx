// A Colmeia de vendas: a base única que todo vendedor lê antes de falar (o Atendente do direct, os vendedores da
// tarefa do direct e quem escreve as mensagens do Comenta X). Aqui o dono ensina em português simples ("quando
// perguntarem isso, responda aquilo"), aprova o que os agentes propõem, vê o que entrou em mais respostas e em mais
// vendas, e testa como o Atendente responderia. Lógica em worker/lib/colmeia.js (migration 39).
// Item que o Conciliador escreveu para juntar itens que se contradiziam (migration 40) mostra quem ele juntou e tem o
// botão de desfazer: o item novo sai e os de antes voltam a valer.
import { useEffect, useState } from 'react';
import { Archive, Check, FlaskConical, Pencil, Plus, Search, Undo2, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { numero } from '../nucleo/util';

const COR: Record<string, string> = { resposta: 'verde', regra: 'ambar', objecao: 'laranja', produto: 'azul', vendeu: 'verde', nao_vendeu: 'vermelho' };
// O que o dono ensina à mão. O que vendeu e o que não vendeu vêm dos vendedores, com a prova.
const ENSINA = ['resposta', 'regra', 'objecao', 'produto'];
const QUANDO: Record<string, string> = {
  resposta: 'Quando perguntarem... (ex.: Serve pra quem tá começando?)',
  regra: 'Quando acontecer... (ex.: A pessoa só mandou áudio)',
  objecao: 'Quando disserem... (ex.: Tá caro)',
  produto: 'Sobre o que é (ex.: O que vem no mini curso)',
};
const FAZ: Record<string, string> = {
  resposta: 'Responda assim, no seu jeito de falar.',
  regra: 'O que o vendedor deve fazer.',
  objecao: 'Como responder, no seu jeito de falar.',
  produto: 'O que é verdade sobre o produto. Sem preço: o preço vem da oferta.',
};
const TEMPOS = [
  { v: '', t: 'É a primeira mensagem dela' },
  { v: '2', t: 'A conversa está acontecendo agora' },
  { v: '180', t: 'A última troca foi há 3 horas' },
  { v: '1500', t: 'A última troca foi ontem' },
];
const VAZIO = { id: '', tipo: 'resposta', produto: 'geral', titulo: '', texto: '' };

export default function Colmeia() {
  useEffect(() => { document.title = 'Colmeia | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const podeEditar = pode('colmeia.editar');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/colmeia'), []);
  const d: any = dados;
  const [f, setF] = useState<any>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const guardar = async () => {
    setSalvando(true);
    try {
      await post(f.id ? `/colmeia/${f.id}` : '/colmeia', { tipo: f.tipo, produto: f.produto, titulo: f.titulo, texto: f.texto });
      avisar(f.id ? 'Mudança salva. Já vale para todos os vendedores.' : 'Guardado na Colmeia. Já vale para todos os vendedores.');
      setF(VAZIO); recarregar();
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setSalvando(false);
  };
  const mudarStatus = async (id: string, status: string, ok: string, extra: Record<string, unknown> = {}) => {
    try { await post(`/colmeia/${id}`, { status, ...extra }); avisar(ok); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const editar = (i: any) => { setF({ id: i.id, tipo: i.tipo, produto: i.produto, titulo: i.titulo, texto: i.texto }); document.getElementById('col-ensinar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const termo = busca.trim().toLowerCase();
  const itens = (d?.itens || []).filter((i: any) => (!tipo || i.tipo === tipo) && (!termo || `${i.titulo} ${i.texto}`.toLowerCase().includes(termo)));
  const propostas = (d?.itens || []).filter((i: any) => i.status === 'proposta');

  return (
    <div className="tela">
      <Titulo titulo="Colmeia" sub="A base que todos os vendedores leem antes de falar. O que você ensina aqui vale na hora para o Atendente e para as rodadas do direct." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {d && (
        <div className="numeros">
          <div className="numero"><b>{numero(d.numeros.ativas)}</b><span>{d.numeros.ativas === 1 ? 'item valendo' : 'itens valendo'}</span></div>
          <div className={`numero ${d.numeros.propostas ? 'destaque' : ''}`}><b>{numero(d.numeros.propostas)}</b><span>{d.numeros.propostas === 1 ? 'proposta esperando você' : 'propostas esperando você'}</span></div>
        </div>
      )}

      {d && propostas.length > 0 && (
        <Grupo titulo="Esperando o seu sim" rodape="Sugestões dos agentes, junções de itens que se contradizem e respostas que você deu para uma pessoa só. Aprovou, passa a valer para todo mundo.">
          <div className="col-lista">
            {propostas.map((i: any) => <Item key={i.id} i={i} nomes={d.nomes} podeEditar={podeEditar} editar={editar} mudarStatus={mudarStatus} />)}
          </div>
        </Grupo>
      )}

      {d && podeEditar && (
        <div className="col-dois">
          <Grupo titulo={f.id ? 'Mudar um item' : 'Ensinar'} className="col-bloco">
            <div id="col-ensinar" className="col-form">
              <div className="col-chips" role="group" aria-label="O que você vai ensinar">
                {ENSINA.map((t) => <button key={t} type="button" className={`col-chip ${f.tipo === t ? 'col-chip-ativo' : ''}`} aria-pressed={f.tipo === t} onClick={() => setF({ ...f, tipo: t })}>{d.nomes.tipos[t]}</button>)}
              </div>
              <div className="campo">
                <label htmlFor="col-produto">Vale para</label>
                <select id="col-produto" value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })}>
                  {Object.entries(d.nomes.produtos).map(([k, v]) => <option key={k} value={k}>{k === 'geral' ? 'Qualquer conversa' : String(v)}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="col-titulo">{QUANDO[f.tipo] || 'Quando'}</label>
                <input id="col-titulo" type="text" maxLength={200} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="col-texto">{FAZ[f.tipo] || 'O que fazer'}</label>
                <textarea id="col-texto" rows={4} maxLength={1200} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} />
              </div>
              <div className="rec-acoes">
                <button type="button" className="bt bt-tinta" disabled={salvando || f.titulo.trim().length < 3 || f.texto.trim().length < 3} onClick={guardar}>{f.id ? <Check /> : <Plus />}{salvando ? 'Salvando' : f.id ? 'Salvar a mudança' : 'Guardar na Colmeia'}</button>
                {f.id && <button type="button" className="bt bt-texto" onClick={() => setF(VAZIO)}>Cancelar</button>}
              </div>
            </div>
          </Grupo>
          <Testar />
        </div>
      )}

      {d && (
        <Grupo titulo="O que está na Colmeia">
          <div className="col-filtros">
            <div className="col-chips" role="group" aria-label="Filtrar por tipo">
              <button type="button" className={`col-chip ${!tipo ? 'col-chip-ativo' : ''}`} aria-pressed={!tipo} onClick={() => setTipo('')}>Tudo</button>
              {Object.entries(d.nomes.tipos).map(([k, v]) => <button key={k} type="button" className={`col-chip ${tipo === k ? 'col-chip-ativo' : ''}`} aria-pressed={tipo === k} onClick={() => setTipo(k)}>{String(v)}</button>)}
            </div>
            <label className="col-busca"><Search /><input type="search" placeholder="Procurar na Colmeia" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Procurar na Colmeia" /></label>
          </div>
          {itens.filter((i: any) => i.status === 'ativa').length ? (
            <div className="col-lista">
              {itens.filter((i: any) => i.status === 'ativa').map((i: any) => <Item key={i.id} i={i} nomes={d.nomes} podeEditar={podeEditar} editar={editar} mudarStatus={mudarStatus} />)}
            </div>
          ) : <Vazio titulo="Nada aqui ainda" texto={tipo === 'vendeu' || tipo === 'nao_vendeu' ? 'Os vendedores anotam aqui o que funcionou e o que não funcionou nas conversas, com a prova.' : 'Use o bloco Ensinar para guardar o primeiro item.'} />}
        </Grupo>
      )}
    </div>
  );
}

function Item({ i, nomes, podeEditar, editar, mudarStatus }: { i: any; nomes: any; podeEditar: boolean; editar: (i: any) => void; mudarStatus: (id: string, status: string, ok: string, extra?: Record<string, unknown>) => void }) {
  const dono = i.origem === 'dono';
  const proposta = i.status === 'proposta';
  // Junção do Conciliador: o item guarda os itens que ele substitui.
  const juntou: any[] = Array.isArray(i.substitui) ? i.substitui : [];
  const juncao = juntou.length > 0;
  const quem = juncao
    ? `${i.autor || 'Conciliador'} ${proposta ? 'propôs juntar e espera o seu sim' : 'juntou'}`
    : dono ? (proposta ? `Você respondeu assim${i.autor ? ` (${i.autor})` : ''}. Vale para todo mundo?` : 'Você ensinou') : i.origem === 'agente' ? `Agente${i.autor ? `: ${i.autor}` : ''}` : 'Já estava no roteiro';
  return (
    <article className="col-item">
      <div className="col-item-topo">
        <Etiqueta cor={COR[i.tipo] || 'cinza'}>{nomes.tipos[i.tipo]}</Etiqueta>
        {i.produto !== 'geral' && <span className="mudo">{nomes.produtos[i.produto]}</span>}
      </div>
      <h3>{i.titulo}</h3>
      <p>{i.texto}</p>
      {juncao && (
        <p className="mudo col-prova">
          <b>{proposta ? 'Quero juntar estes itens:' : 'Juntei estes itens:'}</b>{' '}
          {juntou.map((s: any, k: number) => <span key={s.id || k}>{k > 0 ? ' · ' : ''}“{s.titulo}”</span>)}.{' '}
          {proposta ? 'Se você aprovar, eles são arquivados e este passa a valer no lugar.' : 'Eles estão arquivados. Se você desfizer a junção, eles voltam a valer e este sai.'}
        </p>
      )}
      {i.prova && <p className="mudo col-prova"><b>{juncao ? 'Por quê:' : 'Prova:'}</b> {i.prova}</p>}
      <div className="col-item-pe">
        <span className="mudo">{quem}{i.usos > 0 ? ` · entrou em ${numero(i.usos)} ${i.usos === 1 ? 'resposta' : 'respostas'}` : ''}{i.vendas > 0 ? ` · ${numero(i.vendas)} ${i.vendas === 1 ? 'venda depois' : 'vendas depois'}` : ''}</span>
        {podeEditar && (
          <span className="rec-acoes">
            {proposta && <button type="button" className="bt bt-mini bt-tinta" onClick={() => mudarStatus(i.id, 'ativa', juncao ? 'Junção aprovada. Os itens de antes foram arquivados e este já vale.' : 'Aprovado. Já vale para todos os vendedores.')}><Check />{juncao ? 'Aprovar a junção' : 'Aprovar'}</button>}
            {juncao && !proposta && <button type="button" className="bt bt-mini bt-texto" onClick={() => mudarStatus(i.id, 'arquivada', 'Junção desfeita. Os itens de antes voltaram a valer.', { desfazer: true })}><Undo2 />Desfazer a junção</button>}
            <button type="button" className="bt bt-mini bt-texto" onClick={() => editar(i)}><Pencil />Mudar</button>
            <button type="button" className="bt bt-mini bt-texto" onClick={() => mudarStatus(i.id, 'arquivada', proposta ? (juncao ? 'Proposta descartada. Os itens de antes continuam valendo.' : 'Proposta descartada.') : juncao ? 'Arquivado. Os itens de antes continuam arquivados.' : 'Arquivado. Os vendedores param de usar.')}>{proposta ? <X /> : <Archive />}{proposta ? 'Descartar' : 'Arquivar'}</button>
          </span>
        )}
      </div>
    </article>
  );
}

// Testar: o que o Atendente responderia agora, com a base do jeito que está. Não manda nada para ninguém.
function Testar() {
  const [texto, setTexto] = useState('');
  const [ha, setHa] = useState('');
  const [r, setR] = useState<any>(null);
  const [indo, setIndo] = useState(false);
  const testar = async () => {
    setIndo(true); setR(null);
    try { setR(await post('/followup/atendente/testar', { texto, ...(ha ? { ha_min: Number(ha) } : {}) })); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setIndo(false);
  };
  const NOME: Record<string, string> = { responder: 'Responderia', duvida: 'Mandaria a dúvida para você', nao_sei: 'Não entendeu', ignorar: 'Não responderia (não pede resposta)', erro: 'Deu erro' };
  return (
    <Grupo titulo="Testar o Atendente" className="col-bloco" rodape="Nada é enviado: é só para ver como ele responderia com a Colmeia de agora.">
      <div className="col-form">
        <div className="campo">
          <label htmlFor="col-teste">O que a pessoa mandaria (uma mensagem por linha)</label>
          <textarea id="col-teste" rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'oi\nquanto ta o curso de posts?'} />
        </div>
        <div className="campo">
          <label htmlFor="col-tempo">Momento da conversa</label>
          <select id="col-tempo" value={ha} onChange={(e) => setHa(e.target.value)}>{TEMPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}</select>
        </div>
        <button type="button" className="bt bt-tingido" disabled={indo || texto.trim().length < 2} onClick={testar}><FlaskConical />{indo ? 'Pensando' : 'Ver a resposta'}</button>
        {r && (
          <div className="col-resposta" aria-live="polite">
            <b>{NOME[r.classe] || r.classe}{r.espera ? ', avisando a pessoa que a resposta já vem' : ''}</b>
            {r.mensagens?.length > 0 && <div className="col-baloes">{r.mensagens.map((m: string, k: number) => <span key={k}>{m}</span>)}</div>}
            {r.motivo && <p className="mudo">{r.motivo}</p>}
          </div>
        )}
      </div>
    </Grupo>
  );
}
