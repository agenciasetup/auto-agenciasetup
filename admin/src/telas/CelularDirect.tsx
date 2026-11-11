// A aba Direct do app do celular: primeiro as dúvidas que esperam o dono, para responder ali mesmo; depois o Atendente
// e os tetos do dia, as pessoas por fase (o toque abre a ficha, com o botão que leva para a conversa no Instagram) e o
// placar dos dois vendedores. Mesmos dados e mesma ação da tela Follow-up (GET /followup e POST /followup/:id/responder).
// Nada aqui manda mensagem para ninguém: responder uma dúvida grava a resposta, e quem leva é o Atendente ou a rodada
// do direct, dentro dos tetos de sempre.
import { useState } from 'react';
import { ExternalLink, Send } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Etiqueta, Modal, avisar, useSessao } from '../nucleo/ui';
import { dinheiro, haQuanto, numero } from '../nucleo/util';
import { Barra, Secao, SemRede, Trecho, estiloCor, useGuardado } from './CelularBase';

const FASES = ['na_hora', 'conversando', 'ofertado', 'novo', 'nao_sei', 'comprou', 'nao_quer'];
const NOME_CURTO: Record<string, string> = { na_hora: 'Na hora', conversando: 'Conversando', ofertado: 'Com oferta', novo: 'Chegaram', nao_sei: 'Não sei', comprou: 'Compraram', nao_quer: 'Não querem' };
const VAZIO: Record<string, string> = {
  na_hora: 'Ninguém com toque vencido agora.', conversando: 'Ninguém conversando agora.', ofertado: 'Ninguém com oferta esperando resposta.',
  novo: 'Ninguém novo sem oferta.', nao_sei: 'Nenhuma conversa em que o vendedor ficou sem saber o que fazer.', comprou: 'Ninguém comprou ainda por aqui.', nao_quer: 'Ninguém marcado como "não quer".',
};

