// A aula: player, assuntos (marcadores), "Faça agora", materiais e resumo. Modo assistir e modo aplicar.
// O progresso só conta o que tocou de verdade (pular para o fim não vale) e é salvo a cada 15 segundos.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Carregando, ErroTela, I, brl, copiar, mmss, useDados, useToast } from '../comum';
import { SITE, get, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/rota';
import { Player, type PlayerControle } from '../player';
import { Ficha, baixar } from './Ficha';
import { Ajudou, Comentarios, Notas, Tutor } from './AulaAbas';
import { FaixaConquista } from './Conquista';

export function Aula({ id }: { id: string }) {
  const { dados: d, erro, carregando, recarregar } = useDados(() => get(`/aulas/${id}`), [id]);
  if (carregando && !d) return <Carregando />;
  if (erro) {
    const cod = erro.dados && erro.dados.codigo;
    if (cod === 'bloqueada') return <div className="estado gutter largura"><p>{erro.message}</p><Link className="bt bt-p" para="/cursos">Voltar aos cursos</Link></div>;
    if (cod === 'sem-matricula') return <div className="estado gutter largura"><p>{erro.message}</p><a className="bt bt-marca" href={`${SITE}/cursos`}>Ver os cursos</a></div>;
    return <ErroTela erro={erro} aoTentar={recarregar} />;
  }
  return <AulaPronta d={d} />;
}

function AulaPronta({ d }: { d: any }) {
  const { ir, rota } = useRota();
  const toast = useToast();
  const a = d.aula;
  const marcadores: any[] = Array.isArray(a.marcadores) ? a.marcadores : [];
  const passos: any[] = Array.isArray(a.faca_agora) ? a.faca_agora : [];
  const [modo, setModo] = useState<'assistir' | 'aplicar'>(rota.busca.get('modo') === 'aplicar' ? 'aplicar' : 'assistir');
  const [aba, setAba] = useState(passos.length ? 'faca' : 'materiais');
  // Veio da busca (?t=): começa no minuto achado; senão, de onde parou.
  const tBusca = Number(rota.busca.get('t'));
  const inicio = Number.isFinite(tBusca) && tBusca > 0 ? tBusca : d.progresso.posicao_s || 0;
  const [t, setT] = useState(inicio);
  const [feitos, setFeitos] = useState<number[]>(d.progresso.passos || []);
  const [concluida, setConcluida] = useState(!!d.progresso.concluida_em);
  const [certificado, setCertificado] = useState<any>(null);
  const [nComent, setNComent] = useState<number>(d.comentarios || 0);
  const pausas: any[] = Array.isArray(a.pausas) ? a.pausas : [];
  // Marcador de oferta no minuto: aviso pequeno ao lado do vídeo por alguns segundos (nunca por cima).
  const ofertaMinuto = marcadores.find((m) => m.tipo === 'oferta' && t >= m.s && t < m.s + 10);
  const player = useRef<PlayerControle>(null);

  // Progresso real: soma só os pedacinhos que tocaram em sequência (menos de 2,5 s entre um tempo e outro).
  const conta = useRef({ assistido: d.progresso.assistido_s || 0, ultimo: inicio, salvoEm: Date.now(), mudou: false });
  async function salvar(extra: any = {}) {
    const c = conta.current;
    if (!c.mudou && !extra.concluir) return;
    c.mudou = false;
    c.salvoEm = Date.now();
    try {
      const r = await post(`/aulas/${a.id}/progresso`, { posicao: c.ultimo, assistido: Math.round(c.assistido), ...extra });
      if (r.concluida && !concluida) { setConcluida(true); if (!extra.concluir) toast('Aula concluída'); }
      if (r.certificado) setCertificado(r.certificado);
    } catch {}
  }
  function aoTempo(s: number) {
    const c = conta.current;
    const delta = s - c.ultimo;
    if (delta > 0 && delta < 2.5) { c.assistido += delta; c.mudou = true; }
    c.ultimo = s;
    setT(s);
    if (Date.now() - c.salvoEm > 15_000) salvar();
  }
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'hidden') salvar(); };
    document.addEventListener('visibilitychange', f);
    return () => { document.removeEventListener('visibilitychange', f); salvar(); };
  }, []);

  const assuntos = marcadores.filter((m) => m.tipo !== 'oferta');
  const atual = useMemo(() => [...assuntos].reverse().find((m) => t >= m.s) || assuntos[0], [t, marcadores]);
  const irPara = (s: number) => { player.current && player.current.ir(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const proxima = () => { salvar(); if (d.proxima && d.proxima.liberada) ir(`/aulas/${d.proxima.id}`); };

  async function marcarPasso(i: number) {
    const novos = feitos.includes(i) ? feitos.filter((x) => x !== i) : [...feitos, i];
    setFeitos(novos);
    try { await post(`/aulas/${a.id}/passos`, { passos: novos }); if (!feitos.includes(i)) toast('Passo feito'); } catch (e: any) { toast(e.message); }
  }
  async function concluir() {
    setConcluida(true);
    await salvar({ concluir: true });
    toast('Aula concluída');
  }
  function acao(passo: any, ac: string) {
    if (ac === 'copiar' && passo.prompt) return <button key={ac} className="bt bt-p" onClick={() => copiar(passo.prompt, toast)}><I n="copiar" />Copiar</button>;
    if (ac === 'claude' && passo.prompt) return <a key={ac} className="bt bt-p" href={`https://claude.ai/new?q=${encodeURIComponent(passo.prompt)}`} target="_blank" rel="noopener"><I n="brilho" />Abrir no Claude</a>;
    if (ac.startsWith('baixar:')) {
      const nome = ac.slice(7);
      const f = (d.kit || []).find((k: any) => k.nome === nome);
      if (!f) return null;
      return <button key={ac} className="bt bt-p" onClick={() => baixar(f.id, toast)}><I n="baixar" />{nome}</button>;
    }
    return null;
  }
  const vez = passos.findIndex((_, i) => !feitos.includes(i));

  const textoPrompt = (p: string) => p.split(/(\[[^\]]+\])/g).map((x, i) => (x.startsWith('[') ? <span key={i} className="vaga">{x}</span> : x));

  return (
    <section className="tela ativa gutter largura" aria-label="Aula">
      <div className={`aula${modo === 'aplicar' ? ' aplicar' : ''}`}>
        <div className="a-player">
          <Player ref={player} video={d.video} capa={a.capa_url} inicio={inicio} aberturaFim={a.abertura_fim_s} finalInicio={a.final_inicio_s}
            aoTempo={aoTempo} aoTerminar={() => salvar()} aoProxima={proxima} temProxima={!!(d.proxima && d.proxima.liberada)}
            pausas={pausas} aoVerPasso={() => { setModo('aplicar'); setAba('faca'); }} />
          {d.complemento ? <Etiqueta e={d.complemento} aoAbrir={() => player.current && player.current.pausar()} /> : null}
          {ofertaMinuto ? <a className="aviso-oferta" href={ofertaMinuto.link || '#'} target="_blank" rel="noopener"><I n="brilho" /><span><b>{ofertaMinuto.titulo}</b>{ofertaMinuto.texto ? <small>{ofertaMinuto.texto}</small> : null}</span><I n="direita" /></a> : null}
        </div>

        <div className="a-cab">
          <FaixaConquista c={d.conquista} />
          <div className="trilha-txt"><Link para={`/cursos/${d.curso.slug}`}>{d.curso.titulo}</Link>{d.modulo ? <><span>·</span><span>Módulo {d.modulo.numero}</span></> : null}<span>·</span><span>Aula {a.numero} de {d.curso.total}</span></div>
          <h1>{a.codigo} · {a.titulo}</h1>
          {d.mudou ? <p className="aviso-mudou"><I n="brilho" />Esta aula foi atualizada depois que você assistiu. Vale ver de novo.</p> : null}
          {certificado ? <a className="aviso-mudou certificado-saiu" href={certificado.link}><I n="medalha" />Seu certificado saiu! Toque para ver.</a> : null}
          <div className="linha-acoes">
            {passos.length ? (
              <div className="segmentos" role="tablist" aria-label="Modo da aula">
                <button role="tab" aria-selected={modo === 'assistir'} onClick={() => setModo('assistir')}><I n="tocar" />Assistir</button>
                <button role="tab" aria-selected={modo === 'aplicar'} onClick={() => { setModo('aplicar'); setAba('faca'); }}><I n="listas" />Aplicar</button>
              </div>
            ) : null}
            <button className="bt bt-p" onClick={concluir} disabled={concluida}><I n="ok" />{concluida ? 'Concluída' : 'Concluir'}</button>
            {d.proxima ? <Link className="bt bt-p so-pc" para={d.proxima.liberada ? `/aulas/${d.proxima.id}` : `/cursos/${d.curso.slug}`}>Próxima<I n="direita" /></Link> : null}
          </div>
          {assuntos.length ? (
            <div className="cap-chips">
              {assuntos.map((m) => <button key={m.s} className="cap-chip" aria-current={atual && atual.s === m.s} onClick={() => irPara(m.s)}><b>{mmss(m.s)}</b>{m.titulo}</button>)}
            </div>
          ) : null}
        </div>

        <div className="a-abas">
          <div className="segmentos" role="tablist" aria-label="Partes da aula">
            {passos.length ? <button role="tab" aria-selected={aba === 'faca'} onClick={() => setAba('faca')}><I n="listas" />Faça agora</button> : null}
            <button role="tab" aria-selected={aba === 'materiais'} onClick={() => setAba('materiais')}><I n="arquivo" />Materiais{d.arquivos.length ? <span className="fraco"> {d.arquivos.length}</span> : null}</button>
            <button role="tab" aria-selected={aba === 'tutor'} onClick={() => setAba('tutor')}><I n="brilho" />Tutor</button>
            <button role="tab" aria-selected={aba === 'comentarios'} onClick={() => setAba('comentarios')}><I n="chat" />Comentários{nComent ? <span className="fraco"> {nComent}</span> : null}</button>
            <button role="tab" aria-selected={aba === 'notas'} onClick={() => setAba('notas')}><I n="nota" />Notas</button>
            {a.resumo ? <button role="tab" aria-selected={aba === 'resumo'} onClick={() => setAba('resumo')}><I n="nota" />Resumo</button> : null}
          </div>
        </div>

        <div className="a-paineis">
          {aba === 'faca' && passos.length ? (
            <div className="painel-aula ativo">
              <div className="passos-cab"><h2>Faça agora</h2><span style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="mudo num"><span style={{ fontSize: 13 }}>{feitos.length} de {passos.length}</span><span className="barra" style={{ width: 90 }}><i style={{ width: `${(feitos.length / passos.length) * 100}%` }} /></span></span></div>
              {passos.map((p, i) => {
                const feito = feitos.includes(i);
                return (
                  <div key={i} className={`passo${feito ? ' feito' : i === vez ? ' agora' : ''}`}>
                    <button className="n" onClick={() => marcarPasso(i)} aria-label={feito ? 'Desmarcar passo' : 'Marcar passo como feito'}>{feito ? <I n="ok" /> : i + 1}</button>
                    <div className="corpo">
                      <h3>{p.titulo}</h3>
                      <div className="detalhe" style={{ display: 'grid', gap: 10 }}>
                        {p.texto ? <p>{p.texto}</p> : null}
                        {p.prompt ? <div className="prompt">{textoPrompt(p.prompt)}</div> : null}
                        <div className="acoes">
                          {(p.acoes || []).map((ac: string) => acao(p, ac))}
                          {i === vez ? <button className="bt bt-marca bt-p" onClick={() => marcarPasso(i)}><I n="ok" />Fiz este passo</button> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {aba === 'materiais' ? (
            <div className="painel-aula ativo">
              {d.arquivos.length ? d.arquivos.map((f: any) => <Ficha key={f.id} f={f} />) : <p className="mudo">Esta aula usa os materiais das aulas anteriores. Todos estão na <Link para={`/cursos/${d.curso.slug}?aba=materiais`}>biblioteca do curso</Link>.</p>}
            </div>
          ) : null}
          {aba === 'tutor' ? <div className="painel-aula ativo"><Tutor aulaId={a.id} irPara={irPara} /></div> : null}
          {aba === 'comentarios' ? <div className="painel-aula ativo"><Comentarios aulaId={a.id} t={t} irPara={irPara} aoContar={setNComent} /></div> : null}
          {aba === 'notas' ? <div className="painel-aula ativo"><Notas aulaId={a.id} t={t} irPara={irPara} /></div> : null}
          {aba === 'resumo' && a.resumo ? (
            <div className="painel-aula ativo"><div className="cartao"><h3>Em 1 minuto</h3><p>{a.resumo}</p></div></div>
          ) : null}
          <Ajudou aulaId={a.id} inicial={d.avaliacao} />
          {d.oferta ? <OfertaTema o={d.oferta} fimModulo={d.fim_modulo} /> : null}
          <div className="ajudou" style={{ marginTop: 16 }}>
            <span>{concluida ? 'Aula concluída.' : 'Terminou de assistir?'}</span>
            <span className="acoes">
              {d.anterior ? <Link className="bt bt-p" para={`/aulas/${d.anterior.id}`}><I n="esquerda" />Anterior</Link> : null}
              {d.proxima ? <Link className="bt bt-p" para={d.proxima.liberada ? `/aulas/${d.proxima.id}` : `/cursos/${d.curso.slug}`}>Próxima<I n="direita" /></Link> : null}
            </span>
          </div>
        </div>

        <aside className="a-lado" aria-label="Assuntos e aulas">
          {assuntos.length ? <div><p className="lado-titulo">Assuntos desta aula</p><div className="cap-lista">{assuntos.map((m) => <button key={m.s} aria-current={atual && atual.s === m.s} onClick={() => irPara(m.s)}><b>{mmss(m.s)}</b>{m.titulo}</button>)}</div></div> : null}
          {d.modulo ? (
            <div><p className="lado-titulo lista">Módulo {d.modulo.numero} · {d.modulo.titulo}</p>
              <div className="lista-aulas">
                {d.modulo.aulas.map((x: any) => {
                  const e = x.id === a.id ? 'agora' : x.concluida ? 'feita' : '';
                  return <Link key={x.id} className={`a-item ${e}`} para={`/aulas/${x.id}`}><div className="capa">{x.capa_url ? <img src={x.capa_url} alt="" /> : null}</div><span><b>{x.codigo} · {x.titulo}</b><small className="num">{mmss(x.duracao_s)}</small></span><span className="est">{x.concluida ? <I n="ok" /> : x.id === a.id ? <I n="tocar" /> : null}</span></Link>;
                })}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

// "Quer ir além?": o produto que casa com o tema da aula, para quem ainda não tem. No fim do módulo vira "Próximo nível".
function OfertaTema({ o, fimModulo }: { o: any; fimModulo: boolean }) {
  const preco = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <a className="upsell oferta-tema" href={`${SITE}/checkout/${o.oferta.slug}`}>
      <span className="etiqueta"><I n="brilho" />{fimModulo ? 'Próximo nível' : 'Quer ir além?'}</span>
      <b>{o.nome}</b>
      {o.chamada ? <p>{o.chamada}</p> : null}
      <p><span className="marca-texto">{preco(o.oferta.preco_centavos)}</span>{o.oferta.preco_de_centavos ? <s className="fraco" style={{ marginLeft: 8 }}>{preco(o.oferta.preco_de_centavos)}</s> : null} · Conhecer <I n="direita" /></p>
    </a>
  );
}

// A etiqueta em cima do vídeo, como a do YouTube: "✨ Vídeo e voz gerados com IA | Aprender". Tocou, a etiqueta se abre
// num painel pequeno por cima do player (no celular, numa folha que sobe de baixo): a mini VSL, o texto, o preço e o
// botão de comprar. O vídeo da aula pausa. Quem já tem o curso vê "Ir para o curso". Só vem da API com a oferta ligada.
function Etiqueta({ e, aoAbrir }: { e: any; aoAbrir: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [cel, setCel] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const f = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [aberto]);
  const estilo = { '--c': e.cor } as any;
  const rotulo = <><span className="ia-brilho" aria-hidden="true">✨</span><span className="ia-rotulo">{e.rotulo}</span><span className="ia-sep" aria-hidden="true" /><b>{e.acao}</b></>;
  if (e.tem) return e.curso ? <Link className="ia-tag" para={`/cursos/${e.curso}`} style={estilo}>{rotulo}</Link> : null;

  // O e-mail e o nome vão depois do #: não chegam ao servidor, e o checkout apaga do endereço antes de carregar o resto.
  const pre = e.pre ? `#${new URLSearchParams({ email: e.pre.email || '', nome: e.pre.nome || '' }).toString()}` : '';
  const abrir = () => { aoAbrir(); setCel(window.matchMedia('(max-width: 719px)').matches); setAberto(true); };
  const painel = (
    <div className={`ia-painel${cel ? ' ia-folha' : ''}`} role="dialog" aria-modal={cel} aria-label={e.titulo} style={estilo}>
      <div className="ia-cab"><span className="ia-brilho" aria-hidden="true">✨</span><span>{e.rotulo}</span><button className="ia-fechar" onClick={() => setAberto(false)} aria-label="Fechar"><I n="fechar" /></button></div>
      {e.vsl ? <div className="ia-vsl"><iframe src={e.vsl} referrerPolicy="origin" allow="autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen title={`Vídeo: ${e.titulo}`} /></div> : null}
      <p className="ia-texto">{e.texto}</p>
      <div className="ia-compra">
        <div><b>{e.titulo}</b>{e.sub ? <small>{e.sub}</small> : null}</div>
        <div className="ia-preco"><span className="num">{brl(e.preco_centavos)}</span>{e.preco_de_centavos ? <s>{brl(e.preco_de_centavos)}</s> : null}</div>
      </div>
      <a className="bt bt-cheio ia-comprar" href={`${SITE}/checkout/${e.oferta}${pre}`}>Comprar</a>
    </div>
  );
  return <>
    <button className="ia-tag" style={estilo} onClick={abrir} aria-expanded={aberto} aria-haspopup="dialog" hidden={aberto && !cel}>{rotulo}</button>
    {aberto ? (cel ? createPortal(<div className="ia-fundo" onClick={(ev) => { if (ev.target === ev.currentTarget) setAberto(false); }}>{painel}</div>, document.body) : painel) : null}
  </>;
}
