// A aba Escritório do app do celular: no topo o palco, com as salas vivas e os Calangos andando (o toque abre o perfil);
// depois a mesa de propostas em cartões de arrastar (para a direita aprova, para a
// esquerda descarta; os três botões continuam no cartão e a decisão dá para desfazer), os cartões aprovados que faltam
// fazer, as salas na cor de cada uma com a arte em pixel e, no toque, quem trabalha ali e o último turno de cada um.
// Mesmos dados e mesmas ações da tela grande (GET /escritorio e POST /escritorio/propostas/:id/decidir).
import { useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Clock, Inbox, Undo2, X, Zap } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Modal, avisar, useSessao } from '../nucleo/ui';
import { haQuanto, numero } from '../nucleo/util';
import { Perfil, QuemVendeuMais, SalaIso } from './EscritorioPlanta';
import { Arrastar, Barra, COR_SALA, Secao, SemRede, Trecho, corDaSala, dolar, estiloCor, useGuardado } from './CelularBase';

const FEITO: Record<string, string> = { aprovada: 'Aprovada', depois: 'Guardada para depois', descartada: 'Descartada' };
const SETA: Record<string, string> = { bem: '↑', mal: '↓', neutro: '→' };

export default function CelularEscritorio({ versao, mudou }: { versao: number; mudou: () => void }) {
  const { pode } = useSessao();
  const podeDecidir = pode('escritorio.decidir');
  const { dados, erro, recarregar } = useGuardado<any>('escritorio', () => get('/escritorio'), [versao]);
  const d: any = dados;
  const [saindo, setSaindo] = useState<string[]>([]);
  const [ultima, setUltima] = useState<{ p: any; decisao: string } | null>(null);
  const [salaAberta, setSalaAberta] = useState<string | null>(null);
  const [agente, setAgente] = useState<any>(null);

  if (!d) return erro ? <ErroCarga erro={erro} tentar={recarregar} /> : <Carregando />;

  const decidir = async (p: any, decisao: string, motivo = '') => {
    setSaindo((s) => [...s, p.id]);
    try {
      await post(`/escritorio/propostas/${p.id}/decidir`, { decisao, motivo: motivo.trim() || undefined });
      setUltima({ p, decisao });
      await recarregar();
      mudou();
    } catch (e: any) {
      avisar(e.message || 'Não deu certo. Tente de novo.', 'erro');
      setSaindo((s) => s.filter((x) => x !== p.id));
    }
  };
  const desfazer = async () => {
    const u = ultima;
    if (!u) return;
    setUltima(null);
    try {
      await post(`/escritorio/propostas/${u.p.id}/decidir`, { decisao: 'nova' });
      setSaindo((s) => s.filter((x) => x !== u.p.id));
      await recarregar();
      mudou();
      avisar('Voltou para a mesa.');
    } catch (e: any) { avisar(e.message || 'Não consegui desfazer. Tente pela tela grande.', 'erro'); }
  };

  const nomes = d.nomes || {};
  const mesa: any[] = (d.mesa || []).filter((p: any) => !saindo.includes(p.id));
  const aprovadas: any[] = d.aprovadas || [];
  const bonecos: Record<string, string> = d.arte?.bonecos || {};
  const sala = salaAberta ? (d.salas || []).find((s: any) => s.id === salaAberta) : null;
  const n = d.numeros || {};

  return <>
    <SemRede erro={erro} tentar={recarregar} />
    <Palco salas={d.salas || []} arte={d.arte} numeros={n} naMesa={mesa.length} abrir={setAgente} verTime={setSalaAberta}
      irMesa={() => document.getElementById('cel-mesa')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
    <div className="cel-grade cel-grade-3">
      <div className="cel-cartao"><b className="num">{numero(n.trabalhando)}</b><span>Trabalhando</span></div>
      <div className="cel-cartao"><b className="num">{numero(n.na_mesa)}</b><span>Na mesa</span></div>
      <div className="cel-cartao"><b className="num">{numero(n.aprovadas)}</b><span>Aprovadas, falta fazer</span></div>
    </div>
    <div className="cel-cartao cel-gasto">
      <span><strong>{dolar(n.custo_hoje_usd)}</strong> de IA hoje, de um teto de {dolar(n.teto_dia_usd)} · {dolar(n.custo_mes_usd)} no mês</span>
      <Barra usado={Number(n.custo_hoje_usd) || 0} teto={Number(n.teto_dia_usd) || 0} />
    </div>

    {ultima && (
      <div className="cel-desfazer" role="status">
        <span><strong>{FEITO[ultima.decisao]}:</strong> {ultima.p.titulo}</span>
        <button type="button" className="bt bt-mini" onClick={desfazer}><Undo2 />Desfazer</button>
      </div>
    )}

    <div id="cel-mesa" className="cel-ancora" />
    <Secao titulo="Mesa de propostas" lado={mesa.length ? <b className="cel-conta">{mesa.length}</b> : null}>
      {mesa.length === 0 && <p className="cel-quieto">A mesa está limpa. Quando um agente trouxer uma proposta, ela aparece aqui e chega um aviso.</p>}
      {mesa.length > 0 && podeDecidir && <p className="cel-dica">Arraste o cartão para a direita para aprovar e para a esquerda para descartar. Os botões fazem o mesmo.</p>}
      {mesa.map((p) => <Proposta key={p.id} p={p} nomes={nomes} podeDecidir={podeDecidir} decidir={decidir} />)}
    </Secao>

    {aprovadas.length > 0 && (
      <Secao titulo="Aprovadas, falta fazer" lado={<b className="cel-conta suave">{aprovadas.length}</b>}>
        <div className="cel-lista">
          {aprovadas.map((p) => {
            const a = p.andamento;
            const estado = a ? (nomes.andamentos || {})[a.estado] || a.estado : p.pode_fazer ? 'Na fila do Executor' : 'Fora da fila';
            const cor = a ? ({ feito: 'verde', falta_publicar: 'verde', espera_dono: 'ambar', falhou: 'vermelho', fazendo: 'azul' } as Record<string, string>)[a.estado] || 'cinza' : 'cinza';
            return (
              <div key={p.id} className="cel-linha" style={estiloCor(corDaSala(p.sala))}>
                <strong>{p.titulo}</strong>
                <span className="cel-linha-meta"><Etiqueta cor={cor}>{estado}</Etiqueta>{(nomes.salas || {})[p.sala] || p.sala}</span>
                <Trecho texto={a ? a.nota : p.por_que_nao} linhas={2} />
              </div>
            );
          })}
        </div>
      </Secao>
    )}

    <Modal titulo={sala ? sala.nome : ''} aberto={!!sala} fechar={() => setSalaAberta(null)}>
      {sala && sala.id === 'vendas' && (
        <section className="cel-vendeu" aria-label="Quem vendeu mais">
          <h3>Quem vendeu mais</h3>
          <QuemVendeuMais bonecos={bonecos} agentes={sala.agentes} abrir={(a) => { setSalaAberta(null); setAgente(a); }} />
        </section>
      )}
      {sala && (sala.agentes || []).length === 0 && <p className="cel-quieto">Ninguém trabalha nesta sala ainda.</p>}
      {sala && (sala.agentes || []).map((a: any) => {
        const u = a.turnos && a.turnos.ultimo;
        const estado = a.offline ? 'Offline' : (nomes.estados || {})[a.estado] || a.estado;
        const cor = a.offline ? 'cinza' : a.estado === 'ativo' ? COR_SALA[a.sala] || 'verde' : a.estado === 'pausado' ? 'ambar' : 'cinza';
        return (
          <div key={a.id} className="cel-agente">
            <span className="cel-avatar grande" style={bonecos[a.id] ? { backgroundImage: `url(${bonecos[a.id]})` } : undefined} aria-hidden="true" />
            <div>
              <span><strong>{a.apelido || a.nome}</strong>{a.apelido && <small className="mudo"> · {a.nome}</small>}</span>
              <span className="cel-linha-meta"><Etiqueta cor={cor}>{estado}</Etiqueta>{a.cadencia}</span>
              {a.sinal && <small className={`cel-sinal ${a.sinal.nivel}`}>{SETA[a.sinal.nivel] || '→'} {a.sinal.motivo}</small>}
              {u && <Trecho texto={u.resumo} linhas={3} />}
              <small className="mudo">{u ? `Último turno ${haQuanto(u.fim || u.inicio)}` : 'Ainda sem turno'}{a.turnos && a.turnos.custo_hoje ? ` · ${dolar(a.turnos.custo_hoje)} hoje` : ''}</small>
              <button type="button" className="bt bt-mini cel-ver-perfil" onClick={() => { setSalaAberta(null); setAgente(a); }}>Abrir o perfil</button>
            </div>
          </div>
        );
      })}
    </Modal>
    {agente && <Perfil a={agente} nomes={nomes} foto={bonecos[agente.id]} fechar={() => setAgente(null)} mudou={() => { recarregar(); mudou(); }} podeEditar={pode('escritorio.editar')} />}
  </>;
}

function Proposta({ p, nomes, podeDecidir, decidir }: { p: any; nomes: any; podeDecidir: boolean; decidir: (p: any, decisao: string, motivo?: string) => void }) {
  const [recado, setRecado] = useState('');
  const [comRecado, setComRecado] = useState(false);
  const links: any[] = Array.isArray(p.links) ? p.links : [];
  const miolo = (
    <article className="cel-prop" style={estiloCor(corDaSala(p.sala))}>
      <div className="cel-linha-meta">
        <Etiqueta cor={COR_SALA[p.sala] || 'cinza'}>{(nomes.salas || {})[p.sala] || p.sala}</Etiqueta>
        {p.agente_apelido || p.agente_nome ? `${p.agente_apelido || p.agente_nome} · ` : ''}{haQuanto(p.criado_em)}
      </div>
      <h3>{p.titulo}</h3>
      <p className="cel-rotulo">Prova</p>
      <Trecho texto={p.prova} linhas={4} />
      {p.acao && <><p className="cel-rotulo">O que fazer</p><Trecho texto={p.acao} linhas={3} /></>}
      {p.ganho && <><p className="cel-rotulo">Ganho esperado</p><Trecho texto={p.ganho} linhas={3} /></>}
      <p className="cel-prop-rodape">{(nomes.esforcos || {})[p.esforco] || ''}{links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.t || 'Abrir o link'}</a>)}</p>
      {podeDecidir && <>
        {comRecado
          ? <textarea className="cel-recado" rows={2} placeholder="Recado para o agente (opcional): o que você quer diferente." value={recado} onChange={(e) => setRecado(e.target.value)} aria-label="Recado para o agente" />
          : <button type="button" className="bt bt-texto bt-mini" onClick={() => setComRecado(true)}>Deixar um recado para o agente</button>}
        <div className="cel-decidir">
          <button type="button" className="bt bt-perigo" onClick={() => decidir(p, 'descartada', recado)}><X />Descartar</button>
          <button type="button" className="bt" onClick={() => decidir(p, 'depois', recado)}><Clock />Depois</button>
          <button type="button" className="bt bt-tinta" onClick={() => decidir(p, 'aprovada', recado)}><Check />Aprovar</button>
        </div>
      </>}
    </article>
  );
  return podeDecidir
    ? <Arrastar direita={() => decidir(p, 'aprovada', recado)} esquerda={() => decidir(p, 'descartada', recado)} seloDireita="Aprovar" seloEsquerda="Descartar">{miolo}</Arrastar>
    : miolo;
}

