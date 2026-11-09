// O app do curso de leitura (marca própria, ex.: Dúvidas da Fé em duvidasdafe.agenciasetup.com.br).
// A mesma base do app da Setup (login, API, progresso, arquivos), com outra cara: a da Escola do Olhar de Fé.
// Pensado para quem tem dificuldade de ler e de mexer no celular: letra grande, um caminho por tela, botões grandes,
// o PDF sempre à mão, "Ouvir" (a voz do próprio celular) e a ajuda no WhatsApp em todas as telas.
// Telas: início (/ler), capítulo (/capitulo/:n), dúvida (/duvida/:id), "Tirar uma dúvida" (/perguntar, a ajudante de IA que
// lê print; worker/lib/tutor-leitura.js) e entrar (/entrar, a mesma tela da Setup com a marca).
// No computador (a partir de 1000 px), a moldura ganha o menu ao lado: capítulos com o progresso, a ajudante, o PDF e a
// ajuda; a leitura fica numa coluna larga e o início em duas colunas. No celular, uma coluna só, como antes.
// A raiz (/) do endereço é a página de venda (worker/render/venda-leitura.js); sem ela, a raiz também abre o início.
import { useEffect, useRef, useState } from 'react';
import { copiar, useDados, useToast } from '../comum';
import { get, post, quandoSair } from '../nucleo/api';
import { sair, temSessao } from '../nucleo/auth';
import { Link, casa, useRota } from '../nucleo/rota';
import { Player } from '../player';
import { Entrar } from '../telas/Entrar';
import './leitor.css';

export type Marca = { nome: string; tema: string; autores?: string; whatsapp?: string; pdf?: string; curso: { slug: string; titulo: string; subtitulo?: string; capa_url?: string } };

// ---------------------------------------------------------------- ícones (traço, como os do resto do app)
const IC: Record<string, string> = {
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  baixar: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  ouvir: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z"/><path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
  parar: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  letra: '<path d="M3 19 8.5 5h1L15 19M5.2 14h7.6M16 19l3-7.5h1l3 7.5M17 16.5h5"/>',
  certo: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  seta: '<path d="m9 5 7 7-7 7"/>',
  voltar: '<path d="m15 5-7 7 7 7"/>',
  avancar: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  zap: '<path d="M4.5 20 6 15.6A8 8 0 1 1 9 18.6L4.5 20Z"/><path d="M9.2 9.2c0 2.8 2.8 5.6 5.6 5.6l1.2-1.6-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2-1.6 1.2Z"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  casa: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  ajudante: '<path d="M12 3c4.97 0 9 3.36 9 7.5S16.97 18 12 18c-.9 0-1.77-.1-2.6-.3L5 20l.9-3.6C4.1 15.04 3 12.9 3 10.5 3 6.36 7.03 3 12 3Z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.33c-.55.22-.9.73-.9 1.32V13M12 15.6v.1"/>',
  print: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15-4.5-4.5L8 19"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const Ic = ({ n }: { n: string }) => <svg className="lt-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: IC[n] }} />;
const Cruz = () => <span className="lt-cruz" aria-hidden="true" />;

// Aspas retas do texto viram curvas, como no livro.
const aspas = (t: string) => String(t || '').replace(/"([^"]*)"/g, '“$1”');
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const zapLink = (m: Marca) => (m.whatsapp ? `https://wa.me/${m.whatsapp}` : null);
const mandar = (texto: string) => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');

// Letra maior: 3 tamanhos, guardados neste aparelho.
const TAMANHOS = ['', 'lt-letra-1', 'lt-letra-2'];
function lerTamanho() { try { return Number(localStorage.getItem('lt-letra') || 0) % 3; } catch { return 0; } }
function aplicarTamanho(n: number) {
  const h = document.documentElement;
  TAMANHOS.forEach((c) => c && h.classList.remove(c));
  if (TAMANHOS[n]) h.classList.add(TAMANHOS[n]);
  try { localStorage.setItem('lt-letra', String(n)); } catch {}
}

