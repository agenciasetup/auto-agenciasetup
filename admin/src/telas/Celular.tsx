// App "Vendas" (pedido do dono em 08/11/2026): o painel instalado na tela de início do iPhone, só com o que é de venda,
// e os avisos na hora (venda aprovada, pedido feito, reembolso, cartão recusado). Mora em /admin/celular, fora da
// moldura do painel: abas embaixo, números grandes, tudo com o polegar. Os dados são os mesmos da tela Vendas
// (/api/admin/vendas); os avisos ficam em /api/admin/avisos (worker/lib/acoes-avisos.js) e chegam pelo /admin/sw.js.
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, BellOff, BellRing, ChevronRight, Coins, LayoutGrid, MessageCircle, Receipt, RefreshCw, Search, Send, Share, SquarePlus, Undo2 } from 'lucide-react';
import '../celular.css';
import { get, patch, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Carregando, Celula, ErroCarga, Etiqueta, Faixa, Grupo, Marcar, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { METODO, data, dinheiro, haQuanto, numero } from '../nucleo/util';
import { Colunas } from './comum';
import { DetalheVenda, EtiquetaPedido } from './Vendas';
import { destravarSom, ligarSom, somLigado, tocarMoeda } from '../nucleo/som';
import Recuperar from './Recuperar';

const ABAS = [
  { id: 'resumo', t: 'Resumo', i: <BarChart3 /> },
  { id: 'pedidos', t: 'Pedidos', i: <Receipt /> },
  { id: 'recuperar', t: 'Recuperar', i: <MessageCircle /> },
  { id: 'reembolsos', t: 'Reembolsos', i: <Undo2 /> },
  { id: 'avisos', t: 'Avisos', i: <Bell /> },
];
const PERIODOS = [{ id: 'hoje', t: 'Hoje' }, { id: 'ontem', t: 'Ontem' }, { id: '7', t: '7 dias' }, { id: '30', t: '30 dias' }, { id: 'mes', t: 'Este mês' }];
const SITUACOES = [{ id: '', t: 'Todos' }, { id: 'pago', t: 'Pagos' }, { id: 'aguardando', t: 'Aguardando' }, { id: 'recusado', t: 'Recusados' }, { id: 'expirado', t: 'Expirados' }, { id: 'reembolsado', t: 'Reembolsados' }];

// O período em dias inteiros do horário do celular ("ate" é a meia-noite do dia seguinte).
function faixa(id: string) {
  const h = new Date();
  const d = (a: number, m: number, dia: number) => new Date(a, m, dia).toISOString();
  const [A, M, D] = [h.getFullYear(), h.getMonth(), h.getDate()];
  if (id === 'hoje') return { de: d(A, M, D), ate: d(A, M, D + 1) };
  if (id === 'ontem') return { de: d(A, M, D - 1), ate: d(A, M, D) };
  if (id === 'mes') return { de: d(A, M, 1), ate: d(A, M, D + 1) };
  return { de: d(A, M, D - (Number(id) - 1)), ate: d(A, M, D + 1) };
}

function comparacao(agora: number, antes: number) {
  if (!antes) return agora ? 'nada no período anterior' : '';
  const v = Math.round(((agora - antes) / antes) * 100);
  return v === 0 ? 'igual ao período anterior' : `${Math.abs(v)}% a ${v > 0 ? 'mais' : 'menos'} que o período anterior`;
}

// Instalado na tela de início (o iPhone só recebe avisos assim).
const instalado = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const ehIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function Chips({ opcoes, valor, mudar, rotulo }: { opcoes: { id: string; t: string }[]; valor: string; mudar: (v: string) => void; rotulo: string }) {
  return (
    <div className="chips cel-chips" role="group" aria-label={rotulo}>
      {opcoes.map((o) => <button key={o.id || 'todos'} type="button" className={`chip ${valor === o.id ? 'ativo' : ''}`} aria-pressed={valor === o.id} onClick={() => mudar(o.id)}>{o.t}</button>)}
    </div>
  );
}

export default function Celular() {
  const { rota, ir } = useRota();
  const { eu, pode } = useSessao();
  const aba = ABAS.some((a) => a.id === rota.busca.get('aba')) ? rota.busca.get('aba')! : rota.busca.get('pedido') ? 'pedidos' : 'resumo';
  const [periodo, setPeriodo] = useState('hoje');
  const [moeda, setMoeda] = useState('brl');
  const [aberto, setAberto] = useState<string | null>(rota.busca.get('pedido'));
  // Atualiza sozinho a cada 45 segundos com o app aberto, ao voltar para ele e no botão.
  const [versao, setVersao] = useState(0);
  useEffect(() => { document.title = 'Vendas | Agência Setup'; }, []);
  useEffect(() => { const p = rota.busca.get('pedido'); if (p) setAberto(p); }, [rota.busca.get('pedido')]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') setVersao((v) => v + 1); }, 45_000);
    const voltou = () => {
      if (document.visibilityState !== 'visible') return;
      setVersao((v) => v + 1);
      // Abriu o app: o número no ícone zera.
      try { (navigator as any).clearAppBadge && (navigator as any).clearAppBadge(); } catch {}
      navigator.serviceWorker?.controller?.postMessage('zerar');
    };
    voltou();
    document.addEventListener('visibilitychange', voltou);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', voltou); };
  }, []);
  // Aviso chegando com o app aberto: os números atualizam na hora e a venda toca o "plim" de moeda. O primeiro toque na
  // tela destrava o áudio (o iPhone só deixa tocar som depois de um toque).
  useEffect(() => {
    const toque = () => destravarSom();
    addEventListener('pointerdown', toque);
    const sw = navigator.serviceWorker;
    const aviso = (e: MessageEvent) => {
      const tipo = e.data && e.data.aviso;
      if (!tipo) return;
      setVersao((v) => v + 1);
      if ((tipo === 'venda' || tipo === 'teste') && somLigado()) tocarMoeda();
    };
    sw?.addEventListener('message', aviso);
    return () => { removeEventListener('pointerdown', toque); sw?.removeEventListener('message', aviso); };
  }, []);

  const irAba = (id: string) => ir(`/celular${id === 'resumo' ? '' : `?aba=${id}`}`, { trocar: true });
  const fecharPedido = () => { setAberto(null); if (rota.busca.get('pedido')) ir(`/celular?aba=${aba}`, { trocar: true }); };
  const titulo = ABAS.find((a) => a.id === aba)!.t;

  if (!pode('vendas.ver')) {
    return (
      <div className="app-cel">
        <div className="app-cel-corpo"><Faixa tipo="aviso">O app de vendas é para quem vê o faturamento (Administrador e Editor). Seu cargo é {eu.usuario.nome_papel}.</Faixa>
          <button className="bt" onClick={() => ir('/')}><LayoutGrid />Abrir o painel</button></div>
      </div>
    );
  }

  return (
    <div className="app-cel">
      <header className="app-cel-topo">
        <img src="/img/logo-setup-128.png" alt="" className="app-cel-logo" />
        <h1>{aba === 'resumo' ? 'Vendas' : titulo}</h1>
        <button className="bt-icone" onClick={() => setVersao((v) => v + 1)} aria-label="Atualizar"><RefreshCw /></button>
        <button className="bt-icone" onClick={() => ir('/')} aria-label="Abrir o painel completo"><LayoutGrid /></button>
      </header>

      <main className="app-cel-corpo">
        {aba === 'resumo' && <Resumo periodo={periodo} setPeriodo={setPeriodo} moeda={moeda} setMoeda={setMoeda} versao={versao} abrir={setAberto} irAba={irAba} />}
        {aba === 'pedidos' && <Pedidos periodo={periodo} setPeriodo={setPeriodo} moeda={moeda} versao={versao} abrir={setAberto} />}
        {aba === 'recuperar' && (pode('recuperar.ver') ? <Recuperar /> : <Faixa tipo="aviso">Seu cargo não abre a lista de recuperar vendas.</Faixa>)}
        {aba === 'reembolsos' && <Reembolsos versao={versao} abrir={setAberto} />}
        {aba === 'avisos' && <Avisos />}
      </main>

      <nav className="app-cel-abas" aria-label="Seções">
        {ABAS.map((a) => (
          <button key={a.id} className={aba === a.id ? 'ativo' : ''} aria-current={aba === a.id ? 'page' : undefined} onClick={() => irAba(a.id)}>{a.i}<span>{a.t}</span></button>
        ))}
      </nav>

      <DetalheVenda id={aberto} fechar={fecharPedido} mudou={() => setVersao((v) => v + 1)} />
    </div>
  );
}

