// Suporte: quem comprou, até onde chegou no curso e quem precisa de ajuda agora (pedido do dono em 26/10/2026:
// "identifica GARGALO... meu suporte pode agir antes de ter problema"). O funil mostra onde as pessoas param; a lista
// traz cada pessoa com o motivo em uma frase e o WhatsApp com a mensagem pronta. Ação verSuporte (acoes-suporte.js).
// Os filtros de etapa e a busca rodam aqui na tela (a lista já vem inteira do período).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheckBig, MessageCircle, Search, X } from 'lucide-react';
import { get } from '../nucleo/api';
import { Abas, BotaoCopiar, Carregando, ErroCarga, Etiqueta, Grupo, Modal, Segredo, Titulo, Vazio, useCarregar } from '../nucleo/ui';
import { data, dinheiro, haQuanto, iniciais, numero } from '../nucleo/util';
import { DetalheAluno } from './Alunos';
import '../suporte.css';

const PERIODOS = [{ d: 7, t: '7 dias' }, { d: 30, t: '30 dias' }, { d: 90, t: '90 dias' }, { d: 0, t: 'Tudo' }];
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// "há 3 h", "ontem", "há 2 dias" ou "em 12/10/2026" (haQuanto devolve a data depois de uma semana).
const quando = (iso?: string | null) => { const h = haQuanto(iso); return /^\d/.test(h) ? `em ${h}` : h; };
const COR_PRIORIDADE: Record<number, string> = { 1: 'vermelho', 2: 'ambar', 3: 'azul', 4: 'cinza' };
const ORIGEM: Record<string, string> = { compra: 'Pagou', presente: 'Recebeu de presente', bonus: 'Ganhou o acesso' };