// ---------------------------------------------------------------- casca: login e telas
export function Leitor({ marca }: { marca: Marca }) {
  const { rota, ir } = useRota();
  const [eu, setEu] = useState<any>(null);
  const [falha, setFalha] = useState<any>(null);
  const publico = rota.caminho === '/entrar';

  useEffect(() => {
    document.body.classList.add('tema-leitura');
    aplicarTamanho(lerTamanho());
    quandoSair(() => { setEu(null); ir(`/entrar?volta=${encodeURIComponent(location.pathname)}`, { trocar: true }); });
  }, []);

  useEffect(() => {
    if (publico) return;
    let vivo = true;
    (async () => {
      if (!(await temSessao())) { ir(`/entrar?volta=${encodeURIComponent(rota.caminho)}`, { trocar: true }); return; }
      try { const e = await get('/eu'); if (vivo) { setEu(e); setFalha(null); } } catch (e: any) { if (vivo) setFalha(e); }
    })();
    return () => { vivo = false; };
  }, [publico]);

  if (publico) return <Entrar marca={marca} aoEntrar={(volta) => { setEu(null); ir(volta && volta !== '/' ? volta : '/ler', { trocar: true }); }} />;
  if (falha) return <main className="lt"><Aviso marca={marca} titulo="Não deu para abrir" texto={falha.message} acao={<button className="lt-botao" onClick={async () => { await sair(); setFalha(null); ir('/entrar', { trocar: true }); }}>Entrar com outro e-mail</button>} /></main>;
  if (!eu) return <Abrindo />;

  let tela: any = null, p: any, largo = false;
  if (rota.caminho === '/' || rota.caminho === '/ler') { tela = <Inicio marca={marca} eu={eu} />; largo = true; }
  else if (rota.caminho === '/perguntar') tela = <Perguntar marca={marca} />;
  else if ((p = casa('/capitulo/:n', rota.caminho))) tela = <Capitulo marca={marca} numero={Number(p.n)} />;
  else if ((p = casa('/duvida/:id', rota.caminho)) || (p = casa('/aulas/:id', rota.caminho))) tela = <Duvida key={p.id} marca={marca} id={p.id} />;
  else tela = <Aviso marca={marca} titulo="Esta página não existe" texto="Volte para o início e escolha uma dúvida." acao={<Link className="lt-botao" para="/ler">Ir para o início</Link>} />;
  return (
    <div className="lt-moldura">
      <Lateral marca={marca} caminho={rota.caminho} />
      <main className={`lt${largo ? ' lt-largo' : ''}`}>{tela}</main>
    </div>
  );
}

// O menu ao lado (só no computador): o curso, a ajudante, os capítulos com o progresso, o PDF e a ajuda.
function Lateral({ marca, caminho }: { marca: Marca; caminho: string }) {
  const { dados: d } = useCurso(marca);
  const caps = d ? capitulosDe(d) : [];
  const idAula = (caminho.match(/^\/(?:duvida|aulas)\/([0-9a-f-]{36})/) || [])[1];
  const capAtual = Number((caminho.match(/^\/capitulo\/(\d+)/) || [])[1]) || (idAula ? (caps.find((c: any) => c.aulas.some((a: any) => a.id === idAula)) || {}).numero : null);
  const on = (x: boolean) => (x ? ' lt-on' : '');
  return (
    <aside className="lt-lateral" aria-label="Menu do curso"><div className="lt-lateral-in">
      <Link className="lt-marca" para="/ler"><Cruz />{marca.nome}</Link>
      <nav className="lt-nav">
        <Link className={`lt-nav-item${on(caminho === '/ler' || caminho === '/')}`} para="/ler"><Ic n="casa" />Início</Link>
        <Link className={`lt-nav-item${on(caminho === '/perguntar')}`} para="/perguntar"><Ic n="ajudante" />Tirar uma dúvida</Link>
      </nav>
      {d ? <div className="lt-prog lt-prog-lateral"><span><i style={{ width: `${d.pct}%` }} /></span><b>{d.feitas} de {d.total}</b></div> : null}
      {caps.length ? <div className="lt-lateral-caps">
        <p className="lt-olho lt-lateral-rotulo">Capítulos</p>
        <nav className="lt-nav">
          {caps.map((c: any) => {
            const lidas = c.aulas.filter((a: any) => a.concluida).length;
            return <Link key={c.id} className={`lt-nav-item lt-nav-cap${on(capAtual === c.numero)}`} para={`/capitulo/${c.numero}`}><span className={`lt-num-mini${lidas === c.aulas.length && lidas ? ' lt-num-ok' : ''}`}>{lidas === c.aulas.length && lidas ? <Ic n="certo" /> : c.numero}</span><span>{c.titulo}<small>{lidas} de {c.aulas.length}</small></span></Link>;
          })}
        </nav>
      </div> : <div className="lt-lateral-caps" />}
      <div className="lt-lateral-pe"><BotaoPdf marca={marca} grande /><Ajuda marca={marca} /></div>
    </div></aside>
  );
}

