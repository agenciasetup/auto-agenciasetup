// Follow-up do direct: cada pessoa do Instagram que pode comprar, na fase em que está, até vender. Quem comentou a
// palavra de um post entra sozinho (Atualizar lista); quem chega pelo direct, a tarefa do Claude anota. A dúvida que o
// Claude não sabe responder aparece em "Dúvida com você": a sua resposta vai para a pessoa e vira exemplo para as
// próximas. Desde 09/11/2026 os toques e as respostas conhecidas saem sozinhos, dentro dos tetos; dúvida nova,
// desconto e reclamação continuam vindo para o dono. Lógica em worker/lib/followup.js.
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, HelpCircle, MessageCircle, RefreshCw, Search, Send } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Abas, Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { dataHora, dinheiro, haQuanto, numero } from '../nucleo/util';

const VAZIOS: Record<string, { t: string; d: string }> = {
  na_hora: { t: 'Ninguém na hora do próximo toque', d: 'Quando chegar a hora de falar de novo com alguém, a pessoa aparece aqui. A tarefa do Claude passa às 9h, 10h, 12h, 16h, 18h, 19h, 20h, 21h e 22h.' },
  duvida: { t: 'Nenhuma dúvida esperando você', d: 'Quando alguém perguntar algo que o Claude não sabe responder, a pergunta aparece aqui para você responder.' },
  novo: { t: 'Ninguém novo', d: 'Use "Atualizar lista" para trazer quem comentou a palavra dos posts. Quem chega pelo direct, a tarefa do Claude anota.' },
  ofertado: { t: 'Nenhuma oferta esperando resposta', d: 'Quem recebeu a oferta e ainda não respondeu aparece aqui.' },
  conversando: { t: 'Ninguém conversando agora', d: 'Quem respondeu e ainda está pensando aparece aqui.' },
  nao_sei: { t: 'Nada para decidir', d: 'Quando não der para saber o que a pessoa quer, ela vem para cá e você escolhe o caminho.' },
  comprou: { t: 'Nenhuma compra achada ainda', d: 'Quem pagou com o mesmo e-mail, ou com nome e sobrenome iguais aos do Instagram, aparece aqui.' },
  nao_quer: { t: 'Ninguém disse não', d: 'Quem disse que não quer, ou não respondeu depois de três toques, vem para cá.' },
};
const COR_INTERESSE: Record<string, string> = { posts: 'laranja', combo: 'ambar', videos: 'azul', material: 'cinza', outro: 'cinza', nao_sei: 'vermelho' };
const NOME_ORIGEM: Record<string, string> = { direct: 'direct', story: 'resposta ao story', comentario: 'comentário', manual: 'anotado à mão' };
// Quem a rodada do direct não toca agora (p.pausa): a conversa está com o dono ou com o Atendente. O motivo vem pronto.
const NOME_PAUSA: Record<string, string> = { dono: 'Conversa com você', atendente: 'Com o Atendente' };
// Os três modos do Atendente, com o nome e uma frase. O seletor mostra os três lado a lado e marca o que vale agora.
type Opcao = { id: string; t: string; d: string };
const MODOS_ATENDENTE: Opcao[] = [
  { id: 'automatico', t: 'Responde sozinho', d: 'Responde na hora o que já está liberado na Colmeia.' },
  { id: 'rascunho', t: 'Só prepara a resposta', d: 'Deixa pronta e espera você mandar.' },
  { id: 'ensaio', t: 'Ensaio', d: 'Só responde as suas contas de teste.' },
];
// Quando a resposta sai: logo depois que a pessoa para de escrever (o despertador) ou na volta do relógio de minuto.
const QUANDO_RESPONDE: Opcao[] = [
  { id: 'na_hora', t: 'Em uns 20 segundos', d: 'Responde logo depois que a pessoa para de escrever.' },
  { id: 'relogio', t: 'Na volta do relógio', d: 'Responde em até 1 minuto e meio. É o jeito antigo, que continua de reserva.' },
];
const nomeDoModo = (modo: string) => MODOS_ATENDENTE.find((m) => m.id === modo)?.t || modo;
const AVISO_MODO: Record<string, string> = {
  automatico: 'O Atendente voltou a responder todo mundo sozinho.',
  rascunho: 'O Atendente agora só prepara a resposta e espera você mandar.',
  ensaio: 'Ensaio ligado: só as contas de teste recebem resposta.',
};
// O modelo de IA do Atendente. A frase de cada opção vem do servidor como "Nome: explicação" (d.atendente.modelos):
// o nome vira o título da opção e a explicação, a frase embaixo.
const NOME_MODELO: Record<string, string> = { misto: 'Misto', 'claude-haiku-5-5': 'Só o barato', 'claude-sonnet-5-5': 'Só o cuidadoso' };
function opcaoDeModelo(id: string, texto: unknown): Opcao {
  const s = String(texto || '').trim();
  const k = s.indexOf(': ');
  const frase = (k > 0 ? s.slice(k + 2) : s).trim();
  return { id, t: k > 0 ? s.slice(0, k) : NOME_MODELO[id] || id, d: frase ? `${frase.charAt(0).toUpperCase()}${frase.slice(1)}${/[.!?]$/.test(frase) ? '' : '.'}` : '' };
}
const faseDoEndereco = () => { try { return new URLSearchParams(window.location.search).get('fase') || ''; } catch { return ''; } };

