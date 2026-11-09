// Início no jeito de streaming, limpo: o destaque é um bloco arredondado com a prévia da aula em vídeo no fundo, o texto
// num vidro desfocado e, no computador, as próximas aulas ao lado (no celular, um pôster alto e o carrossel logo abaixo).
// Embaixo, poucas seções e em ordem: seu progresso, a turma, os materiais e o que conhecer.
import { useEffect, useRef, useState } from 'react';
import { CardAula, Carregando, ErroTela, I, Poster, TIPOS, brl, mmss, useDados } from '../comum';
import { SITE, get } from '../nucleo/api';
import { Link } from '../nucleo/rota';
import { Avisos } from './Avisos';
import { CartaoCriacao } from './Turma';
import { Avatar } from './AulaAbas';
import { Conquista } from './Conquista';
import '../inicio.css';

export function Inicio({ eu }: { eu: any }) {
  const { dados: d, erro, carregando, recarregar } = useDados(() => get('/inicio'), []);
  if (carregando && !d) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  const curso = d.cursos[0];
  const temTurma = d.cursos.length > 0;
  return (
    <section className="tela ativa inicio" aria-label="Início">
      {d.avisos && d.avisos.length ? <div className="gutter largura"><Avisos dados={d.avisos} /></div> : null}
      <Destaque d={d} eu={eu} />

      <div className="gutter largura">
        {d.conquista ? <section className="ini-secao ini-conquista"><Conquista c={d.conquista} /></section> : null}

        {d.proximas.length > 1 ? (
          <Secao titulo="Próximas aulas" link={curso ? { para: `/cursos/${curso.slug}`, t: 'Ver todas' } : null} classe="so-cel">
            <div className="trilho">{d.proximas.slice(1).map((a: any) => <CardAula key={a.id} a={a} para={`/aulas/${a.id}`} />)}</div>
          </Secao>
        ) : null}

        {d.cursos.length ? (
          <Secao olho="Você" titulo="Seu progresso">
            <div className="bento">
              {d.cursos.map((c: any) => (
                <Link key={c.id} className="b-cartao b-curso" para={`/cursos/${c.slug}`}>
                  <div className="b-curso-topo"><Poster titulo={c.titulo} pe="" cor={c.cor} /><div className="b-pct num">{c.pct}<small>%</small></div></div>
                  <div><h3>{c.titulo}</h3><p>{c.feitas} de {c.total} aulas concluídas</p></div>
                  <div className="barra"><i style={{ width: `${Math.max(2, c.pct)}%` }} /></div>
                </Link>
              ))}
              {d.trilha && d.trilha.passos.length ? <Trilha t={d.trilha} /> : null}
              <div className="b-cartao b-ritmo">
                <span className="b-icone"><I n="fogo" /></span>
                <div><b className="num">{d.sequencia || 0}</b><span>{d.sequencia === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
                {d.nivel ? (
                  <div className="b-nivel">
                    <p><span>Nível {d.nivel.numero} · {d.nivel.nome}</span><span className="num">{d.nivel.xp} XP</span></p>
                    <div className="barra"><i style={{ width: `${Math.max(3, d.nivel.pct)}%` }} /></div>
                    <small>{d.nivel.proximo ? `Faltam ${Math.max(0, d.nivel.ate - d.nivel.xp)} XP para ${d.nivel.proximo}` : 'Nível máximo'}</small>
                  </div>
                ) : null}
              </div>
            </div>
          </Secao>
        ) : null}

        {/* Curso com marca própria (ex.: Dúvidas da Fé): tem o app dele; aqui, só o caminho para lá. */}
        {d.outros_apps && d.outros_apps.length ? (
          <Secao olho="Também é seu" titulo="Cursos em outro app">
            <div className="fora-lista">
              {d.outros_apps.map((o: any) => (
                <a key={o.url} className="b-cartao b-fora" href={o.url}>
                  {o.capa_url ? <img src={o.capa_url} alt="" loading="lazy" /> : null}
                  <div><h3>{o.titulo}</h3><p>Abre no app do curso. Entre com este mesmo e-mail.</p></div>
                  <span className="bt bt-p">Abrir<I n="externo" /></span>
                </a>
              ))}
            </div>
          </Secao>
        ) : null}

        {temTurma ? (
          <Secao olho="Comunidade" titulo="Da turma" link={{ para: '/turma', t: 'Abrir a turma' }}>
            {d.desafios && d.desafios.length ? (
              <Link className="b-desafio" para={`/turma?aba=desafios&desafio=${d.desafios[0].slug}`}>
                <span className="b-icone"><I n="trofeu" /></span>
                <div><small>Desafio aberto</small><h3>{d.desafios[0].titulo}</h3><p>{d.desafios[0].premio ? `Prêmio: ${d.desafios[0].premio}` : d.desafios[0].descricao}</p></div>
                <span className="bt bt-p">Participar</span>
              </Link>
            ) : null}
            <div className="turma-grade">
              {d.mural && d.mural.length ? (
                <div className="b-cartao b-mural">
                  <h3>Mural de criações</h3>
                  <div className="trilho">{d.mural.map((c: any) => <CartaoCriacao key={c.id} c={c} />)}</div>
                </div>
              ) : (
                <Link className="b-cartao b-convite" para="/turma?aba=mural">
                  <span className="b-icone"><I n="imagem" /></span>
                  <div><h3>Mostre o que você criou</h3><p>Poste o seu primeiro post feito com o Claude no mural. A turma vê, curte e você ganha XP.</p></div>
                  <span className="bt bt-p">Enviar criação</span>
                </Link>
              )}
              {d.ranking && d.ranking.top.length ? (
                <Link className="b-cartao b-ranking" para="/turma?aba=ranking">
                  <h3>Ranking da semana</h3>
                  <div className="ranking">{d.ranking.top.slice(0, 5).map((r: any) => <div key={`${r.posicao}-${r.nome}`} className={`rank${r.eu ? ' eu' : ''}`}><span className="pos">{r.posicao}</span><Avatar nome={r.nome} foto={r.foto_url} moldura={r.moldura} /><span>{r.nome}</span><span className="xp">{r.pontos} XP</span></div>)}</div>
                </Link>
              ) : null}
            </div>
          </Secao>
        ) : null}

        {d.materiais.length ? (
          <Secao olho="Kit" titulo="Materiais mais baixados" link={curso ? { para: `/cursos/${curso.slug}?aba=materiais`, t: 'Biblioteca' } : null}>
            <div className="trilho">
              {d.materiais.map((f: any) => {
                const t = TIPOS[f.tipo] || TIPOS.guia;
                return (
                  <Link key={f.id} className="c-arquivo" para={curso ? `/cursos/${curso.slug}?aba=materiais` : '/'}>
                    <div className="topo-arq"><span className="ic-arq" style={{ ['--c' as any]: t.c }}><I n={t.n} /></span><span className="etiqueta" style={{ ['--c' as any]: t.c }}>{t.t}</span></div>
                    <b>{f.nome}</b><p>{f.o_que}</p>
                    <div className="pe"><span>{f.tempo}</span><span>{f.downloads} downloads</span></div>
                  </Link>
                );
              })}
            </div>
          </Secao>
        ) : null}

        {d.conhecer.length ? (
          <Secao olho="Catálogo" titulo="Para você conhecer">
            <div className="trilho">
              {d.conhecer.map((c: any) => (
                <a key={c.id} className="c-poster" href={c.oferta ? `${SITE}/checkout/${c.oferta.slug}` : `${SITE}/cursos`}>
                  <Poster titulo={c.titulo} cor={c.cor} bloq pe="" />
                  <span className="preco">{c.oferta ? <>{brl(c.oferta.preco_centavos)} · <span className="marca-texto">Conhecer</span></> : <span className="mudo">Em breve</span>}</span>
                </a>
              ))}
            </div>
          </Secao>
        ) : null}
      </div>
    </section>
  );
}

function Secao({ olho, titulo, link, classe = '', children }: { olho?: string; titulo: string; link?: { para: string; t: string } | null; classe?: string; children: any }) {
  return (
    <section className={`ini-secao ${classe}`}>
      <div className="ini-cab">
        <div>{olho ? <span className="ini-olho">{olho}</span> : null}<h2>{titulo}</h2></div>
        {link ? <Link para={link.para}>{link.t}<I n="seta" /></Link> : null}
      </div>
      {children}
    </section>
  );
}

// O bloco do topo. Sem curso: chama para o catálogo. Curso concluído: rever. Senão: a aula para continuar.
function Destaque({ d, eu }: { d: any; eu: any }) {
  const primeiro = String(eu.nome || '').split(' ')[0];
  const k = d.continuar;
  const curso = d.cursos[0];
  const proximas = (d.proximas || []).slice(1, 5);
  if (!k) {
    return (
      <div className="destaque-envolta">
        <section className="destaque destaque-vazio">
          <Fundo poster={curso ? curso.capa_url : null} video={null} />
          <div className="destaque-veu" /><div className="grao" />
          <div className="destaque-conteudo">
            <div className="destaque-vidro">
              <span className="destaque-olho">Olá, {primeiro}</span>
              {curso ? <><h1 className="destaque-titulo">Você terminou {curso.titulo}</h1><p className="destaque-meta"><span>Reveja quando quiser: as aulas continuam aqui.</span></p>
                <div className="destaque-acoes"><Link className="bt bt-marca bt-g" para={`/cursos/${curso.slug}`}><I n="tocar" />Rever as aulas</Link></div></>
                : <><h1 className="destaque-titulo">Seu curso aparece aqui</h1><p className="destaque-meta"><span>Quando a compra for confirmada, o curso entra sozinho.</span></p>
                <div className="destaque-acoes"><a className="bt bt-marca bt-g" href={`${SITE}/cursos`}>Ver os cursos</a></div></>}
            </div>
          </div>
        </section>
      </div>
    );
  }
  const faltam = k.pct > 0 ? Math.max(1, Math.round(((k.duracao_s || 0) * (100 - k.pct)) / 6000)) : Math.round((k.duracao_s || 0) / 60);
  return (
    <div className="destaque-envolta">
      <section className="destaque" aria-label="Continuar">
        <Fundo poster={k.capa_url} video={k.previa_url} />
        <div className="destaque-veu" /><div className="grao" />
        <div className="destaque-conteudo">
          <div className="destaque-vidro">
            <span className="destaque-olho">{k.pct > 0 ? `Olá, ${primeiro} · continue de onde parou` : `Olá, ${primeiro} · sua próxima aula`}</span>
            <h1 className="destaque-titulo">{k.titulo}</h1>
            <p className="destaque-meta"><span>Aula {k.codigo}</span><span className="so-pc">{k.curso.titulo}</span><span className="num">{k.pct > 0 ? `faltam ${faltam} min` : `${faltam} min`}</span></p>
            {k.pct > 0 ? <div className="barra"><i style={{ width: `${k.pct}%` }} /></div> : null}
            <div className="destaque-acoes">
              <Link className="bt bt-marca bt-g" para={`/aulas/${k.id}`}><I n="tocar" />{k.pct > 0 ? 'Continuar' : 'Assistir'}</Link>
              <Link className="bt bt-vidro bt-g" para={`/cursos/${k.curso.slug}`}>Ver o curso</Link>
            </div>
          </div>
          {proximas.length ? (
            <aside className="destaque-lista so-pc" aria-label="Próximas aulas">
              <h2>Próximas aulas</h2>
              {proximas.map((a: any) => (
                <Link key={a.id} className="lista-aula" para={`/aulas/${a.id}`}>
                  <span className="lista-capa">{a.capa_url ? <img src={a.capa_url} alt="" loading="lazy" /> : null}{!a.liberada ? <span className="cadeado"><I n="cadeado" /></span> : null}</span>
                  <span className="lista-txt"><small className="num">Aula {a.codigo} · {mmss(a.duracao_s)}</small><b>{a.titulo}</b></span>
                </Link>
              ))}
              <Link className="lista-mais" para={`/cursos/${k.curso.slug}`}>Ver todas as aulas<I n="seta" /></Link>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// Prévia em vídeo (8 s, sem som) sobre a capa. Não toca para quem pediu menos movimento ou economia de dados, e pausa
// fora da tela.
function Fundo({ poster, video }: { poster?: string | null; video?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [usa] = useState(() => {
    if (!video) return false;
    try {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if ((navigator as any).connection && (navigator as any).connection.saveData) return false;
    } catch {}
    return true;
  });
  useEffect(() => {
    const v = ref.current;
    if (!v || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, [usa]);
  return (
    <div className="destaque-fundo" aria-hidden="true">
      {poster ? <img src={poster} alt="" /> : <div className="destaque-sem-capa" />}
      {usa ? <video ref={ref} className={tocando ? 'on' : ''} src={video as string} muted autoPlay loop playsInline preload="auto" onPlaying={() => setTocando(true)} /> : null}
    </div>
  );
}

function Trilha({ t }: { t: any }) {
  const feitos = t.passos.filter((p: any) => p.estado === 'feito').length;
  const agora = t.passos.find((p: any) => p.estado === 'agora');
  return (
    <div className="b-cartao b-trilha">
      <div className="b-trilha-topo"><div><small>Sua trilha</small><h3>{t.titulo}</h3></div><span className="num">{feitos}/{t.passos.length}</span></div>
      <ol className="b-passos">
        {t.passos.slice(0, 5).map((p: any, i: number) => {
          const corpo = <><span className="ponto">{p.estado === 'feito' ? <I n="ok" /> : i + 1}</span><span className="txt"><b>{p.titulo || `Passo ${i + 1}`}</b><small>{p.estado === 'feito' ? 'Feito' : p.total ? `${p.feitas} de ${p.total} aulas` : 'Em breve'}</small></span></>;
          return <li key={i} className={p.estado}>{p.primeira ? <Link para={`/aulas/${p.primeira}`}>{corpo}</Link> : <div>{corpo}</div>}</li>;
        })}
      </ol>
      {agora && agora.primeira ? <Link className="bt bt-p b-seguir" para={`/aulas/${agora.primeira}`}>Seguir a trilha</Link> : null}
    </div>
  );
}