function Abrindo({ texto = 'Abrindo...' }: { texto?: string }) {
  return <div className="lt lt-abrindo"><span className="lt-giro" />{texto}</div>;
}

function Aviso({ marca, titulo, texto, acao }: { marca: Marca; titulo: string; texto: string; acao?: any }) {
  return <>
    <div className="lt-topo"><span className="lt-marca"><Cruz />{marca.nome}</span></div>
    <div className="lt-cartao lt-aviso"><h1 className="lt-h2">{titulo}</h1><p className="lt-mudo">{texto}</p>{acao}</div>
    <Ajuda marca={marca} />
  </>;
}

function Ajuda({ marca }: { marca: Marca }) {
  const zap = zapLink(marca);
  return zap ? <a className="lt-ajuda" href={zap} target="_blank" rel="noopener"><Ic n="zap" /><span><b>Ficou com alguma dificuldade?</b>Fale com a gente no WhatsApp</span></a> : null;
}

// O PDF do curso: pede o link assinado (10 minutos) e abre.
function BotaoPdf({ marca, grande = false }: { marca: Marca; grande?: boolean }) {
  const toast = useToast();
  const [abrindo, setAbrindo] = useState(false);
  if (!marca.pdf) return null;
  const baixar = async () => {
    setAbrindo(true);
    try { const r = await get(`/arquivos/${marca.pdf}`); location.href = r.url; } catch (e: any) { toast(e.message); } finally { setAbrindo(false); }
  };
  return <button className={grande ? 'lt-botao lt-botao-leve' : 'lt-pilula'} onClick={baixar} disabled={abrindo}><Ic n="baixar" />{abrindo ? 'Abrindo...' : grande ? 'Baixar o livro em PDF' : 'PDF'}</button>;
}

// O curso (capítulos, dúvidas, progresso): uma chamada, guardada enquanto o app está aberto.
let guardado: any = null;
function useCurso(marca: Marca) {
  const r = useDados(() => get(`/cursos/${marca.curso.slug}`).then((d) => (guardado = d)), [marca.curso.slug]);
  return { ...r, dados: r.dados || guardado };
}
const capitulosDe = (d: any) => (d.secoes || []).flatMap((s: any) => s.modulos);
// A pintura de um capítulo é a da primeira dúvida dele que tem imagem.
const capaDoCapitulo = (c: any) => (c && (c.aulas || []).find((a: any) => a.capa_url) || {}).capa_url || null;
const Miniatura = ({ a }: { a: any }) => <span className="lt-mini">{a.capa_url ? <img src={a.capa_url} alt="" loading="lazy" /> : null}{a.concluida ? <span className="lt-mini-ok"><Ic n="certo" /></span> : null}</span>;

function SemCurso({ marca, erro }: { marca: Marca; erro: any }) {
  const oferta = erro?.dados?.oferta;
  if (erro?.dados?.codigo === 'sem-matricula') {
    return <Aviso marca={marca} titulo={`Você ainda não tem o ${marca.nome}`} texto="Este e-mail não tem uma compra do curso. Se você comprou com outro e-mail, entre com ele."
      acao={<div className="lt-botoes">{oferta ? <a className="lt-botao" href={`/checkout/${oferta.slug}`}>Quero o {marca.nome}</a> : null}<button className="lt-botao lt-botao-leve" onClick={async () => { await sair(); location.href = '/entrar'; }}>Entrar com outro e-mail</button></div>} />;
  }
  return <Aviso marca={marca} titulo="Não deu para abrir" texto={erro?.message || 'Confira a internet e tente de novo.'} acao={<button className="lt-botao" onClick={() => location.reload()}>Tentar de novo</button>} />;
}

