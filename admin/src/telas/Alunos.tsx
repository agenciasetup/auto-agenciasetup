// Alunos: quem tem acesso, o que já assistiu, link de entrada (quem perdeu o e-mail) e liberar ou tirar um curso na mão.
import { useEffect, useState } from 'react';
import { Gift, Link2, UserX } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Modal, Paginacao, Segredo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { ORIGEM_MATRICULA, STATUS_EMAIL, data, dinheiro, haQuanto, iniciais } from '../nucleo/util';
import { EtiquetaPedido } from './Vendas';

export default function Alunos() {
  const { pode } = useSessao();
  useEffect(() => { document.title = 'Alunos | Painel Agência Setup'; }, []);
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<string | null>(null);
  const [liberar, setLiberar] = useState<any>(null);
  const [link, setLink] = useState<{ nome: string; link: string } | null>(null);
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  useEffect(() => { setPagina(1); }, [buscaFeita]);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/alunos?pagina=${pagina}${buscaFeita ? `&busca=${encodeURIComponent(buscaFeita)}` : ''}`), [pagina, buscaFeita]);
  const cursos = useCarregar(() => (liberar ? get('/area/cursos') : Promise.resolve(null)), [!!liberar]);
  const { ocupado, rodar } = useAcao();

  const confirmarLiberar = () => rodar('liberar', async () => {
    if (!/^\S+@\S+\.\S+$/.test(liberar.email.trim())) throw new Error('Confira o e-mail.');
    if (!liberar.curso_id) throw new Error('Escolha o curso.');
    const r = await post('/alunos', { ...liberar, email: liberar.email.trim().toLowerCase(), dias: liberar.dias ? Number(liberar.dias) : null });
    setLink({ nome: liberar.nome || liberar.email, link: r.link });
    setLiberar(null);
    recarregar();
  }, 'Curso liberado e e-mail de acesso enviado.');

  return (
    <div className="tela">
      <Titulo titulo="Alunos" sub="Quem tem acesso aos cursos e o que já fez. Para atender: reenviar o acesso, gerar link de entrada ou liberar um curso."
        acoes={pode('alunos.editar') ? <button className="bt bt-tinta" onClick={() => setLiberar({ email: '', nome: '', curso_id: '', origem: 'bonus', dias: '' })}><Gift />Liberar curso</button> : undefined} />
      <div className="filtros">
        <input type="search" placeholder="Buscar por e-mail ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar aluno" />
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.itens.length ? <>
        <Grupo>
          {dados.itens.map((a: any) => {
            const ativas = (a.matriculas || []).filter((m: any) => m.status === 'ativa');
            return (
              <Celula key={a.id} onClick={() => setAberto(a.id)} icone={<span style={{ fontWeight: 700, fontSize: 13 }}>{iniciais(a.nome || a.email)}</span>} cor={ativas.length ? 'laranja' : undefined}
                titulo={a.nome || a.email}
                sub={`${a.email} · ${a.ultimo_acesso ? `entrou ${haQuanto(a.ultimo_acesso)}` : 'ainda não entrou'}`}
                direita={ativas.length ? <Etiqueta cor="verde">{ativas.length === 1 ? ativas[0].curso?.titulo || '1 curso' : `${ativas.length} cursos`}</Etiqueta> : <Etiqueta>Sem curso ativo</Etiqueta>} />
            );
          })}
        </Grupo>
        <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 30} mudar={setPagina} />
      </> : <Vazio titulo={buscaFeita ? 'Ninguém com essa busca.' : 'Nenhum aluno ainda.'} texto={buscaFeita ? undefined : 'Quem compra pelo checkout entra aqui sozinho, com o acesso liberado.'} />)}

      <DetalheAluno id={aberto} fechar={() => setAberto(null)} mudou={recarregar} mostrarLink={setLink} />

      <Modal titulo="Liberar um curso" aberto={!!liberar} fechar={() => setLiberar(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setLiberar(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={confirmarLiberar}><Gift />Liberar e mandar o acesso</button></>}>
        {liberar && <>
          <Campo rotulo="E-mail da pessoa" tipo="email" valor={liberar.email} mudar={(v) => setLiberar({ ...liberar, email: v })} autoFocus />
          <Campo rotulo="Nome" valor={liberar.nome} mudar={(v) => setLiberar({ ...liberar, nome: v })} dica="Se a pessoa já for aluna, fica o nome que ela já tem." />
          {cursos.carregando && !cursos.dados ? <Carregando /> : (
            <Escolha rotulo="Curso" valor={liberar.curso_id} mudar={(v) => setLiberar({ ...liberar, curso_id: v })}
              opcoes={[{ v: '', t: 'Escolha o curso' }, ...((cursos.dados as any[]) || []).map((c: any) => ({ v: c.id, t: c.titulo }))]} />
          )}
          <Escolha rotulo="Motivo" valor={liberar.origem} mudar={(v) => setLiberar({ ...liberar, origem: v })}
            opcoes={[{ v: 'bonus', t: 'Bônus' }, { v: 'presente', t: 'Presente ou cortesia' }, { v: 'equipe', t: 'Alguém da equipe' }]} />
          <Campo rotulo="Dias de acesso" tipo="number" min={1} valor={liberar.dias} mudar={(v) => setLiberar({ ...liberar, dias: v })} dica="Em branco: acesso sem prazo." />
          <p className="campo-dica">A pessoa recebe o e-mail de boas-vindas com o link de entrada. Você também vê o link aqui, para mandar no WhatsApp.</p>
        </>}
      </Modal>

      <Modal titulo="Link de entrada" aberto={!!link} fechar={() => setLink(null)} rodape={<button className="bt bt-tinta" onClick={() => setLink(null)}>Pronto</button>}>
        {link && <>
          <p style={{ marginTop: 0 }}>Mande este link para <b>{link.nome}</b>. Ele entra direto na área do aluno, vale uma vez e vence em 24 horas.</p>
          <Segredo texto={link.link} aviso="Não publique este link: quem abrir primeiro entra na conta." />
        </>}
      </Modal>
    </div>
  );
}

// A tela Suporte abre a mesma ficha do aluno.
export function DetalheAluno({ id, fechar, mudou, mostrarLink }: { id: string | null; fechar: () => void; mudou: () => void; mostrarLink: (l: { nome: string; link: string }) => void }) {
  const { pode } = useSessao();
  const { dados: a, erro, recarregar } = useCarregar(() => (id ? get(`/alunos/${id}`) : Promise.resolve(null)), [id]);
  const [tirar, setTirar] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => setTirar(null), [id]);
  const pronto = a && a.id === id;

  const gerarLink = () => rodar('link', async () => {
    const r = await post(`/alunos/${id}/link`);
    mostrarLink({ nome: a.nome || a.email, link: r.link });
  });
  const revogar = () => rodar('revogar', async () => {
    await post(`/matriculas/${tirar.id}/revogar`, { motivo: tirar.motivo || 'retirada pela equipe' });
    setTirar(null); recarregar(); mudou();
  }, 'Acesso retirado.');

  return (
    <Modal titulo={pronto ? a.nome || a.email : 'Aluno'} aberto={!!id} fechar={fechar}
      rodape={pronto && <>
        {pode('alunos.editar') && <button className="bt bt-texto" disabled={!!ocupado} onClick={gerarLink}><Link2 />Gerar link de entrada</button>}
        <button className="bt bt-tinta" onClick={fechar}>Fechar</button>
      </>}>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {!pronto && !erro && <Carregando />}
      {pronto && <>
        <dl className="lista-dados">
          <dt>E-mail</dt><dd>{a.email}</dd>
          {a.celular && <><dt>Celular</dt><dd>{a.celular}</dd></>}
          {a.instagram && <><dt>Instagram</dt><dd>@{String(a.instagram).replace(/^@/, '')}</dd></>}
          {a.area && <><dt>Área</dt><dd>{a.area}</dd></>}
          <dt>Login</dt><dd>{a.ultimo_acesso ? `Entrou ${haQuanto(a.ultimo_acesso)}` : a.tem_login ? 'Login pronto, ainda não entrou' : 'Ainda não criou o login'}</dd>
          <dt>Aluno desde</dt><dd>{data(a.criado_em)}</dd>
          <dt>Aulas concluídas</dt><dd>{a.concluidas}</dd>
        </dl>

        <h3 className="sub-titulo">Cursos</h3>
        {a.matriculas.length ? a.matriculas.map((m: any) => (
          <div key={m.id} className="linha-pequena linha-acao">
            <span><b>{m.curso?.titulo}</b> <span className="mudo">· {ORIGEM_MATRICULA[m.origem] || m.origem} · {m.fim ? `até ${data(m.fim)}` : 'sem prazo'}{m.status === 'revogada' && m.motivo ? ` · ${m.motivo}` : ''}</span></span>
            <span>{m.status === 'ativa' ? <Etiqueta cor="verde">Ativo</Etiqueta> : <Etiqueta cor="vermelho">Sem acesso</Etiqueta>}
              {m.status === 'ativa' && pode('alunos.editar') && <button className="bt bt-mini bt-texto bt-perigo" onClick={() => setTirar({ ...m, motivo: '' })}><UserX />Tirar</button>}</span>
          </div>
        )) : <p className="mudo">Nenhum curso.</p>}
        {tirar && (
          <Faixa tipo="aviso">
            Tirar o acesso de {a.nome || a.email} a <b>{tirar.curso?.titulo}</b>? Para devolver o dinheiro, use o reembolso em Vendas.
            <Campo rotulo="Motivo (fica no histórico)" valor={tirar.motivo} mudar={(v) => setTirar({ ...tirar, motivo: v })} />
            <div className="barra-acoes">
              <button className="bt bt-mini" onClick={() => setTirar(null)}>Cancelar</button>
              <button className="bt bt-mini bt-perigo" disabled={!!ocupado} onClick={revogar}>Sim, tirar o acesso</button>
            </div>
          </Faixa>
        )}

        {a.ultimas?.length ? <>
          <h3 className="sub-titulo">Últimas aulas</h3>
          {a.ultimas.map((p: any, i: number) => <p key={i} className="linha-pequena">Aula {p.aula?.codigo} · {p.aula?.titulo} <span className="mudo">· {p.concluida_em ? 'concluída' : 'começou'} {haQuanto(p.atualizado_em)}</span></p>)}
        </> : null}

        {a.pedidos?.length ? <>
          <h3 className="sub-titulo">Pedidos</h3>
          {a.pedidos.map((p: any) => <p key={p.id} className="linha-pequena">#{p.numero} · {dinheiro(p.total_centavos, p.moeda)} <EtiquetaPedido status={p.status} /> <span className="mudo">{haQuanto(p.criado_em)}{p.teste ? ' · teste' : ''}</span></p>)}
        </> : null}

        {a.emails?.length ? <>
          <h3 className="sub-titulo">E-mails</h3>
          {a.emails.map((e: any) => <p key={e.id} className="linha-pequena">{e.assunto} <Etiqueta cor={STATUS_EMAIL[e.status]?.cor}>{STATUS_EMAIL[e.status]?.t || e.status}</Etiqueta> <span className="mudo">{haQuanto(e.criado_em)}</span></p>)}
        </> : null}
      </>}
    </Modal>
  );
}