export default function Followup() {
  useEffect(() => { document.title = 'Follow-up do direct | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  // O aviso do celular abre a aba certa: /admin/followup?fase=duvida.
  const [fase, setFase] = useState(() => faseDoEndereco() || 'na_hora');
  // A aba de entrada. Sem ?fase= no endereço, a primeira carga decide: com dúvida esperando, a tela abre em "Dúvida
  // com você". Só nessa vez: depois que a pessoa escolhe uma aba, ninguém troca por ela.
  // decidir: esperando os números da primeira carga; pulando: trocou para as dúvidas e a lista delas está vindo.
  const [entrada, setEntrada] = useState<'decidir' | 'pulando' | 'pronta'>(() => (faseDoEndereco() ? 'pronta' : 'decidir'));
  const [interesse, setInteresse] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [mudandoAtendente, setMudandoAtendente] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/followup?fase=${fase}${interesse ? `&interesse=${interesse}` : ''}${buscaFeita ? `&busca=${encodeURIComponent(buscaFeita)}` : ''}`), [fase, interesse, buscaFeita]);
  const d: any = dados;
  const n = d?.numeros;
  const antesDoPulo = useRef<any>(null);
  useEffect(() => {
    if (entrada === 'decidir' && n) {
      if (n.duvida > 0 && fase !== 'duvida') { antesDoPulo.current = dados; setFase('duvida'); setEntrada('pulando'); } else setEntrada('pronta');
    } else if (entrada === 'pulando' && (dados !== antesDoPulo.current || erro)) {
      // A lista das dúvidas chegou (ou deu erro): a tela volta a mostrar a lista.
      antesDoPulo.current = null;
      setEntrada('pronta');
    }
  }, [entrada, n, dados, erro, fase]);
  // Enquanto a aba de entrada troca sozinha, a lista da aba antiga não aparece (ela piscaria antes das dúvidas).
  const trocandoDeAba = entrada === 'pulando' || (entrada === 'decidir' && !!n && n.duvida > 0 && fase !== 'duvida');
  const escolherAba = (id: string) => { setEntrada('pronta'); setFase(id); };
  const podeMexer = pode('followup.editar');
  const podeAtendente = pode('followup.atendente');
  // A frase ao lado de "Ligado" ou "Desligado". Desligado: o que acontece com as mensagens e em que modo ele volta.
  // Ensaio: quem recebe resposta. Nos outros modos o seletor logo abaixo já diz tudo; a frase fica só para quem não
  // pode mexer no Atendente (e por isso não vê o seletor).
  const at = d?.atendente;
  const situacaoAtendente: string = !at ? ''
    : !at.ligado ? `As mensagens que chegam são só anotadas na lista.${podeAtendente ? ` Ao ligar, ele volta no modo "${nomeDoModo(at.modo)}".` : ''}`
    : at.modo === 'ensaio' ? `Ensaio: só responde as contas de teste (${(at.contas_teste || []).map((u: string) => `@${u}`).join(', ') || 'nenhuma conta na lista'}). Quem não é de teste fica esperando e recebe a resposta quando o modo voltar para "Responde sozinho", se a mensagem tiver menos de 6 horas.`
    : podeAtendente ? '' : String(at.modos?.[at.modo] || '');
  const mudar = async (id: string, corpo: any, ok?: string) => {
    try { await post(`/followup/${id}`, corpo); if (ok) avisar(ok); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const responder = async (id: string, resposta: string) => {
    try {
      const r: any = await post(`/followup/${id}/responder`, { resposta });
      avisar(r?.atendente_leva
        ? 'Resposta salva. O Atendente leva para a pessoa no próximo minuto. Ela também foi para a Colmeia, esperando você dizer se vale para todo mundo.'
        : 'Resposta salva. A pessoa recebe na próxima rodada do direct (já passou das 24 horas do Instagram ou o Atendente não está respondendo sozinho). Ela também foi para a Colmeia, esperando você dizer se vale para todo mundo.');
      recarregar();
    }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const atendente = async (corpo: any, ok: string) => {
    setMudandoAtendente(true);
    try {
      const r: any = await post('/followup/atendente', corpo);
      // A opção nova já aparece marcada com o que o servidor guardou, sem esperar a lista voltar.
      if (r && typeof r.modo === 'string') setDados((x: any) => (x && x.atendente ? { ...x, atendente: { ...x.atendente, ligado: !!r.ligado, modo: r.modo, modelo: r.modelo } } : x));
      avisar(ok); recarregar();
    }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    finally { setMudandoAtendente(false); }
  };
  const mandar = async (id: string) => {
    try { await post(`/followup/${id}/mandar`, {}); avisar('Mensagem enviada pelo sistema.'); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r: any = await post('/followup/sincronizar', {});
      avisar(r.importados || r.compras ? `${numero(r.importados)} ${r.importados === 1 ? 'pessoa nova ou atualizada' : 'pessoas novas ou atualizadas'} e ${numero(r.compras)} ${r.compras === 1 ? 'compra achada' : 'compras achadas'}.` : 'A lista já estava em dia.');
      recarregar();
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    finally { setSincronizando(false); }
  };
  const abas = [
    { id: 'na_hora', t: 'Na hora', n: n?.na_hora },
    { id: 'duvida', t: 'Dúvida com você', n: n?.duvida },
    { id: 'novo', t: 'Chegaram', n: n?.novo },
    { id: 'ofertado', t: 'Ofertados', n: n?.ofertado },
    { id: 'conversando', t: 'Conversando', n: n?.conversando },
    { id: 'nao_sei', t: 'Não sei o que fazer', n: n?.nao_sei },
    { id: 'comprou', t: 'Compraram', n: n?.comprou },
    { id: 'nao_quer', t: 'Não querem', n: n?.nao_quer },
  ];

  return (
    <div className="tela">
      <Titulo
        titulo="Follow-up do direct"
        sub="Quem pode comprar, na fase em que está. A tarefa do Claude lê o direct, anota aqui e manda os toques e as respostas conhecidas. Dúvida nova, desconto e reclamação ficam esperando você."
        acoes={podeMexer && <button className="bt" onClick={sincronizar} disabled={sincronizando}><RefreshCw className={sincronizando ? 'girar' : ''} />{sincronizando ? 'Atualizando...' : 'Atualizar lista'}</button>}
      />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {n && (
        <div className="numeros">
          <div className={`numero grande ${n.duvida ? 'destaque' : ''}`}><b>{numero(n.duvida)}</b><span>{n.duvida === 1 ? 'dúvida esperando você' : 'dúvidas esperando você'}</span></div>
          <div className="numero"><b>{numero(n.na_hora)}</b><span>Na hora do próximo toque</span></div>
          <div className="numero"><b>{numero((n.novo || 0) + (n.ofertado || 0) + (n.conversando || 0))}</b><span>Em aberto{n.por_interesse?.combo ? ` · ${numero(n.por_interesse.combo)} no Combo` : ''}{n.por_interesse?.posts ? ` · ${numero(n.por_interesse.posts)} no mini curso` : ''}</span></div>
          <div className="numero"><b>{numero(n.comprou)}</b><span>Compraram</span></div>
        </div>
      )}
      {d?.atendente && (
        <Grupo titulo="Atendente do direct" rodape="Responde quem escreve no direct, sem depender do computador. Espera a pessoa terminar de escrever, lê as últimas mensagens e responde com o que está na Colmeia. Desconto, reembolso, problema de acesso e pergunta nova vêm para você como dúvida, e a sua resposta entra na Colmeia.">
          <div className="fu-atendente">
            <span className={`esc-luz esc-luz-${d.atendente.ligado ? 'ativo' : 'pausado'}`} />
            <b>{d.atendente.ligado ? 'Ligado' : 'Desligado'}</b>
            {podeAtendente && (
              <span className="rec-acoes">
                <button className="bt bt-mini bt-tingido" disabled={mudandoAtendente} onClick={() => atendente({ ligado: !d.atendente.ligado }, d.atendente.ligado ? 'Atendente desligado.' : `Atendente ligado no modo "${nomeDoModo(d.atendente.modo)}".`)}>{d.atendente.ligado ? 'Desligar' : 'Ligar'}</button>
              </span>
            )}
          </div>
          {situacaoAtendente && <p className="mudo fu-situacao">{situacaoAtendente}</p>}
          {podeAtendente && d.atendente.ligado && (
            <>
              <p className="fu-rotulo">Como ele responde</p>
              <Opcoes rotulo="Como o Atendente responde" opcoes={MODOS_ATENDENTE} atual={d.atendente.modo} parado={mudandoAtendente}
                escolher={(id) => atendente({ modo: id }, AVISO_MODO[id] || 'Modo do Atendente mudado.')} />
              {d.atendente.modelos && (
                <details className="fu-avancado">
                  <summary>Avançado</summary>
                  <p className="fu-rotulo">Quanto tempo ele leva para responder</p>
                  <Opcoes rotulo="Quanto tempo o Atendente leva para responder" opcoes={QUANDO_RESPONDE} atual={d.atendente.na_hora ? 'na_hora' : 'relogio'} parado={mudandoAtendente}
                    escolher={(id) => atendente({ na_hora: id === 'na_hora' }, id === 'na_hora' ? 'O Atendente passa a responder uns 20 segundos depois da última mensagem.' : 'O Atendente voltou a responder na volta do relógio.')} />
                  <p className="fu-rotulo">Qual modelo de IA escreve as respostas</p>
                  <Opcoes rotulo="Modelo de IA do Atendente" opcoes={Object.entries(d.atendente.modelos).map(([id, texto]) => opcaoDeModelo(id, texto))} atual={d.atendente.modelo} parado={mudandoAtendente}
                    escolher={(id) => atendente({ modelo: id }, 'Modelo do Atendente trocado.')} />
                </details>
              )}
            </>
          )}
        </Grupo>
      )}
      {d?.placar?.length > 0 && (
        <Grupo titulo="Placar dos vendedores" rodape="Cada pessoa fica com um vendedor (um jeito de conversar) do primeiro toque até o fim. As taxas aparecem a partir de 30 pessoas, e só vale decidir com umas 300 por vendedor.">
          <div className="fu-placar">
            {d.placar.map((v: any) => (
              <div className="fu-vendedor" key={v.vendedor}>
                <b>{v.nome}</b>
                <span>{numero(v.pessoas)} {v.pessoas === 1 ? 'pessoa atendida' : 'pessoas atendidas'}</span>
                <span>{numero(v.responderam)} {v.responderam === 1 ? 'respondeu' : 'responderam'}{v.taxa_resposta !== null ? ` (${String(v.taxa_resposta).replace('.', ',')}%)` : ''}</span>
                <span>{numero(v.compraram)} {v.compraram === 1 ? 'comprou' : 'compraram'}{v.taxa_compra !== null ? ` (${String(v.taxa_compra).replace('.', ',')}%)` : ''}</span>
                <span>{dinheiro(v.receita_centavos)} de receita{v.receita_por_100_centavos !== null ? ` · ${dinheiro(v.receita_por_100_centavos)} a cada 100 pessoas` : ''}</span>
              </div>
            ))}
          </div>
        </Grupo>
      )}
      {d?.tetos && (
        <p className="mudo fu-tetos">
          Mensagens puxadas hoje: <b>{numero(d.tetos.dia.usado)} de {numero(d.tetos.dia.teto)}</b>. Pessoas nesta rodada: <b>{numero(d.tetos.rodada.usado)} de {numero(d.tetos.rodada.teto)}</b>. Quem conta é o sistema, e a rodada para quando o teto fecha.
        </p>
      )}
      <Abas abas={abas} atual={fase} mudar={escolherAba} />
      <div className="filtros">
        <select value={interesse} onChange={(e) => setInteresse(e.target.value)} aria-label="Interesse">
          <option value="">Todos os interesses</option>
          {d?.interesses && Object.entries(d.interesses).map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="search" placeholder="@, nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pessoa" />
      </div>
      {((carregando && !d) || trocandoDeAba) && <Carregando />}
      {d && !trocandoDeAba && (d.itens.length ? (
        <div className="rec-lista">{d.itens.map((p: any) => <Pessoa key={p.id} p={p} fases={d.fases} interesses={d.interesses} mudar={mudar} responder={responder} mandar={mandar} podeMexer={podeMexer} />)}</div>
      ) : (
        <Vazio icone={buscaFeita ? <Search /> : <MessageCircle />} titulo={buscaFeita ? 'Ninguém com esse @, nome ou e-mail nesta aba.' : VAZIOS[fase]?.t} texto={buscaFeita ? undefined : VAZIOS[fase]?.d} />
      ))}
      {d && !trocandoDeAba && d.total > d.itens.length && <p className="mudo linha-pequena">Mostrando {d.itens.length} de {numero(d.total)}. Use a busca ou o filtro de interesse para achar as outras.</p>}
    </div>
  );
}

// Seletor com todas as opções à vista, lado a lado (no celular, uma embaixo da outra), cada uma com o nome e uma
// frase. A marcada é a que vale agora; tocar em outra troca na hora. Serve para o modo e para o modelo do Atendente.
function Opcoes({ rotulo, opcoes, atual, escolher, parado }: { rotulo: string; opcoes: Opcao[]; atual: string; escolher: (id: string) => void; parado: boolean }) {
  return (
    <div className="fu-opcoes" role="group" aria-label={rotulo}>
      {opcoes.map((o) => {
        const marcada = o.id === atual;
        return (
          <button key={o.id} type="button" className={`fu-opcao ${marcada ? 'fu-opcao-marcada' : ''}`} aria-pressed={marcada} disabled={parado && !marcada} onClick={() => { if (!marcada) escolher(o.id); }}>
            <b><span className="fu-opcao-bola" aria-hidden="true">{marcada && <Check />}</span>{o.t}</b>
            {o.d && <span>{o.d}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Pessoa({ p, fases, interesses, mudar, responder, mandar, podeMexer }: { p: any; fases: Record<string, string>; interesses: Record<string, string>; mudar: (id: string, corpo: any, ok?: string) => void; responder: (id: string, r: string) => void; mandar: (id: string) => void; podeMexer: boolean }) {
  const [nota, setNota] = useState(p.nota || '');
  const [resposta, setResposta] = useState('');
  useEffect(() => { setNota(p.nota || ''); setResposta(''); }, [p.id, p.nota]);
  const copiar = async (t: string) => {
    try { await navigator.clipboard.writeText(t); avisar('Mensagem copiada.'); }
    catch { avisar('Não consegui copiar.', 'erro'); }
  };
  const esperando = p.duvida && !p.resposta;
  return (
    <Grupo className="rec-pessoa">
      <div className="rec-topo">
        <div className="rec-quem">
          <b><a href={p.perfil_url} target="_blank" rel="noopener noreferrer">@{p.usuario}</a></b>
          <span className="mudo">{p.nome ? `${p.nome} · ` : ''}chegou por {NOME_ORIGEM[p.origem] || p.origem} {haQuanto(p.primeiro_em)}</span>
        </div>
        <div className="rec-valor">
          <Etiqueta cor={COR_INTERESSE[p.interesse] || 'cinza'}>{interesses[p.interesse] || p.interesse}</Etiqueta>
          {p.na_hora && <Etiqueta cor="laranja">Na hora</Etiqueta>}
          {p.vendedor && <Etiqueta cor="cinza">Vendedor: {p.vendedor === 'pergunta' ? 'Pergunta antes' : 'Calango'}</Etiqueta>}
          {p.produto && <Etiqueta cor="verde">{p.fase === 'comprou' ? 'Comprou' : 'Já é aluno'}: {p.produto}</Etiqueta>}
          {NOME_PAUSA[p.pausa] && <Etiqueta cor="cinza">{NOME_PAUSA[p.pausa]}</Etiqueta>}
        </div>
      </div>
      {NOME_PAUSA[p.pausa] && p.pausa_motivo && <p className="rec-linha fu-pausa">{p.pausa_motivo}</p>}
      {!p.pausa && p.pode_tocar === false && p.nao_tocar_motivo && ['novo', 'ofertado', 'conversando'].includes(p.fase) && <p className="rec-linha fu-pausa">Não recebe mensagem agora: {p.nao_tocar_motivo}</p>}
      <p className="rec-linha">
        {p.palavras?.length ? `Comentou ${p.palavras.join(', ')} · ` : ''}
        {p.toques ? `${p.toques} ${p.toques === 1 ? 'mensagem nossa' : 'mensagens nossas'}, a última ${haQuanto(p.nosso_em)}` : 'Nenhuma mensagem nossa ainda'}
        {p.compra_por === 'nome' ? ' · compra achada pelo nome, confira' : ''}
      </p>
      {p.ultima_mensagem && <p className="fu-disse"><span className="mudo">Disse{p.ultima_em ? ` ${haQuanto(p.ultima_em)}` : ''}:</span> {p.ultima_mensagem}</p>}

      {p.duvida && (
        <div className={`fu-duvida ${esperando ? 'aberta' : ''}`}>
          <p><HelpCircle /><b>Dúvida:</b> {p.duvida}</p>
          {p.resposta ? (
            <p className="mudo"><Check /><b>Você respondeu</b>{p.respondida_por ? ` (${p.respondida_por})` : ''}: {p.resposta}</p>
          ) : podeMexer && (
            <>
              <textarea rows={3} maxLength={2000} placeholder="Sua resposta. O Claude usa para responder esta pessoa no seu jeito, e para as próximas com a mesma dúvida." value={resposta} onChange={(e) => setResposta(e.target.value)} aria-label="Sua resposta para a dúvida" />
              <button className="bt bt-mini bt-tinta" disabled={!resposta.trim()} onClick={() => responder(p.id, resposta)}><Send />Salvar resposta</button>
            </>
          )}
        </div>
      )}

      {p.proxima_mensagem && (
        <div className="fu-proxima">
          <span className="mudo linha-pequena">Próxima mensagem{p.proximo_em ? ` · ${p.na_hora ? 'já está na hora' : `para ${dataHora(p.proximo_em)}`}` : ''}</span>
          <p>{p.proxima_mensagem}</p>
        </div>
      )}
      {!p.proxima_mensagem && p.proximo_em && ['novo', 'ofertado', 'conversando'].includes(p.fase) && <p className="rec-linha mudo">Próximo toque: {p.na_hora ? 'já está na hora' : dataHora(p.proximo_em)}</p>}

      <div className="rec-acoes">
        <a className="bt bt-mini bt-tingido" href={p.abrir} target="_blank" rel="noopener noreferrer"><ExternalLink />Abrir conversa</a>
        {p.proxima_mensagem && <button className="bt bt-mini bt-texto" onClick={() => copiar(p.proxima_mensagem)}><Copy />Copiar mensagem</button>}
        {podeMexer && p.proxima_mensagem && p.pode_api && <button className="bt bt-mini bt-tinta" onClick={() => mandar(p.id)}><Send />Mandar pelo sistema</button>}
        {podeMexer && p.proxima_mensagem && <button className="bt bt-mini bt-texto" onClick={() => mudar(p.id, { mandei: p.proxima_mensagem }, 'Marcado como enviado.')}><Check />Já mandei</button>}
        {podeMexer && (
          <select className="fu-select" value={p.fase} onChange={(e) => mudar(p.id, { fase: e.target.value }, 'Fase mudada.')} aria-label="Fase">
            {Object.entries(fases).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        {podeMexer && (
          <select className="fu-select" value={p.interesse} onChange={(e) => mudar(p.id, { interesse: e.target.value }, 'Interesse mudado.')} aria-label="Interesse">
            {Object.entries(interesses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {p.historico?.length > 0 && (
        <details className="fu-historico">
          <summary>Histórico</summary>
          <ol>{[...p.historico].reverse().map((h: any, i: number) => <li key={i}><span className="mudo">{dataHora(h.em)}{h.quem ? ` · ${h.quem}` : ''}</span> {h.tipo === 'nos' ? 'Nós: ' : h.tipo === 'pessoa' ? 'Pessoa: ' : ''}{h.texto}</li>)}</ol>
        </details>
      )}
      {podeMexer && <input className="rec-nota" placeholder="Anotação (só a equipe vê)" maxLength={500} value={nota} aria-label="Anotação" onChange={(e) => setNota(e.target.value)} onBlur={() => { if (nota !== (p.nota || '')) mudar(p.id, { nota }, 'Anotação salva.'); }} />}
    </Grupo>
  );
}