// ---------------------------------------------------------------- início
function Inicio({ marca, eu }: { marca: Marca; eu: any }) {
  const { dados: d, erro } = useCurso(marca);
  const [termo, setTermo] = useState('');
  if (erro && !d) return <SemCurso marca={marca} erro={erro} />;
  if (!d) return <Abrindo />;
  const caps = capitulosDe(d);
  const todas = caps.flatMap((c: any) => c.aulas.map((a: any) => ({ ...a, cap: c })));
  // Primeiro as dúvidas com a palavra na pergunta; depois as do capítulo que tem a palavra no nome.
  const t = semAcento(termo.trim());
  const achadas = t.length >= 2 ? todas
    .map((a: any) => ({ a, nota: semAcento(a.titulo).includes(t) ? 2 : semAcento(a.cap.titulo).includes(t) ? 1 : 0 }))
    .filter((x: any) => x.nota).sort((x: any, y: any) => y.nota - x.nota).map((x: any) => x.a).slice(0, 12) : [];
  const primeiro = String(eu.nome || '').split(' ')[0];
  const cont = d.continuar;
  // O destaque mostra a pintura da dúvida da vez (como a área da Setup mostra a aula da vez).
  const fundo = (cont && (todas.find((a: any) => a.id === cont.id) || cont).capa_url) || capaDoCapitulo(caps[0]) || marca.curso.capa_url;
  return <>
    <section className="lt-destaque">
      {fundo ? <img className="lt-destaque-img" src={fundo} alt="" /> : null}
      <div className="lt-destaque-veu" />
      <div className="lt-topo lt-topo-sobre"><span className="lt-marca"><Cruz />{marca.nome}</span><BotaoPdf marca={marca} /></div>
      <div className="lt-destaque-txt">
        <p className="lt-ola">{primeiro ? `Olá, ${primeiro}` : 'Olá'}</p>
        {cont ? <>
          <p className="lt-olho lt-ouro">{d.feitas ? 'Continue de onde parou' : 'Comece por aqui'}</p>
          <h1 className="lt-destaque-titulo">{cont.titulo}</h1>
          <div className="lt-prog"><span><i style={{ width: `${d.pct}%` }} /></span><b>{d.feitas} de {d.total} lidas</b></div>
          <Link className="lt-botao" para={`/duvida/${cont.id}`}>{d.feitas ? 'Continuar lendo' : 'Começar a ler'}<Ic n="avancar" /></Link>
        </> : <>
          <p className="lt-olho lt-ouro">Parabéns</p>
          <h1 className="lt-destaque-titulo">Você leu todas as {d.total} dúvidas.</h1>
          <p className="lt-mudo">Volte quando quiser: tudo continua aqui, e o PDF também.</p>
        </>}
      </div>
    </section>
    <label className="lt-busca"><Ic n="busca" /><input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Procure a sua dúvida" aria-label="Procurar uma dúvida" enterKeyHint="search" /></label>
    {termo.trim().length >= 2 ? (
      <div className="lt-lista lt-resultados">
        {achadas.length ? achadas.map((a: any) => <Link key={a.id} className="lt-linha" para={`/duvida/${a.id}`}><Miniatura a={a} /><span><b>{a.titulo}</b><small>Capítulo {a.cap.numero} · {a.cap.titulo}</small></span><span className="lt-seta"><Ic n="seta" /></span></Link>)
          : <p className="lt-vazio">Nenhuma dúvida com essas palavras. Tente com outra palavra, como "Maria", "missa" ou "santos".</p>}
      </div>
    ) : <>
      <CartaoAjudante />
      <h2 className="lt-secao">Os {caps.length} capítulos</h2>
      <div className="lt-caps">
        {caps.map((c: any) => {
          const lidas = c.aulas.filter((a: any) => a.concluida).length;
          const tudo = lidas === c.aulas.length && lidas > 0;
          const img = capaDoCapitulo(c);
          return (
            <Link key={c.id} className="lt-cap" para={`/capitulo/${c.numero}`}>
              <span className="lt-cap-img">{img ? <img src={img} alt="" loading="lazy" /> : null}<span className={`lt-cap-num${tudo ? ' lt-num-ok' : ''}`}>{tudo ? <Ic n="certo" /> : c.numero}</span></span>
              <span className="lt-cap-txt">
                <b>{c.titulo}</b>
                <small>{lidas ? `${lidas} de ${c.aulas.length} lidas` : `${c.aulas.length} dúvidas`}</small>
                {lidas ? <span className="lt-cap-barra"><i style={{ width: `${Math.round((lidas / c.aulas.length) * 100)}%` }} /></span> : null}
              </span>
            </Link>
          );
        })}
      </div>
    </>}
    {marca.pdf ? <div className="lt-pdf-faixa lt-so-celular"><p>Prefere ler no papel ou sem internet? O livro inteiro está em PDF.</p><BotaoPdf marca={marca} grande /></div> : null}
    <div className="lt-so-celular"><Ajuda marca={marca} /></div>
    <p className="lt-pe">{marca.nome}{marca.autores ? ` · ${marca.autores}` : ''} · <button className="lt-link" onClick={async () => { await sair(); location.href = '/entrar'; }}>Sair</button></p>
  </>;
}

