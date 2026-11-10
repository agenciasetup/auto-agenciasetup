// Vendas: os números do período, com filtro por produto, canal, campanha e conteúdo, de onde vieram as vendas, a fila de
// reembolso e cada pedido (origem, pagamento, e-mails, reembolso). O reembolso pode sair agora ou entrar na fila para
// daqui a N dias (padrão 7).
import { useEffect, useState } from 'react';
import { MessageCircle, RotateCcw, Send, Undo2 } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Campo, Carregando, Celula, ErroCarga, Etiqueta, Faixa, Grupo, Marcar, Modal, Paginacao, Segredo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { METODO, STATUS_EMAIL, STATUS_PEDIDO, data, dataHora, dinheiro, haQuanto, marcasDoToque, numero, numeroWhats, textoToque } from '../nucleo/util';
import { Colunas, FiltroMoeda, FiltroPeriodo, faixaDoPeriodo, type Periodo } from './comum';

const PRAZOS = [{ d: 0, t: 'Agora' }, { d: 3, t: '3 dias' }, { d: 7, t: '7 dias' }, { d: 15, t: '15 dias' }, { d: 30, t: '30 dias' }];
const FILA: Record<string, { t: string; cor: string }> = {
  agendado: { t: 'Na fila', cor: 'ambar' }, devolvendo: { t: 'Devolvendo', cor: 'azul' }, falhou: { t: 'Falhou', cor: 'vermelho' },
  feito: { t: 'Devolvido', cor: 'azul' }, cancelado: { t: 'Tirado da fila', cor: 'cinza' },
};
const ABERTOS = ['agendado', 'devolvendo', 'falhou'];

// "em 3 dias", "amanhã", "em 5 h": quanto falta para a devolução.
function faltam(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 10 * 60_000) return 'nos próximos minutos';
  if (ms < 86400_000) return `em ${Math.max(1, Math.round(ms / 3600_000))} h`;
  const d = Math.round(ms / 86400_000);
  return d === 1 ? 'amanhã' : `em ${d} dias`;
}

const diaCurto = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
const NOME_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Dia a dia; num período longo (personalizado), junta por mês para as colunas continuarem legíveis.
function colunasDoPeriodo(lista: any[], moeda: string) {
  const texto = (rotulo: string, x: any) => `${rotulo}: ${x.pagos ? `${dinheiro(x.centavos, moeda)} · ${x.pagos} ${x.pagos === 1 ? 'venda' : 'vendas'}` : 'sem venda'}`;
  if (lista.length <= 92) return lista.map((x) => ({ rotulo: diaCurto(x.dia), valor: x.centavos, detalhe: texto(diaCurto(x.dia), x) }));
  const meses = new Map<string, { pagos: number; centavos: number }>();
  for (const x of lista) { const k = x.dia.slice(0, 7); const m = meses.get(k) || { pagos: 0, centavos: 0 }; m.pagos += x.pagos; m.centavos += x.centavos; meses.set(k, m); }
  return [...meses.entries()].map(([k, m]) => { const r = `${NOME_MES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`; return { rotulo: r, valor: m.centavos, detalhe: texto(r, m) }; });
}

// "23% a mais que o período anterior". Sem nada antes, não há o que comparar.
function comparacao(agora: number, antes: number) {
  if (!antes) return agora ? 'nada no período anterior' : '';
  const v = Math.round(((agora - antes) / antes) * 100);
  return v === 0 ? 'igual ao período anterior' : `${Math.abs(v)}% a ${v > 0 ? 'mais' : 'menos'} que o período anterior`;
}

