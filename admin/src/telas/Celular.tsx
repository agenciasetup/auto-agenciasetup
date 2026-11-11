// O app do celular (/admin/celular): o painel instalado na tela de início do iPhone. Nasceu em 08/11/2026 só com as
// vendas; em 10/11/2026 o dono pediu o Escritório, o direct e a Colmeia ali, "bem imersivo, pensado na navegação do
// celular". Mora fora da moldura do painel: cinco abas embaixo (Hoje, Escritório, Direct, Colmeia e Vendas), cada uma com
// o número do que espera o dono, tudo ao alcance do polegar. Abre na hora com o último dado guardado no aparelho
// (CelularBase.tsx), atualiza sozinho a cada 45 segundos, ao voltar para o app, no botão e puxando a tela para baixo.
// Nenhuma rota nova no servidor: cada aba lê a mesma API da tela grande. Os avisos chegam pelo /admin/sw.js.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BarChart3, Bell, Building2, ChevronLeft, Hexagon, LayoutGrid, RefreshCw, Send, Sun } from 'lucide-react';
import '../celular.css';
import { get } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { useSessao } from '../nucleo/ui';
import { destravarSom, somLigado, tocarMoeda } from '../nucleo/som';
import { Puxar, useGuardado } from './CelularBase';
import CelularVendas, { AvisosCelular } from './CelularVendas';
import CelularHoje from './CelularHoje';
import CelularEscritorio from './CelularEscritorio';
import CelularDirect from './CelularDirect';
import CelularColmeia from './CelularColmeia';

// exige: basta uma das permissões. espera: o item de /esperando que vira o número na aba.
type Tela = { id: string; t: string; i: ReactNode; exige: string[]; espera?: string };
const TELAS: Tela[] = [
  { id: 'hoje', t: 'Hoje', i: <Sun />, exige: [] },
  { id: 'escritorio', t: 'Escritório', i: <Building2 />, exige: ['escritorio.ver'], espera: 'mesa' },
  { id: 'direct', t: 'Direct', i: <Send />, exige: ['followup.ver'], espera: 'duvidas' },
  { id: 'colmeia', t: 'Colmeia', i: <Hexagon />, exige: ['colmeia.ver'], espera: 'colmeia' },
  { id: 'vendas', t: 'Vendas', i: <BarChart3 />, exige: ['vendas.ver', 'suporte.ver'], espera: 'chamados' },
];

export default function Celular() {
  const { rota, ir } = useRota();
  const { pode } = useSessao();
  const telas = TELAS.filter((t) => !t.exige.length || t.exige.some((p) => pode(p)));
  const pedida = rota.busca.get('tela');
  // Endereços antigos continuam valendo: ?pedido= e ?aba= abrem as Vendas, ?aba=avisos abre os avisos.
  const tela = pedida === 'avisos' || rota.busca.get('aba') === 'avisos' ? 'avisos'
    : telas.some((t) => t.id === pedida) ? pedida!
      : (rota.busca.get('pedido') || rota.busca.get('aba')) && telas.some((t) => t.id === 'vendas') ? 'vendas' : 'hoje';

  // Atualiza sozinho a cada 45 segundos com o app aberto, ao voltar para ele, no botão e puxando a tela.
  const [versao, setVersao] = useState(0);
  const [girando, setGirando] = useState(false);
  const mudou = useCallback(() => setVersao((v) => v + 1), []);
  const atualizar = useCallback(() => { setVersao((v) => v + 1); setGirando(true); setTimeout(() => setGirando(false), 800); }, []);
  const espera = useGuardado<any>('esperando', () => get('/esperando'), [versao]);
  const conta = (id?: string) => (id ? Number((espera.dados?.itens || []).find((i: any) => i.id === id)?.n) || 0 : 0);

  useEffect(() => { document.title = 'Setup | Agência Setup'; }, []);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') setVersao((v) => v + 1); }, 45_000);
    const voltou = () => { if (document.visibilityState === 'visible') setVersao((v) => v + 1); };
    document.addEventListener('visibilitychange', voltou);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', voltou); };
  }, []);
  // O número no ícone do app: o que espera o dono agora (o sw.js soma os avisos que chegarem depois).
  const total = espera.dados ? Number(espera.dados.total) || 0 : null;
  useEffect(() => {
    if (total === null) return;
    try { const n: any = navigator; if (n.setAppBadge) (total ? n.setAppBadge(total) : n.clearAppBadge()).catch(() => {}); } catch {}
    try { navigator.serviceWorker?.controller?.postMessage({ contador: total }); } catch {}
  }, [total]);
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

  const irTela = useCallback((id: string, extra = '') => {
    ir(id === 'hoje' ? '/celular' : `/celular?tela=${id}${extra}`, { trocar: true });
    window.scrollTo(0, 0);
  }, [ir]);
  const titulo = tela === 'avisos' ? 'Avisos' : TELAS.find((t) => t.id === tela)!.t;

  return (
    <div className="app-cel">
      <Puxar acao={atualizar} />
      <header className="app-cel-topo">
        {tela === 'avisos'
          ? <button className="bt-icone" onClick={() => irTela('hoje')} aria-label="Voltar"><ChevronLeft /></button>
          : <img src="/img/logo-setup-128.png" alt="" className="app-cel-logo" />}
        <h1>{titulo}</h1>
        <button className="bt-icone" onClick={atualizar} aria-label="Atualizar"><RefreshCw className={girando ? 'cel-gira' : ''} /></button>
        <button className={`bt-icone ${tela === 'avisos' ? 'ativo' : ''}`} onClick={() => irTela(tela === 'avisos' ? 'hoje' : 'avisos')} aria-label="Avisos deste aparelho"><Bell /></button>
        <button className="bt-icone" onClick={() => ir('/')} aria-label="Abrir o painel completo"><LayoutGrid /></button>
      </header>

      <main className="app-cel-corpo" key={tela}>
        {tela === 'hoje' && <CelularHoje versao={versao} espera={espera.dados} irTela={irTela} />}
        {tela === 'escritorio' && <CelularEscritorio versao={versao} mudou={mudou} />}
        {tela === 'direct' && <CelularDirect versao={versao} mudou={mudou} />}
        {tela === 'colmeia' && <CelularColmeia versao={versao} mudou={mudou} />}
        {tela === 'vendas' && <CelularVendas versao={versao} mudou={mudou} />}
        {tela === 'avisos' && <AvisosCelular />}
      </main>

      <nav className="app-cel-abas" aria-label="Seções">
        {telas.map((a) => {
          const n = conta(a.espera);
          return (
            <button key={a.id} className={tela === a.id ? 'ativo' : ''} aria-current={tela === a.id ? 'page' : undefined} onClick={() => irTela(a.id)}>
              <span className="cel-aba-icone">{a.i}{n > 0 && <b className="cel-pingo" aria-label={`${n} esperando você`}>{n > 99 ? '99+' : n}</b>}</span>
              <span>{a.t}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