// ---------------------------------------------------------------- capítulo
function Capitulo({ marca, numero }: { marca: Marca; numero: number }) {
  const { dados: d, erro } = useCurso(marca);
  if (erro && !d) return <SemCurso marca={marca} erro={erro} />;
  if (!d) return <Abrindo />;
  const c = capitulosDe(d).find((x: any) => x.numero === numero);
  if (!c) return <Aviso marca={marca} titulo="Capítulo não encontrado" texto="Volte para o início e escolha um capítulo." acao={<Link className="lt-botao" para="/ler">Ir para o início</Link>} />;
  const lidas = c.aulas.filter((a: any) => a.concluida).length;
  const img = capaDoCapitulo(c);
  return <>
    <div className="lt-topo"><Link className="lt-voltar" para="/ler"><Ic n="voltar" />Início</Link><BotaoPdf marca={marca} /></div>
    <section className="lt-cap-heroi">
      {img ? <img src={img} alt="" /> : null}
      <div className="lt-destaque-veu" />
      <div className="lt-cap-heroi-txt">
        <p className="lt-olho lt-ouro">Capítulo {c.numero} · {c.aulas.length} dúvidas</p>
        <h1 className="lt-h1">{c.titulo}</h1>
        <div className="lt-prog"><span><i style={{ width: `${Math.round((lidas / c.aulas.length) * 100)}%` }} /></span><b>{lidas} de {c.aulas.length} lidas</b></div>
      </div>
    </section>
    {c.descricao ? <p className="lt-mudo">{c.descricao}</p> : null}
    <div className="lt-lista">
      {c.aulas.map((a: any, i: number) => (
        <Link key={a.id} className="lt-linha" para={`/duvida/${a.id}`}>
          <Miniatura a={a} />
          <span><b>{a.titulo}</b><small>{a.concluida ? 'Lida' : `Dúvida ${c.numero}.${i + 1} · 3 minutos`}</small></span>
          <span className="lt-seta"><Ic n="seta" /></span>
        </Link>
      ))}
    </div>
    <Ajuda marca={marca} />
  </>;
}

