// Escritório de IA: cada agente na sua sala (parede de cor própria, a principal amarela), o que cada um fez por último
// e a mesa de propostas. Os agentes trazem cartões com prova; quem decide é o dono, em um toque. Pedido do dono em
// 09/11/2026 (plano em docs/escritorio.md): pixel, moderno, ambiente cristão, um Calango por agente.
// Lógica em worker/lib/escritorio.js. O Calango vem de scripts/escritorio-calango.mjs (8 quadros numa folha só).
import { useEffect, useState } from 'react';
import { Check, Clock, Cross, ExternalLink, Inbox, LayoutGrid, List, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { dataHora, haQuanto, numero } from '../nucleo/util';
import folhaDoCalango from '../img/escritorio-calango.webp';
import { Perfil, Planta, Seta, dolar } from './EscritorioPlanta';

const COR_SALA: Record<string, string> = { direcao: 'ambar', vendas: 'verde', conteudo: 'azul', video: 'vermelho', design: 'laranja', sistema: 'cinza', produto: 'azul', receita: 'ambar' };
const COR_CARREIRA: Record<string, string> = { admitido: 'verde', promovido: 'azul', voltou: 'verde', pausado: 'ambar', rebaixado: 'laranja', demitido: 'vermelho', nota: 'cinza' };
const NOME_TURNO: Record<string, string> = { rodando: 'trabalhando agora', ok: 'deu certo', erro: 'deu erro', sem_trabalho: 'não tinha o que fazer' };

export default function Escritorio() {
  useEffect(() => { document.title = 'Escritório | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/escritorio'), []);
  const d: any = dados;
  const n = d?.numeros;
  const podeDecidir = pode('escritorio.decidir');
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
          <span className="mudo">O botão de expandir abre a sala, com a equipe e o consumo. Toque num Calango para ver o perfil dele.</span>
        </div>
      )}
      {d && naPlanta && (
        <>
          <Planta salas={d.salas} arte={d.arte} abrir={setPerfil} />
          <Grupo titulo="A mesa" rodape={'"Tudo o que fizerem, façam de todo o coração, como para o Senhor." Colossenses 3,23'}>
            {d.mesa.length ? d.mesa.map((p: any) => <Cartao key={p.id} p={p} nomes={d.nomes} podeDecidir={podeDecidir} decidir={decidir} />)
              : <Vazio icone={<Inbox />} titulo="A mesa está limpa" texto="Quando um agente tiver uma proposta com prova, o cartão aparece aqui para você aprovar, deixar para depois ou descartar." />}
          </Grupo>
        </>
      )}
      {d && !naPlanta && (
        <div className="esc-planta">
          {d.salas.map((s: any) => (
            <section key={s.id} className={`esc-sala esc-${s.id}`} aria-label={`Sala ${s.nome}`}>
              <header className="esc-parede">
                <span className="esc-placa">{s.nome}</span>
                {s.id === 'direcao' && <span className="esc-cruz" title="Cruz na parede da sala principal"><Cross /></span>}
                <span className="esc-conta">{s.agentes.filter((a: any) => a.estado === 'ativo').length} de {s.agentes.length} ativos</span>
              </header>
              <div className="esc-chao">
                {s.id === 'direcao' && (
                  <>
                    <p className="esc-quadro">"Tudo o que fizerem, façam de todo o coração, como para o Senhor." <span>Colossenses 3,23</span></p>
                    <div className="esc-mesa">
                      <h2>A mesa</h2>
                      {d.mesa.length ? d.mesa.map((p: any) => <Cartao key={p.id} p={p} nomes={d.nomes} podeDecidir={podeDecidir} decidir={decidir} />)
                        : <Vazio icone={<Inbox />} titulo="A mesa está limpa" texto="Quando um agente tiver uma proposta com prova, o cartão aparece aqui para você aprovar, deixar para depois ou descartar." />}
                    </div>
                  </>
                )}
                <div className="esc-mesas">
                  {s.agentes.map((a: any) => <Agente key={a.id} a={a} nomes={d.nomes} perfil={setPerfil} foto={d.arte?.bonecos?.[a.id]} />)}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {d && d.aprovadas.length > 0 && (
        <Grupo titulo="Aprovadas, falta fazer" rodape="Aprovar não põe ninguém para trabalhar sozinho: peça ao Claude para fazer. Quando estiver pronto, anote o resultado aqui: é ele que entra no placar do agente.">
          {d.aprovadas.map((p: any) => <Aprovada key={p.id} p={p} podeDecidir={podeDecidir} fechar={fechar} voltar={() => decidir(p.id, 'nova', 'Voltou para a mesa.')} />)}
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
              <div><b>{p.titulo}</b><span className="mudo"> · {d.nomes.salas[p.sala]}{p.agente_nome ? ` · ${p.agente_apelido || p.agente_nome}` : ''}</span></div>
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
                {p.status === 'descartada' && p.motivo && <p className="mudo linha-pequena">Seu motivo: {p.motivo}</p>}
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

// O Calango do agente: mexe quando o agente trabalha, fica parado quando está pausado e some quase todo na mesa vazia.
function Calango({ estado, rodando }: { estado: string; rodando: boolean }) {
  return <span className={`esc-calango esc-c-${estado} ${rodando ? 'esc-c-rodando' : ''}`} style={{ backgroundImage: `url(${folhaDoCalango})` }} aria-hidden="true" />;
}

function Agente({ a, nomes, perfil, foto }: { a: any; nomes: any; perfil: (a: any) => void; foto?: string }) {
  const [aberto, setAberto] = useState(false);
  const [det, setDet] = useState<any>(null);
  const u = a.turnos?.ultimo;
  const erro = u?.status === 'erro';
  const abrir = async () => {
    const novo = !aberto;
    setAberto(novo);
    if (novo && !det) { try { setDet(await get(`/escritorio/agentes/${a.id}`)); } catch (e: any) { avisar(e.message || 'Não consegui abrir o agente.', 'erro'); } }
  };
  return (
    <article className={`esc-agente esc-a-${a.estado} ${erro ? 'esc-a-erro' : ''}`}>
      {foto ? <span className={`esc-calango-foto esc-cf-${a.estado}`} style={{ backgroundImage: `url(${foto})` }} aria-hidden="true" /> : <Calango estado={a.estado} rodando={u?.status === 'rodando'} />}
      <div className="esc-info">
        <div className="esc-nome">
          <b>{a.apelido ? `${a.apelido} · ${a.nome}` : a.nome}</b>
          {a.estado === 'ativo' && <Seta sinal={a.sinal} classe="pl-seta-linha" />}
          <span className={`esc-luz esc-luz-${erro ? 'erro' : a.estado}`} title={erro ? 'O último turno deu erro' : nomes.estados[a.estado]} />
        </div>
        <p className="esc-funcao">{a.funcao}</p>
        <p className="esc-meta">{a.estado === 'planejado' ? 'Mesa vazia: ainda não contratado' : `${nomes.onde[a.onde]}${a.cadencia ? ` · ${a.cadencia}` : ''}`}</p>
        {a.estado !== 'planejado' && (
          <p className="esc-turno">
            <Clock />
            {u ? <>Último turno {haQuanto(u.inicio)}: {NOME_TURNO[u.status] || u.status}{u.resumo ? `. ${u.resumo}` : ''}</>
              : a.trabalho ? <>{a.trabalho.frase}{a.trabalho.ultimo ? `. ${a.trabalho.hoje === undefined ? 'Saiu' : 'Mais recente:'} ${haQuanto(a.trabalho.ultimo)}` : ''}{a.trabalho.custo_usd ? ` · ${dolar(a.trabalho.custo_usd)}` : ''}</>
                : 'Ainda sem turno anotado'}
          </p>
        )}
        {(a.placar || a.turnos?.custo_hoje > 0) && (
          <p className="esc-meta">
            {a.placar ? `${numero(a.placar.feitas_por_ele)} ${a.placar.feitas_por_ele === 1 ? 'proposta' : 'propostas'}, ${numero(a.placar.aprovadas)} ${a.placar.aprovadas === 1 ? 'aprovada' : 'aprovadas'}, ${numero(a.placar.com_resultado)} com resultado` : ''}
            {a.placar && a.turnos?.custo_hoje > 0 ? ' · ' : ''}
            {a.turnos?.custo_hoje > 0 ? `${dolar(a.turnos.custo_hoje)} hoje` : ''}
          </p>
        )}
        {a.vendas && (
          <p className="esc-meta">
            Placar: {numero(a.vendas.pessoas)} {a.vendas.pessoas === 1 ? 'pessoa atendida' : 'pessoas atendidas'}, {numero(a.vendas.responderam)} {a.vendas.responderam === 1 ? 'respondeu' : 'responderam'}, {numero(a.vendas.compraram)} {a.vendas.compraram === 1 ? 'comprou' : 'compraram'}
            {a.vendas.pouco ? '. Ainda é cedo para comparar.' : ''}
          </p>
        )}
        <span className="rec-acoes">
          <button className="bt bt-mini bt-texto esc-mais" onClick={() => perfil(a)}>Perfil e carreira</button>
          {a.estado !== 'planejado' && <button className="bt bt-mini bt-texto esc-mais" onClick={abrir} aria-expanded={aberto}>{aberto ? 'Fechar' : 'Ver turnos e caderno'}</button>}
        </span>
        {aberto && det && (
          <div className="esc-detalhe">
            {det.caderno ? <><b>Caderno</b><p className="esc-caderno">{det.caderno}</p></> : <p className="mudo">O caderno está em branco. As lições deste agente aparecem aqui.</p>}
            {det.turnos?.length > 0 && (
              <>
                <b>Últimos turnos</b>
                <ol>{det.turnos.map((t: any) => <li key={t.id}><span className="mudo">{dataHora(t.inicio)} · {NOME_TURNO[t.status] || t.status}{Number(t.custo_usd) > 0 ? ` · ${dolar(t.custo_usd)}` : ''}</span>{t.resumo ? ` ${t.resumo}` : ''}</li>)}</ol>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Cartao({ p, nomes, podeDecidir, decidir }: { p: any; nomes: any; podeDecidir: boolean; decidir: (id: string, decisao: string, ok: string, motivo?: string) => void }) {
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
            <input id={`esc-recado-${p.id}`} type="text" maxLength={500} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="O que mudar, ou por que não. Ele lê antes de propor de novo." />
          </div>
          <div className="rec-acoes">
            <button className="bt bt-mini bt-tinta" onClick={() => decidir(p.id, 'aprovada', 'Aprovada. Foi para "Aprovadas, falta fazer". Ninguém começa sozinho: peça ao Claude para fazer.', recado)}><Check />Aprovar</button>
            <button className="bt bt-mini bt-tingido" onClick={() => decidir(p.id, 'depois', 'Guardada em "Para depois".', recado)}><Clock />Depois</button>
            <button className="bt bt-mini bt-texto" onClick={() => decidir(p.id, 'descartada', recado.trim() ? 'Descartada. O agente vai ler o motivo.' : 'Descartada.', recado)}><X />Descartar</button>
          </div>
        </>
      )}
    </article>
  );
}

function Aprovada({ p, podeDecidir, fechar, voltar }: { p: any; podeDecidir: boolean; fechar: (id: string, r: string) => void; voltar: () => void }) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  return (
    <div className="esc-linha esc-aprovada">
      <div>
        <b>{p.titulo}</b>
        <p className="mudo linha-pequena">{p.acao}</p>
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