export default function CelularDirect({ versao, mudou }: { versao: number; mudou: () => void }) {
  const { pode } = useSessao();
  const podeMexer = pode('followup.editar');
  const duv = useGuardado<any>('direct-duvidas', () => get('/followup?fase=duvida&limite=30'), [versao]);
  const [fase, setFase] = useState('na_hora');
  const lista = useGuardado<any>(`direct-${fase}`, () => get(`/followup?fase=${fase}&limite=40`), [fase, versao]);
  const [ficha, setFicha] = useState<any>(null);
  const d: any = duv.dados;

  if (!d) return duv.erro ? <ErroCarga erro={duv.erro} tentar={duv.recarregar} /> : <Carregando />;

  const responder = async (id: string, resposta: string) => {
    try {
      const r: any = await post(`/followup/${id}/responder`, { resposta });
      avisar(r?.atendente_leva
        ? 'Resposta salva. O Atendente leva para a pessoa no próximo minuto.'
        : 'Resposta salva. A pessoa recebe na próxima rodada do direct.');
      await duv.recarregar();
      mudou();
      return true;
    } catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); return false; }
  };

  const a = d.atendente || {};
  const t = d.tetos || {};
  const numeros = d.numeros || {};
  const duvidas: any[] = d.itens || [];
  const pessoas: any[] = lista.dados && lista.dados.fase === fase ? lista.dados.itens || [] : [];
  const placar: any[] = d.placar || [];

  return <>
    <SemRede erro={duv.erro} tentar={duv.recarregar} />

    <Secao titulo="Dúvidas com você" lado={duvidas.length ? <b className="cel-conta">{duvidas.length}</b> : null}>
      {duvidas.length === 0 && <p className="cel-quieto">Nenhuma dúvida esperando você. Quando alguém perguntar algo que o Atendente não sabe, aparece aqui e chega um aviso.</p>}
      {duvidas.map((p) => <Duvida key={p.id} p={p} podeMexer={podeMexer} responder={responder} />)}
    </Secao>

    <Secao titulo="Atendente e tetos">
      <div className="cel-cartao cel-gasto">
        <span><Etiqueta cor={a.ligado ? 'verde' : 'cinza'}>{a.ligado ? 'Atendente ligado' : 'Atendente desligado'}</Etiqueta> {a.ligado && a.modos ? a.modos[a.modo] || '' : 'Ninguém responde sozinho agora.'}</span>
        {t.dia && <>
          <span><strong>{numero(t.dia.usado)}</strong> de {numero(t.dia.teto)} mensagens de follow-up hoje{t.dia.sobra === 0 ? ' · o teto do dia fechou' : ''}</span>
          <Barra usado={t.dia.usado} teto={t.dia.teto} />
        </>}
        {t.rodada && <>
          <span><strong>{numero(t.rodada.usado)}</strong> de {numero(t.rodada.teto)} pessoas nesta rodada</span>
          <Barra usado={t.rodada.usado} teto={t.rodada.teto} />
        </>}
      </div>
    </Secao>

    <Secao titulo="Pessoas">
      <div className="cel-sub" role="tablist" aria-label="Fase da conversa" data-sem-puxar>
        {FASES.map((f) => <button key={f} type="button" role="tab" aria-selected={fase === f} className={fase === f ? 'ativo' : ''} onClick={() => setFase(f)}>{NOME_CURTO[f]}<b>{numero(numeros[f])}</b></button>)}
      </div>
      {lista.erro && !pessoas.length && <ErroCarga erro={lista.erro} tentar={lista.recarregar} />}
      {!lista.erro && !pessoas.length && (lista.carregando ? <Carregando /> : <p className="cel-quieto">{VAZIO[fase]}</p>)}
      <div className="cel-lista">
        {pessoas.map((p) => (
          <button key={p.id} type="button" className="cel-linha" style={estiloCor(p.pausa ? 'var(--ambar)' : p.pode_tocar ? 'var(--verde)' : 'var(--fraco)')} onClick={() => setFicha(p)}>
            <strong>@{p.usuario}{p.nome ? <small className="mudo"> · {p.nome}</small> : null}</strong>
            {p.ultima_mensagem && <span className="cel-uma-linha">{p.ultima_mensagem}</span>}
            <span className="cel-linha-meta">{haQuanto(p.ultima_em || p.primeiro_em)}{d.interesses && d.interesses[p.interesse] ? ` · ${d.interesses[p.interesse]}` : ''}{p.toques ? ` · ${p.toques} ${p.toques === 1 ? 'toque' : 'toques'}` : ''}</span>
          </button>
        ))}
      </div>
      {lista.dados && lista.dados.fase === fase && Number(lista.dados.total) > pessoas.length && <p className="cel-dica">Mostrando {pessoas.length} de {numero(lista.dados.total)}. A lista inteira está na tela Follow-up do painel.</p>}
    </Secao>

    {placar.length > 0 && (
      <Secao titulo="Placar dos vendedores">
        <div className="cel-lista">
          {placar.map((v) => (
            <div key={v.vendedor} className="cel-linha">
              <strong>{v.nome}</strong>
              <span className="cel-linha-meta">{numero(v.pessoas)} {v.pessoas === 1 ? 'pessoa' : 'pessoas'} · {numero(v.responderam)} {v.responderam === 1 ? 'respondeu' : 'responderam'}{v.taxa_resposta !== null && v.taxa_resposta !== undefined ? ` (${String(v.taxa_resposta).replace('.', ',')}%)` : ''} · {numero(v.compraram)} {v.compraram === 1 ? 'comprou' : 'compraram'}</span>
              <span className="cel-linha-meta"><b className="num">{dinheiro(v.receita_centavos, 'brl')}</b>{v.pouco ? ' · ainda é pouca gente para comparar' : ''}</span>
            </div>
          ))}
        </div>
      </Secao>
    )}

    <Modal titulo={ficha ? `@${ficha.usuario}` : ''} aberto={!!ficha} fechar={() => setFicha(null)}>
      {ficha && <Ficha p={ficha} d={d} />}
    </Modal>
  </>;
}