// ---------------------------------------------------------------- resumo
function Resumo({ periodo, setPeriodo, moeda, setMoeda, versao, abrir, irAba }: { periodo: string; setPeriodo: (v: string) => void; moeda: string; setMoeda: (v: string) => void; versao: number; abrir: (id: string) => void; irAba: (id: string) => void }) {
  const f = faixa(periodo);
  const { dados, erro, recarregar } = useCarregar(() => get(`/vendas?${new URLSearchParams({ pagina: '1', moeda, de: f.de, ate: f.ate })}`), [periodo, moeda, versao]);
  const fila = useCarregar(() => get('/vendas/reembolsos'), [versao]);
  const d: any = dados;
  const n = d?.numeros;
  const din = (c: number) => dinheiro(c, moeda);
  const ultimos = (d?.itens || []).slice(0, 6);
  const colunas = useMemo(() => (d?.por_dia || []).map((x: any) => {
    const [, m, dia] = String(x.dia).split('-');
    return { rotulo: `${dia}/${m}`, valor: x.centavos, detalhe: `${dia}/${m}: ${x.pagos ? `${din(x.centavos)} · ${x.pagos} ${x.pagos === 1 ? 'venda' : 'vendas'}` : 'sem venda'}` };
  }), [d, moeda]);
  const naFila = fila.dados?.itens?.length || 0;

  return <>
    <Chips opcoes={PERIODOS} valor={periodo} mudar={setPeriodo} rotulo="Período" />
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {!d && !erro && <Carregando />}
    {n && <>
      <section className="cel-hero">
        <span className="cel-hero-rotulo">Faturamento · {PERIODOS.find((p) => p.id === periodo)?.t.toLowerCase()}</span>
        <b className="num">{din(n.faturamento_centavos)}</b>
        <span>{numero(n.pagos)} {n.pagos === 1 ? 'venda' : 'vendas'}{n.pagos ? ` · ticket médio ${din(n.ticket_centavos)}` : ''}</span>
        {comparacao(n.faturamento_centavos, n.anterior.faturamento_centavos) && <span className="mudo">{comparacao(n.faturamento_centavos, n.anterior.faturamento_centavos)}</span>}
        <div className="cel-moeda">
          <button type="button" className={moeda === 'brl' ? 'ativo' : ''} onClick={() => setMoeda('brl')}>R$</button>
          <button type="button" className={moeda === 'usd' ? 'ativo' : ''} onClick={() => setMoeda('usd')}>US$</button>
        </div>
      </section>
      <div className="cel-grade">
        <button type="button" className="cel-cartao" onClick={() => irAba('pedidos')}><b className="num">{numero(n.aguardando)}</b><span>Aguardando pagamento</span></button>
        <div className="cel-cartao"><b className="num">{n.conversao == null ? '–' : `${Math.round(n.conversao * 100)}%`}</b><span>Pedidos que viraram venda</span></div>
        <button type="button" className="cel-cartao" onClick={() => irAba('recuperar')}><b className="num">{din(n.nao_pagos_centavos)}</b><span>Ficaram no checkout</span></button>
        <button type="button" className="cel-cartao" onClick={() => irAba('reembolsos')}><b className="num">{numero(n.reembolsados + n.contestados)}</b><span>Reembolsos e contestações{naFila ? ` · ${naFila} na fila` : ''}</span></button>
      </div>
      {colunas.length > 1 && <Grupo titulo="Por dia"><Colunas itens={colunas} moeda={moeda} /></Grupo>}
      <Grupo titulo="Últimos pedidos" acoes={<button className="bt bt-texto bt-mini" onClick={() => irAba('pedidos')}>Ver todos<ChevronRight /></button>}>
        {ultimos.length ? ultimos.map((p: any) => <LinhaPedido key={p.id} p={p} abrir={abrir} />) : <Vazio titulo="Nenhum pedido neste período." texto="Quando alguém comprar, aparece aqui na hora." />}
      </Grupo>
      {d.produtos?.length > 0 && (
        <Grupo titulo="Por produto">
          {d.produtos.slice(0, 6).map((p: any) => <Celula key={p.id} titulo={p.nome} sub={`${numero(p.vendas)} ${p.vendas === 1 ? 'venda' : 'vendas'}${p.bump ? ` · ${numero(p.bump)} como bump` : ''}`} direita={<b className="num">{din(p.centavos)}</b>} />)}
        </Grupo>
      )}
      {d.canais?.length > 0 && (
        <Grupo titulo="De onde vieram" rodape="O último link antes da compra.">
          {d.canais.slice(0, 6).map((c: any) => <Celula key={c.nome} titulo={c.nome} sub={`${numero(c.vendas)} ${c.vendas === 1 ? 'venda' : 'vendas'}${c.visitas ? ` · ${numero(c.visitas)} visitas` : ''}`} direita={<b className="num">{din(c.centavos)}</b>} />)}
        </Grupo>
      )}
    </>}
  </>;
}

