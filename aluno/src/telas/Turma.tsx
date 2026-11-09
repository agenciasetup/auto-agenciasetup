// Turma (seção 7): o mural do que a turma criou com o curso (curtir), os desafios da equipe (entregar) e o ranking
// da semana e do mês (só quem aceitou aparecer). Sem feed para rolar: fazer junto e ver o que os outros fizeram.
import { useEffect, useRef, useState } from 'react';
import { Carregando, ErroTela, I, useDados, useToast } from '../comum';
import { get, patch, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/rota';
import { Avatar, reduzirImagem } from './AulaAbas';

const STATUS: Record<string, string> = { pendente: 'Em análise', aprovada: 'No mural', destaque: 'Destaque', recusada: 'Não entrou' };
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function Turma({ eu, aoMudarEu }: { eu: any; aoMudarEu: (e: any) => void }) {
  const { rota, ir } = useRota();
  const [aba, setAba] = useState(rota.busca.get('aba') || 'mural');
  const [enviar, setEnviar] = useState<any>(null);
  useEffect(() => { document.title = 'Turma | Cursos da Setup'; }, []);
  const trocar = (x: string) => { setAba(x); ir(`/turma?aba=${x}`, { trocar: true }); };
  return (
    <section className="tela ativa gutter largura" aria-label="Turma">
      <div className="ola"><h1>Turma</h1><button className="bt bt-marca bt-p" onClick={() => setEnviar({})}><I n="mais" />Enviar criação</button></div>
      <div className="segmentos" role="tablist" aria-label="Partes da turma" style={{ marginTop: 14 }}>
        <button role="tab" aria-selected={aba === 'mural'} onClick={() => trocar('mural')}><I n="imagem" />Mural</button>
        <button role="tab" aria-selected={aba === 'desafios'} onClick={() => trocar('desafios')}><I n="trofeu" />Desafios</button>
        <button role="tab" aria-selected={aba === 'ranking'} onClick={() => trocar('ranking')}><I n="medalha" />Ranking</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {aba === 'mural' ? <Mural aoEnviar={() => setEnviar({})} /> : null}
        {aba === 'desafios' ? <Desafios aoEnviar={(d: any) => setEnviar({ desafio: d })} /> : null}
        {aba === 'ranking' ? <Ranking eu={eu} aoMudarEu={aoMudarEu} /> : null}
      </div>
      {enviar ? <EnviarCriacao desafio={enviar.desafio} aoFechar={(ok?: boolean) => { setEnviar(null); if (ok) trocar('mural'); }} /> : null}
    </section>
  );
}

export function CartaoCriacao({ c, aoCurtir }: { c: any; aoCurtir?: (c: any) => void }) {
  return (
    <div className="c-mural">
      <a className={`post${c.imagem_url ? ' com-imagem' : ' preto'}`} href={c.link || c.imagem_url || '#'} target="_blank" rel="noopener nofollow">
        {c.imagem_url ? <img src={c.imagem_url} alt={c.titulo} loading="lazy" /> : <b>{c.titulo}</b>}
        {c.status === 'destaque' ? <span className="etiqueta selo-destaque" style={{ ['--c' as any]: '#ffd60a' }}><I n="medalha" />Destaque</span> : null}
      </a>
      <div className="autor">
        {c.autor ? <Avatar nome={c.autor.nome} foto={c.autor.foto_url} moldura={c.autor.moldura} /> : null}
        <span className="nome-autor">{c.autor && c.autor.usuario ? <a href={`/@${c.autor.usuario}`}>{c.autor.nome.split(' ')[0]}</a> : c.autor ? c.autor.nome.split(' ')[0] : ''}</span>
        <button type="button" className="curt" aria-pressed={c.eu_curti} onClick={() => aoCurtir && aoCurtir(c)} aria-label="Curtir"><I n="coracao" />{c.curtidas || ''}</button>
      </div>
    </div>
  );
}

function useCurtir(setItens: (f: (l: any[]) => any[]) => void) {
  const toast = useToast();
  return async (c: any) => {
    const ligar = !c.eu_curti;
    setItens((l) => l.map((x) => (x.id === c.id ? { ...x, eu_curti: ligar, curtidas: x.curtidas + (ligar ? 1 : -1) } : x)));
    try { await post(`/entregas/${c.id}/curtir`, { ligar }); } catch (e: any) { toast(e.message); setItens((l) => l.map((x) => (x.id === c.id ? c : x))); }
  };
}

function Mural({ aoEnviar }: { aoEnviar: () => void }) {
  const { dados, erro, carregando, recarregar } = useDados(() => get('/mural'), []);
  const [itens, setItens] = useState<any[]>([]);
  useEffect(() => { if (dados) setItens(dados.itens); }, [dados]);
  const curtir = useCurtir(setItens);
  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  return (
    <>
      {dados.minhas.length ? (
        <div className="cartao" style={{ marginBottom: 16 }}>
          <h3>Suas criações</h3>
          {dados.minhas.map((m: any) => <p key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{m.titulo}{m.desafio ? <span className="fraco"> · {m.desafio.titulo}</span> : null}</span><span className="etiqueta" style={{ ['--c' as any]: m.status === 'recusada' ? '#ff453a' : m.status === 'pendente' ? '#ffb000' : '#34c759' }}>{STATUS[m.status]}</span></p>)}
        </div>
      ) : null}
      <div className="criacoes">
        <button type="button" className="enviar-criacao" onClick={aoEnviar}><I n="mais" />Mostre o que você criou com o curso</button>
        {itens.map((c) => <CartaoCriacao key={c.id} c={c} aoCurtir={curtir} />)}
      </div>
      {!itens.length ? <p className="mudo" style={{ marginTop: 14 }}>O mural ainda está vazio. Seja a primeira criação: um post, um carrossel ou a sua pasta funcionando.</p> : null}
    </>
  );
}

function Desafios({ aoEnviar }: { aoEnviar: (d: any) => void }) {
  const { rota } = useRota();
  const { dados, erro, carregando, recarregar } = useDados(() => get('/desafios'), []);
  const aberto = rota.busca.get('desafio');
  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  if (aberto) return <Desafio slug={aberto} aoEnviar={aoEnviar} />;
  if (!dados.length) return <div className="cartao"><h3>Nenhum desafio aberto agora</h3><p>Quando a equipe abrir um, ele aparece aqui e no início. Destaques ganham selo, moldura e repost no Instagram da agência.</p></div>;
  return (
    <div className="desafios">
      {dados.map((d: any) => (
        <Link key={d.id} className="cartao desafio" para={`/turma?aba=desafios&desafio=${d.slug}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <span className="etiqueta" style={{ ['--c' as any]: d.status === 'aberto' ? '#34c759' : '#8e8e93' }}>{d.status === 'aberto' ? (d.fim ? `Até ${dataCurta(d.fim)}` : 'Aberto') : 'Encerrado'}</span>
            {d.minha ? <span className="etiqueta" style={{ ['--c' as any]: '#ff7a00' }}>Você: {STATUS[d.minha]}</span> : null}
          </div>
          <h3>{d.titulo}</h3>
          <p>{d.descricao}</p>
          <p className="fraco">{d.entregas} {d.entregas === 1 ? 'criação' : 'criações'}{d.premio ? ` · Prêmio: ${d.premio}` : ''}</p>
        </Link>
      ))}
    </div>
  );
}

function Desafio({ slug, aoEnviar }: { slug: string; aoEnviar: (d: any) => void }) {
  const { dados: d, erro, carregando, recarregar } = useDados(() => get(`/desafios/${slug}`), [slug]);
  const [itens, setItens] = useState<any[]>([]);
  useEffect(() => { if (d) setItens(d.mural); }, [d]);
  const curtir = useCurtir(setItens);
  if (carregando && !d) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Link para="/turma?aba=desafios" className="link-simples" style={{ justifySelf: 'start' }}><I n="esquerda" />Todos os desafios</Link>
      <div className="cartao">
        <span className="etiqueta" style={{ ['--c' as any]: d.status === 'aberto' ? '#34c759' : '#8e8e93', justifySelf: 'start' }}>{d.status === 'aberto' ? (d.fim ? `Aberto até ${dataCurta(d.fim)}` : 'Aberto') : 'Encerrado'}</span>
        <h3 style={{ fontSize: 20 }}>{d.titulo}</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{d.descricao}</p>
        {d.regras ? <><h3>Regras</h3><p style={{ whiteSpace: 'pre-wrap' }}>{d.regras}</p></> : null}
        {d.premio ? <p><b>Prêmio:</b> {d.premio}</p> : null}
        {d.minha ? <p className="marca-texto">Sua entrega: {d.minha.titulo} · {STATUS[d.minha.status]}{d.minha.motivo ? ` (${d.minha.motivo})` : ''}</p>
          : d.status === 'aberto' ? <button className="bt bt-marca bt-p" style={{ justifySelf: 'start' }} onClick={() => aoEnviar(d)}><I n="mais" />Entregar neste desafio</button> : null}
      </div>
      {itens.length ? <div className="criacoes">{itens.map((c) => <CartaoCriacao key={c.id} c={c} aoCurtir={curtir} />)}</div> : <p className="mudo">Ainda sem criações aprovadas neste desafio.</p>}
    </div>
  );
}

function Ranking({ eu, aoMudarEu }: { eu: any; aoMudarEu: (e: any) => void }) {
  const toast = useToast();
  const [periodo, setPeriodo] = useState('semana');
  const { dados, erro, carregando, recarregar } = useDados(() => get(`/ranking?periodo=${periodo}`), [periodo]);
  async function participar(v: boolean) {
    try { const r = await patch('/eu', { no_ranking: v }); aoMudarEu({ ...eu, ...r }); recarregar(); toast(v ? 'Você entrou no ranking' : 'Você saiu do ranking'); } catch (e: any) { toast(e.message); }
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="segmentos" role="tablist" aria-label="Período">
        {[['semana', 'Semana'], ['mes', 'Mês'], ['tudo', 'Desde o início']].map(([k, t]) => <button key={k} role="tab" aria-selected={periodo === k} onClick={() => setPeriodo(k)}>{t}</button>)}
      </div>
      {carregando && !dados ? <Carregando /> : erro ? <ErroTela erro={erro} aoTentar={recarregar} /> : (
        <div className="cartao">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><h3>{periodo === 'semana' ? 'Ranking da semana' : periodo === 'mes' ? 'Ranking do mês' : 'Ranking geral'}</h3>{periodo === 'semana' ? <span className="etiqueta" style={{ ['--c' as any]: '#8e8e93' }}>zera na segunda</span> : null}</div>
          <div className="ranking">
            {dados.top.length ? dados.top.map((r: any) => (
              <div key={`${r.posicao}-${r.nome}`} className={`rank${r.eu ? ' eu' : ''}`}><span className="pos">{r.posicao}</span><Avatar nome={r.nome} foto={r.foto_url} moldura={r.moldura} /><span>{r.usuario ? <a href={`/@${r.usuario}`}>{r.nome}</a> : r.nome}</span><span className="xp">{r.pontos} XP</span></div>
            )) : <p className="mudo">Ninguém pontuou neste período ainda.</p>}
          </div>
          <p className="fraco" style={{ fontSize: 13 }}>{dados.eu.posicao ? `Você: ${dados.eu.posicao}º de ${dados.eu.participantes}, com ${dados.eu.pontos} XP.` : `Você fez ${dados.eu.pontos} XP neste período.`} XP vem de aula assistida de verdade, passo feito, comentário útil e criação aprovada.</p>
          {!dados.participo ? (
            <div className="opcao" style={{ padding: 0 }}><div>Aparecer no ranking<small>Só o seu nome e a sua foto. Dá para sair quando quiser.</small></div><button className="bt bt-marca bt-p" onClick={() => participar(true)}>Quero aparecer</button></div>
          ) : <button className="link-simples" style={{ justifySelf: 'start' }} onClick={() => participar(false)}>Sair do ranking</button>}
        </div>
      )}
    </div>
  );
}

// Folha de envio: link do post ou imagem, título, descrição, desafio e autorização de repost.
function EnviarCriacao({ desafio, aoFechar }: { desafio?: any; aoFechar: (ok?: boolean) => void }) {
  const toast = useToast();
  const [f, setF] = useState<any>({ titulo: '', link: '', descricao: '', autoriza_repost: true, imagem: null });
  const [enviando, setEnviando] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  async function mandar(e: any) {
    e.preventDefault();
    setEnviando(true);
    try {
      await post('/entregas', { ...f, link: f.link || null, desafio_id: desafio ? desafio.id : null });
      toast('Enviado! A equipe confere e coloca no mural.');
      aoFechar(true);
    } catch (er: any) { toast(er.message); } finally { setEnviando(false); }
  }
  return (
    <div className="busca-folha" role="dialog" aria-modal="true" aria-label="Enviar criação" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <form className="busca-caixa folha-form" onSubmit={mandar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>{desafio ? `Entregar: ${desafio.titulo}` : 'Enviar criação'}</h3><button type="button" className="bt-icone" aria-label="Fechar" onClick={() => aoFechar()}><I n="fechar" /></button></div>
        <div className="campo"><label htmlFor="c-tit">Título</label><input id="c-tit" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} maxLength={120} placeholder="Ex.: Carrossel do meu primeiro post automático" required /></div>
        <div className="campo"><label htmlFor="c-link">Link do post (opcional)</label><input id="c-link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://instagram.com/p/..." inputMode="url" /></div>
        <div className="campo"><label>Imagem (opcional)</label>
          {f.imagem ? <div className="anexo"><img src={f.imagem} alt="" /><button type="button" className="bt bt-p" onClick={() => setF({ ...f, imagem: null })}><I n="fechar" />Tirar</button></div>
            : <button type="button" className="bt bt-p" onClick={() => arq.current && arq.current.click()}><I n="imagem" />Escolher imagem</button>}
          <input ref={arq} type="file" accept="image/*" hidden onChange={async (e) => { const a = e.target.files && e.target.files[0]; if (a) try { setF({ ...f, imagem: await reduzirImagem(a, 1350, 0.85) }); } catch (er: any) { toast(er.message); } }} />
        </div>
        <div className="campo"><label htmlFor="c-desc">Conte em uma frase (opcional)</label><textarea id="c-desc" rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} maxLength={1000} /></div>
        <label className="marcar-linha"><input type="checkbox" checked={f.autoriza_repost} onChange={(e) => setF({ ...f, autoriza_repost: e.target.checked })} /> Autorizo a Agência Setup a repostar com crédito</label>
        <button className="bt bt-marca" disabled={enviando || f.titulo.trim().length < 2 || (!f.link && !f.imagem)}>{enviando ? 'Enviando...' : 'Enviar para o mural'}</button>
      </form>
    </div>
  );
}
