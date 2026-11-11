// A aba Colmeia do app do celular, em quatro partes como a tela grande: Esperando você (aprovar ou descartar o que os
// agentes e o Treino propuseram, e responder a pergunta do Conciliador), O que ela sabe (busca no que está valendo),
// Ensinar (o formulário curto) e o Treino (a conversa de ensaio, que já é um chat). Mesmos dados e mesmas ações da tela
// Colmeia (GET /colmeia, POST /colmeia e POST /colmeia/:id). Aprovar aqui vale na hora para os vendedores, igual lá.
import { useState } from 'react';
import { Check, Search, Send, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, ErroCarga, Etiqueta, avisar, useSessao } from '../nucleo/ui';
import { Secao, SemRede, Trecho, estiloCor, useGuardado } from './CelularBase';
import Treino from './ColmeiaTreino';

const ORDEM_TIPOS = ['resposta', 'regra', 'objecao', 'produto', 'vendeu', 'nao_vendeu'];
// O que o dono ensina (lição de vendedor nasce dos agentes, não daqui).
const ENSINA: [string, string][] = [['resposta', 'Pergunta ou situação'], ['regra', 'Regra de comportamento'], ['objecao', 'Objeção'], ['produto', 'Fato do produto']];
const NOVO = { tipo: 'resposta', modo: 'frase', produto: 'geral', titulo: '', texto: '' };