function LinhaPedido({ p, abrir }: { p: any; abrir: (id: string) => void }) {
  return (
    <Celula onClick={() => abrir(p.id)}
      titulo={<>{p.aluno?.nome || p.aluno?.email || `#${p.numero}`}{p.teste ? <span className="mudo"> (teste)</span> : null}</>}
      sub={`#${p.numero} · ${p.oferta?.nome || ''} · ${METODO[p.metodo] || p.metodo}${p.parcelas > 1 ? ` ${p.parcelas}x` : ''} · ${haQuanto(p.criado_em)}`}
      direita={<><b className="num">{dinheiro(p.total_centavos, p.moeda)}</b><EtiquetaPedido status={p.status} reembolsos={p.reembolsos} /></>} />
  );
}

// ---------------------------------------------------------------- pedidos
function Pedidos({ periodo, setPeriodo, moeda, versao, abrir }: { periodo: string; setPeriodo: (v: string) => void; moeda: string; versao: number; abrir: (id: string) => void }) {
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  const chave = `${periodo}|${moeda}|${status}|${buscaFeita}|${versao}`;
  useEffect(() => { setPagina(1); }, [chave]);
  const { dados, erro, carregando, recarregar } = useCarregar(() => {
    const f = faixa(periodo);
    const q = new URLSearchParams({ pagina: String(pagina), moeda, de: f.de, ate: f.ate });
    if (status) q.set('status', status);
    if (buscaFeita) q.set('busca', buscaFeita);
    return get(`/vendas?${q}`);
  }, [chave, pagina]);
  useEffect(() => {
    const d: any = dados;
    if (!d) return;
    setLista((l) => (pagina === 1 ? d.itens : [...l, ...d.itens.filter((x: any) => !l.some((y) => y.id === x.id))]));
    setTotal(d.total || 0);
  }, [dados]);

  return <>
    <Chips opcoes={PERIODOS} valor={periodo} mudar={setPeriodo} rotulo="Período" />
    <Chips opcoes={SITUACOES} valor={status} mudar={setStatus} rotulo="Situação" />
    <label className="cel-busca"><Search /><input type="search" placeholder="Número, e-mail ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pedido" enterKeyHint="search" /></label>
    {buscaFeita && <p className="mudo cel-nota">A busca procura em todas as datas.</p>}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !lista.length && <Carregando />}
    {!carregando && !lista.length && !erro && <Vazio titulo={buscaFeita || status ? 'Nenhum pedido com esse filtro.' : 'Nenhum pedido neste período.'} />}
    {lista.length > 0 && <>
      <p className="mudo cel-nota">{numero(total)} {total === 1 ? 'pedido' : 'pedidos'}</p>
      <Grupo>{lista.map((p) => <LinhaPedido key={p.id} p={p} abrir={abrir} />)}</Grupo>
      {lista.length < total && <button className="bt cel-mais" disabled={carregando} onClick={() => setPagina((n) => n + 1)}>{carregando ? 'Carregando…' : 'Carregar mais'}</button>}
    </>}
  </>;
}

