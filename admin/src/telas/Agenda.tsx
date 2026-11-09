// Posts e agenda: o calendário por dia, semana, mês e ano (o que está marcado, o que saiu pelo painel e o que foi
// postado direto no app), a lista com filtros (a antiga Fila das redes) e os rascunhos sem data. Dia com muito post rola
// dentro da própria célula: nada fica escondido num "+3". O botão principal é "Novo post".
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Abas, Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, REDES, STATUS_PECA } from '../nucleo/util';
import Fila from './Fila';
import { FiltroPerfil } from './comum';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const VISTAS = ['hoje', 'semana', 'mes', 'ano'];
const chaveDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const domingoDe = (d: Date) => somaDias(d, -d.getDay());
const seguidos = (ini: Date, n: number) => Array.from({ length: n }, (_, i) => somaDias(ini, i));
const qtPosts = (n: number) => `${n} ${n === 1 ? 'post' : 'posts'}`;

export default function Agenda() {
  const { pode } = useSessao();
  const { rota } = useRota();
  const vistaUrl = rota.busca.get('vista') || '';
  const temFiltro = rota.busca.get('status') || rota.busca.get('rede') || rota.busca.get('perfil') || vistaUrl === 'lista';
  const [aba, setAba] = useState(temFiltro ? 'lista' : VISTAS.includes(vistaUrl) ? vistaUrl : 'mes');
  const [ref, setRef] = useState(() => meiaNoite(new Date()));
  const [perfil, setPerfil] = useState('');
  useEffect(() => { document.title = 'Posts e agenda | Painel Agência Setup'; }, []);
  // A aba "Hoje" sempre volta para hoje; as outras ficam no período que a pessoa estava olhando.
  const mudarAba = (id: string) => { if (id === 'hoje') setRef(meiaNoite(new Date())); setAba(id); };
  return (
    <div className="tela tela-larga">
      <Titulo titulo="Posts e agenda" sub="O que sai, quando e onde. Nada vai para as redes sem aprovação."
        acoes={pode('pecas.editar') ? <Link para="/posts/novo" className="bt bt-tinta"><Plus />Novo post</Link> : undefined} />
      <Abas abas={[{ id: 'hoje', t: 'Hoje' }, { id: 'semana', t: 'Semana' }, { id: 'mes', t: 'Mês' }, { id: 'ano', t: 'Ano' }, { id: 'lista', t: 'Lista' }]} atual={aba} mudar={mudarAba} />
      {aba === 'lista' ? <Fila embutida /> : <Calendario vista={aba} ref_={ref} setRef={setRef} perfil={perfil} setPerfil={setPerfil} abrirVista={setAba} />}
    </div>
  );
}