export default function CelularColmeia({ versao, mudou }: { versao: number; mudou: () => void }) {
  const { pode } = useSessao();
  const podeEditar = pode('colmeia.editar');
  const { dados, erro, recarregar } = useGuardado<any>('colmeia', () => get('/colmeia'), [versao]);
  const d: any = dados;
  const [aba, setAba] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [f, setF] = useState({ ...NOVO });

  if (!d) return erro ? <ErroCarga erro={erro} tentar={recarregar} /> : <Carregando />;

  const nomes = d.nomes || { tipos: {}, produtos: {}, modos: {} };
  const itens: any[] = d.itens || [];
  const propostas = itens.filter((i) => i.status === 'proposta');
  const ativos = itens.filter((i) => i.status === 'ativa');
  const atual = aba || (propostas.length ? 'espera' : 'sabe');
  const termo = busca.trim().toLowerCase();
  const achados = termo ? ativos.filter((i) => `${i.titulo} ${i.texto}`.toLowerCase().includes(termo)) : ativos;

  const decidir = async (i: any, status: 'ativa' | 'arquivada') => {
    setOcupado(i.id);
    try {
      await post(`/colmeia/${i.id}`, { status });
      avisar(status === 'ativa' ? 'Está valendo. Os vendedores já usam.' : 'Descartado. Não entra na Colmeia.');
      await recarregar();
      mudou();
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setOcupado('');
  };
  const responder = async (i: any, texto: string) => {
    setOcupado(i.id);
    let ok = false;
    try {
      const r: any = await post(`/colmeia/${i.id}`, { responder: texto });
      avisar(r?.aviso || (r?.ajustou ? 'O Conciliador reescreveu o item com a sua resposta. Confira e aprove.' : 'Resposta anotada.'));
      await recarregar();
      ok = true;
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setOcupado('');
    return ok;
  };
  const ensinar = async () => {
    if (!f.titulo.trim() || !f.texto.trim()) { avisar('Diga quando isso vale e o que o vendedor fala ou faz.', 'erro'); return; }
    setOcupado('ensinar');
    try {
      await post('/colmeia', { tipo: f.tipo, modo: f.modo, produto: f.produto, titulo: f.titulo.trim(), texto: f.texto.trim() });
      avisar('Ensinado. Já está valendo para os vendedores.');
      setF({ ...NOVO });
      await recarregar();
      setAba('sabe');
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setOcupado('');
  };
  const cartao = (i: any) => <Cartao key={i.id} i={i} nomes={nomes} podeEditar={podeEditar} decidir={decidir} responder={responder} ocupado={ocupado === i.id} />;

  const ABAS = [{ id: 'espera', t: 'Esperando você', n: propostas.length }, { id: 'sabe', t: 'O que ela sabe', n: 0 }, ...(podeEditar ? [{ id: 'ensinar', t: 'Ensinar', n: 0 }, { id: 'treino', t: 'Treino', n: 0 }] : [])];

  return <>
    <SemRede erro={erro} tentar={recarregar} />
    <div className="cel-sub" role="tablist" aria-label="Partes da Colmeia" data-sem-puxar>
      {ABAS.map((a) => <button key={a.id} type="button" role="tab" aria-selected={atual === a.id} className={atual === a.id ? 'ativo' : ''} onClick={() => setAba(a.id)}>{a.t}{a.n > 0 && <b>{a.n}</b>}</button>)}
    </div>

    {atual === 'espera' && <>
      {propostas.length === 0 && <p className="cel-quieto">Nada esperando o seu sim. O que os agentes, o Conciliador e o Treino propuserem aparece aqui.</p>}
      {propostas.map(cartao)}
    </>}

    {atual === 'sabe' && <>
      <label className="cel-busca"><Search /><input type="search" placeholder="Buscar no que ela sabe" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar na Colmeia" enterKeyHint="search" /></label>
      <p className="cel-dica">{achados.length} {achados.length === 1 ? 'item valendo' : 'itens valendo'}{termo ? ' com essa busca' : ''}. É o que todo vendedor lê antes de falar.</p>
      {ORDEM_TIPOS.map((tipo) => {
        const doTipo = achados.filter((i) => i.tipo === tipo);
        if (!doTipo.length) return null;
        return (
          <Secao key={tipo} titulo={nomes.tipos[tipo] || tipo} lado={<b className="cel-conta suave">{doTipo.length}</b>}>
            <div className="cel-lista">
              {doTipo.map((i) => (
                <details key={i.id} className="cel-item">
                  <summary><strong>{i.titulo}</strong><small>{nomes.produtos[i.produto] || i.produto}{i.modo ? ` · ${nomes.modos[i.modo]}` : ''}{i.usos ? ` · usado ${i.usos} ${i.usos === 1 ? 'vez' : 'vezes'}` : ''}{i.vendas ? ` · ${i.vendas} ${i.vendas === 1 ? 'venda' : 'vendas'}` : ''}</small></summary>
                  <div><Texto i={i} /></div>
                </details>
              ))}
            </div>
          </Secao>
        );
      })}
    </>}

    {atual === 'ensinar' && podeEditar && (
      <div className="cel-form">
        <Escolher rotulo="O que você quer ensinar" opcoes={ENSINA} valor={f.tipo} mudar={(v) => setF({ ...f, tipo: v })} />
        <Campo rotulo="Quando" valor={f.titulo} mudar={(v) => setF({ ...f, titulo: v })} placeholder="Ex.: Perguntou se o acesso é para sempre" dica="A pergunta da pessoa ou a situação em que isso vale." />
        <Escolher rotulo="Como você quer ensinar" opcoes={[['frase', 'Frase pronta'], ['explicacao', 'Explicação']]} valor={f.modo} mudar={(v) => setF({ ...f, modo: v })} />
        <AreaTexto rotulo={f.modo === 'frase' ? 'O vendedor fala assim' : 'O vendedor faz assim'} valor={f.texto} mudar={(v) => setF({ ...f, texto: v })} linhas={5}
          placeholder={f.modo === 'frase' ? 'As suas palavras. Cada linha é uma mensagem.' : 'Explique o que fazer. O vendedor escreve do jeito dele.'}
          dica={f.modo === 'frase' ? 'O vendedor usa exatamente estas palavras.' : 'Você diz o que fazer e o vendedor escolhe as palavras.'} />
        <Escolher rotulo="Vale para" opcoes={Object.entries(nomes.produtos || {}) as [string, string][]} valor={f.produto} mudar={(v) => setF({ ...f, produto: v })} />
        <button type="button" className="bt bt-tinta cel-largo" disabled={ocupado === 'ensinar'} onClick={ensinar}><Check />{ocupado === 'ensinar' ? 'Salvando…' : 'Ensinar'}</button>
        <p className="cel-dica">O que você ensina aqui vale na hora. O que vem de agente espera o seu sim.</p>
      </div>
    )}

    {atual === 'treino' && podeEditar && <div className="cel-treino" data-sem-puxar><Treino itens={ativos} podeEditar={podeEditar} cartao={cartao} recarregarColmeia={recarregar} /></div>}
  </>;
}

function Escolher({ rotulo, opcoes, valor, mudar }: { rotulo: string; opcoes: [string, string][]; valor: string; mudar: (v: string) => void }) {
  return (
    <div className="cel-escolher">
      <span>{rotulo}</span>
      <div className="chips soltos" role="group" aria-label={rotulo}>
        {opcoes.map(([id, t]) => <button key={id} type="button" className={`chip ${valor === id ? 'ativo' : ''}`} aria-pressed={valor === id} onClick={() => mudar(id)}>{t}</button>)}
      </div>
    </div>
  );
}

// O texto do item do jeito que o vendedor lê: frase pronta em balões (uma mensagem por linha), explicação em texto.
function Texto({ i }: { i: any }) {
  if (i.modo === 'frase') return <div className="cel-frases">{String(i.texto || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l, k) => <span key={k}>{l}</span>)}</div>;
  return <Trecho texto={i.texto} linhas={8} />;
}

function Cartao({ i, nomes, podeEditar, decidir, responder, ocupado }: { i: any; nomes: any; podeEditar: boolean; decidir: (i: any, s: 'ativa' | 'arquivada') => void; responder: (i: any, t: string) => Promise<boolean>; ocupado: boolean }) {
  const [fala, setFala] = useState('');
  const troca: any[] = Array.isArray(i.substitui) ? i.substitui.filter(Boolean) : [];
  const proposta = i.status === 'proposta';
  const mandar = async () => { if (fala.trim() && (await responder(i, fala.trim()))) setFala(''); };
  return (
    <article className="cel-prop" style={estiloCor('var(--verde)')}>
      <div className="cel-linha-meta"><Etiqueta cor="verde">{nomes.tipos[i.tipo] || i.tipo}</Etiqueta>{nomes.produtos[i.produto] || i.produto}{i.modo ? ` · ${nomes.modos[i.modo]}` : ''}{i.autor ? ` · de ${i.autor}` : ''}</div>
      <p className="cel-rotulo">Quando</p>
      <h3>{i.titulo}</h3>
      <p className="cel-rotulo">{i.modo === 'frase' ? 'O vendedor fala assim' : 'O vendedor faz assim'}</p>
      <Texto i={i} />
      {i.porque && <><p className="cel-rotulo">Por quê</p><Trecho texto={i.porque} linhas={3} /></>}
      {troca.length > 0 && <p className="cel-troca">{troca.length === 1 ? 'Entra no lugar de: ' : 'Junta estes itens e fica no lugar deles: '}{troca.map((s: any) => `“${s.titulo}”`).join(', ')}</p>}
      {proposta && podeEditar && i.pergunta && (
        <div className="cel-pergunta">
          <strong>{i.pergunta}</strong>
          <textarea className="cel-recado" rows={2} placeholder="Sua resposta. O item é reescrito com ela." value={fala} onChange={(e) => setFala(e.target.value)} aria-label="Resposta à pergunta do Conciliador" />
          <button type="button" className="bt" disabled={!fala.trim() || ocupado} onClick={mandar}><Send />Responder a pergunta</button>
        </div>
      )}
      {proposta && podeEditar && (
        <div className="cel-decidir dois">
          <button type="button" className="bt bt-perigo" disabled={ocupado} onClick={() => decidir(i, 'arquivada')}><X />Descartar</button>
          <button type="button" className="bt bt-tinta" disabled={ocupado} onClick={() => decidir(i, 'ativa')}><Check />{troca.length ? 'Aprovar e trocar' : 'Aprovar'}</button>
        </div>
      )}
    </article>
  );
}