// ---------------------------------------------------------------- uma dúvida
function Duvida({ marca, id }: { marca: Marca; id: string }) {
  const toast = useToast();
  const { ir } = useRota();
  const { dados: d, erro } = useDados(() => get(`/aulas/${id}`), [id]);
  const { dados: doCurso } = useCurso(marca);
  const [tamanho, setTamanho] = useState(lerTamanho());
  const [falando, setFalando] = useState(false);
  const [lida, setLida] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  // Chegou ao "Para guardar": a dúvida fica marcada como lida (uma vez).
  useEffect(() => {
    if (!d || !fim.current || d.progresso?.concluida_em) return;
    const ob = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { ob.disconnect(); setLida(true); post(`/aulas/${id}/progresso`, { concluir: true, posicao: 0, assistido: 0 }).then(() => { guardado = null; }).catch(() => {}); }
    }, { threshold: 0.6 });
    ob.observe(fim.current);
    return () => ob.disconnect();
  }, [d]);
  useEffect(() => () => { try { speechSynthesis.cancel(); } catch {} }, [id]);

  if (erro && !d) return <SemCurso marca={marca} erro={erro} />;
  if (!d) return <Abrindo />;
  const a = d.aula;
  const c = a.corpo || {};
  const cap = d.modulo;

  const ouvir = () => {
    try {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); setFalando(false); return; }
      const texto = [a.titulo, c.resposta, ...(c.explicacao || []), c.diga ? `Se alguém te perguntar, diga: ${c.diga}` : '', c.guardar ? `Para guardar: ${c.guardar}` : ''].filter(Boolean).join('. ');
      const fala = new SpeechSynthesisUtterance(texto.replace(/"/g, ''));
      fala.lang = 'pt-BR';
      fala.rate = 0.95;
      const voz = speechSynthesis.getVoices().find((v) => v.lang === 'pt-BR');
      if (voz) fala.voice = voz;
      fala.onend = () => setFalando(false);
      fala.onerror = () => setFalando(false);
      speechSynthesis.speak(fala);
      setFalando(true);
    } catch { toast('Este celular não tem a voz para ler em voz alta.'); }
  };
  const letra = () => { const n = (tamanho + 1) % 3; setTamanho(n); aplicarTamanho(n); toast(['Letra normal', 'Letra maior', 'Letra bem grande'][n]); };

  return <>
    <div className="lt-topo"><Link className="lt-voltar" para={cap ? `/capitulo/${cap.numero}` : '/ler'}><Ic n="voltar" />{cap ? `Capítulo ${cap.numero}` : 'Início'}</Link><BotaoPdf marca={marca} /></div>
    <article className="lt-duvida">
      {d.video && d.video.tipo !== 'nenhum' ? (
        <div className="lt-video"><Player video={d.video} capa={c.imagem?.url} inicio={0} aoTempo={() => {}} aoTerminar={() => {}} temProxima={false} /></div>
      ) : c.imagem?.url ? (
        <figure className="lt-figura"><img src={c.imagem.url} alt={c.imagem.alt || ''} /><figcaption>{c.imagem.legenda}</figcaption></figure>
      ) : null}
      <p className="lt-olho">{cap ? `Capítulo ${cap.numero} · ` : ''}{c.minutos || 3} minutos de leitura</p>
      <h1 className="lt-h1">{a.titulo}</h1>
      <div className="lt-ferramentas">
        <button className="lt-pilula" onClick={ouvir} aria-pressed={falando}><Ic n={falando ? 'parar' : 'ouvir'} />{falando ? 'Parar' : 'Ouvir'}</button>
        <button className="lt-pilula" onClick={letra}><Ic n="letra" />Letra maior</button>
      </div>
      {c.resposta ? <div className="lt-resposta"><p className="lt-olho lt-verde"><Ic n="certo" />Resposta rápida</p><p className="lt-resposta-tx">{aspas(c.resposta)}</p></div> : null}
      {(c.explicacao || []).length ? <section className="lt-bloco"><p className="lt-olho">Explicando com calma</p><div className="lt-prosa">{c.explicacao.map((t: string, i: number) => <p key={i}>{aspas(t)}</p>)}</div></section> : null}
      {(c.biblia || []).length ? <section className="lt-bloco"><p className="lt-olho lt-ouro">Na Bíblia</p>{c.biblia.map((v: any, i: number) => <blockquote key={i} className="lt-verso"><p>{v.texto}</p><cite><b>{v.ref}</b>{v.nota ? ` · ${v.nota}` : ''}</cite></blockquote>)}</section> : null}
      {(c.igreja || []).length ? <section className="lt-bloco"><p className="lt-olho lt-ouro">A Igreja ensina</p>{c.igreja.map((v: any, i: number) => <figure key={i} className="lt-cita"><blockquote><p>{v.texto}</p></blockquote><figcaption><b>{v.doc}, {v.numero}</b>{v.url ? <><br /><a href={v.url} target="_blank" rel="noopener">Ler no site do Vaticano</a></> : null}</figcaption></figure>)}</section> : null}
      {c.diga ? (
        <section className="lt-bloco lt-diga">
          <p className="lt-olho lt-ouro">Se alguém te perguntar, diga</p>
          <p className="lt-diga-tx">{aspas(c.diga)}</p>
          <div className="lt-ferramentas"><button className="lt-pilula" onClick={() => copiar(aspas(c.diga), toast)}><Ic n="copiar" />Copiar</button><button className="lt-pilula" onClick={() => mandar(aspas(c.diga))}><Ic n="zap" />Mandar</button></div>
        </section>
      ) : null}
      {(c.e_se || []).length ? <section className="lt-bloco"><p className="lt-olho">E se a conversa continuar?</p><div className="lt-ese">{c.e_se.map((e: any, i: number) => <div key={i}><b>{aspas(e.pergunta)}</b><p>{aspas(e.resposta)}</p></div>)}</div></section> : null}
      {c.guardar ? (
        <div className="lt-guardar" ref={fim}>
          <p className="lt-olho">Para guardar</p>
          <p className="lt-guardar-tx">{aspas(c.guardar)}</p>
          <button className="lt-pilula" onClick={() => mandar(`${aspas(c.guardar)}\n\nDo livro ${marca.nome}`)}><Ic n="zap" />Mandar no WhatsApp</button>
        </div>
      ) : <div ref={fim} />}
    </article>
    {lida || d.progresso?.concluida_em ? <p className="lt-lida"><Ic n="certo" />Dúvida lida</p> : null}
    {d.proxima ? (
      <Link className="lt-proxima" para={`/duvida/${d.proxima.id}`} onClick={() => { if (!d.progresso?.concluida_em && !lida) post(`/aulas/${id}/progresso`, { concluir: true, posicao: 0, assistido: 0 }).catch(() => {}); guardado = null; }}>
        <Miniatura a={{ capa_url: doCurso ? (capitulosDe(doCurso).flatMap((x: any) => x.aulas).find((x: any) => x.id === d.proxima.id) || {}).capa_url : null }} />
        <span className="lt-olho">Próxima dúvida</span><b>{d.proxima.titulo}</b><span className="lt-roda"><Ic n="avancar" /></span>
      </Link>
    ) : <button className="lt-proxima" onClick={() => ir('/ler')}><Miniatura a={{ capa_url: marca.curso.capa_url }} /><span className="lt-olho">Você chegou ao fim</span><b>Voltar para o início</b><span className="lt-roda"><Ic n="avancar" /></span></button>}
    <CartaoAjudante texto="Ficou com alguma dúvida ou recebeu um comentário sobre isso?" />
    <div className="lt-so-celular"><Ajuda marca={marca} /></div>
  </>;
}