function Calendario({ vista, ref_, setRef, perfil, setPerfil, abrirVista }: { vista: string; ref_: Date; setRef: (d: Date) => void; perfil: string; setPerfil: (v: string) => void; abrirVista: (v: string) => void }) {
  const { ir } = useRota();
  // O período que a vista pede. O mês usa a grade inteira, de 6 semanas, a partir do domingo da semana do dia 1.
  const { ini, fim } = useMemo(() => {
    if (vista === 'hoje') return { ini: ref_, fim: somaDias(ref_, 1) };
    if (vista === 'semana') { const i = domingoDe(ref_); return { ini: i, fim: somaDias(i, 7) }; }
    if (vista === 'ano') return { ini: new Date(ref_.getFullYear(), 0, 1), fim: new Date(ref_.getFullYear() + 1, 0, 1) };
    const i = domingoDe(new Date(ref_.getFullYear(), ref_.getMonth(), 1));
    return { ini: i, fim: somaDias(i, 42) };
  }, [vista, ref_]);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/agenda?de=${encodeURIComponent(ini.toISOString())}&ate=${encodeURIComponent(fim.toISOString())}${perfil ? `&perfil=${perfil}` : ''}`), [ini.getTime(), fim.getTime(), perfil]);
  const porDia = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const it of dados?.itens || []) if (it.quando) (m[chaveDia(new Date(it.quando))] = m[chaveDia(new Date(it.quando))] || []).push(it);
    return m;
  }, [dados]);
  const hoje = chaveDia(new Date());
  const abrir = (it: any) => ir(it.pelo_app ? `/resultados/${it.post_id}` : `/posts/${it.id}`);
  const verDia = (d: Date) => { setRef(meiaNoite(d)); abrirVista('hoje'); };
  const andar = (n: number) => {
    if (vista === 'hoje') setRef(somaDias(ref_, n));
    else if (vista === 'semana') setRef(somaDias(ref_, 7 * n));
    else if (vista === 'ano') setRef(new Date(ref_.getFullYear() + n, ref_.getMonth(), 1));
    else setRef(new Date(ref_.getFullYear(), ref_.getMonth() + n, 1));
  };
  // Os números da legenda são do período que está na tela (no mês, sem os dias de fora que completam a grade).
  const naVista = (dados?.itens || []).filter((it: any) => it.quando && (vista !== 'mes' || new Date(it.quando).getMonth() === ref_.getMonth()));
  const conta = (s: string) => naVista.filter((it: any) => it.status === s).length;
  const sab = somaDias(domingoDe(ref_), 6);
  const titulo = vista === 'hoje' ? <>{DIAS_LONGOS[ref_.getDay()]}, {ref_.getDate()} <span className="mudo">de {MESES[ref_.getMonth()]}</span></>
    : vista === 'semana' ? <>{domingoDe(ref_).getDate()} a {sab.getDate()} <span className="mudo">de {MESES[sab.getMonth()]}</span></>
    : vista === 'ano' ? <>{ref_.getFullYear()}</>
    : <>{MESES[ref_.getMonth()]} <span className="mudo">{ref_.getFullYear()}</span></>;

  return <>
    <div className="cal-topo">
      <div className="cal-mes">
        <button className="bt-icone" onClick={() => andar(-1)} aria-label="Período anterior"><ChevronLeft /></button>
        <h2>{titulo}</h2>
        <button className="bt-icone" onClick={() => andar(1)} aria-label="Próximo período"><ChevronRight /></button>
        <button className="bt bt-mini bt-texto" onClick={() => setRef(meiaNoite(new Date()))}>Hoje</button>
      </div>
      <FiltroPerfil valor={perfil} mudar={setPerfil} />
      <div className="cal-legenda">
        <span><i className="cal-cor agendado" />{conta('agendado')} agendados</span>
        <span><i className="cal-cor publicado" />{conta('publicado')} publicados</span>
        {conta('erro') > 0 && <span><i className="cal-cor erro" />{conta('erro')} com erro</span>}
      </div>
    </div>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && <>
      {vista === 'hoje' && <Dia itens={porDia[chaveDia(ref_)] || []} abrir={abrir} />}
      {vista === 'semana' && <Semana ini={domingoDe(ref_)} porDia={porDia} hoje={hoje} abrir={abrir} verDia={verDia} />}
      {vista === 'mes' && <Mes ini={ini} mes={ref_.getMonth()} porDia={porDia} hoje={hoje} abrir={abrir} verDia={verDia} vazio={!naVista.length} />}
      {vista === 'ano' && <Ano ano={ref_.getFullYear()} porDia={porDia} hoje={hoje} verDia={verDia} verMes={(m) => { setRef(new Date(ref_.getFullYear(), m, 1)); abrirVista('mes'); }} />}
      <Grupo titulo={`Rascunhos sem data${dados.rascunhos?.length ? ` (${dados.rascunhos.length})` : ''}`} rodape="Abra para revisar, aprovar e escolher quando sai.">
        {dados.rascunhos?.length ? <div className="rascunhos">{dados.rascunhos.map((it: any) => <ItemCal key={it.id} it={it} abrir={abrir} largo />)}</div>
          : <p className="mudo" style={{ margin: 0 }}>Nenhum rascunho esperando.</p>}
      </Grupo>
    </>}
  </>;
}

function Dia({ itens, abrir }: { itens: any[]; abrir: (it: any) => void }) {
  if (!itens.length) return <Vazio icone={<CalendarDays />} titulo="Nada marcado neste dia" texto="Crie um post e agende, ou peça ao Claude: ele deixa os rascunhos aqui." />;
  return <div className="cal-dia-lista">{itens.map((it) => <ItemCal key={it.id} it={it} abrir={abrir} largo />)}</div>;
}

function Semana({ ini, porDia, hoje, abrir, verDia }: { ini: Date; porDia: Record<string, any[]>; hoje: string; abrir: (it: any) => void; verDia: (d: Date) => void }) {
  const dias = seguidos(ini, 7);
  return <>
    <div className="cal-semana" role="grid" aria-label="Calendário da semana">
      {dias.map((d) => {
        const k = chaveDia(d);
        const itens = porDia[k] || [];
        return (
          <div key={k} role="gridcell" className={`cal-sem-dia${k === hoje ? ' hoje' : ''}`}>
            <button type="button" className="cal-sem-topo" onClick={() => verDia(d)} aria-label={`Ver ${DIAS_LONGOS[d.getDay()]}, ${d.getDate()}`}>
              <span>{DIAS[d.getDay()]}</span><b className="cal-n">{d.getDate()}</b>
            </button>
            <div className="cal-rola">{itens.map((it) => <ItemCal key={it.id} it={it} abrir={abrir} />)}</div>
          </div>
        );
      })}
    </div>
    <ListaCelular dias={dias} porDia={porDia} hoje={hoje} abrir={abrir} vazio="Nada marcado nesta semana" />
  </>;
}

function Mes({ ini, mes, porDia, hoje, abrir, verDia, vazio }: { ini: Date; mes: number; porDia: Record<string, any[]>; hoje: string; abrir: (it: any) => void; verDia: (d: Date) => void; vazio: boolean }) {
  const dias = seguidos(ini, 42);
  return <>
    <div className="cal" role="grid" aria-label={`Calendário de ${MESES[mes]}`}>
      {DIAS.map((d) => <div key={d} className="cal-dia-nome" role="columnheader">{d}</div>)}
      {dias.map((d) => {
        const k = chaveDia(d);
        const itens = porDia[k] || [];
        return (
          <div key={k} role="gridcell" className={`cal-dia${d.getMonth() !== mes ? ' fora' : ''}${k === hoje ? ' hoje' : ''}`}>
            <div className="cal-dia-topo">
              <button type="button" className="cal-n" onClick={() => verDia(d)} aria-label={`Ver o dia ${d.getDate()}`}>{d.getDate()}</button>
              {itens.length > 3 && <span className="cal-qt">{qtPosts(itens.length)}</span>}
            </div>
            <div className="cal-rola" tabIndex={itens.length > 3 ? 0 : undefined}>{itens.map((it) => <ItemCal key={it.id} it={it} abrir={abrir} />)}</div>
          </div>
        );
      })}
    </div>
    <ListaCelular dias={dias.filter((d) => d.getMonth() === mes)} porDia={porDia} hoje={hoje} abrir={abrir} vazio={vazio ? 'Nada marcado neste mês' : ''} />
  </>;
}

// No celular, a grade vira uma lista dos dias que têm post.
function ListaCelular({ dias, porDia, hoje, abrir, vazio }: { dias: Date[]; porDia: Record<string, any[]>; hoje: string; abrir: (it: any) => void; vazio: string }) {
  const comPost = dias.filter((d) => (porDia[chaveDia(d)] || []).length);
  return (
    <div className="cal-lista">
      {comPost.map((d) => (
        <div key={chaveDia(d)} className="cal-lista-dia">
          <p className={`cal-lista-data${chaveDia(d) === hoje ? ' hoje' : ''}`}>{DIAS[d.getDay()]}, {d.getDate()} de {MESES[d.getMonth()]}</p>
          {porDia[chaveDia(d)].map((it) => <ItemCal key={it.id} it={it} abrir={abrir} largo />)}
        </div>
      ))}
      {!comPost.length && vazio && <Vazio icone={<CalendarDays />} titulo={vazio} texto="Crie um post e agende, ou peça ao Claude: ele deixa os rascunhos aqui." />}
    </div>
  );
}

// O ano num olhar: cada mês com os dias marcados por cor. Toque no dia para ver os posts, no mês para abrir o mês.
function Ano({ ano, porDia, hoje, verDia, verMes }: { ano: number; porDia: Record<string, any[]>; hoje: string; verDia: (d: Date) => void; verMes: (m: number) => void }) {
  return (
    <div className="cal-ano">
      {MESES.map((nome, m) => {
        const inicio = new Date(ano, m, 1);
        const total = new Date(ano, m + 1, 0).getDate();
        const dias = seguidos(inicio, total);
        const posts = dias.reduce((s, d) => s + (porDia[chaveDia(d)] || []).length, 0);
        return (
          <section key={nome} className="cal-ano-mes">
            <button type="button" className="cal-ano-topo" onClick={() => verMes(m)}><b>{nome}</b><span>{posts ? qtPosts(posts) : 'sem posts'}</span></button>
            <div className="cal-ano-grade">
              {DIAS.map((d) => <span key={d} className="cal-ano-sem" aria-hidden="true">{d[0]}</span>)}
              {Array.from({ length: inicio.getDay() }, (_, i) => <span key={`v${i}`} />)}
              {dias.map((d) => {
                const k = chaveDia(d);
                const itens = porDia[k] || [];
                const tipo = itens.some((i) => i.status === 'erro') ? 'erro' : itens.some((i) => i.status === 'agendado') ? 'agendado' : itens.length ? 'publicado' : '';
                return <button key={k} type="button" className={`cal-ano-dia ${tipo}${k === hoje ? ' hoje' : ''}`} onClick={() => verDia(d)} title={itens.length ? qtPosts(itens.length) : undefined} aria-label={`${d.getDate()} de ${nome}${itens.length ? `, ${qtPosts(itens.length)}` : ''}`}>{d.getDate()}</button>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ItemCal({ it, abrir, largo }: { it: any; abrir: (it: any) => void; largo?: boolean }) {
  const rede = REDES[it.rede];
  return (
    <button type="button" className={`cal-item st-${it.status}${largo ? ' largo' : ''}`} style={{ ['--c' as any]: rede?.cor || 'var(--mudo)' }} onClick={() => abrir(it)}
      title={`${rede?.t || it.rede} · ${FORMATOS[it.formato] || it.formato} · ${STATUS_PECA[it.status]?.t || it.status}${it.perfil === 'en' ? ' · perfil em inglês' : ''}${it.erro ? ` · ${it.erro}` : ''}`}>
      {it.miniatura ? <img src={it.miniatura} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="cal-item-sem" />}
      <span className="cal-item-t">
        {it.quando && <b>{hora(it.quando)}</b>}
        <span>{it.titulo}</span>
      </span>
      {it.perfil === 'en' && <span className="cal-en" aria-label="Perfil em inglês">EN</span>}
      {largo && <Etiqueta cor={STATUS_PECA[it.status]?.cor}>{it.pelo_app ? 'Pelo app' : STATUS_PECA[it.status]?.t || it.status}</Etiqueta>}
    </button>
  );
}
