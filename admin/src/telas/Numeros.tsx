// Números da área de membros: vendas, de onde vieram, o funil até o certificado, cada aula (onde a turma para, o que
// ajuda, o que gera dúvida), as turmas por mês, o tutor e o relatório da semana feito pela IA. Tudo vem de uma função
// do banco (numeros_area). Pedidos e matrículas de teste ficam fora.
import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, RefreshCw, Sparkles } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, ErroCarga, Etiqueta, Faixa, Grupo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { dinheiro, haQuanto, numero } from '../nucleo/util';
import { Barras, Colunas, FiltroMoeda } from './comum';

const PERIODOS = [{ d: 7, t: '7 dias' }, { d: 15, t: '15 dias' }, { d: 30, t: '30 dias' }, { d: 60, t: '60 dias' }, { d: 90, t: '90 dias' }, { d: 365, t: '1 ano' }];
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const diaCurto = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (ym: string) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a.slice(2)}`; };

export default function Numeros() {
  useEffect(() => { document.title = 'Números | Painel Agência Setup'; }, []);
  const [dias, setDias] = useState(30);
  // Real ou dólar (o curso em inglês): vendas, gráfico, origens e funil só da moeda escolhida.
  const [moeda, setMoeda] = useState('brl');
  const { dados: d, erro, carregando, recarregar } = useCarregar(() => get(`/numeros?dias=${dias}&moeda=${moeda}`), [dias, moeda]);
  return (
    <div className="tela">
      <Titulo titulo="Números" sub="Como vão as vendas, os alunos e cada aula. Pedidos de teste ficam de fora." />
      <div className="filtros"><div className="chips">{PERIODOS.map((p) => <button key={p.d} className={`chip ${dias === p.d ? 'ativo' : ''}`} onClick={() => setDias(p.d)}>{p.t}</button>)}</div><FiltroMoeda valor={moeda} mudar={setMoeda} /></div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {d && <Painel d={d} dias={dias} recarregar={recarregar} />}
    </div>
  );
}

function Painel({ d, dias, recarregar }: { d: any; dias: number; recarregar: () => void }) {
  const v = d.vendas;
  const m = d.moeda || 'brl';
  const din = (c: number) => dinheiro(c, m);
  const f = d.funil;
  const cursos = d.cursos || [];
  const nota = cursos.find((c: any) => c.avaliacoes);
  return <>
    <div className="numeros">
      <div className="numero grande destaque"><b>{din(v.faturamento_centavos)}</b><span>Faturamento em {dias} dias · {numero(v.pagos)} {v.pagos === 1 ? 'venda' : 'vendas'} ({m === 'usd' ? `${numero(v.cartao)} no cartão` : `${numero(v.pix)} no Pix, ${numero(v.cartao)} no cartão`})</span></div>
      <div className="numero"><b>{din(v.ticket_centavos)}</b><span>Ticket médio{v.com_cupom ? ` · ${numero(v.com_cupom)} com cupom` : ''}</span></div>
      <div className="numero"><b>{v.conversao === null ? '–' : `${Math.round(v.conversao * 100)}%`}</b><span>Pedidos que viraram venda ({numero(v.pagos)} de {numero(v.pedidos)})</span></div>
      <div className="numero"><b>{numero(d.alunos.ativos_7d)}</b><span>Alunos ativos em 7 dias · {numero(d.alunos.com_curso)} com curso</span></div>
      <div className="numero"><b>{nota ? String(nota.nota).replace('.', ',') : '–'}</b><span>{nota ? `Nota do curso (0 a 10) · NPS ${nota.nps ?? '–'} · ${numero(nota.avaliacoes)} avaliações` : 'Nota do curso: ainda sem avaliações'}</span></div>
    </div>

    <Relatorio r={d.relatorio} ia={d.ia} recarregar={recarregar} />

    <div className="colunas">
      <div>
        <Grupo titulo="Vendas por dia" rodape={v.reembolsados ? `${numero(v.reembolsados)} reembolsos ou contestações no período.` : undefined}>
          {v.pagos ? <Colunas itens={porDia(d.por_dia, dias, m)} moeda={m} /> : <Vazio icone={<BarChart3 />} titulo="Nenhuma venda no período" texto="Quando a oferta estiver no ar, as vendas aparecem aqui dia a dia." />}
        </Grupo>
        <Grupo titulo="De onde vieram as vendas" rodape="Último toque antes da compra: link do Comenta X, link curto do painel ou UTM do anúncio.">
          {d.origens.length ? <Barras itens={d.origens} valor={(o) => o.centavos} rotulo={(o) => o.origem} detalhe={(o) => `${o.vendas} · ${din(o.centavos)}`} /> : <p className="mudo" style={{ margin: 0 }}>Sem vendas no período.</p>}
        </Grupo>
      </div>
      <div>
        <Grupo titulo="Do clique ao certificado" rodape="Visitantes que chegaram por um link com marca (post, DM, anúncio). Começaram e certificado contam quem comprou no período.">
          <Barras itens={[
            { t: 'Visitantes', n: f.visitantes }, { t: 'Pedidos', n: f.pedidos }, { t: 'Pagos', n: f.pagos },
            { t: 'Começaram o curso', n: f.comecaram }, { t: 'Certificado', n: f.certificado },
          ]} valor={(i) => i.n} rotulo={(i) => i.t} detalhe={(i) => numero(i.n)} />
        </Grupo>
        <Grupo titulo="Tutor de IA" rodape={`No período. Custo em dólar, pago direto à Anthropic.`}>
          <div className="numeros-mini" style={{ margin: 0 }}>
            <span><b>{numero(d.tutor.perguntas)}</b> perguntas</span>
            <span><b>{numero(d.tutor.respostas_equipe)}</b> respondidas pela equipe</span>
            <span><b>{numero(d.tutor.uteis)}</b> úteis · <b>{numero(d.tutor.nao_uteis)}</b> não ajudaram</span>
            <span><b>US$ {Number(d.tutor.custo_usd || 0).toFixed(2).replace('.', ',')}</b> de custo</span>
          </div>
        </Grupo>
      </div>
    </div>

    <Aulas aulas={d.aulas} />
    <Turmas turmas={d.turmas} />
  </>;
}

// Dias sem venda entram com zero (até 90 dias); no ano, junta por mês.
function porDia(lista: any[], dias: number, moeda = 'brl') {
  const mapa = new Map(lista.map((x: any) => [x.dia, x]));
  if (dias > 90) {
    const meses = new Map<string, { pagos: number; centavos: number }>();
    for (const x of lista) { const k = x.dia.slice(0, 7); const m = meses.get(k) || { pagos: 0, centavos: 0 }; m.pagos += x.pagos; m.centavos += x.centavos; meses.set(k, m); }
    return [...meses.entries()].sort().map(([k, m]) => ({ rotulo: mesCurto(k), valor: m.centavos, detalhe: `${mesCurto(k)}: ${dinheiro(m.centavos, moeda)} · ${m.pagos} ${m.pagos === 1 ? 'venda' : 'vendas'}` }));
  }
  const fim = new Date(Date.now() - 3 * 3600_000);
  return Array.from({ length: dias }, (_, i) => {
    const dia = new Date(fim.getTime() - (dias - 1 - i) * 86400_000).toISOString().slice(0, 10);
    const x: any = mapa.get(dia) || { pagos: 0, centavos: 0 };
    return { rotulo: diaCurto(dia), valor: x.centavos, detalhe: `${diaCurto(dia)}: ${x.pagos ? `${dinheiro(x.centavos, moeda)} · ${x.pagos} ${x.pagos === 1 ? 'venda' : 'vendas'}` : 'sem venda'}` };
  });
}

function Aulas({ aulas }: { aulas: any[] }) {
  if (!aulas.length) return null;
  // Onde a turma para: a maior queda de quem começou, de uma aula para a seguinte (do mesmo curso).
  let queda = { i: -1, n: 0 };
  aulas.forEach((a, i) => { const ant = aulas[i - 1]; if (ant && ant.curso === a.curso && ant.comecaram - a.comecaram > queda.n) queda = { i, n: ant.comecaram - a.comecaram }; });
  const temDados = aulas.some((a) => a.comecaram);
  return (
    <Grupo titulo="Cada aula" rodape="Desde o começo do curso. Começaram e concluíram contam sobre quem tem o curso. A maior queda mostra onde a turma para.">
      {!temDados ? <p className="mudo" style={{ margin: 0 }}>Os números de cada aula aparecem quando os primeiros alunos assistirem.</p> : (
        <div className="tabela-rolar">
          <table className="tabela">
            <thead><tr><th>Aula</th><th className="num">Começaram</th><th className="num">Concluíram</th><th className="num">Ajudou</th><th className="num">Dúvidas</th><th className="num">Coment.</th><th /></tr></thead>
            <tbody>
              {aulas.map((a, i) => {
                const avaliacoes = a.uteis + a.nao_uteis;
                const revisar = avaliacoes >= 3 && a.nao_uteis > a.uteis;
                return (
                  <tr key={a.id}>
                    <td><span className="mono mudo">{a.codigo}</span> {a.titulo}</td>
                    <td className="num">{numero(a.comecaram)} <small>{pct(a.comecaram, a.matriculados)}</small></td>
                    <td className="num"><span className="mini-barra"><i style={{ width: a.matriculados ? `${(100 * a.concluiram) / a.matriculados}%` : 0 }} /></span>{numero(a.concluiram)} <small>{pct(a.concluiram, a.matriculados)}</small></td>
                    <td className="num">{avaliacoes ? `${a.uteis} de ${avaliacoes}` : '–'}</td>
                    <td className="num">{a.duvidas || '–'}</td>
                    <td className="num">{a.comentarios || '–'}</td>
                    <td>{i === queda.i ? <Etiqueta cor="ambar">Maior queda (−{queda.n})</Etiqueta> : null}{revisar ? <Etiqueta cor="vermelho">Revisar</Etiqueta> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Grupo>
  );
}

function Turmas({ turmas }: { turmas: any[] }) {
  if (!turmas.length) return null;
  return (
    <Grupo titulo="Turmas por mês de entrada" rodape="Quem entrou em cada mês e até onde foi. Metade: concluiu pelo menos metade das aulas.">
      <div className="tabela-rolar">
        <table className="tabela">
          <thead><tr><th>Entrou em</th><th className="num">Alunos</th><th className="num">Começaram</th><th className="num">Metade</th><th className="num">Certificado</th><th className="num">Ativos 7 dias</th></tr></thead>
          <tbody>{turmas.map((t: any) => (
            <tr key={t.mes}><td>{mesCurto(t.mes)}</td><td className="num">{numero(t.matriculas)}</td><td className="num">{pct(t.comecaram, t.matriculas)}</td><td className="num">{pct(t.metade, t.matriculas)}</td><td className="num">{pct(t.certificado, t.matriculas)}</td><td className="num">{numero(t.ativos_7d)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Grupo>
  );
}

// O relatório vem em Markdown simples (## título, listas). Vira texto aqui, sem HTML de fora.
function Texto({ md }: { md: string }) {
  const partes: ReactNode[] = [];
  let lista: string[] = [];
  let ordenada = false;
  const fechar = () => { if (lista.length) { const L = ordenada ? 'ol' : 'ul'; partes.push(<L key={partes.length}>{lista.map((l, i) => <li key={i}>{negrito(l)}</li>)}</L>); lista = []; } };
  for (const linha of md.split('\n')) {
    const t = linha.trim();
    const m = t.match(/^(\d+)[.)]\s+(.*)$/) || t.match(/^[-*]\s+(.*)$/);
    if (m) { const ord = /^\d/.test(t); if (lista.length && ord !== ordenada) fechar(); ordenada = ord; lista.push(m[m.length - 1]); continue; }
    fechar();
    if (!t) continue;
    if (t.startsWith('#')) partes.push(<h3 key={partes.length}>{t.replace(/^#+\s*/, '')}</h3>);
    else partes.push(<p key={partes.length}>{negrito(t)}</p>);
  }
  fechar();
  return <div className="texto-relatorio">{partes}</div>;
}
const negrito = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));

function Relatorio({ r, ia, recarregar }: { r: any; ia: boolean; recarregar: () => void }) {
  const { pode } = useSessao();
  const { ocupado, rodar } = useAcao();
  const gerar = () => rodar('relatorio', async () => { await post('/relatorios'); recarregar(); }, 'Relatório pronto.');
  const botao = ia && pode('relatorio.gerar')
    ? <button className="bt bt-mini" disabled={!!ocupado} onClick={gerar}>{ocupado ? <RefreshCw className="girar" /> : <Sparkles />}{ocupado ? 'Escrevendo…' : r ? 'Refazer agora' : 'Gerar agora'}</button>
    : undefined;
  return (
    <Grupo titulo="Relatório da semana" acoes={botao}
      rodape={r ? `Semana de ${r.semana.split('-').reverse().join('/')} · feito ${haQuanto(r.criado_em)} pelo ${r.modelo || 'Claude'} · custou US$ ${Number(r.custo_usd || 0).toFixed(3).replace('.', ',')}` : 'Toda segunda-feira, às 8h, o Claude lê os números da semana e escreve o que foi bem, o que preocupa e 3 ações.'}>
      {r ? <Texto md={r.texto} />
        : ia ? <p className="mudo" style={{ margin: 0 }}>O primeiro relatório sai na próxima segunda-feira. Para ver agora, toque em Gerar agora (custa poucos centavos de dólar).</p>
        : <Faixa tipo="info">Ligue o Claude em <Link para="/integracoes">Integrações</Link> para receber o relatório toda segunda-feira.</Faixa>}
    </Grupo>
  );
}