// ---------------------------------------------------------------- reembolsos
const FILA: Record<string, { t: string; cor: string }> = { agendado: { t: 'Na fila', cor: 'ambar' }, devolvendo: { t: 'Devolvendo', cor: 'azul' }, falhou: { t: 'Falhou', cor: 'vermelho' } };

function Reembolsos({ versao, abrir }: { versao: number; abrir: (id: string) => void }) {
  const { dados, erro, recarregar } = useCarregar(() => get('/vendas/reembolsos'), [versao]);
  const d: any = dados;
  const pedidos = useCarregar(() => get(`/vendas?${new URLSearchParams({ pagina: '1', status: 'reembolsado', ...faixa('30') })}`), [versao]);
  const feitos: any[] = (pedidos.dados as any)?.itens || [];
  return <>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {!d && !erro && <Carregando />}
    {d && (d.itens.length ? (
      <Grupo titulo={`Na fila · ${dinheiro(d.total_centavos)}${d.total_usd_centavos ? ` + ${dinheiro(d.total_usd_centavos, 'usd')}` : ''}`} rodape="Até o dia, o dinheiro fica no caixa. No dia, o sistema devolve sozinho. Abra o pedido para devolver antes ou tirar da fila.">
        {d.itens.map((r: any) => (
          <Celula key={r.id} icone={<Undo2 />} cor={r.status === 'falhou' ? 'vermelho' : 'ambar'} onClick={() => abrir(r.pedido?.id)}
            titulo={<>{r.pedido?.aluno?.nome || r.pedido?.aluno?.email}{r.pedido?.teste ? <span className="mudo"> (teste)</span> : null}</>}
            sub={r.status === 'falhou' ? `Não saiu: ${r.erro || 'erro no pagamento'}` : `#${r.pedido?.numero} · sai ${data(r.devolver_em)}${r.pelo_aluno ? ' · pedido pelo aluno' : ''}${r.motivo ? ` · ${r.motivo}` : ''}`}
            direita={<><b className="num">{dinheiro(r.pedido?.total_centavos || 0, r.pedido?.moeda)}</b><Etiqueta cor={FILA[r.status]?.cor}>{FILA[r.status]?.t || r.status}</Etiqueta></>} />
        ))}
      </Grupo>
    ) : <Vazio titulo="Nenhum reembolso na fila." texto="Quando um aluno pedir reembolso pelo app, ele aparece aqui e chega um aviso." />)}
    {feitos.length > 0 && <Grupo titulo="Reembolsados nos últimos 30 dias">{feitos.map((p) => <LinhaPedido key={p.id} p={p} abrir={abrir} />)}</Grupo>}
  </>;
}