// ---------------------------------------------------------------- a ajudante (IA): pergunta escrita ou print
function CartaoAjudante({ texto = 'Ficou com uma dúvida ou recebeu um comentário e não sabe o que responder?' }: { texto?: string }) {
  return (
    <Link className="lt-cartao lt-cartao-ajudante" para="/perguntar">
      <span className="lt-ajudante-ic"><Ic n="ajudante" /></span>
      <span><b>Tirar uma dúvida</b><small>{texto} Escreva ou mande o print.</small></span>
      <span className="lt-seta"><Ic n="seta" /></span>
    </Link>
  );
}

// O print vai menor: no máximo 1200 px no lado maior, em JPEG. Fica leve para o celular mandar e barato para ler.
async function printLeve(arquivo: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error('Não consegui abrir esta imagem. Tente outro print.'));
    i.src = URL.createObjectURL(arquivo);
  });
  const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', 0.8);
}

type Troca = { pergunta: string; imagem: string | null; resposta?: string; duvidas?: { id: string; codigo: string; titulo: string }[]; erro?: string };

function Perguntar({ marca }: { marca: Marca }) {
  const toast = useToast();
  const estado = useDados(() => get(`/cursos/${marca.curso.slug}/ajudante`), [marca.curso.slug]);
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [restantes, setRestantes] = useState<number | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const r = restantes ?? estado.dados?.restantes ?? null;
  const desligada = estado.dados && !estado.dados.ligado;

  const anexar = async (f?: File | null) => {
    if (!f) return;
    setErro('');
    try { setImagem(await printLeve(f)); } catch (e: any) { setErro(e.message); }
  };
  const perguntar = async (e?: any) => {
    e && e.preventDefault();
    if (texto.trim().length < 3 && !imagem) { setErro('Escreva a sua dúvida ou anexe um print.'); return; }
    setErro('');
    setEnviando(true);
    const troca: Troca = { pergunta: texto.trim(), imagem };
    try {
      const resp = await post(`/cursos/${marca.curso.slug}/ajudante`, { pergunta: texto.trim(), imagem });
      setTrocas((t) => [...t, { ...troca, resposta: resp.resposta, duvidas: resp.duvidas }]);
      setRestantes(resp.restantes);
      setTexto('');
      setImagem(null);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (er: any) {
      setErro(er.message);
    } finally {
      setEnviando(false);
    }
  };
  // Quando a resposta traz "Você pode responder assim:", os botões copiam e mandam só essa parte.
  const sugestao = (t: string) => (t.split(/Você pode responder assim:/i)[1] || '').split(/Leia mais:/i)[0].trim();

  return <>
    <div className="lt-topo"><Link className="lt-voltar" para="/ler"><Ic n="voltar" />Início</Link><BotaoPdf marca={marca} /></div>
    <p className="lt-olho">Ajudante do livro</p>
    <h1 className="lt-h1">Tirar uma dúvida</h1>
    <p className="lt-mudo lt-linha-fina">Escreva a sua pergunta ou mande o print do comentário que você recebeu. A resposta vem do que está no livro.</p>
    {trocas.map((x, i) => (
      <div key={i} className="lt-troca" ref={i === trocas.length - 1 ? fim : undefined}>
        <div className="lt-minha">{x.imagem ? <img src={x.imagem} alt="O print que você mandou" /> : null}{x.pergunta ? <p>{x.pergunta}</p> : null}</div>
        <div className="lt-resposta lt-resposta-ia">
          <p className="lt-olho lt-verde"><Ic n="ajudante" />Resposta</p>
          <p className="lt-resposta-ia-tx">{aspas(x.resposta || '')}</p>
          <div className="lt-ferramentas">
            <button className="lt-pilula" onClick={() => copiar(sugestao(x.resposta || '') || x.resposta || '', toast)}><Ic n="copiar" />{sugestao(x.resposta || '') ? 'Copiar a resposta pronta' : 'Copiar'}</button>
            <button className="lt-pilula" onClick={() => mandar(sugestao(x.resposta || '') || x.resposta || '')}><Ic n="zap" />Mandar</button>
          </div>
          {x.duvidas && x.duvidas.length ? <div className="lt-leia"><p className="lt-olho">Leia no livro</p>{x.duvidas.map((dd) => <Link key={dd.id} className="lt-leia-item" para={`/duvida/${dd.id}`}>{dd.titulo}<Ic n="seta" /></Link>)}</div> : null}
        </div>
      </div>
    ))}
    {desligada ? <div className="lt-cartao"><p>A ajudante está desligada agora. Fale com a gente no WhatsApp.</p></div> : (
      <form className="lt-cartao lt-pergunta" onSubmit={perguntar}>
        <label className="lt-olho" htmlFor="lt-pergunta-tx">{trocas.length ? 'Outra pergunta' : 'Sua pergunta'}</label>
        <textarea id="lt-pergunta-tx" value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder='Ex.: Meu primo disse que católico adora imagem. O que eu respondo?' maxLength={1200} />
        {imagem ? <div className="lt-anexo"><img src={imagem} alt="O print que vai junto" /><button type="button" className="lt-pilula" onClick={() => setImagem(null)}><Ic n="fechar" />Tirar o print</button></div> : null}
        <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => { anexar(e.target.files && e.target.files[0]); e.target.value = ''; }} />
        <div className="lt-ferramentas">
          {!imagem ? <button type="button" className="lt-pilula" onClick={() => arquivo.current?.click()}><Ic n="print" />Anexar print</button> : null}
        </div>
        {erro ? <p className="lt-erro" role="alert">{erro}</p> : null}
        <button className="lt-botao" disabled={enviando}>{enviando ? 'Pensando na resposta...' : 'Perguntar'}{enviando ? null : <Ic n="avancar" />}</button>
        <p className="lt-pe-ajudante">{r !== null ? `Você ainda pode fazer ${r} perguntas hoje. ` : ''}As respostas são automáticas, feitas com inteligência artificial a partir do livro. Na dúvida, confira na dúvida indicada.</p>
      </form>
    )}
    <div className="lt-so-celular"><Ajuda marca={marca} /></div>
  </>;
}