export default function Vendas() {
  useEffect(() => { document.title = 'Vendas | Painel Agência Setup'; }, []);
  // Um item do Plano pode abrir a tela já filtrada (/vendas?canal=...).
  const { rota } = useRota();
  const url = (k: string) => rota.busca.get(k) || '';
  const [periodo, setPeriodo] = useState<Periodo>({ id: '30', de: '', ate: '' });
  const [produto, setProduto] = useState(url('produto'));
  const [canal, setCanal] = useState(url('canal'));
  const [campanha, setCampanha] = useState(url('campanha'));
  const [conteudo, setConteudo] = useState(url('conteudo'));
  const [status, setStatus] = useState(url('status'));
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<string | null>(null);
  // Real ou dólar (o curso em inglês): números, origens e pedidos só da moeda escolhida.
  const [moeda, setMoeda] = useState('brl');
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  const faixa = faixaDoPeriodo(periodo);
  const chaveFiltros = `${faixa?.de}|${faixa?.ate}|${produto}|${canal}|${campanha}|${conteudo}|${status}|${buscaFeita}|${moeda}`;
  useEffect(() => { setPagina(1); }, [chaveFiltros]);
  const consulta = () => {
    const q = new URLSearchParams({ pagina: String(pagina), moeda });
    if (faixa) { q.set('de', faixa.de); q.set('ate', faixa.ate); }
    for (const [k, v] of Object.entries({ produto, canal, campanha, conteudo, status, busca: buscaFeita })) if (v) q.set(k, v);
    return `/vendas?${q}`;
  };
  // Personalizado sem as duas datas: espera a pessoa terminar de escolher, sem buscar nada.
  const { dados, erro, carregando, recarregar } = useCarregar(() => (faixa ? get(consulta()) : Promise.resolve(null)), [pagina, chaveFiltros]);
  const d: any = dados;
  const n = d?.numeros;
  const din = (c: number) => dinheiro(c, moeda);
  const fila = useCarregar(() => get('/vendas/reembolsos'), []);
  const mudou = () => { recarregar(); fila.recarregar(); };
  const temFiltro = !!(produto || canal || campanha || conteudo);
  const limpar = () => { setProduto(''); setCanal(''); setCampanha(''); setConteudo(''); };
  const cmp = n ? comparacao(n.faturamento_centavos, n.anterior.faturamento_centavos) : '';
  const op = d?.opcoes || {};
  // Filtro vindo do link que não aparece no período continua na lista, para a pessoa ver o que está valendo.
  const comAtual = (l: string[] = [], v: string) => (v && !l.includes(v) ? [v, ...l] : l);

  return (
    <div className="tela">
      <Titulo titulo="Vendas" sub="Pedidos do checkout, de onde cada venda veio e o que aconteceu com ela. Pedidos de teste ficam fora dos números."
        acoes={<Link para="/recuperar" className="bt"><MessageCircle />Recuperar vendas</Link>} />
      <div className="filtros"><FiltroPeriodo valor={periodo} mudar={setPeriodo} /><FiltroMoeda valor={moeda} mudar={setMoeda} />{moeda === 'usd' && <span className="mudo">O curso em inglês, pago no Stripe. O Stripe repassa em real para a conta.</span>}</div>
      <div className="filtros">
        <select value={produto} onChange={(e) => setProduto(e.target.value)} aria-label="Produto">
          <option value="">Todos os produtos</option>
          {(op.produtos || []).map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal">
          <option value="">Todos os canais</option>
          {comAtual(op.canais, canal).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={campanha} onChange={(e) => setCampanha(e.target.value)} aria-label="Campanha (utm_campaign)">
          <option value="">Todas as campanhas</option>
          {comAtual(op.campanhas, campanha).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={conteudo} onChange={(e) => setConteudo(e.target.value)} aria-label="Conteúdo (utm_content)">
          <option value="">Todos os conteúdos</option>
          {comAtual(op.conteudos, conteudo).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {temFiltro && <button className="bt bt-mini bt-texto" onClick={limpar}>Limpar filtros</button>}
      </div>
      {periodo.id === 'livre' && !faixa && <p className="mudo">Escolha as duas datas para ver o período.</p>}
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {d?.cortou && <Faixa tipo="aviso">Esse período tem muitos registros e os mais antigos ficaram de fora da conta. Escolha um período menor para ver certo.</Faixa>}
      {n && (
        <div className="numeros">
          <div className="numero grande destaque"><b>{din(n.faturamento_centavos)}</b><span>Faturamento{cmp ? ` · ${cmp}` : ''} · {moeda === 'usd' ? `${numero(n.cartao)} no cartão` : `${numero(n.pix)} no Pix, ${numero(n.cartao)} no cartão`}{n.aguardando ? ` · ${numero(n.aguardando)} aguardando` : ''}</span></div>
          <div className="numero"><b>{numero(n.pagos)}</b><span>Vendas pagas{typeof n.compradores === 'number' ? ` de ${numero(n.compradores)} ${n.compradores === 1 ? 'pessoa' : 'pessoas'}` : ''} · {numero(n.anterior.pagos)} no período anterior</span></div>
          <div className="numero"><b>{din(n.ticket_centavos)}</b><span>Ticket médio</span></div>
          <div className="numero"><b>{n.conversao == null ? '–' : `${Math.round(n.conversao * 100)}%`}</b><span>Pedidos que viraram venda · {din(n.nao_pagos_centavos)} ficaram no checkout</span></div>
          <div className="numero"><b>{numero(n.reembolsados + n.contestados)}</b><span>Reembolsos e contestações</span></div>
        </div>
      )}
      {d && (d.por_dia?.length > 1 || d.produtos?.length > 0) && (
        <div className="colunas">
          <div>{d.por_dia?.length > 1 && <Grupo titulo="Vendas por dia"><Colunas itens={colunasDoPeriodo(d.por_dia, moeda)} moeda={moeda} /></Grupo>}</div>
          <div>{d.produtos?.length > 0 && (
            <Grupo titulo="Por produto" rodape="O valor pago de cada um, já com cupom e juros. O bump conta como produto.">
              <TabelaOrigem linhas={d.produtos.map((p: any) => ({ ...p, chave: p.id }))} ativo={produto} escolher={setProduto} din={din} coluna="Produto" extra={(p) => (p.bump ? `${numero(p.bump)} como bump` : '')} />
            </Grupo>
          )}</div>
        </div>
      )}
      {d?.canais?.length > 0 && (
        <Grupo titulo="De onde vieram as vendas" rodape={<>Último toque antes da compra. Aqui, em Campanhas e em Conteúdos, as vendas contam pessoas: quem comprou duas vezes conta uma, e o dinheiro dos dois pedidos soma. Visitas são pessoas diferentes que chegaram por um link{moeda === 'usd' || produto ? ' (só no real e sem filtro de produto)' : ''}. Toque numa linha para filtrar.</>}>
          <TabelaOrigem linhas={d.canais.map((c: any) => ({ ...c, chave: c.nome }))} ativo={canal} escolher={setCanal} din={din} coluna="Canal" />
        </Grupo>
      )}
      {(d?.campanhas?.length > 0 || d?.conteudos?.length > 0) && (
        <div className="colunas">
          <div>{d.campanhas?.length > 0 && <Grupo titulo="Campanhas" rodape="utm_campaign. No Comenta X, é a palavra do post."><TabelaOrigem linhas={d.campanhas.map((c: any) => ({ ...c, chave: c.nome }))} ativo={campanha} escolher={setCampanha} din={din} coluna="Campanha" /></Grupo>}</div>
          <div>{d.conteudos?.length > 0 && <Grupo titulo="Conteúdos" rodape="utm_content. No Comenta X, é a versão da mensagem (skill-a, skill-b) ou o botão do curso."><TabelaOrigem linhas={d.conteudos.map((c: any) => ({ ...c, chave: c.nome }))} ativo={conteudo} escolher={setConteudo} din={din} coluna="Conteúdo" /></Grupo>}</div>
        </div>
      )}

      {fila.dados?.itens?.length ? (
        <Grupo titulo={`Fila de reembolso · ${dinheiro(fila.dados.total_centavos)}${fila.dados.total_usd_centavos ? ` + ${dinheiro(fila.dados.total_usd_centavos, 'usd')}` : ''}`} rodape="Até o dia, o dinheiro fica no caixa e o pedido conta como pago. No dia, o sistema devolve sozinho (pelo Asaas, ou pelo Stripe no curso em inglês). Abra o pedido para devolver antes ou tirar da fila.">
          {fila.dados.itens.map((r: any) => (
            <Celula key={r.id} icone={<Undo2 />} cor={r.status === 'falhou' ? 'vermelho' : 'ambar'} onClick={() => setAberta(r.pedido?.id)}
              titulo={<>#{r.pedido?.numero} · {r.pedido?.aluno?.nome || r.pedido?.aluno?.email}{r.pedido?.teste ? <span className="mudo"> (teste)</span> : null}</>}
              sub={r.status === 'falhou' ? `Não saiu: ${r.erro || 'erro no Asaas'}` : `Devolve ${data(r.devolver_em)}, ${faltam(r.devolver_em)}${r.motivo ? ` · ${r.motivo}` : ''}${r.tirou_acesso ? '' : ' · ainda com acesso'}`}
              direita={<><b className="num">{dinheiro(r.pedido?.total_centavos || 0, r.pedido?.moeda)}</b><Etiqueta cor={FILA[r.status]?.cor}>{FILA[r.status]?.t || r.status}</Etiqueta></>} />
          ))}
        </Grupo>
      ) : null}

      <h2 className="sub-titulo">Pedidos</h2>
      <div className="filtros">
        <input type="search" placeholder="Número do pedido, e-mail ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pedido" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_PEDIDO).map(([id, s]) => <option key={id} value={id}>{s.t}</option>)}
        </select>
      </div>
      {buscaFeita && <p className="mudo" style={{ margin: '0 0 12px' }}>A busca procura em todas as datas.</p>}
      {carregando && !d && faixa && <Carregando />}
      {d && (d.itens.length ? <>
        <Grupo>
          {d.itens.map((p: any) => (
            <Celula key={p.id} onClick={() => setAberta(p.id)}
              titulo={<>#{p.numero} · {p.aluno?.nome || p.aluno?.email}{p.teste ? <span className="mudo"> (teste)</span> : null}</>}
              sub={`${p.oferta?.nome || ''} · ${METODO[p.metodo] || p.metodo}${p.parcelas > 1 ? ` em ${p.parcelas}x` : ''} · ${textoToque(p.ultimo_toque)} · ${haQuanto(p.criado_em)}`}
              direita={<><b className="num">{dinheiro(p.total_centavos, p.moeda)}</b><EtiquetaPedido status={p.status} reembolsos={p.reembolsos} /></>} />
          ))}
        </Grupo>
        <Paginacao pagina={pagina} total={d.total} porPagina={d.por_pagina || 30} mudar={setPagina} />
      </> : <Vazio titulo={buscaFeita || status || temFiltro ? 'Nenhum pedido com esse filtro.' : 'Nenhum pedido neste período.'} texto={buscaFeita || status || temFiltro ? undefined : 'Escolha um período maior, ou espere: quando alguém comprar, o pedido aparece aqui na hora.'} />)}

      <DetalheVenda id={aberta} fechar={() => setAberta(null)} mudou={mudou} />
    </div>
  );
}

// Canal, campanha, conteúdo ou produto: visitas, vendas, conversão e dinheiro. A linha é o filtro (toque de novo para tirar).
function TabelaOrigem({ linhas, ativo, escolher, din, coluna, extra }: { linhas: any[]; ativo: string; escolher: (v: string) => void; din: (c: number) => string; coluna: string; extra?: (l: any) => string }) {
  const temVisitas = linhas.some((l) => l.visitas != null);
  return (
    <div className="tabela-rolar">
      <table className="tabela tabela-filtro">
        <thead><tr><th>{coluna}</th>{temVisitas && <th className="num">Visitas</th>}<th className="num">Vendas</th>{temVisitas && <th className="num">Conversão</th>}<th className="num">Faturamento</th></tr></thead>
        <tbody>{linhas.map((l) => (
          <tr key={l.chave} className={ativo === l.chave ? 'ativa' : ''}>
            <td><button type="button" onClick={() => escolher(ativo === l.chave ? '' : l.chave)} aria-pressed={ativo === l.chave}>{l.nome}{extra && extra(l) ? <small className="mudo"> {extra(l)}</small> : null}</button></td>
            {temVisitas && <td className="num">{l.visitas == null ? '–' : numero(l.visitas)}</td>}
            <td className="num">{numero(l.vendas)}</td>
            {temVisitas && <td className="num">{l.visitas ? `${((l.vendas / l.visitas) * 100).toFixed(1).replace('.', ',')}%` : '–'}</td>}
            <td className="num">{din(l.centavos)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// Pedido pago com reembolso na fila aparece como "Reembolso 05/11" (o dinheiro ainda não saiu).
export function EtiquetaPedido({ status, reembolsos }: { status: string; reembolsos?: any[] }) {
  const naFila = status === 'pago' && (reembolsos || []).find((r) => ABERTOS.includes(r.status));
  if (naFila) return <Etiqueta cor="ambar">Reembolso {data(naFila.devolver_em).slice(0, 5)}</Etiqueta>;
  const s = STATUS_PEDIDO[status] || { t: status, cor: 'cinza' };
  return <Etiqueta cor={s.cor}>{s.t}</Etiqueta>;
}

// Também no app "Vendas" do celular (Celular.tsx).
export function DetalheVenda({ id, fechar, mudou }: { id: string | null; fechar: () => void; mudou: () => void }) {
  const { pode } = useSessao();
  const { dados: p, erro, recarregar } = useCarregar(() => (id ? get(`/vendas/${id}`) : Promise.resolve(null)), [id]);
  const [confirmar, setConfirmar] = useState(false);
  const [dias, setDias] = useState(7);
  const [motivo, setMotivo] = useState('');
  const [tirar, setTirar] = useState(true);
  const [link, setLink] = useState('');
  const { ocupado, rodar } = useAcao();
  useEffect(() => { setConfirmar(false); setLink(''); setDias(7); setMotivo(''); setTirar(true); }, [id]);
  const aberto = p ? (p.reembolsos || []).find((r: any) => ABERTOS.includes(r.status)) : null;
  const quando = new Date(Date.now() + dias * 86400_000).toISOString();

  const reembolsar = () => rodar('reembolsar', async () => {
    await post(`/vendas/${id}/reembolsar`, { dias, motivo, tirar_acesso: tirar });
    setConfirmar(false); recarregar(); mudou();
  }, dias === 0 ? 'Reembolso feito. O acesso ao curso caiu.' : `Reembolso na fila: sai em ${data(quando)}.`);
  const devolverJa = () => rodar('devolver', async () => {
    await post(`/vendas/reembolsos/${aberto.id}/devolver`);
    recarregar(); mudou();
  }, 'Reembolso feito agora. O acesso ao curso caiu.');
  const tirarDaFila = () => rodar('cancelar', async () => {
    const r = await post(`/vendas/reembolsos/${aberto.id}/cancelar`);
    recarregar(); mudou();
    return r;
  }, 'Reembolso tirado da fila. Se o acesso tinha caído, ele voltou.');
  const reenviar = () => rodar('reenviar', async () => {
    const r = await post(`/vendas/${id}/reenviar`);
    setLink(r.link || '');
  }, 'E-mail de acesso enviado de novo.');

  const caminho = p ? p.toques || [] : [];
  return (
    <Modal titulo={p && p.id === id ? `Pedido #${p.numero}` : 'Pedido'} aberto={!!id} fechar={fechar}
      rodape={p && <>
        {p.status === 'pago' && pode('alunos.editar') && <button className="bt bt-texto" disabled={!!ocupado} onClick={reenviar}><Send />Reenviar acesso</button>}
        {p.status === 'pago' && pode('vendas.reembolsar') && !confirmar && !aberto && <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => setConfirmar(true)}><RotateCcw />Reembolsar</button>}
        <button className="bt bt-tinta" onClick={fechar}>Fechar</button>
      </>}>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {(!p || p.id !== id) && !erro && <Carregando />}
      {p && p.id === id && <>
        {p.teste && <Faixa tipo="info">Pedido de teste: não conta nos números.</Faixa>}
        {aberto && (
          <Faixa tipo={aberto.status === 'falhou' ? 'erro' : 'aviso'}>
            {aberto.status === 'falhou'
              ? <>O reembolso não saiu depois de 3 tentativas{aberto.erro ? `: ${aberto.erro}` : ''}. Tente de novo ou devolva pelo Asaas.</>
              : aberto.status === 'devolvendo' ? <>O reembolso está saindo agora pelo Asaas.</>
              : <>Na fila de reembolso: {dinheiro(p.total_centavos, p.moeda)} sai em <b>{dataHora(aberto.devolver_em)}</b> ({faltam(aberto.devolver_em)}). Até lá, o dinheiro fica no caixa e o pedido conta como pago.</>}
            <small style={{ display: 'block', marginTop: 6 }}>
              {aberto.quem?.nome ? `Pedido por ${aberto.quem.nome}` : aberto.pelo_aluno ? 'Pedido pelo aluno, no app' : 'Pedido pelo painel'} {haQuanto(aberto.criado_em)}.
              {aberto.motivo ? ` Motivo: ${aberto.motivo}.` : ''} {aberto.tirou_acesso ? 'O acesso já caiu.' : 'A pessoa continua com acesso até o dia.'}
            </small>
            {pode('vendas.reembolsar') && aberto.status !== 'devolvendo' && (
              <div className="barra-acoes" style={{ marginTop: 10 }}>
                <button className="bt bt-mini" disabled={!!ocupado} onClick={tirarDaFila}>Tirar da fila</button>
                <button className="bt bt-mini bt-perigo" disabled={!!ocupado} onClick={devolverJa}>{aberto.status === 'falhou' ? 'Tentar de novo' : 'Devolver agora'}</button>
              </div>
            )}
          </Faixa>
        )}
        {confirmar && (
          <Faixa tipo="aviso">
            <b>Quando devolver {dinheiro(p.total_centavos, p.moeda)} para {p.aluno?.nome || p.aluno?.email}?</b>
            <div className="chips soltos" style={{ display: 'flex', marginTop: 10 }}>
              {PRAZOS.map((o) => <button type="button" key={o.d} className={`chip ${dias === o.d ? 'ativo' : ''}`} onClick={() => setDias(o.d)}>{o.t}</button>)}
            </div>
            <Campo rotulo="Ou escolha os dias (0 a 30)" tipo="number" min={0} max={30} valor={dias} mudar={(v) => setDias(Math.max(0, Math.min(30, Math.round(Number(v) || 0))))} />
            {dias > 0 && <Marcar rotulo="Tirar o acesso agora" valor={tirar} mudar={setTirar} dica="Desmarcado, a pessoa continua no curso até o dia da devolução." />}
            <Campo rotulo="Motivo (opcional, só a equipe vê)" valor={motivo} mudar={setMotivo} />
            <p style={{ margin: '8px 0 0' }}>
              {dias === 0
                ? 'O dinheiro volta agora pelo Asaas, o acesso cai na hora e o pedido fica como reembolsado.'
                : `Entra na fila e sai sozinho em ${dataHora(quando)}. Até lá, o dinheiro fica no caixa e o pedido conta como pago. Dá para tirar da fila ou devolver antes.`}
            </p>
            <div className="barra-acoes" style={{ marginTop: 10 }}>
              <button className="bt bt-mini" onClick={() => setConfirmar(false)}>Cancelar</button>
              <button className="bt bt-mini bt-perigo" disabled={!!ocupado} onClick={reembolsar}>{dias === 0 ? 'Sim, reembolsar agora' : `Agendar para ${data(quando)}`}</button>
            </div>
          </Faixa>
        )}
        <dl className="lista-dados">
          <dt>Situação</dt><dd><EtiquetaPedido status={p.status} reembolsos={p.reembolsos} /></dd>
          <dt>Quem comprou</dt><dd><b>{p.aluno?.nome}</b><small>{p.aluno?.email}{p.aluno?.celular ? ` · ${p.aluno.celular}` : ''}</small>
            {numeroWhats(p.aluno?.celular) && <a className="bt bt-mini" style={{ marginTop: 8 }} href={`https://wa.me/${numeroWhats(p.aluno?.celular)}`} target="_blank" rel="noopener noreferrer"><MessageCircle />Chamar no WhatsApp</a>}</dd>
          {p.pagador?.estrangeiro && <><dt>País</dt><dd>{p.pagador.pais_nome || p.pagador.pais}<small>Mora fora do Brasil: comprou sem CPF, no cartão internacional, à vista.</small></dd></>}
          <dt>Oferta</dt><dd>{p.oferta?.nome}</dd>
          <dt>Itens</dt><dd>{(p.itens || []).map((i: any) => i.nome).join(' + ')}</dd>
          <dt>Valor</dt><dd><b>{dinheiro(p.total_centavos, p.moeda)}</b><small>
            {METODO[p.metodo]}{p.parcelas > 1 ? ` em ${p.parcelas}x` : ''}
            {p.desconto_centavos ? ` · desconto ${dinheiro(p.desconto_centavos, p.moeda)}` : ''}{p.juros_centavos ? ` · juros ${dinheiro(p.juros_centavos)}` : ''}
            {p.cupom ? ` · cupom ${p.cupom}` : ''}
          </small></dd>
          <dt>Datas</dt><dd>Criado {dataHora(p.criado_em)}{p.pago_em && <small>Pago {dataHora(p.pago_em)}</small>}</dd>
          <dt>Pagamento</dt><dd>{p.provedor === 'simulado' ? 'Simulado (computador)' : 'Asaas'}{p.cobranca_id && <small className="mono">{p.cobranca_id}</small>}</dd>
        </dl>

        <h3 className="sub-titulo">De onde veio</h3>
        <dl className="lista-dados">
          <dt>Primeiro toque</dt><dd>{textoToque(p.primeiro_toque)}{p.primeiro_toque?.quando && <small>{dataHora(p.primeiro_toque.quando)}{p.primeiro_toque.pagina ? ` · ${p.primeiro_toque.pagina}` : ''}</small>}</dd>
          <dt>Último toque</dt><dd>{textoToque(p.ultimo_toque)}{p.ultimo_toque?.quando && <small>{dataHora(p.ultimo_toque.quando)}{p.ultimo_toque.pagina ? ` · ${p.ultimo_toque.pagina}` : ''}</small>}{marcasDoToque(p.ultimo_toque) && <small className="mono">{marcasDoToque(p.ultimo_toque)}</small>}</dd>
          {caminho.length > 2 && <><dt>Caminho</dt><dd><small>{caminho.map((x: any) => textoToque(x)).join(' → ')}</small></dd></>}
        </dl>

        {p.nota_fiscal ? <><h3 className="sub-titulo">Nota fiscal</h3><p className="linha-pequena">{p.nota_fiscal.status === 'emitida' ? `Emitida${p.nota_fiscal.numero ? ` · nº ${p.nota_fiscal.numero}` : ''}` : p.nota_fiscal.status === 'erro' ? `Erro: ${p.nota_fiscal.erro}` : p.nota_fiscal.status === 'pendente' ? 'Na fila para emitir' : p.nota_fiscal.status}{p.nota_fiscal.pdf_url ? <> · <a href={p.nota_fiscal.pdf_url} target="_blank" rel="noreferrer">PDF</a></> : null}</p></> : null}
        {p.presente ? <><h3 className="sub-titulo">Presente</h3><p className="linha-pequena">Para {p.presente.nome || p.presente.email} ({p.presente.email}){p.presente.mensagem ? `: "${p.presente.mensagem}"` : ''}</p></> : null}
        {link && <><h3 className="sub-titulo">Link de entrada</h3><Segredo texto={link} aviso="Vale uma vez. Mande só para a própria pessoa (WhatsApp)." /></>}

        {p.emails?.length ? <>
          <h3 className="sub-titulo">E-mails</h3>
          {p.emails.map((e: any) => <p key={e.id} className="linha-pequena">{e.assunto} <Etiqueta cor={STATUS_EMAIL[e.status]?.cor}>{STATUS_EMAIL[e.status]?.t || e.status}</Etiqueta> <span className="mudo">{haQuanto(e.criado_em)}</span></p>)}
        </> : null}
        {p.reembolsos?.length ? <>
          <h3 className="sub-titulo">Reembolso</h3>
          {p.reembolsos.map((r: any) => (
            <p key={r.id} className="linha-pequena">
              <Etiqueta cor={FILA[r.status]?.cor}>{FILA[r.status]?.t || r.status}</Etiqueta>{' '}
              {r.status === 'feito' ? `Devolvido ${dataHora(r.feito_em)}` : r.status === 'cancelado' ? `Tirado da fila${r.feito_em ? ` ${dataHora(r.feito_em)}` : ''}` : `Para ${dataHora(r.devolver_em)}`}
              <span className="mudo"> · {r.dias ? `${r.dias} ${r.dias === 1 ? 'dia' : 'dias'}` : 'na hora'}{r.quem?.nome ? ` · ${r.quem.nome}` : r.pelo_aluno ? ' · pelo aluno' : ''}{r.nota ? ` · ${r.nota}` : ''}</span>
            </p>
          ))}
        </> : null}
        {p.eventos?.length ? <>
          <h3 className="sub-titulo">Avisos do pagamento</h3>
          {p.eventos.map((e: any) => <p key={e.id} className="linha-pequena"><span className="mono">{e.tipo}</span> <span className="mudo">{dataHora(e.recebido_em)}</span> {e.erro ? <Etiqueta cor="vermelho">{e.erro}</Etiqueta> : null}</p>)}
        </> : null}
      </>}
    </Modal>
  );
}
