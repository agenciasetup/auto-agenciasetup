// A Colmeia de vendas: a base única que todo vendedor lê antes de falar (o Atendente do direct, os vendedores da
// tarefa do direct e quem escreve as mensagens do Comenta X). Lógica em worker/lib/colmeia.js (migrations 39, 40, 46).
// A tela tem quatro abas, uma coisa por vez (revisão de 10/11/2026, o dono achava tudo misturado):
// - O que ela sabe: os itens que valem, separados por jeito (perguntas, regras, produtos, o que os vendedores viram)
//   e, dentro, por produto. Cada item diz "Quando" e como foi ensinado: frase pronta ou explicação.
// - Ensinar: o formulário. A dúvida do dono era "escrevo a resposta exata ou explico o contexto?": agora ele escolhe
//   entre Frase pronta (o vendedor usa as palavras dele) e Explicação (o vendedor escreve do próprio jeito).
// - Treino: a conversa de ensaio entre duas pessoas do time, com Aprender, Salvar e Recomeçar (ColmeiaTreino.tsx).
// - Esperando você: o que os agentes, o Conciliador e o Treino propõem. Só aparece quando tem proposta.
// Item que juntou ou trocou outros (coluna substitui) mostra quem ele substituiu e tem o botão de desfazer.
// O que foi arquivado ou descartado não some: fica no bloco "Arquivados", fechado até a pessoa abrir.
import { useEffect, useState } from 'react';
import { Archive, Check, FlaskConical, Pencil, Plus, Search, Send, Undo2, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Abas, Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { haQuanto, numero } from '../nucleo/util';
import Treino from './ColmeiaTreino';

const COR: Record<string, string> = { resposta: 'verde', objecao: 'verde', regra: 'ambar', produto: 'azul', vendeu: 'verde', nao_vendeu: 'vermelho' };
// Os nomes da tela, mais simples que os do banco. Objeção é uma pergunta ou situação como as outras.
const NOME_TIPO: Record<string, string> = { resposta: 'Pergunta ou situação', objecao: 'Pergunta ou situação', regra: 'Regra de conversa', produto: 'Sobre o produto', vendeu: 'Vendeu', nao_vendeu: 'Não vendeu' };
const JEITOS = [
  { id: 'resposta', t: 'Perguntas e situações', tipos: ['resposta', 'objecao'] },
  { id: 'regra', t: 'Regras de conversa', tipos: ['regra'] },
  { id: 'produto', t: 'Sobre os produtos', tipos: ['produto'] },
  { id: 'licao', t: 'O que os vendedores viram', tipos: ['vendeu', 'nao_vendeu'] },
];
const ORDEM_PRODUTO = ['geral', 'posts', 'combo', 'videos', 'duvidas'];
// O que o dono ensina à mão. O que vendeu e o que não vendeu vêm dos vendedores, com a prova.
const ENSINA = ['resposta', 'objecao', 'regra', 'produto'];
const OQUE = [
  { v: 'resposta', t: 'Uma pergunta ou situação', d: 'Quando perguntarem ou acontecer algo, o que responder.' },
  { v: 'regra', t: 'Uma regra de conversa', d: 'Um jeito de agir que vale em toda conversa.' },
  { v: 'produto', t: 'Um fato do produto', d: 'Uma verdade sobre o produto, para ninguém inventar.' },
];
const COMO = [
  { v: 'frase', t: 'Frase pronta', d: 'Você escreve a resposta como mandaria. O vendedor usa as suas palavras.' },
  { v: 'explicacao', t: 'Explicação', d: 'Você explica o que fazer, como para alguém novo no time. O vendedor escreve do jeito dele.' },
];
const QUANDO: Record<string, { r: string; ex: string }> = {
  resposta: { r: 'Quando isso vale', ex: 'Ex.: Perguntou se serve pra quem tá começando' },
  regra: { r: 'Quando isso vale', ex: 'Ex.: A pessoa só mandou áudio' },
  produto: { r: 'Sobre o que é', ex: 'Ex.: O que vem no mini curso' },
};
const TEXTO: Record<string, { r: string; ex: string; dica: string }> = {
  frase: { r: 'A resposta, com as suas palavras', ex: 'Serve sim!\nO curso começa do zero 🦎', dica: 'Cada linha vira uma mensagem.' },
  explicacao: { r: 'O que o vendedor deve fazer', ex: 'Diga que serve, porque o curso começa do zero, e pergunte o que a pessoa já usa hoje.', dica: 'Escreva como explicaria para alguém novo no time.' },
  regra: { r: 'O que o vendedor deve fazer', ex: 'Peça para a pessoa escrever, porque você não ouve áudio.', dica: 'Vale em toda conversa: escreva curto.' },
  produto: { r: 'O que é verdade', ex: 'São 18 aulas curtas e um kit com os arquivos prontos.', dica: 'Sem preço: o preço vem da oferta.' },
};
// Como o texto de um item é chamado no cartão, conforme o jeito que ele foi ensinado.
const ROTULO_TEXTO: Record<string, string> = { frase: 'O vendedor fala assim', explicacao: 'O vendedor faz assim' };
const TEMPOS = [
  { v: '', t: 'É a primeira mensagem dela' },
  { v: '2', t: 'A conversa está acontecendo agora' },
  { v: '180', t: 'A última troca foi há 3 horas' },
  { v: '1500', t: 'A última troca foi ontem' },
];
const VAZIO = { id: '', tipo: 'resposta', modo: 'frase', produto: 'geral', titulo: '', texto: '' };
const semAspas = (t: string) => t.replace(/^["“]+|["”]+$/g, '');
// O jeito de um item: o que está gravado; junção de vários itens é sempre explicação (ela tem "se isso, se aquilo").
const modoDe = (i: any): string => i.modo || (Array.isArray(i.substitui) && i.substitui.length > 1 ? 'explicacao' : '');
// Item de antes do formato (sem modo), na hora de mudar: uma fala só, entre aspas, é frase pronta. O resto é explicação.
const modoProvavel = (texto: string) => (/^["“][^"“”]+["”]$/.test(String(texto).trim()) ? 'frase' : 'explicacao');

export default function Colmeia() {
  useEffect(() => { document.title = 'Colmeia | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const podeEditar = pode('colmeia.editar');
  const [aba, setAba] = useState('');
  const [jeito, setJeito] = useState('resposta');
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/colmeia'), []);
  const d: any = dados;
  const [f, setF] = useState<any>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  // Arquivados: o que foi arquivado ou descartado. A lista só é pedida quando a pessoa abre o bloco.
  const [verArquivados, setVerArquivados] = useState(false);
  const arquivo = useCarregar<any>(() => (verArquivados ? get('/colmeia?status=arquivada') : Promise.resolve(null)), [verArquivados]);
  const [voltando, setVoltando] = useState('');
  // Toda mudança de status mexe nas duas listas (a que vale e a arquivada): as duas são lidas de novo.
  const recarregarTudo = () => { recarregar(); if (verArquivados) arquivo.recarregar(); };

  const guardar = async () => {
    setSalvando(true);
    try {
      const tipo = f.tipo;
      const modo = tipo === 'resposta' || tipo === 'objecao' ? f.modo : 'explicacao';
      await post(f.id ? `/colmeia/${f.id}` : '/colmeia', { tipo, produto: f.produto, titulo: f.titulo, texto: f.texto, modo });
      avisar(f.id ? 'Mudança salva. Já vale para todos os vendedores.' : 'Guardado na Colmeia. Já vale para todos os vendedores.');
      setF(VAZIO); recarregar();
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setSalvando(false);
  };
  const mudarStatus = async (id: string, status: string, ok: string, extra: Record<string, unknown> = {}) => {
    try { await post(`/colmeia/${id}`, { status, ...extra }); avisar(ok); recarregarTudo(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  // Itens que estão valendo no lugar de outros. O item arquivado que um deles substitui, se voltar sozinho, vale junto.
  const juncoesValendo: any[] = (d?.itens || []).filter((i: any) => i.status === 'ativa' && Array.isArray(i.substitui) && i.substitui.length > 0);
  const juntadoEm = (id: string) => juncoesValendo.find((j: any) => j.substitui.some((s: any) => s && s.id === id)) || null;
  // "Voltar a valer" num item arquivado. Quando o item substitui outros, o servidor arquiva os que ele substitui.
  const voltarAValer = async (i: any) => {
    const ehJuncao = Array.isArray(i.substitui) && i.substitui.length > 0;
    const junta = juntadoEm(i.id);
    setVoltando(i.id);
    try {
      const r: any = await post(`/colmeia/${i.id}`, { status: 'ativa' });
      // "Está valendo", e não "voltou": proposta descartada também mora nos arquivados, e essa nunca tinha valido.
      avisar(ehJuncao
        ? (r?.arquivados > 0 ? 'Está valendo. Os itens que ele substituía foram arquivados e fica só este no lugar.' : 'Está valendo. Os itens que ele substituía continuam arquivados.')
        : junta ? `Está valendo. O item “${junta.titulo}” continua valendo também.` : 'Está valendo. Os vendedores já usam.');
      recarregarTudo();
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setVoltando('');
  };
  const editar = (i: any) => {
    const modo = i.modo || modoProvavel(i.texto);
    setF({ id: i.id, tipo: i.tipo, modo, produto: i.produto, titulo: i.titulo, texto: !i.modo && modo === 'frase' ? semAspas(String(i.texto).trim()) : i.texto });
    setAba('ensinar');
    setTimeout(() => document.getElementById('col-ensinar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  // A resposta do dono a uma pergunta do Conciliador: ele reescreve o item e o cartão volta com o texto novo.
  const responder = async (id: string, texto: string) => {
    try {
      const r: any = await post(`/colmeia/${id}`, { responder: texto });
      avisar(r?.aviso || 'Ajustado com a sua resposta. Confira o texto e aprove.');
      recarregar();
      return r?.ajustou !== false;
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); return false; }
  };

  const todos: any[] = d?.itens || [];
  const valendo = todos.filter((i) => i.status === 'ativa');
  const propostas = todos.filter((i) => i.status === 'proposta');
  const arquivados: any[] = Array.isArray(arquivo.dados?.itens) ? arquivo.dados.itens : [];
  // Na chegada, quem tem proposta esperando cai nela; senão, no que a Colmeia sabe.
  const abaAtual = aba === 'espera' && !propostas.length ? 'base' : aba || (propostas.length ? 'espera' : 'base');
  const termo = busca.trim().toLowerCase();
  const tiposDoJeito = (JEITOS.find((j) => j.id === jeito) || JEITOS[0]).tipos;
  // Com busca, procura em tudo o que vale; sem busca, mostra o jeito escolhido.
  const mostrados = valendo.filter((i) => (termo ? `${i.titulo} ${i.texto}`.toLowerCase().includes(termo) : tiposDoJeito.includes(i.tipo)));
  const porProduto = ORDEM_PRODUTO.map((p) => ({ p, itens: mostrados.filter((i) => i.produto === p) })).filter((g) => g.itens.length);
  const cartao = (i: any, semProduto = false) => <Item key={i.id} i={i} nomes={d.nomes} semProduto={semProduto} podeEditar={podeEditar} editar={editar} mudarStatus={mudarStatus} responder={responder} />;
  const tipoForm = f.tipo === 'objecao' ? 'resposta' : f.tipo;
  const escolheModo = tipoForm === 'resposta';
  const campoTexto = TEXTO[escolheModo ? f.modo : tipoForm] || TEXTO.explicacao;

  return (
    <div className="tela">
      <Titulo titulo="Colmeia" sub="O que os vendedores sabem antes de falar com alguém. Você ensina escrevendo, ou conversando no Treino. Nada que um agente propõe vale antes do seu sim." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {d && (
        <Abas
          atual={abaAtual} mudar={setAba}
          abas={[
            { id: 'base', t: 'O que ela sabe', n: valendo.length },
            ...(podeEditar ? [{ id: 'ensinar', t: 'Ensinar' }] : []),
            { id: 'treino', t: 'Treino' },
            ...(propostas.length ? [{ id: 'espera', t: 'Esperando você', n: propostas.length }] : []),
          ]}
        />
      )}

      {d && abaAtual === 'espera' && (
        <Grupo titulo="Esperando o seu sim" rodape="O que o Treino aprendeu, o que os agentes sugeriram, as junções de itens que se contradizem e as respostas que você deu para uma pessoa só. Aprovou, passa a valer para todo mundo. Quando o cartão traz uma pergunta, responda ali mesmo: o texto é ajustado e volta para você aprovar.">
          <div className="col-lista">{propostas.map((i) => cartao(i))}</div>
        </Grupo>
      )}

      {d && abaAtual === 'ensinar' && podeEditar && (
        <div className="col-dois">
          <Grupo titulo={f.id ? 'Mudar um item' : 'Ensinar'} className="col-bloco">
            <div id="col-ensinar" className="col-form">
              <p className="col-passo">1. O que você vai ensinar</p>
              <div className="col-opcoes" role="group" aria-label="O que você vai ensinar">
                {OQUE.map((o) => (
                  <button key={o.v} type="button" className={`col-opcao ${tipoForm === o.v ? 'col-opcao-ativa' : ''}`} aria-pressed={tipoForm === o.v} onClick={() => setF({ ...f, tipo: o.v })}>
                    <b>{o.t}</b><span>{o.d}</span>
                  </button>
                ))}
              </div>
              <div className="campo">
                <label htmlFor="col-titulo"><span className="col-passo">2. {(QUANDO[tipoForm] || QUANDO.resposta).r}</span></label>
                <input id="col-titulo" type="text" maxLength={200} value={f.titulo} placeholder={(QUANDO[tipoForm] || QUANDO.resposta).ex} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
              </div>
              {escolheModo && (
                <>
                  <p className="col-passo">3. Como você quer ensinar</p>
                  <div className="col-opcoes col-opcoes-2" role="group" aria-label="Como você quer ensinar">
                    {COMO.map((o) => (
                      <button key={o.v} type="button" className={`col-opcao ${f.modo === o.v ? 'col-opcao-ativa' : ''}`} aria-pressed={f.modo === o.v} onClick={() => setF({ ...f, modo: o.v })}>
                        <b>{o.t}</b><span>{o.d}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="campo">
                <label htmlFor="col-texto"><span className="col-passo">{escolheModo ? '4' : '3'}. {campoTexto.r}</span></label>
                <textarea id="col-texto" rows={4} maxLength={1200} value={f.texto} placeholder={campoTexto.ex} onChange={(e) => setF({ ...f, texto: e.target.value })} />
                <p className="campo-dica">{campoTexto.dica}</p>
              </div>
              <div className="campo">
                <label htmlFor="col-produto"><span className="col-passo">{escolheModo ? '5' : '4'}. Vale para</span></label>
                <select id="col-produto" value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })}>
                  {Object.entries(d.nomes.produtos).map(([k, v]) => <option key={k} value={k}>{k === 'geral' ? 'Qualquer conversa' : String(v)}</option>)}
                </select>
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

      {d && abaAtual === 'treino' && <Treino itens={todos} podeEditar={podeEditar} cartao={(i) => cartao(i)} recarregarColmeia={recarregar} />}

      {d && abaAtual === 'base' && (
        <Grupo titulo="O que está valendo">
          <div className="col-filtros">
            <div className="col-chips" role="group" aria-label="Escolher o jeito">
              {JEITOS.map((j) => {
                const n = valendo.filter((i) => j.tipos.includes(i.tipo)).length;
                const ativo = !termo && jeito === j.id;
                return <button key={j.id} type="button" className={`col-chip ${ativo ? 'col-chip-ativo' : ''}`} aria-pressed={ativo} onClick={() => { setJeito(j.id); setBusca(''); }}>{j.t} <span className="col-chip-n">{numero(n)}</span></button>;
              })}
            </div>
            <label className="col-busca"><Search /><input type="search" placeholder="Procurar na Colmeia" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Procurar na Colmeia" /></label>
          </div>
          {porProduto.length ? porProduto.map((g) => (
            <section key={g.p} className="col-secao">
              <h3 className="col-secao-t">{g.p === 'geral' ? 'Qualquer conversa' : d.nomes.produtos[g.p]} <span className="mudo">{numero(g.itens.length)}</span></h3>
              <div className="col-lista">{g.itens.map((i) => cartao(i, true))}</div>
            </section>
          )) : (
            <Vazio
              titulo={termo ? 'Nada com essas palavras' : 'Nada aqui ainda'}
              texto={termo ? 'Tente outra palavra, ou ensine este assunto na aba Ensinar.' : jeito === 'licao' ? 'Os vendedores anotam aqui o que funcionou e o que não funcionou nas conversas, com a prova.' : 'Use a aba Ensinar ou o Treino para guardar o primeiro item.'}
            />
          )}
        </Grupo>
      )}

      {d && abaAtual === 'base' && (
        <Grupo
          titulo={verArquivados && arquivo.dados ? `Arquivados (${numero(arquivados.length)})` : 'Arquivados'}
          acoes={<button type="button" className="bt bt-mini" aria-expanded={verArquivados} onClick={() => setVerArquivados(!verArquivados)}><Archive />{verArquivados ? 'Esconder arquivados' : 'Ver arquivados'}</button>}
        >
          {!verArquivados ? (
            <p className="mudo col-nota">O que você arquivou ou descartou fica guardado aqui. Os vendedores não usam, e dá para fazer voltar a valer.</p>
          ) : arquivo.erro ? (
            <ErroCarga erro={arquivo.erro} tentar={arquivo.recarregar} />
          ) : !arquivo.dados ? (
            <Carregando />
          ) : arquivados.length ? (
            <div className="col-lista">
              {arquivados.map((i: any) => <Arquivado key={i.id} i={i} nomes={d.nomes} podeEditar={podeEditar} junta={juntadoEm(i.id)} voltando={voltando === i.id} voltar={voltarAValer} />)}
            </div>
          ) : <Vazio icone={<Archive />} titulo="Nada arquivado" texto="Quando você arquivar um item ou descartar uma proposta, ele vem para cá." />}
        </Grupo>
      )}
    </div>
  );
}

// O miolo de um cartão: o jeito, o "Quando" e o texto. Frase pronta aparece em balões, uma mensagem por balão.
function Miolo({ i, nomes, semProduto }: { i: any; nomes: any; semProduto?: boolean }) {
  const modo = modoDe(i);
  const licao = i.tipo === 'vendeu' || i.tipo === 'nao_vendeu';
  return (
    <>
      <div className="col-item-topo">
        <Etiqueta cor={COR[i.tipo] || 'cinza'}>{NOME_TIPO[i.tipo] || nomes.tipos[i.tipo] || i.tipo}</Etiqueta>
        {modo && !licao && <span className="col-modo">{nomes.modos?.[modo] || (modo === 'frase' ? 'Frase pronta' : 'Explicação')}</span>}
        {!semProduto && i.produto !== 'geral' && <span className="mudo">{nomes.produtos[i.produto]}</span>}
      </div>
      <p className="col-rotulo">{i.tipo === 'produto' ? 'Sobre' : licao ? 'O que aconteceu' : 'Quando'}</p>
      <h3>{i.titulo}</h3>
      <p className="col-rotulo">{licao ? 'O que o vendedor viu' : i.tipo === 'produto' ? 'O que é verdade' : ROTULO_TEXTO[modo] || 'O que fazer'}</p>
      {modo === 'frase'
        ? <div className="col-baloes">{String(i.texto).split('\n').map((l: string, k: number) => <span key={k}>{semAspas(l)}</span>)}</div>
        : <p>{i.texto}</p>}
    </>
  );
}

// Um item arquivado ou descartado: só leitura, com um botão para voltar a valer. junta: o item que está valendo no
// lugar dele, quando existe.
function Arquivado({ i, nomes, podeEditar, junta, voltando, voltar }: { i: any; nomes: any; podeEditar: boolean; junta: any; voltando: boolean; voltar: (i: any) => void }) {
  const juntou: any[] = Array.isArray(i.substitui) ? i.substitui : [];
  const quem = i.autor === 'Treino' ? 'Aprendido no Treino' : i.origem === 'dono' ? 'Escrito por você' : i.origem === 'agente' ? `Escrito por ${i.autor || 'um agente'}` : 'Já estava no roteiro';
  return (
    <article className="col-item">
      <Miolo i={i} nomes={nomes} />
      {juntou.length > 0 && (
        <p className="mudo col-prova">
          <b>{juntou.length > 1 ? 'Juntava estes itens:' : 'Ficava no lugar de:'}</b>{' '}
          {juntou.map((s: any, k: number) => <span key={s.id || k}>{k > 0 ? ' · ' : ''}“{s.titulo}”</span>)}.{' '}
          Se este voltar a valer, {juntou.length > 1 ? 'eles são arquivados' : 'o outro é arquivado'} e fica só este no lugar.
        </p>
      )}
      {junta && <p className="mudo col-prova"><b>Foi substituído por:</b> “{junta.titulo}”, que está valendo. Se este voltar, os dois valem ao mesmo tempo. Para trocar um pelo outro, use o botão de desfazer no item que está valendo.</p>}
      {(i.porque ?? i.prova) && <p className="mudo col-prova"><b>{juntou.length > 1 ? 'Por quê:' : 'De onde veio:'}</b> {i.porque ?? i.prova}</p>}
      <div className="col-item-pe">
        <span className="mudo">{quem}{i.atualizado_em ? ` · arquivado ${haQuanto(i.atualizado_em)}` : ''}</span>
        {podeEditar && (
          <span className="rec-acoes">
            <button type="button" className="bt bt-mini bt-tingido" disabled={voltando} onClick={() => voltar(i)}><Undo2 />{voltando ? 'Voltando' : 'Voltar a valer'}</button>
          </span>
        )}
      </div>
    </article>
  );
}

function Item({ i, nomes, semProduto, podeEditar, editar, mudarStatus, responder }: { i: any; nomes: any; semProduto?: boolean; podeEditar: boolean; editar: (i: any) => void; mudarStatus: (id: string, status: string, ok: string, extra?: Record<string, unknown>) => void; responder?: (id: string, texto: string) => Promise<boolean> }) {
  const dono = i.origem === 'dono';
  const proposta = i.status === 'proposta';
  const doTreino = i.autor === 'Treino';
  // A pergunta do Conciliador (quando ele não sabe qual regra deve ganhar) e a resposta que o dono está escrevendo.
  const pergunta: string = proposta && podeEditar && responder ? i.pergunta || '' : '';
  const [fala, setFala] = useState('');
  const [indo, setIndo] = useState(false);
  const mandar = async () => {
    if (!responder) return;
    setIndo(true);
    if (await responder(i.id, fala.trim())) setFala('');
    setIndo(false);
  };
  const quemPergunta = String(i.autor || 'O Conciliador').replace(/\s*\(.*\)\s*$/, '');
  // O item guarda os itens que ele substitui: vários quando é junção do Conciliador, um quando o Treino mudou um item.
  const juntou: any[] = Array.isArray(i.substitui) ? i.substitui : [];
  const juncao = juntou.length > 1;
  const troca = juntou.length === 1;
  const quem = doTreino
    ? (proposta ? 'Aprendido no Treino. Vale para todo mundo?' : 'Aprendido no Treino')
    : juncao ? `${i.autor || 'Conciliador'} ${proposta ? (pergunta ? 'propôs juntar e espera a sua resposta' : 'propôs juntar e espera o seu sim') : 'juntou'}`
      : troca ? `${i.autor || 'Um agente'} ${proposta ? 'propôs reescrever e espera o seu sim' : 'reescreveu'}`
      : dono ? (proposta ? `Você respondeu assim${i.autor ? ` (${i.autor})` : ''}. Vale para todo mundo?` : 'Você ensinou') : i.origem === 'agente' ? `Agente${i.autor ? `: ${i.autor}` : ''}` : 'Já estava no roteiro';
  const aprovado = juncao ? 'Junção aprovada. Os itens de antes foram arquivados e este já vale.' : troca ? 'Aprovado. O item antigo foi arquivado e este já vale no lugar.' : 'Aprovado. Já vale para todos os vendedores.';
  return (
    <article className="col-item">
      <Miolo i={i} nomes={nomes} semProduto={semProduto} />
      {juncao && (
        <p className="mudo col-prova">
          <b>{proposta ? 'Quero juntar estes itens:' : 'Juntei estes itens:'}</b>{' '}
          {juntou.map((s: any, k: number) => <span key={s.id || k}>{k > 0 ? ' · ' : ''}“{s.titulo}”</span>)}.{' '}
          {proposta ? 'Se você aprovar, eles são arquivados e este passa a valer no lugar.' : 'Eles estão arquivados. Se você desfizer a junção, eles voltam a valer e este sai.'}
        </p>
      )}
      {troca && (
        <p className="mudo col-prova">
          <b>{proposta ? 'Fica no lugar de:' : 'Ficou no lugar de:'}</b> “{juntou[0].titulo}”.{' '}
          {proposta ? 'Se você aprovar, o antigo é arquivado e este passa a valer.' : 'O antigo está arquivado. Se você desfizer a troca, ele volta a valer e este sai.'}
        </p>
      )}
      {(i.porque ?? i.prova) && <p className="mudo col-prova"><b>{doTreino ? 'De onde veio:' : juntou.length ? 'Por quê:' : 'Prova:'}</b> {i.porque ?? i.prova}</p>}
      {pergunta && (
        <div className="col-pergunta">
          <label htmlFor={`col-fala-${i.id}`}><b>{quemPergunta} pergunta:</b> {pergunta}</label>
          <textarea id={`col-fala-${i.id}`} rows={2} maxLength={1000} value={fala} disabled={indo} onChange={(e) => setFala(e.target.value)} placeholder="Responda do seu jeito, em poucas palavras." />
          <div className="col-pergunta-pe">
            <button type="button" className="bt bt-mini bt-tinta" disabled={indo || fala.trim().length < 2} onClick={mandar}><Send />{indo ? 'Ajustando o texto' : 'Responder'}</button>
            <span className="mudo">{indo ? 'Leva uns 10 segundos.' : 'O texto acima é reescrito com a sua resposta e volta para você aprovar. Nada passa a valer antes disso.'}</span>
          </div>
        </div>
      )}
      <div className="col-item-pe">
        <span className="mudo">{quem}{i.usos > 0 ? ` · entrou em ${numero(i.usos)} ${i.usos === 1 ? 'resposta' : 'respostas'}` : ''}{i.vendas > 0 ? ` · ${numero(i.vendas)} ${i.vendas === 1 ? 'venda depois' : 'vendas depois'}` : ''}</span>
        {podeEditar && (
          <span className="rec-acoes">
            {proposta && <button type="button" className={`bt bt-mini ${pergunta ? 'bt-texto' : 'bt-tinta'}`} disabled={indo} onClick={() => mudarStatus(i.id, 'ativa', aprovado)}><Check />{pergunta ? 'Aprovar como está' : juncao ? 'Aprovar a junção' : troca ? 'Aprovar e trocar' : 'Aprovar'}</button>}
            {(juncao || troca) && !proposta && <button type="button" className="bt bt-mini bt-texto" onClick={() => mudarStatus(i.id, 'arquivada', juncao ? 'Junção desfeita. Os itens de antes voltaram a valer.' : 'Troca desfeita. O item antigo voltou a valer.', { desfazer: true })}><Undo2 />{juncao ? 'Desfazer a junção' : 'Desfazer a troca'}</button>}
            {/* O que vendeu e o que não vendeu são lições dos vendedores, com a prova: o formulário de ensinar não tem esses tipos. */}
            {ENSINA.includes(i.tipo) && <button type="button" className="bt bt-mini bt-texto" onClick={() => editar(i)}><Pencil />Mudar</button>}
            <button type="button" className="bt bt-mini bt-texto" onClick={() => mudarStatus(i.id, 'arquivada', proposta ? (juntou.length ? 'Proposta descartada. O que valia antes continua valendo.' : 'Proposta descartada.') : juntou.length ? 'Arquivado. O que ele substituía continua arquivado.' : 'Arquivado. Os vendedores param de usar.')}>{proposta ? <X /> : <Archive />}{proposta ? 'Descartar' : 'Arquivar'}</button>
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
    <Grupo titulo="Testar uma pergunta" className="col-bloco" rodape="Nada é enviado: é só para ver como o Atendente responderia com a Colmeia de agora. Para uma conversa inteira, use a aba Treino.">
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
            {r.suporte && <p className="mudo"><b>Abriria um chamado no Suporte:</b> {r.suporte.problema}{r.suporte.curso ? ` · curso: ${r.suporte.curso}` : ''}{r.suporte.email ? ` · e-mail: ${r.suporte.email}` : ''}{r.suporte.telefone ? ` · telefone: ${r.suporte.telefone}` : ''}</p>}
            {r.motivo && <p className="mudo">{r.motivo}</p>}
          </div>
        )}
      </div>
    </Grupo>
  );
}
