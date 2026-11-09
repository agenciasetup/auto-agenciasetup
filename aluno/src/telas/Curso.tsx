// Meus cursos e a página do curso: seções, módulos que abrem e fecham, aulas com progresso, materiais e certificado.
import { useState } from 'react';
import { Carregando, ErroTela, I, Poster, duracao, mmss, useDados, useToast } from '../comum';
import { SITE, get, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/rota';
import { Ficha } from './Ficha';
import { Avisos } from './Avisos';
import { BotaoCertificado, Conquista } from './Conquista';

export function MeusCursos() {
  const { dados: d, erro, carregando, recarregar } = useDados(() => get('/inicio'), []);
  if (carregando && !d) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  return (
    <section className="tela ativa gutter largura" aria-label="Meus cursos">
      <div className="ola"><h1>Meus cursos</h1></div>
      {d.cursos.length ? d.cursos.map((c: any) => (
        <Link key={c.id} className="trilha" para={`/cursos/${c.slug}`} style={{ marginTop: 16 }}>
          <Poster titulo={c.titulo} pe={`${c.pct}% concluído`} cor={c.cor} />
          <div className="trilha-corpo"><div><h3>{c.titulo}</h3><p>{c.feitas} de {c.total} aulas concluídas</p></div><div className="barra"><i style={{ width: `${Math.max(2, c.pct)}%` }} /></div></div>
        </Link>
      )) : <div className="cartao" style={{ marginTop: 16 }}><h3>Você ainda não tem cursos</h3><p>Quando a compra for confirmada, o curso aparece aqui sozinho.</p><a className="bt bt-p" href={`${SITE}/cursos`}>Ver os cursos</a></div>}
    </section>
  );
}

export function Curso({ slug }: { slug: string }) {
  const { rota } = useRota();
  const [aba, setAba] = useState(rota.busca.get('aba') || 'aulas');
  const { dados: d, erro, carregando, recarregar } = useDados(() => get(`/cursos/${slug}`), [slug]);
  if (carregando && !d) return <Carregando />;
  if (erro) {
    if (erro.dados && erro.dados.codigo === 'outro-app') {
      return <div className="estado gutter largura"><p>{erro.message} Entre lá com este mesmo e-mail.</p><a className="bt bt-marca" href={erro.dados.url}>Abrir o {erro.dados.nome}</a></div>;
    }
    if (erro.dados && erro.dados.codigo === 'sem-matricula') {
      const o = erro.dados.oferta;
      return <div className="estado gutter largura"><p>Você ainda não tem este curso.</p>{o ? <a className="bt bt-marca" href={`${SITE}/checkout/${o.slug}`}>Conhecer o curso</a> : null}</div>;
    }
    return <ErroTela erro={erro} aoTentar={recarregar} />;
  }
  const c = d.curso;
  const palavras = c.titulo.split(' ');
  const a = palavras.length > 2 ? palavras.slice(0, -2).join(' ') : c.titulo;
  const b = palavras.length > 2 ? palavras.slice(-2).join(' ') : '';
  const k = d.continuar;
  const pctCert = d.certificado.necessarias ? Math.min(100, Math.round((d.feitas / d.certificado.necessarias) * 100)) : 0;
  return (
    <section className="tela ativa gutter largura" aria-label="Curso">
      <Avisos dados={d.avisos} />
      <div className="curso-hero">
        <div className="foto">{c.capa_url ? <img src={c.capa_url} alt="" /> : null}<div className="grao" /></div>
        <div style={{ display: 'grid', gap: 16 }}>
          <span className="etiqueta">Curso</span>
          <h1>{a}{b ? <> <span className="serifa">{b}</span></> : null}</h1>
          {c.subtitulo ? <p className="lead">{c.subtitulo}</p> : null}
          <div className="metas">
            <span><I n="video" />{d.total} aulas</span>
            <span><I n="medalha" />Certificado com {c.certificado_pct}%</span>
            <span><I n="pacote" />{d.arquivos.length} materiais</span>
          </div>
          <div className="progresso-curso">
            <div className="linha"><span><b>{d.feitas} de {d.total} aulas</b> concluídas</span><span className="num">{d.pct}%</span></div>
            <div className="barra"><i style={{ width: `${Math.max(1, d.pct)}%` }} /></div>
          </div>
          {k ? <div className="acoes"><Link className="bt bt-marca bt-g" para={`/aulas/${k.id}`}><I n="tocar" />{k.pct > 0 ? `Continuar a aula ${k.codigo}` : `Assistir a aula ${k.codigo}`}</Link></div> : null}
        </div>
      </div>

      {d.conquista ? <div className="curso-conquista"><Conquista c={d.conquista} galeria /></div> : null}

      <div className="curso-corpo">
        <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
          <div className="segmentos" role="tablist" aria-label="Partes do curso">
            {[['aulas', 'Aulas'], ['materiais', 'Materiais'], ['notas', 'Notas'], ['avaliacoes', 'Avaliação'], ['sobre', 'Sobre']].map(([id, t]) => (
              <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>{t}</button>
            ))}
          </div>
          {aba === 'aulas' ? (
            <div>
              {d.secoes.map((s: any) => (
                <div className="secao" key={s.id || 'sem'}>
                  {s.titulo ? <h3>{s.titulo}</h3> : null}
                  {s.modulos.map((m: any) => {
                    const feitas = m.aulas.filter((x: any) => x.concluida).length;
                    const atual = k && m.aulas.some((x: any) => x.id === k.id);
                    const cls = feitas === m.aulas.length && m.aulas.length ? 'completo' : atual ? 'atual' : '';
                    return (
                      <details className={`modulo ${cls}`} key={m.id} open={!!atual}>
                        <summary>
                          <span className="n">{cls === 'completo' ? <I n="ok" /> : m.liberado ? m.numero : <I n="cadeado" />}</span>
                          <span><b>Módulo {m.numero} · {m.titulo}</b><small>{feitas} de {m.aulas.length} aulas{!m.liberado && m.libera_em ? ` · libera em ${new Date(m.libera_em).toLocaleDateString('pt-BR')}` : ''}</small></span>
                          <I n="baixo" className="seta" />
                        </summary>
                        <ol>
                          {m.aulas.map((x: any) => {
                            const e = x.concluida ? 'feita' : k && x.id === k.id ? 'agora' : '';
                            const conteudo = (
                              <>
                                <div className="capa">{x.capa_url ? <img src={x.capa_url} alt="" loading="lazy" /> : null}</div>
                                <span><b>{x.codigo} · {x.titulo}</b><small className="num">{mmss(x.duracao_s)}{x.pct > 0 && !x.concluida ? ` · ${x.pct}% assistido` : ''}</small>{e === 'agora' && x.pct > 0 ? <div className="barra"><i style={{ width: `${x.pct}%` }} /></div> : null}</span>
                                <span className="est">{x.concluida ? <I n="ok" /> : e === 'agora' ? <I n="tocar" /> : !x.liberada ? <I n="cadeado" /> : null}</span>
                              </>
                            );
                            return <li key={x.id}>{x.liberada ? <Link className={`a-item ${e}`} para={`/aulas/${x.id}`}>{conteudo}</Link> : <div className="a-item">{conteudo}</div>}</li>;
                          })}
                        </ol>
                      </details>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : aba === 'materiais' ? (
            <div style={{ display: 'grid', gap: 12 }}>{d.arquivos.length ? d.arquivos.map((f: any) => <Ficha key={f.id} f={f} />) : <p className="mudo">Este curso ainda não tem materiais.</p>}</div>
          ) : aba === 'notas' ? (
            <NotasDoCurso slug={c.slug} />
          ) : aba === 'avaliacoes' ? (
            <AvaliacaoCurso d={d} aoMudar={recarregar} />
          ) : (
            <div className="cartao"><h3>Sobre o curso</h3><p style={{ whiteSpace: 'pre-line' }}>{c.descricao}</p><p className="fraco">Duração total: {duracao(d.secoes.flatMap((s: any) => s.modulos).flatMap((m: any) => m.aulas).reduce((t: number, x: any) => t + (x.duracao_s || 0), 0))}</p></div>
          )}
        </div>
        <aside className="lado-curso">
          <div className="cartao">
            <div className="cert"><span className="anel" style={{ ['--p' as any]: pctCert }} data-txt={`${d.feitas}/${d.certificado.necessarias}`} /><div><h3>Seu certificado</h3><p>{d.certificado.codigo ? 'Pronto, com código para conferir, PDF e LinkedIn.' : d.certificado.espera ? `Libera no dia ${d.conquista.dias} da sua conquista${d.certificado.faltam > 0 ? `. Até lá, faltam ${d.certificado.faltam} aulas para os ${c.certificado_pct}%.` : '. Suas aulas já estão em dia.'}` : d.certificado.faltam > 0 ? `Faltam ${d.certificado.faltam} aulas para chegar aos ${c.certificado_pct}% e liberar o certificado.` : 'Tudo pronto: solicite o seu certificado.'}</p></div></div>
            {d.certificado.codigo ? <a className="bt bt-marca bt-p" href={`/certificado/${d.certificado.codigo}`}><I n="medalha" />Ver o certificado</a> : !d.certificado.espera && d.certificado.faltam <= 0 ? <BotaoCertificado slug={c.slug} /> : null}
          </div>
          {k ? <div className="cartao"><h3>Dúvida? O tutor responde</h3><p>Ele conhece cada aula palavra por palavra e lê o print da sua tela.</p><Link className="bt bt-p" para={`/aulas/${k.id}`}><I n="brilho" />Perguntar ao tutor</Link></div> : null}
          {d.depoimento.pode && !d.depoimento.enviado ? <div className="cartao"><h3>Conte como está sendo</h3><p>{d.depoimento.recompensas.length ? `Ganhe ${d.depoimento.recompensas.map((r: any) => r.nome).join(', ')} na hora.` : 'Sua opinião melhora o curso para a próxima turma.'}</p><button className="bt bt-tingido bt-p" onClick={() => setAba('avaliacoes')}><I n="presente" />Contar e ganhar</button></div> : null}
          {d.depoimento.pedir_resultado ? <div className="cartao"><h3>30 dias depois: e aí?</h3><p>Conte o resultado que você teve. Ajuda a mostrar o que o curso faz de verdade.</p><button className="bt bt-p" onClick={() => setAba('avaliacoes')}>Contar o resultado</button></div> : null}
        </aside>
      </div>
    </section>
  );
}

function NotasDoCurso({ slug }: { slug: string }) {
  const { dados } = useDados(() => get(`/cursos/${slug}/anotacoes`), [slug]);
  if (!dados) return <p className="mudo">Carregando as suas notas...</p>;
  if (!dados.length) return <div className="cartao"><h3>Nenhuma nota ainda</h3><p>Na aula, abra a aba Notas e anote no minuto: a nota leva você de volta ao ponto exato do vídeo.</p></div>;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {dados.map((n: any) => (
        <Link key={n.id} className="nota-item" para={`/aulas/${n.aula.id}?t=${n.minuto_s}`}>
          <span className="tempo-chip">{mmss(n.minuto_s)}</span>
          <span><b style={{ display: 'block', fontSize: 12.5 }} className="fraco">Aula {n.aula.codigo} · {n.aula.titulo}</b><span style={{ whiteSpace: 'pre-wrap' }}>{n.texto}</span></span>
        </Link>
      ))}
    </div>
  );
}

function AvaliacaoCurso({ d, aoMudar }: { d: any; aoMudar: () => void }) {
  const toast = useToast();
  const dep = d.depoimento;
  const [f, setF] = useState<any>({ nota: d.minha_nota ? d.minha_nota.nota : 10, texto: '', autoriza_uso: true, video_url: '' });
  const [resultado, setResultado] = useState('');
  const presentes = dep.recompensas.map((r: any) => r.nome).join(', ');
  async function enviar(e: any) {
    e.preventDefault();
    try { await post(`/cursos/${d.curso.slug}/depoimento`, { ...f, video_url: f.video_url || null }); toast(presentes ? 'Obrigado! O seu presente já está em Materiais.' : 'Obrigado por contar!'); aoMudar(); } catch (er: any) { toast(er.message); }
  }
  async function salvarResultado(e: any) {
    e.preventDefault();
    try { await post(`/cursos/${d.curso.slug}/resultado`, { resultado }); toast('Obrigado!'); aoMudar(); } catch (er: any) { toast(er.message); }
  }
  if (dep.enviado) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="cartao"><h3>Obrigado por contar como foi</h3><p>{dep.status === 'aprovado' ? 'Seu depoimento foi aprovado.' : 'A equipe já recebeu o seu depoimento.'}{presentes ? ' O seu presente está em Materiais.' : ''}</p></div>
      {dep.pedir_resultado ? (
        <form className="cartao" onSubmit={salvarResultado}>
          <h3>E o resultado, 30 dias depois?</h3>
          <div className="campo"><label htmlFor="res">Quantos posts você já automatizou? O que mudou?</label><textarea id="res" rows={3} value={resultado} onChange={(e) => setResultado(e.target.value)} maxLength={500} /></div>
          <button className="bt bt-marca bt-p" disabled={!resultado.trim()} style={{ justifySelf: 'start' }}>Enviar</button>
        </form>
      ) : null}
    </div>
  );
  if (!dep.pode) return <div className="cartao"><h3>Avaliação do curso</h3><p>Depois de 50% das aulas, você conta como está sendo{presentes ? ` e ganha ${presentes}` : ''}. Você está em {d.pct}%.</p></div>;
  return (
    <form className="cartao" onSubmit={enviar}>
      <h3>Conte como está sendo{presentes ? ' e ganhe o presente' : ''}</h3>
      {presentes ? <p>Você ganha na hora: {presentes}.</p> : null}
      <div className="campo"><label>De 0 a 10, quanto você indicaria o curso?</label>
        <div className="notas-0-10">{Array.from({ length: 11 }, (_, i) => <button key={i} type="button" aria-pressed={f.nota === i} onClick={() => setF({ ...f, nota: i })}>{i}</button>)}</div>
      </div>
      <div className="campo"><label htmlFor="dep">O que mudou para você?</label><textarea id="dep" rows={4} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} maxLength={2000} placeholder="Ex.: Antes eu levava 2 horas num carrossel. Agora..." /></div>
      <div className="campo"><label htmlFor="dep-v">Link de um vídeo curto (opcional)</label><input id="dep-v" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} placeholder="https://" inputMode="url" /></div>
      <label className="marcar-linha"><input type="checkbox" checked={f.autoriza_uso} onChange={(e) => setF({ ...f, autoriza_uso: e.target.checked })} /> Autorizo usar o meu depoimento (com o meu nome) na página do curso</label>
      <button className="bt bt-marca bt-p" disabled={f.texto.trim().length < 10} style={{ justifySelf: 'start' }}><I n="presente" />Enviar</button>
    </form>
  );
}