// ---------------------------------------------------------------- avisos
const b64u = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s: string) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
const ID_LOCAL = 'agenciasetup-aviso-id';
const lerId = () => { try { return localStorage.getItem(ID_LOCAL); } catch { return null; } };
const guardarId = (id: string | null) => { try { id ? localStorage.setItem(ID_LOCAL, id) : localStorage.removeItem(ID_LOCAL); } catch {} };

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computador';
  const onde = instalado() ? 'app Vendas' : /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'navegador';
  return `${so} (${onde})`;
}

function Avisos() {
  const { dados, setDados, erro, recarregar } = useCarregar(() => get('/avisos'), []);
  const d: any = dados;
  const { ocupado, rodar } = useAcao();
  const [inscricao, setInscricao] = useState<PushSubscription | null | undefined>(undefined);
  const [permissao, setPermissao] = useState<string>(typeof Notification !== 'undefined' ? Notification.permission : 'indisponivel');
  const [resultado, setResultado] = useState<any[] | null>(null);
  const [som, setSom] = useState(somLigado());
  const suporta = 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
  const precisaInstalar = ehIos() && !instalado();

  useEffect(() => {
    if (!suporta) { setInscricao(null); return; }
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setInscricao).catch(() => setInscricao(null));
  }, []);

  const meuId = lerId();
  const este = d && inscricao ? (d.aparelhos || []).find((a: any) => a.id === meuId) : null;
  const outros = d ? (d.aparelhos || []).filter((a: any) => !este || a.id !== este.id) : [];

  // O pedido de permissão sai já no toque (o iPhone só aceita assim); o resto vem depois.
  const ligar = () => {
    const pedido = Notification.requestPermission();
    rodar('ligar', async () => {
      const p = await pedido;
      setPermissao(p);
      if (p !== 'granted') throw new Error(p === 'denied' ? 'Os avisos estão bloqueados para este app. Libere nos ajustes do aparelho e tente de novo.' : 'Sem a permissão, os avisos não chegam.');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      const chave = sub && (sub.options as any)?.applicationServerKey;
      if (sub && chave && b64u(new Uint8Array(chave)) !== d.publica) { await sub.unsubscribe(); sub = null; }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(d.publica) });
      const j = sub.toJSON();
      const a = await post('/avisos', { endpoint: j.endpoint, keys: j.keys, aparelho: nomeDoAparelho() });
      guardarId(a.id);
      setInscricao(sub);
      recarregar();
    }, 'Avisos ligados neste aparelho.');
  };

  const mudarTipo = (a: any, tipo: string, ligado: boolean) => rodar(`tipo-${a.id}`, async () => {
    const eventos = ligado ? [...new Set([...(a.eventos || []), tipo])] : (a.eventos || []).filter((t: string) => t !== tipo);
    const novo = await patch(`/avisos/${a.id}`, { eventos });
    setDados({ ...d, aparelhos: d.aparelhos.map((x: any) => (x.id === a.id ? novo : x)) });
  });

  const testar = (id?: string) => rodar('testar', async () => {
    const r = await post('/avisos/teste', id ? { id } : {});
    setResultado(r.resultados);
    if (r.resultados.some((x: any) => !x.ok)) recarregar();
  });

  const desligar = (a: any) => rodar(`sair-${a.id}`, async () => {
    if (este && a.id === este.id && inscricao) { await inscricao.unsubscribe().catch(() => {}); setInscricao(null); guardarId(null); }
    await post(`/avisos/${a.id}/desligar`);
    recarregar();
  }, 'Avisos desligados nesse aparelho.');

  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (!d || inscricao === undefined) return <Carregando />;

  const tipos = (a: any) => (
    <div className="cel-tipos">
      {d.tipos.map((t: any) => <Marcar key={t.id} rotulo={t.t} dica={t.sub} valor={(a.eventos || []).includes(t.id)} desativado={!!ocupado} mudar={(v) => mudarTipo(a, t.id, v)} />)}
    </div>
  );

  return <>
    {precisaInstalar ? (
      <section className="cel-instalar">
        <h2>Instale o app para receber os avisos</h2>
        <p className="mudo">No iPhone, os avisos só chegam com o app na tela de início (iOS 16.4 ou mais novo). Leva 30 segundos:</p>
        <ol>
          <li>Abra esta página no <b>Safari</b>.</li>
          <li>Toque em <b>Compartilhar</b> <Share className="cel-icone-texto" /> na barra de baixo.</li>
          <li>Toque em <b>Adicionar à Tela de Início</b> <SquarePlus className="cel-icone-texto" /> e depois em <b>Adicionar</b>.</li>
          <li>Abra o app <b>Vendas</b> pelo ícone laranja, entre com o seu login e volte nesta aba.</li>
        </ol>
      </section>
    ) : !suporta ? (
      <Faixa tipo="aviso">Este navegador não recebe avisos. No iPhone, use o Safari e instale o app na tela de início. No computador, o Chrome, o Edge e o Firefox recebem.</Faixa>
    ) : permissao === 'denied' && !este ? (
      <Faixa tipo="aviso">{ehIos()
        ? <>Os avisos estão bloqueados para este app. No iPhone: <b>Ajustes &gt; Notificações &gt; Vendas</b> e ligue <b>Permitir Notificações</b>. Depois volte aqui.</>
        : <>Os avisos estão bloqueados neste navegador. Toque no cadeado ao lado do endereço, libere <b>Notificações</b> e recarregue a página.</>}</Faixa>
    ) : !este ? (
      <section className="cel-instalar">
        <h2>Ligue os avisos neste aparelho</h2>
        <p className="mudo">Venda aprovada, Pix gerado, reembolso e cartão recusado chegam na hora, com o nome de quem comprou e o valor.</p>
        <button className="bt bt-tinta cel-largo" disabled={!!ocupado} onClick={ligar}><BellRing />{ocupado === 'ligar' ? 'Ligando…' : 'Ligar os avisos'}</button>
      </section>
    ) : (
      <Grupo titulo={`Este aparelho · ${este.aparelho}`} acoes={<Etiqueta cor="verde">Ligado</Etiqueta>}>
        {tipos(este)}
        {este.ultimo_erro && <Faixa tipo="erro">O último aviso não chegou ({haQuanto(este.ultimo_erro.em)}): {este.ultimo_erro.erro}</Faixa>}
        <div className="cel-botoes">
          <button className="bt" disabled={!!ocupado} onClick={() => testar(este.id)}><Send />{ocupado === 'testar' ? 'Mandando…' : 'Mandar um aviso de teste'}</button>
          <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => desligar(este)}><BellOff />Desligar aqui</button>
        </div>
      </Grupo>
    )}

    {resultado && (
      <Faixa tipo={resultado.every((r) => r.ok) ? 'ok' : 'erro'}>
        {resultado.map((r) => <div key={r.id}>{r.aparelho}: {r.ok ? 'mandado. Se não aparecer em alguns segundos, confira se o modo Foco não está segurando os avisos.' : r.saiu ? 'esse aparelho saiu dos avisos (desinstalou ou bloqueou). Ligue de novo nele.' : `não foi (${r.erro || 'erro'}).`}</div>)}
      </Faixa>
    )}

    {outros.length > 0 && (
      <Grupo titulo="Seus outros aparelhos" rodape="Cada aparelho escolhe os próprios avisos. Desligue os que você não usa mais.">
        {outros.map((a: any) => (
          <details key={a.id} className="cel-aparelho">
            <summary><span><b>{a.aparelho}</b><small className="mudo">{a.ultimo_erro ? `Último aviso não chegou: ${a.ultimo_erro.erro}` : `Ligado ${haQuanto(a.criado_em)}`}</small></span><ChevronRight /></summary>
            {tipos(a)}
            <div className="cel-botoes">
              <button className="bt bt-mini" disabled={!!ocupado} onClick={() => testar(a.id)}><Send />Testar</button>
              <button className="bt bt-mini bt-texto bt-perigo" disabled={!!ocupado} onClick={() => desligar(a)}><BellOff />Desligar</button>
            </div>
          </details>
        ))}
      </Grupo>
    )}
    <Grupo titulo="Som de moeda" rodape="Com o app aberto na tela, cada venda toca o plim. Com o app fechado ou a tela bloqueada, o aviso usa o som padrão do iPhone: a Apple não deixa site nem app da web escolher outro som.">
      <div className="cel-tipos"><Marcar rotulo="Tocar o plim de moeda na venda" valor={som} mudar={(v) => { ligarSom(v); setSom(v); if (v) tocarMoeda(); }} /></div>
      <div className="cel-botoes"><button className="bt" onClick={() => tocarMoeda()}><Coins />Ouvir o plim</button></div>
    </Grupo>
    <p className="mudo cel-nota">Os avisos vão só para quem vê o faturamento (Administrador e Editor). Pedidos de teste só avisam se você ligar essa opção.</p>
  </>;
}
