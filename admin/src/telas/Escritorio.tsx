// Escritório de IA: cada agente na sua sala, o que cada um fez por último e a mesa de propostas. Os agentes trazem
// cartões com prova; quem decide é o dono, em um toque. Pedido do dono em 09/11/2026 (plano em docs/escritorio.md):
// pixel, moderno, ambiente cristão, um Calango por agente.
// Dois jeitos de ver: a planta (EscritorioPlanta.tsx) e a lista (Lista, aqui embaixo: um bloco por sala, uma linha por
// agente, as mesmas colunas em todos os blocos). A mesa é a mesma nos dois. Lógica em worker/lib/escritorio.js.
import { useEffect, useState } from 'react';
import { Check, Clock, ExternalLink, Inbox, LayoutGrid, List, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { data, haQuanto, numero } from '../nucleo/util';
import { Perfil, Planta, chamado, dolar } from './EscritorioPlanta';

const COR_SALA: Record<string, string> = { direcao: 'ambar', vendas: 'verde', conteudo: 'azul', video: 'vermelho', design: 'laranja', sistema: 'cinza', produto: 'azul', receita: 'ambar' };
const COR_CARREIRA: Record<string, string> = { admitido: 'verde', promovido: 'azul', voltou: 'verde', pausado: 'ambar', rebaixado: 'laranja', demitido: 'vermelho', nota: 'cinza' };
// Como o último turno terminou, em duas palavras (a coluna "Última atividade" da lista).
const TURNO_CURTO: Record<string, string> = { ok: 'deu certo', erro: 'deu erro', sem_trabalho: 'nada a fazer' };
// O andamento de um cartão aprovado (quem pegou e o que falta), pela cor: pronto, espera você, não conseguiu, fazendo.
const COR_ANDAMENTO: Record<string, string> = { feito: 'verde', falta_publicar: 'verde', espera_dono: 'ambar', falhou: 'vermelho', fazendo: 'azul' };
// O que a tela diz de quem faz o cartão aprovado. Com o Executor valendo (a tarefa diária, docs/tarefa-aprovadas.md),
// os pequenos são feitos sozinhos; sem ele, ninguém começa sozinho.
const AVISO_APROVADA = ['Aprovada. Foi para "Aprovadas, falta fazer". Ninguém começa sozinho: peça ao Claude para fazer.', 'Aprovada. Foi para "Aprovadas, falta fazer". O Executor pega os cartões pequenos, um por dia. Os outros, peça ao Claude.'];
const RODAPE_APROVADAS = [
  'Aprovar não põe ninguém para trabalhar sozinho: peça ao Claude para fazer. Quando estiver pronto, anote o resultado aqui: é ele que entra no placar do agente.',
  'Uma vez por dia o Executor pega o cartão pequeno mais antigo, faz o que cabe dentro do projeto, confere e deixa pronto para publicar. O que mexe em site público, dinheiro, banco ou mensagem para pessoas continua esperando você: peça ao Claude. Depois de publicar, anote o resultado aqui: é ele que entra no placar do agente.',
];

export default function Escritorio() {
  useEffect(() => { document.title = 'Escritório | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/escritorio'), []);
  const d: any = dados;
  const n = d?.numeros;
  const podeDecidir = pode('escritorio.decidir');
  const executorAtivo = !!d?.executor?.ativo;
  const avisoAprovada = AVISO_APROVADA[executorAtivo ? 1 : 0];
  // O perfil aberto ao lado e o jeito de ver: a planta (salas em pixel, bonecos andando) ou a lista.
  const [perfil, setPerfil] = useState<any>(null);
  const [vista, setVista] = useState<string>(() => { try { return localStorage.getItem('esc-vista') || 'planta'; } catch { return 'planta'; } });
  const mudarVista = (v: string) => { setVista(v); try { localStorage.setItem('esc-vista', v); } catch { /* sem armazenamento */ } };
  // A planta se atualiza sozinha a cada minuto, para os balões falarem do que acabou de acontecer.
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) recarregar(); }, 60_000); return () => clearInterval(t); }, []);
  const naPlanta = vista === 'planta' && !!d?.arte?.salas;
  // motivo: o recado do dono para o agente (por que não, ou o que mudar). Fica no cartão e o agente lê antes de propor de novo.
  const decidir = async (id: string, decisao: string, ok: string, motivo = '') => {
    try { await post(`/escritorio/propostas/${id}/decidir`, { decisao, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }); avisar(ok); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const fechar = async (id: string, resultado: string) => {
    try { await post(`/escritorio/propostas/${id}/resultado`, { resultado }); avisar('Resultado anotado. Entrou no placar do agente.'); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };

  return (
    <div className="tela">
      <Titulo titulo="Escritório" sub="Cada agente na sua sala. Eles trazem propostas com prova para a mesa, e quem decide é você." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {n && (
        <div className="numeros">
          <div className={`numero grande ${n.na_mesa ? 'destaque' : ''}`}><b>{numero(n.na_mesa)}</b><span>{n.na_mesa === 1 ? 'proposta esperando você' : 'propostas esperando você'}</span></div>
          <div className="numero"><b>{numero(n.trabalhando)}</b><span>{n.trabalhando === 1 ? 'agente ativo' : 'agentes ativos'}</span></div>
          <div className="numero"><b>{dolar(n.custo_hoje_usd)}</b><span>Gasto de hoje · teto de {dolar(n.teto_dia_usd)}</span>{pode('escritorio.editar') && <Teto atual={n.teto_dia_usd} salvo={recarregar} />}</div>
          <div className="numero"><b>{numero(n.planejados)}</b><span>Ainda não contratados</span></div>
        </div>
      )}

      {d && d.arte?.salas && (
        <div className="pl-vistas" role="group" aria-label="Como ver o escritório">
          <button type="button" className={`bt bt-mini ${naPlanta ? 'bt-tingido' : 'bt-texto'}`} aria-pressed={naPlanta} onClick={() => mudarVista('planta')}><LayoutGrid />Planta</button>
          <button type="button" className={`bt bt-mini ${!naPlanta ? 'bt-tingido' : 'bt-texto'}`} aria-pressed={!naPlanta} onClick={() => mudarVista('lista')}><List />Lista</button>
          {naPlanta && <span className="mudo">O botão de expandir abre a sala, com a equipe e o consumo. Toque num Calango para ver o perfil dele.</span>}
        </div>
      )}
      {d && naPlanta && <Planta salas={d.salas} arte={d.arte} abrir={setPerfil} />}
      {d && !naPlanta && <Lista salas={d.salas} bonecos={d.arte?.bonecos || {}} abrir={setPerfil} />}
      {/* A mesa é a mesma nas duas vistas, no mesmo lugar: logo depois das salas. */}
      {d && (
        <Grupo titulo="A mesa" rodape={'"Tudo o que fizerem, façam de todo o coração, como para o Senhor." Colossenses 3,23'}>
          {d.mesa.length ? d.mesa.map((p: any) => <Cartao key={p.id} p={p} nomes={d.nomes} podeDecidir={podeDecidir} decidir={decidir} avisoAprovada={avisoAprovada} />)
            : <Vazio icone={<Inbox />} titulo="A mesa está limpa" texto="Quando um agente tiver uma proposta com prova, o cartão aparece aqui para você aprovar, deixar para depois ou descartar." />}
        </Grupo>
      )}

      {d && d.aprovadas.length > 0 && (
        <Grupo titulo="Aprovadas, falta fazer" rodape={RODAPE_APROVADAS[executorAtivo ? 1 : 0]}>
          {d.aprovadas.map((p: any) => <Aprovada key={p.id} p={p} nomes={d.nomes} executorAtivo={executorAtivo} podeDecidir={podeDecidir} fechar={fechar} voltar={() => decidir(p.id, 'nova', 'Voltou para a mesa.')} />)}
        </Grupo>
      )}
      {d && (d.movimentos?.length > 0 || d.demitidos?.length > 0) && (
        <Grupo titulo="Quadro de pessoal" rodape="Quem entrou, quem subiu, quem parou e quem saiu, com o motivo. Promover, rebaixar, pausar e demitir ficam no perfil de cada agente.">
          {d.movimentos.slice(0, 12).map((h: any) => (
            <div className="esc-linha" key={h.id}>
              <div>
                <Etiqueta cor={COR_CARREIRA[h.tipo] || 'cinza'}>{d.nomes.carreira[h.tipo] || h.tipo}</Etiqueta> <b>{h.agente_apelido ? `${h.agente_apelido} (${h.agente_nome})` : h.agente_nome}</b>
                {(h.tipo === 'promovido' || h.tipo === 'rebaixado') && h.de && h.para ? ` de ${h.de} para ${h.para}` : ''}
                <span className="mudo"> · {haQuanto(h.criado_em)}{h.por_nome ? ` · ${h.por_nome}` : ''}</span>
                {h.motivo && <p className="mudo linha-pequena">{h.motivo}</p>}
              </div>
            </div>
          ))}
          {d.demitidos.length > 0 && (
            <p className="pl-vagas pl-demitidos">
              <span>{d.demitidos.length === 1 ? 'Demitido:' : 'Demitidos:'}</span>
              {d.demitidos.map((a: any) => <button key={a.id} type="button" className="pl-vaga" onClick={() => setPerfil({ ...a, estado: 'desligado' })}>{a.apelido || a.nome}</button>)}
            </p>
          )}
        </Grupo>
      )}
      {d && perfil && <Perfil a={perfil} nomes={d.nomes} foto={d.arte?.bonecos?.[perfil.id]} fechar={() => setPerfil(null)} mudou={recarregar} podeEditar={pode('escritorio.editar')} />}
      {d?.maquinas && <Computadores maquinas={d.maquinas} podeEditar={pode('escritorio.editar')} />}
      {d && d.depois.length > 0 && (
        <Grupo titulo="Para depois">
          {d.depois.map((p: any) => (
            <div className="esc-linha" key={p.id}>
              <div>
                <b>{p.titulo}</b><span className="mudo"> · {d.nomes.salas[p.sala]}{p.agente_nome ? ` · ${p.agente_apelido || p.agente_nome}` : ''}{p.decidida_em ? ` · guardada ${haQuanto(p.decidida_em)}` : ''}</span>
                {p.motivo && <p className="mudo linha-pequena">Seu recado: {p.motivo}</p>}
              </div>
              {podeDecidir && <button className="bt bt-mini bt-texto" onClick={() => decidir(p.id, 'nova', 'Voltou para a mesa.')}>Voltar para a mesa</button>}
            </div>
          ))}
        </Grupo>
      )}
      {d && d.fechadas.length > 0 && (
        <Grupo titulo="Últimas fechadas">
          {d.fechadas.map((p: any) => (
            <div className="esc-linha" key={p.id}>
              <div>
                <b>{p.titulo}</b> <Etiqueta cor={p.status === 'feita' ? 'verde' : 'cinza'}>{d.nomes.status[p.status]}</Etiqueta>
                {p.resultado && <p className="mudo linha-pequena">{p.resultado}</p>}
                {p.motivo && <p className="mudo linha-pequena">Seu recado: {p.motivo}</p>}
              </div>
              {podeDecidir && p.status === 'descartada' && <button className="bt bt-mini bt-texto" onClick={() => decidir(p.id, 'nova', 'Voltou para a mesa.')}>Voltar para a mesa</button>}
            </div>
          ))}
        </Grupo>
      )}
    </div>
  );
}

// O teto de gasto do dia com a API, em dólar. Passou do teto, os agentes param até o dia seguinte.
function Teto({ atual, salvo }: { atual: number; salvo: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(String(atual ?? ''));
  const salvar = async () => {
    try { await post('/escritorio/teto', { teto_dia_usd: Number(String(valor).replace(',', '.')) }); avisar('Teto do dia salvo.'); setAberto(false); salvo(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  if (!aberto) return <button className="bt bt-mini bt-texto esc-teto" onClick={() => { setValor(String(atual ?? '')); setAberto(true); }}>Mudar o teto</button>;
  return (
    <span className="esc-teto-form">
      <input type="number" min={0} max={1000} step={0.5} value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Teto do dia em dólar" />
      <button className="bt bt-mini bt-tinta" onClick={salvar}>Salvar</button>
      <button className="bt bt-mini bt-texto" onClick={() => setAberto(false)}>Cancelar</button>
    </span>
  );
}

// ---------------------------------------------------------------- a vista Lista
// O estado do agente em uma palavra, com o ponto de cor.
function estadoDe(a: any): { t: string; luz: string } {
  if (a.estado === 'planejado') return { t: 'Vaga', luz: 'planejado' };
  if (a.estado === 'pausado') return { t: 'Pausado', luz: 'pausado' };
  if (a.offline) return { t: 'Offline', luz: 'offline' };
  return { t: 'Ativo', luz: 'ativo' };
}
// O que o agente fez por último, em poucas palavras: "há 2 h, deu certo". Vale o mais recente entre o último turno e o
// último trabalho que saiu (quem é rotina do relógio não grava turno). Vaga aberta não tem atividade.
function ultimaAtividade(a: any): { t: string; tom?: string } {
  if (a.estado === 'planejado') return { t: '' };
  const u = a.turnos?.ultimo;
  if (u?.status === 'rodando') return { t: 'trabalhando agora', tom: 'agora' };
  const doTurno = u ? Date.parse(u.fim || u.inicio) || 0 : 0;
  const doTrabalho = a.trabalho?.ultimo ? Date.parse(a.trabalho.ultimo) || 0 : 0;
  if (u && doTurno >= doTrabalho) return { t: `${haQuanto(u.fim || u.inicio)}, ${TURNO_CURTO[u.status] || u.status}`, tom: u.status === 'erro' ? 'erro' : undefined };
  if (doTrabalho) return { t: `${haQuanto(a.trabalho.ultimo)}, deu certo` };
  return { t: 'sem atividade recente' };
}

// Um bloco por sala, todos iguais: o cabeçalho (cor, nome, quantos ativos e o gasto de hoje) e uma linha por agente.
// As colunas são as mesmas em todos os blocos (a grade mora em .esc-colunas, no painel.css). No celular cada agente
// vira duas linhas. Um botão por linha: "Ver perfil". O resto do agente (função, turnos, caderno) está no perfil.
function Lista({ salas, bonecos, abrir }: { salas: any[]; bonecos: Record<string, string>; abrir: (a: any) => void }) {
  if (!salas.some((s) => s.agentes.length > 0)) return <div className="esc-lista"><Vazio titulo="O escritório está vazio" texto="Quando um agente for cadastrado, ele aparece aqui, na sala dele." /></div>;
  return (
    <div className="esc-lista">
      <div className="esc-colunas esc-lista-topo" aria-hidden="true"><span /><span>Agente</span><span>Estado</span><span>Última atividade</span><span className="esc-la-gasto">Gasto hoje</span><span /></div>
      {salas.map((s) => {
        const ativos = s.agentes.filter((a: any) => a.estado === 'ativo').length;
        const vagas = s.agentes.filter((a: any) => a.estado === 'planejado').length;
        const conta = [ativos === 0 ? 'Ninguém ativo' : ativos === 1 ? '1 ativo' : `${ativos} ativos`, vagas === 1 ? '1 vaga' : vagas > 1 ? `${vagas} vagas` : ''].filter(Boolean).join(' · ');
        return (
          <section key={s.id} className={`grupo esc-bloco esc-${s.id}`} aria-label={`Sala ${s.nome}`}>
            <header className="esc-colunas esc-bloco-topo">
              <span className="pl-ponto" aria-hidden="true" />
              <h2>{s.nome}<small>{conta}</small></h2>
              <span className="esc-la-gasto">{s.consumo?.hoje > 0 ? <>{dolar(s.consumo.hoje)}<small> hoje</small></> : null}</span>
            </header>
            {s.agentes.length === 0 && <p className="esc-bloco-vazio mudo">Nenhum agente nesta sala ainda.</p>}
            {s.agentes.length > 0 && (
              <ul className="esc-linhas">
                {s.agentes.map((a: any) => {
                  const estado = estadoDe(a);
                  const atividade = ultimaAtividade(a);
                  const gasto = Number(a.consumo?.hoje) || 0;
                  return (
                    <li key={a.id} className={`esc-colunas esc-la esc-la-${a.estado}`}>
                      {bonecos[a.id]
                        ? <span className="esc-la-foto" style={{ backgroundImage: `url(${bonecos[a.id]})` }} aria-hidden="true" />
                        : <span className="esc-la-foto esc-la-inicial" aria-hidden="true">{chamado(a).slice(0, 1)}</span>}
                      {/* As duas metades da linha: no computador elas se desfazem e cada pedaço vai para a sua coluna;
                          no celular viram as duas linhas do agente (nome e gasto em cima; estado, atividade e botão embaixo). */}
                      <span className="esc-la-l1">
                        <span className="esc-la-nome"><b>{chamado(a)}</b>{a.apelido ? <small>{a.nome}</small> : null}</span>
                        <span className="esc-la-gasto">{gasto > 0 ? dolar(gasto) : null}</span>
                      </span>
                      <span className="esc-la-l2">
                        <span className="esc-la-estado"><i className={`esc-luz esc-luz-${estado.luz}`} aria-hidden="true" />{estado.t}</span>
                        <span className={`esc-la-atividade${atividade.tom ? ` esc-tom-${atividade.tom}` : ''}`}>{atividade.t}</span>
                        <button type="button" className="bt bt-mini esc-la-botao" onClick={() => abrir(a)} aria-label={`Ver perfil de ${chamado(a)}`}>Ver perfil</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Cartao({ p, nomes, podeDecidir, decidir, avisoAprovada }: { p: any; nomes: any; podeDecidir: boolean; decidir: (id: string, decisao: string, ok: string, motivo?: string) => void; avisoAprovada: string }) {
  // O recado do dono para o agente vale para os três botões: o que mudar (ao aprovar) ou por que não (depois, descartar).
  const [recado, setRecado] = useState('');
  return (
    <article className="esc-cartao">
      <div className="esc-cartao-topo">
        <Etiqueta cor={COR_SALA[p.sala] || 'cinza'}>{nomes.salas[p.sala] || p.sala}</Etiqueta>
        <span className="mudo">{p.agente_nome ? `${p.agente_apelido ? `${p.agente_apelido}, ` : ''}${p.agente_nome} · ` : ''}{haQuanto(p.criado_em)} · {nomes.esforcos[p.esforco]}</span>
      </div>
      <h3>{p.titulo}</h3>
      <p><b>Prova:</b> {p.prova}</p>
      <p><b>O que o agente propõe:</b> {p.acao}</p>
      {p.ganho && <p><b>Ganho esperado:</b> {p.ganho}</p>}
      {p.links?.length > 0 && <p className="esc-links">{p.links.map((l: any, i: number) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink />{l.t}</a>)}</p>}
      {podeDecidir && (
        <>
          <div className="campo esc-recado">
            <label htmlFor={`esc-recado-${p.id}`}>Recado para o agente (opcional)</label>
            <input id={`esc-recado-${p.id}`} type="text" maxLength={500} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder={p.le_recado ? 'O que mudar, ou por que não. Ele lê antes de propor de novo.' : 'O que mudar, ou por que não. Fica guardado no cartão.'} />
          </div>
          <div className="rec-acoes">
            <button className="bt bt-mini bt-tinta" onClick={() => decidir(p.id, 'aprovada', avisoAprovada, recado)}><Check />Aprovar</button>
            <button className="bt bt-mini bt-tingido" onClick={() => decidir(p.id, 'depois', 'Guardada em "Para depois".', recado)}><Clock />Depois</button>
            <button className="bt bt-mini bt-texto" onClick={() => decidir(p.id, 'descartada', recado.trim() && p.le_recado ? 'Descartada. O agente vai ler o motivo.' : 'Descartada.', recado)}><X />Descartar</button>
          </div>
        </>
      )}
    </article>
  );
}

// O andamento de um cartão aprovado em uma linha: quem pegou, quando e o que falta. Sem andamento e com o Executor
// valendo, diz se o cartão está na fila dele ou por que não entra. A nota é texto do agente: aparece como texto.
function Andamento({ p, nomes, executorAtivo }: { p: any; nomes: any; executorAtivo: boolean }) {
  const a = p.andamento;
  if (!a) {
    if (!executorAtivo || p.pode_fazer === undefined) return null;
    return <p className="esc-andamento"><Etiqueta cor={p.pode_fazer ? 'azul' : 'cinza'}>{p.pode_fazer ? 'Na fila do Executor' : 'Fora da fila'}</Etiqueta> {p.pode_fazer ? 'Ele faz um cartão pequeno por dia, o aprovado há mais tempo primeiro.' : p.por_que_nao}</p>;
  }
  const quem = a.agente_nome || 'O Executor';
  const dia = data(a.em).slice(0, 5);
  const nota = /[.!?]$/.test(String(a.nota || '').trim()) ? String(a.nota).trim() : `${String(a.nota || '').trim()}.`;
  const frases: Record<string, string> = {
    falta_publicar: `${quem} fez em ${dia} e falta publicar: ${nota}`,
    feito: `${quem} fez em ${dia}: ${nota} Falta só anotar o resultado.`,
    espera_dono: `${quem} olhou em ${dia} e não dá para fazer sozinho: ${nota}`,
    falhou: `${quem} tentou em ${dia} e não conseguiu: ${nota}${executorAtivo && p.pode_fazer ? ' Tenta de novo na próxima rodada.' : p.por_que_nao ? ` ${p.por_que_nao}` : ''}`,
    fazendo: `${quem} está trabalhando neste cartão agora.`,
  };
  return (
    <p className="esc-andamento">
      <Etiqueta cor={COR_ANDAMENTO[a.estado] || 'cinza'}>{nomes.andamentos?.[a.estado] || a.estado}</Etiqueta> {frases[a.estado] || nota}
      {a.commit && a.estado !== 'fazendo' ? <span className="mudo"> (commit {a.commit})</span> : null}
    </p>
  );
}

function Aprovada({ p, nomes, executorAtivo, podeDecidir, fechar, voltar }: { p: any; nomes: any; executorAtivo: boolean; podeDecidir: boolean; fechar: (id: string, r: string) => void; voltar: () => void }) {
  // Quando o Executor já fez, o campo do resultado abre com a nota dele: o dono só confere, completa e salva.
  const [texto, setTexto] = useState(() => (p.andamento && ['falta_publicar', 'feito'].includes(p.andamento.estado) ? String(p.andamento.nota || '') : ''));
  const [aberto, setAberto] = useState(false);
  return (
    <div className="esc-linha esc-aprovada">
      <div>
        <b>{p.titulo}</b>
        <p className="mudo linha-pequena">{p.acao}</p>
        {p.motivo && <p className="mudo linha-pequena">Seu recado: {p.motivo}</p>}
        <Andamento p={p} nomes={nomes} executorAtivo={executorAtivo} />
        {aberto && (
          <>
            <textarea rows={3} maxLength={1500} placeholder="O que foi feito e o que mudou nos números." value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Resultado da proposta" />
            <button className="bt bt-mini bt-tinta" disabled={texto.trim().length < 3} onClick={() => fechar(p.id, texto)}><Check />Salvar resultado</button>
          </>
        )}
      </div>
      {podeDecidir && !aberto && (
        <div className="rec-acoes">
          <button className="bt bt-mini bt-tingido" onClick={() => setAberto(true)}><Check />Foi feita</button>
          <button className="bt bt-mini bt-texto" onClick={voltar}>Voltar para a mesa</button>
        </div>
      )}
    </div>
  );
}

// Os computadores da agência: quem está dando sinal de vida. Sem sinal de nenhum, os agentes que rodam no computador
// aparecem offline (cinza, ZzzZz). O comando do Mac liga o sinal de lá (o do Windows é uma tarefa agendada).
function Computadores({ maquinas, podeEditar }: { maquinas: any; podeEditar: boolean }) {
  const [comando, setComando] = useState('');
  const ver = async () => {
    try { const r: any = await get('/escritorio/sinal'); setComando(r.comando_mac || ''); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(comando); avisar('Comando copiado. Cole no Terminal do Mac.'); } catch { avisar('Não consegui copiar. Selecione o texto e copie.', 'erro'); } };
  return (
    <Grupo titulo="Computadores" rodape="Cada computador avisa de 5 em 5 minutos que está ligado. Sem sinal de nenhum deles por 12 minutos, os Calangos que rodam no computador ficam cinza, com ZzzZz.">
      {maquinas.lista.map((m: any) => (
        <div className="esc-linha" key={m.id}>
          <div><span className={`esc-luz esc-luz-${m.viva ? 'ativo' : 'pausado'}`} style={{ display: 'inline-block', marginRight: 8 }} /><b>{m.nome}</b><span className="mudo"> · {m.viva ? 'ligado' : m.em ? `sem sinal desde ${haQuanto(m.em)}` : 'o sinal ainda não foi ligado neste computador'}</span></div>
          {podeEditar && m.id === 'mac' && !m.viva && !comando && <button className="bt bt-mini bt-tingido" onClick={ver}>Ver o comando do Mac</button>}
        </div>
      ))}
      {comando && (
        <div className="pl-motivo">
          <label htmlFor="esc-comando">No Mac, abra o Terminal, cole esta linha e aperte Enter. Ela liga o sinal de 5 em 5 minutos.</label>
          <textarea id="esc-comando" rows={4} readOnly value={comando} onFocus={(e) => e.target.select()} />
          <div className="pl-acoes"><button className="bt bt-mini bt-tinta" onClick={copiar}>Copiar o comando</button></div>
        </div>
      )}
    </Grupo>
  );
}
