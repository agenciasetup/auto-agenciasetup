// A aba Hoje do app do celular: o que espera o dono (cada item leva para a aba certa), as vendas do dia, quem está
// trabalhando no Escritório agora e o gasto de IA contra o teto. Tudo com os dados que as telas grandes já usam
// (/esperando, /vendas e /escritorio), cada bloco só para quem tem a permissão.
import { ChevronRight } from 'lucide-react';
import { get } from '../nucleo/api';
import { useSessao } from '../nucleo/ui';
import { dinheiro, numero } from '../nucleo/util';
import { Barra, Secao, SemRede, corDaSala, dolar, estiloCor, useGuardado } from './CelularBase';

// Para onde leva cada item do "Esperando você", e a cor da sala que cuida dele.
const DESTINO: Record<string, { tela: string; extra?: string; sala: string }> = {
  mesa: { tela: 'escritorio', sala: 'direcao' },
  duvidas: { tela: 'direct', sala: 'vendas' },
  colmeia: { tela: 'colmeia', sala: 'vendas' },
  chamados: { tela: 'vendas', extra: '&aba=chamados', sala: 'produto' },
  entregas: { tela: '', sala: 'video' },
};
const ORDEM_FALA: Record<string, number> = { atencao: 0, agora: 1, feito: 2 };
const hojeTexto = () => new Date().toDateString();

export default function CelularHoje({ versao, espera, irTela }: { versao: number; espera: any; irTela: (id: string, extra?: string) => void }) {
  const { eu, pode } = useSessao();
  const veVendas = pode('vendas.ver');
  const veEsc = pode('escritorio.ver');
  const vendas = useGuardado<any>('hoje-vendas', async () => {
    if (!veVendas) return null;
    const h = new Date();
    const de = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    const ate = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1);
    const d: any = await get(`/vendas?${new URLSearchParams({ pagina: '1', moeda: 'brl', de: de.toISOString(), ate: ate.toISOString() })}`);
    return { numeros: d.numeros, dia: hojeTexto() };
  }, [versao]);
  const esc = useGuardado<any>('escritorio', () => (veEsc ? get('/escritorio') : Promise.resolve(null)), [versao]);

  const hora = new Date().getHours();
  const saudacao = hora < 5 ? 'Boa madrugada' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = String(eu.usuario.nome || '').trim().split(' ')[0];
  const dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // O número de ontem guardado no aparelho não aparece como se fosse de hoje.
  const n = vendas.dados && vendas.dados.dia === hojeTexto() ? vendas.dados.numeros : null;
  const itens: any[] = (espera?.itens || []).filter((i: any) => Number(i.n) > 0 || (i.id === 'mesa' && i.nota));
  const e = esc.dados;
  const agentes: any[] = (e?.salas || []).flatMap((s: any) => s.agentes || []);
  const falando = agentes.filter((a) => a.fala).sort((a, b) => (ORDEM_FALA[a.fala.tipo] ?? 9) - (ORDEM_FALA[b.fala.tipo] ?? 9));
  const bonecos: Record<string, string> = e?.arte?.bonecos || {};
  const maquinas: any[] = e?.maquinas?.lista || [];

  return <>
    <header className="cel-ola">
      <h2>{saudacao}{nome ? `, ${nome}` : ''}</h2>
      <p>{dia.charAt(0).toUpperCase() + dia.slice(1)}</p>
    </header>
    <SemRede erro={vendas.erro || esc.erro} tentar={() => { vendas.recarregar(); esc.recarregar(); }} />

    {veVendas && (
      <button type="button" className="cel-hero cel-hero-toque" onClick={() => irTela('vendas')}>
        <span className="cel-hero-rotulo">Vendas de hoje</span>
        <b className="num">{n ? dinheiro(n.faturamento_centavos, 'brl') : '…'}</b>
        <span>{n ? `${numero(n.pagos)} ${n.pagos === 1 ? 'venda' : 'vendas'}${n.pagos ? ` · ticket médio ${dinheiro(n.ticket_centavos, 'brl')}` : ''}${n.aguardando ? ` · ${numero(n.aguardando)} aguardando pagamento` : ''}` : 'Buscando o número de hoje'}</span>
        <ChevronRight className="cel-hero-seta" />
      </button>
    )}

    <Secao titulo="Esperando você" lado={espera?.total ? <b className="cel-conta">{espera.total}</b> : null}>
      {!espera && <p className="cel-quieto">Buscando o que espera você…</p>}
      {espera && itens.length === 0 && <p className="cel-quieto">Tudo em dia. Nada espera a sua decisão agora.</p>}
      {itens.map((i: any) => {
        const d = DESTINO[i.id] || { tela: '', sala: 'sistema' };
        const miolo = <>
          <b className="num">{numero(i.n)}</b>
          <span><strong>{i.titulo}</strong><small>{Number(i.n) === 1 ? i.um : i.varios}</small>{i.nota && <small className="cel-espera-nota">{i.nota}</small>}</span>
          {d.tela && <ChevronRight />}
        </>;
        return d.tela
          ? <button key={i.id} type="button" className="cel-espera" style={estiloCor(corDaSala(d.sala))} onClick={() => irTela(d.tela, d.extra)}>{miolo}</button>
          : <div key={i.id} className="cel-espera" style={estiloCor(corDaSala(d.sala))}>{miolo}</div>;
      })}
    </Secao>

    {veEsc && e && (
      <Secao titulo="No escritório agora" lado={<button type="button" className="bt bt-texto bt-mini" onClick={() => irTela('escritorio')}>Abrir<ChevronRight /></button>}>
        {falando.length > 0 ? (
          <div className="cel-falas" data-sem-puxar>
            {falando.map((a) => (
              <div key={a.id} className={`cel-fala ${a.fala.tipo}`} style={estiloCor(corDaSala(a.sala))}>
                <span className="cel-avatar" style={bonecos[a.id] ? { backgroundImage: `url(${bonecos[a.id]})` } : undefined} aria-hidden="true" />
                <strong>{a.apelido || a.nome}</strong>
                <small>{a.fala.texto}</small>
              </div>
            ))}
          </div>
        ) : <p className="cel-quieto">Tudo quieto agora. Ninguém acabou de entregar nada.</p>}
        <div className="cel-cartao cel-gasto">
          <span><strong>{dolar(e.numeros.custo_hoje_usd)}</strong> de IA hoje, de um teto de {dolar(e.numeros.teto_dia_usd)}</span>
          <Barra usado={Number(e.numeros.custo_hoje_usd) || 0} teto={Number(e.numeros.teto_dia_usd) || 0} />
          <span>{numero(e.numeros.trabalhando)} agentes trabalhando{maquinas.length ? ` · ${maquinas.map((m) => `${m.nome} ${m.viva ? 'ligado' : 'sem sinal'}`).join(' · ')}` : ''}</span>
        </div>
      </Secao>
    )}
  </>;
}