// O palco (pedido do dono em 10/11/2026: "ver os calanguinhos se mexendo", "aspecto de jogo", "estética de Habbo, só que
// mobile"): uma sala por vez, do tamanho da tela, com os Calangos andando, sentando e falando, igual à planta da tela
// grande (é a mesma SalaIso de EscritorioPlanta.tsx). Desliza de lado para trocar de sala, ou toca no mapa embaixo. O
// toque num Calango abre o perfil dele. Em cima, o placar do jogo: a sala, a energia de IA do dia e a mesa.
const SALA_LEMBRADA = 'setup-cel-sala';
function Palco({ salas, arte, numeros, naMesa, abrir, verTime, irMesa }: { salas: any[]; arte: any; numeros: any; naMesa: number; abrir: (a: any) => void; verTime: (id: string) => void; irMesa: () => void }) {
  const trilho = useRef<HTMLDivElement>(null);
  const mapa = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(() => {
    let id = '';
    try { id = localStorage.getItem(SALA_LEMBRADA) || ''; } catch {}
    return Math.max(0, salas.findIndex((s) => s.id === id));
  });
  // Abre na sala em que a pessoa estava da última vez, sem animação.
  useLayoutEffect(() => { const el = trilho.current; if (el && i > 0) el.scrollLeft = i * el.clientWidth; }, []);
  const escolher = (k: number) => {
    if (k === i || !salas[k]) return;
    setI(k);
    try { localStorage.setItem(SALA_LEMBRADA, salas[k].id); } catch {}
    const botao = mapa.current?.children[k] as HTMLElement | undefined;
    if (botao && mapa.current) mapa.current.scrollTo({ left: botao.offsetLeft - mapa.current.clientWidth / 2 + botao.offsetWidth / 2, behavior: 'smooth' });
  };
  const aoRolar = () => { const el = trilho.current; if (el && el.clientWidth) escolher(Math.round(el.scrollLeft / el.clientWidth)); };
  const ir = (k: number) => { const el = trilho.current; if (el) el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' }); };

  const sala = salas[i] || salas[0];
  if (!sala) return null;
  const bonecos = arte?.bonecos || {};
  const ags: any[] = sala.agentes || [];
  const ativos = ags.filter((a) => a.estado === 'ativo' && !a.offline).length;
  const vagas = ags.filter((a) => a.estado === 'planejado').length;
  const usado = Number(numeros.custo_hoje_usd) || 0;
  const teto = Number(numeros.teto_dia_usd) || 0;
  const pct = teto > 0 ? Math.min(100, Math.round((usado / teto) * 100)) : 0;
  const pede = (s: any) => (s.agentes || []).some((a: any) => (a.sinal && a.sinal.nivel === 'mal') || (a.fala && a.fala.tipo === 'atencao'));

  return (
    <section className="cel-palco" style={estiloCor(corDaSala(sala.id))} data-sem-puxar aria-label="O escritório ao vivo">
      <div className="cel-hud">
        <button type="button" className="cel-hud-sala" onClick={() => verTime(sala.id)} aria-label={`Sala ${sala.nome}: ver a equipe`}>
          <i aria-hidden="true" />
          <span><strong>{sala.nome}</strong><small>{ags.length === 0 ? 'Sala vazia' : ativos === ags.length - vagas ? `${ativos} trabalhando` : `${ativos} de ${ags.length - vagas} trabalhando`}{vagas ? ` · ${vagas} ${vagas === 1 ? 'vaga' : 'vagas'}` : ''}</small></span>
          <ChevronRight />
        </button>
        <div className="cel-hud-pilula" role="img" aria-label={`Energia de IA de hoje: ${pct} por cento do teto`}>
          <span><Zap />Energia</span>
          <b>{100 - pct}%</b>
          <em><i style={{ width: `${100 - pct}%`, background: pct >= 100 ? 'var(--vermelho)' : pct >= 80 ? 'var(--ambar)' : 'var(--verde)' }} /></em>
        </div>
        <button type="button" className={`cel-hud-pilula ${naMesa ? 'chama' : ''}`} onClick={irMesa} aria-label={`${naMesa} na mesa de propostas: ir para a mesa`}>
          <span><Inbox />Mesa</span>
          <b>{naMesa}</b>
          <small>{naMesa ? 'esperando' : 'limpa'}</small>
        </button>
      </div>

      <div className="cel-trilho" ref={trilho} onScroll={aoRolar}>
        {salas.map((s) => (
          <div key={s.id} className="cel-trilho-sala">
            <SalaIso s={s} imagem={arte?.salas?.[s.id]} bonecos={bonecos} abrir={abrir} grande />
          </div>
        ))}
      </div>

      <div className="cel-mapa" ref={mapa} role="tablist" aria-label="Salas do escritório">
        {salas.map((s, k) => (
          <button key={s.id} type="button" role="tab" aria-selected={k === i} className={k === i ? 'ativo' : ''} style={estiloCor(corDaSala(s.id))} onClick={() => ir(k)}>
            <span style={arte?.salas?.[s.id] ? { backgroundImage: `url(${arte.salas[s.id]})` } : undefined} aria-hidden="true" />
            <small>{s.nome}</small>
            {pede(s) && <b aria-label="pede atenção" />}
          </button>
        ))}
      </div>
      <p className="cel-palco-dica">Deslize para trocar de sala. Toque num Calango para abrir o perfil.</p>
    </section>
  );
}