function Duvida({ p, podeMexer, responder }: { p: any; podeMexer: boolean; responder: (id: string, r: string) => Promise<boolean> }) {
  const [texto, setTexto] = useState('');
  const [mandando, setMandando] = useState(false);
  const pergunta = String(p.duvida || p.ultima_mensagem || '').trim();
  const mandar = async () => {
    if (!texto.trim() || mandando) return;
    setMandando(true);
    if (await responder(p.id, texto.trim())) setTexto('');
    setMandando(false);
  };
  return (
    <article className="cel-prop" style={estiloCor('var(--verde)')}>
      <div className="cel-linha-meta"><strong>@{p.usuario}</strong>{p.nome ? ` · ${p.nome}` : ''} · {haQuanto(p.duvida_em || p.ultima_em)}</div>
      <div className="cel-frases"><span>{pergunta || 'Sem texto anotado.'}</span></div>
      {p.ultima_mensagem && p.ultima_mensagem !== pergunta && <><p className="cel-rotulo">Última mensagem dela</p><Trecho texto={p.ultima_mensagem} linhas={3} /></>}
      {podeMexer && <>
        <textarea className="cel-recado" rows={3} placeholder="Sua resposta. Escreva como você falaria com a pessoa." value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={`Resposta para @${p.usuario}`} />
        <div className="cel-decidir dois">
          <a className="bt" href={p.abrir} target="_blank" rel="noreferrer"><ExternalLink />Ver a conversa</a>
          <button type="button" className="bt bt-tinta" disabled={!texto.trim() || mandando} onClick={mandar}><Send />{mandando ? 'Salvando…' : 'Responder'}</button>
        </div>
      </>}
      {!podeMexer && <a className="bt" href={p.abrir} target="_blank" rel="noreferrer"><ExternalLink />Ver a conversa no Instagram</a>}
    </article>
  );
}

function Ficha({ p, d }: { p: any; d: any }) {
  const historico: any[] = Array.isArray(p.historico) ? [...p.historico].reverse() : [];
  return <>
    <div className="cel-linha-meta">
      <Etiqueta cor="azul">{(d.fases || {})[p.fase] || p.fase}</Etiqueta>
      {d.interesses && d.interesses[p.interesse] ? d.interesses[p.interesse] : ''}{p.vendedor && d.vendedores && d.vendedores[p.vendedor] ? ` · vendedor ${String(d.vendedores[p.vendedor]).split(' (')[0]}` : ''}{p.toques ? ` · ${p.toques} ${p.toques === 1 ? 'toque' : 'toques'}` : ''}
    </div>
    {p.nome && <p className="cel-rotulo">{p.nome}</p>}
    {p.pausa && <p className="cel-troca">Em pausa: {p.pausa_motivo || (p.pausa === 'dono' ? 'você está conversando com essa pessoa.' : 'o Atendente está cuidando.')}</p>}
    {!p.pausa && !p.pode_tocar && p.nao_tocar_motivo && <p className="cel-troca">O sistema não toca agora: {p.nao_tocar_motivo}</p>}
    {p.duvida && <><p className="cel-rotulo">Dúvida</p><Trecho texto={p.duvida} linhas={4} /></>}
    {p.resposta && <><p className="cel-rotulo">Sua resposta</p><Trecho texto={p.resposta} linhas={4} /></>}
    {p.proxima_mensagem && <><p className="cel-rotulo">Próxima mensagem preparada</p><Trecho texto={p.proxima_mensagem} linhas={4} /></>}
    {p.nota && <><p className="cel-rotulo">Anotação</p><Trecho texto={p.nota} linhas={3} /></>}
    {historico.length > 0 && <>
      <p className="cel-rotulo">O que aconteceu</p>
      <ul className="cel-historico">{historico.map((h, k) => <li key={k}>{h.texto || h.tipo}<small>{haQuanto(h.em)}</small></li>)}</ul>
    </>}
    <div className="cel-acoes">
      <a className="bt bt-tinta" href={p.abrir} target="_blank" rel="noreferrer"><ExternalLink />Abrir a conversa no Instagram</a>
      <a className="bt" href={p.perfil_url} target="_blank" rel="noreferrer">Ver o perfil</a>
    </div>
  </>;
}