export default function Suporte() {
  useEffect(() => { document.title = 'Suporte | Painel Agência Setup'; }, []);
  const [dias, setDias] = useState(90);
  const [curso, setCurso] = useState('');
  const [aba, setAba] = useState<'ajuda' | 'todos'>('ajuda');
  const [etapa, setEtapa] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [link, setLink] = useState<{ nome: string; link: string } | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const { dados: d, erro, carregando, recarregar } = useCarregar(() => get(`/suporte?dias=${dias}${curso ? `&curso=${curso}` : ''}`), [dias, curso]);

  const pessoas: any[] = d?.pessoas || [];
  const ajuda = pessoas.filter((p) => p.precisa_ajuda);
  const visiveis = useMemo(() => {
    let l = aba === 'ajuda' && !etapa ? ajuda : pessoas;
    if (etapa === 'reembolso') l = l.filter((p) => p.situacao !== 'ativo');
    else if (etapa) l = l.filter((p) => p.etapa === etapa);
    const b = semAcento(busca.trim());
    if (b) l = l.filter((p) => semAcento(`${p.nome} ${p.email}`).includes(b) || (b.replace(/\D/g, '').length >= 4 && String(p.celular || '').includes(b.replace(/\D/g, ''))));
    return l;
  }, [pessoas, aba, etapa, busca]);

  // Etapas do filtro: as do funil (como estado da pessoa) e as que ficam fora dele, com quantas pessoas há em cada.
  const opcoesEtapa = useMemo(() => {
    if (!d) return [];
    const conta = (f: (p: any) => boolean) => pessoas.filter(f).length;
    return [
      { v: 'sem_acesso', t: 'Pagou, curso não liberado', n: conta((p) => p.etapa === 'sem_acesso') },
      ...d.etapas.flatMap((e: any) => [{ v: e.id, t: e.estado, n: conta((p) => p.etapa === e.id) },
        // E-mail que saiu antes do rastreio (ou ainda sem aviso do Resend): à parte, nunca como "não abriu".
        ...(e.id === 'email' && d.rastreio_email ? [{ v: 'sem_rastreio', t: 'E-mail enviado, sem dado de abertura', n: conta((p) => p.etapa === 'sem_rastreio') }] : [])]),
      { v: 'reembolso', t: 'Reembolso ou contestação', n: conta((p) => p.situacao !== 'ativo') },
    ].filter((o) => o.n || o.v === etapa);
  }, [d, etapa]);

  const verEtapa = (id: string) => {
    setEtapa(etapa === id ? '' : id);
    setAba('todos');
    setTimeout(() => lista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const periodo = dias ? `nos últimos ${dias} dias` : 'desde o começo';
  const rodapeFunil = 'Cada etapa conta quem chegou até ela ou passou; toque numa etapa para ver quem parou ali. Quem ganhou o curso na mão (bônus) fica fora do funil e aparece na lista.'
    + (d?.rastreio_email ? ` Aberto e clicado vêm do rastreio do Resend, ligado em ${data(d.rastreio_desde)}: é um sinal, não certeza (alguns apps abrem o e-mail sozinhos ou bloqueiam a contagem). E-mail mandado antes disso fica como "sem dado de abertura", fora de quem parou.` : '');

  return (
    <div className="tela">
      <Titulo titulo="Suporte" sub="Quem comprou, até onde chegou no curso e quem precisa de ajuda agora. Fale com a pessoa antes de virar problema." />
      <div className="filtros">
        <div className="chips" role="group" aria-label="Período da compra">
          {PERIODOS.map((p) => <button key={p.d} className={`chip ${dias === p.d ? 'ativo' : ''}`} onClick={() => setDias(p.d)}>{p.t}</button>)}
        </div>
        {d && d.cursos.length > 1 && (
          <select value={curso || d.curso?.id || ''} onChange={(e) => setCurso(e.target.value)} aria-label="Curso">
            {d.cursos.map((c: any) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        )}
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {d && !d.curso && <Vazio titulo="Nenhum curso publicado ainda." texto="Quando o curso estiver no ar e alguém comprar, o funil e a lista aparecem aqui." />}
      {d && d.curso && (
        <div className={carregando ? 'suporte-carregando' : undefined}>
          <div className="numeros">
            <div className="numero destaque"><b>{numero(d.resumo.precisam_ajuda)}</b><span>{d.resumo.precisam_ajuda === 1 ? 'Pessoa precisa' : 'Pessoas precisam'} de ajuda agora{d.resumo.sem_telefone ? ` · ${numero(d.resumo.sem_telefone)} sem celular` : ''}</span></div>
            <div className="numero"><b>{numero(d.resumo.compraram)}</b><span>Compraram {periodo}{d.resumo.na_mao ? ` · mais ${numero(d.resumo.na_mao)} com acesso dado na mão` : ''}</span></div>
            <div className="numero"><b>{pct(d.resumo.entraram, d.resumo.compraram)}</b><span>Entraram na área ({numero(d.resumo.entraram)} de {numero(d.resumo.compraram)})</span></div>
            <div className="numero"><b>{numero(d.resumo.concluiram)}</b><span>Concluíram o curso{d.resumo.reembolsos ? ` · ${numero(d.resumo.reembolsos)} ${d.resumo.reembolsos === 1 ? 'reembolso' : 'reembolsos'}` : ''}</span></div>
          </div>

          <Grupo titulo={`Onde as pessoas param · ${d.curso.titulo}`}
            rodape={rodapeFunil}>
            {d.resumo.compraram ? <Funil etapas={d.etapas} ativa={etapa} escolher={verEtapa} />
              : <p className="mudo" style={{ margin: 0 }}>Ninguém comprou {periodo}. Quando alguém comprar, o funil mostra até onde cada pessoa chegou.</p>}
          </Grupo>

          <div ref={lista} className="suporte-lista-topo">
            <Abas atual={aba} mudar={(id) => { setAba(id as any); if (id === 'ajuda') setEtapa(''); }}
              abas={[{ id: 'ajuda', t: 'Precisam de ajuda', n: ajuda.length }, { id: 'todos', t: 'Todos', n: pessoas.length }]} />
          </div>
          <div className="filtros">
            <input type="search" placeholder="Buscar por nome, e-mail ou celular" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pessoa" />
            <select value={etapa} onChange={(e) => { setEtapa(e.target.value); if (e.target.value) setAba('todos'); }} aria-label="Etapa">
              <option value="">Todas as etapas</option>
              {opcoesEtapa.map((o) => <option key={o.v} value={o.v}>{o.t} ({o.n})</option>)}
            </select>
            {(etapa || busca) && <button className="bt bt-texto bt-mini" onClick={() => { setEtapa(''); setBusca(''); }}><X />Limpar</button>}
          </div>

          {visiveis.length ? (
            <div className="pessoas">
              {visiveis.map((p) => <Pessoa key={p.id} p={p} veValor={d.ve_valor} abrir={() => setAberto(p.aluno_id)} />)}
            </div>
          ) : etapa || busca ? (
            <Vazio icone={<Search />} titulo="Ninguém com esse filtro." texto="Troque a etapa, apague a busca ou aumente o período." />
          ) : aba === 'ajuda' && pessoas.length ? (
            <Vazio icone={<CircleCheckBig />} titulo="Ninguém precisa de ajuda agora."
              texto="Quando alguém pagar e não entrar, parar numa aula ou mandar uma dúvida, a pessoa aparece aqui com o motivo e o WhatsApp."
              acao={<button className="bt bt-mini" onClick={() => setAba('todos')}>Ver todos ({numero(pessoas.length)})</button>} />
          ) : (
            <Vazio titulo={`Ninguém comprou ${periodo}.`} texto="Quem comprar pelo checkout aparece aqui sozinho, com a etapa em que está." />
          )}
        </div>
      )}

      <DetalheAluno id={aberto} fechar={() => setAberto(null)} mudou={recarregar} mostrarLink={setLink} />
      <Modal titulo="Link de entrada" aberto={!!link} fechar={() => setLink(null)} rodape={<button className="bt bt-tinta" onClick={() => setLink(null)}>Pronto</button>}>
        {link && <>
          <p style={{ marginTop: 0 }}>Mande este link para <b>{link.nome}</b>. Ele entra direto na área do aluno, vale uma vez e vence em 24 horas.</p>
          <Segredo texto={link.link} aviso="Não publique este link: quem abrir primeiro entra na conta." />
        </>}
      </Modal>
    </div>
  );
}

// O funil em barras: o número, a parte de quem comprou e quantos pararam em cada etapa. A maior parada é o gargalo.
function Funil({ etapas, ativa, escolher }: { etapas: any[]; ativa: string; escolher: (id: string) => void }) {
  const base = etapas[0]?.n || 0;
  const gargalo = etapas.reduce((m, e, i) => (i < etapas.length - 1 && e.parados > (etapas[m]?.parados || 0) ? i : m), -1);
  return (
    <div className="funil">
      {etapas.map((e, i) => (
        <button key={e.id} type="button" className={`funil-etapa ${ativa === e.id ? 'ativa' : ''}`} onClick={() => escolher(e.id)} title={e.dica}
          aria-label={`${e.t}: ${e.n} de ${base}. ${e.parados ? `${e.parados} pararam aqui.` : ''} Ver quem parou nesta etapa.`}>
          <span className="funil-nome">
            <span>{e.t}</span>
            {i < etapas.length - 1 && e.parados > 0 && (
              <small>{numero(e.parados)} {e.parados === 1 ? 'parou' : 'pararam'} aqui{i === gargalo ? <Etiqueta cor="ambar">Maior gargalo</Etiqueta> : null}</small>
            )}
            {e.sem_rastreio > 0 && <small>{numero(e.sem_rastreio)} sem dado de abertura (e-mail de antes do rastreio)</small>}
          </span>
          <span className="funil-barra"><i style={{ width: base ? `${Math.max(e.n ? 2 : 0, (100 * e.n) / base)}%` : 0 }} /></span>
          <span className="funil-num">
            <b>{numero(e.n)}</b><small>{pct(e.n, base)}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function Pessoa({ p, veValor, abrir }: { p: any; veValor: boolean; abrir: () => void }) {
  const cor = p.motivo ? COR_PRIORIDADE[p.motivo.prioridade] || 'cinza' : p.etapa === 'concluiu' ? 'verde' : undefined;
  const outros = (p.motivos || []).slice(1);
  const pedido = p.pedido ? `pedido #${p.pedido.numero}${veValor && p.pedido.total_centavos != null ? ` · ${dinheiro(p.pedido.total_centavos)}` : ''}` : '';
  const atividade = p.sem_acesso ? '' : p.ultima_atividade ? `ativo ${haQuanto(p.ultima_atividade)}` : 'nunca entrou';
  const sub = [`${ORIGEM[p.origem] || 'Entrou'} ${quando(p.liberado_em)}`, pedido, p.sem_acesso ? '' : `${p.aulas_feitas} de ${p.aulas_total} aulas`, atividade].filter(Boolean).join(' · ');
  return (
    <div className="pessoa">
      <button type="button" className="pessoa-corpo" onClick={abrir} aria-label={`Abrir a ficha de ${p.nome}`}>
        <span className={`pessoa-avatar ${cor ? `cor-${cor}` : ''}`} aria-hidden="true">{iniciais(p.nome)}</span>
        <span className="pessoa-texto">
          <span className="pessoa-nome"><span>{p.nome}</span><Etiqueta cor={p.situacao !== 'ativo' ? 'vermelho' : p.etapa === 'concluiu' ? 'verde' : 'cinza'}>{p.situacao === 'reembolsado' ? 'Reembolsado' : p.situacao === 'contestado' ? 'Contestado' : p.etapa_t}</Etiqueta></span>
          {p.motivo && <span className="pessoa-motivo">{p.motivo.texto}</span>}
          {outros.length ? <span className="pessoa-mais">Também: {outros.map((m: any) => m.texto).join(' ')}</span> : null}
          <span className="pessoa-sub">{sub}</span>
        </span>
      </button>
      <div className="pessoa-acoes">
        {p.whatsapp ? (
          <a className="bt bt-mini bt-whats" href={p.whatsapp.link} target="_blank" rel="noopener noreferrer" title={p.mensagem}>
            <MessageCircle />WhatsApp
          </a>
        ) : (
          <span className="pessoa-email" title="Sem celular no cadastro">
            <span>{p.email}</span>
            <BotaoCopiar texto={p.email} rotulo="Copiar e-mail" classe="bt bt-mini" />
          </span>
        )}
      </div>
    </div>
  );
}
