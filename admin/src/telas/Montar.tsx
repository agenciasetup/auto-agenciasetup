// Montar cursos (Área de membros > Cursos e aulas): curso, módulos e aulas (vídeo do Bunny ou do Panda, abertura e final,
// marcadores no minuto, pausa prática, "Faça agora", resumo), arquivos com ficha (envio para o bucket privado, link ou
// Google Drive) e "curso vivo" (aula atualizada avisa no sino quem já tinha assistido). Trilhas ficam em outra aba.
// Curso com marca e endereço próprios (ex.: Dúvidas da Fé, tema "leitura"): a aula é um texto (resposta rápida,
// explicação, Bíblia, Igreja, "diga", "e se" e "para guardar"), editado aqui mesmo; o vídeo fica opcional, para depois.
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Bell, FilePlus2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { api, get, patch, post, put } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { STATUS_CONTEUDO, paraCampoData, doCampoData } from '../nucleo/util';

const mmss = (s?: number | null) => (s || s === 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
const seg = (t: string) => { const m = String(t || '').trim().match(/^(\d+)(?::(\d{1,2}))?$/); return m ? (m[2] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1])) : 0; };
const TIPOS_ARQ = ['receita', 'guia', 'skill', 'modelo', 'ferramenta', 'pacote', 'pdf', 'link'].map((v) => ({ v, t: v }));
const SITUACAO = [{ v: 'rascunho', t: 'Rascunho (só a equipe vê)' }, { v: 'publicado', t: 'Publicado' }, { v: 'arquivado', t: 'Arquivado' }];

export function Montar() {
  const { pode } = useSessao();
  const lista = useCarregar(() => get('/area/cursos'), []);
  const [cursoId, setCursoId] = useState<string | null>(null);
  const [novo, setNovo] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { if (!cursoId && lista.dados?.length) setCursoId(lista.dados[0].id); }, [lista.dados]);
  const criar = () => rodar('curso', async () => { const c = await post('/area/cursos', novo); setNovo(null); lista.recarregar(); setCursoId(c.id); }, 'Curso criado (rascunho).');
  if (lista.erro) return <ErroCarga erro={lista.erro} tentar={lista.recarregar} />;
  if (lista.carregando && !lista.dados) return <Carregando />;
  return <>
    <div className="filtros">
      <select value={cursoId || ''} onChange={(e) => setCursoId(e.target.value)} aria-label="Curso">{(lista.dados || []).map((c: any) => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
      {pode('cursos.editar') ? <button className="bt bt-tinta" onClick={() => setNovo({ titulo: '', subtitulo: '', certificado_pct: 70, cor: '#ff7a00' })}><Plus />Novo curso</button> : null}
    </div>
    {cursoId ? <Curso key={cursoId} id={cursoId} aoMudar={lista.recarregar} /> : <Vazio titulo="Nenhum curso ainda." />}
    <Modal titulo="Novo curso" aberto={!!novo} fechar={() => setNovo(null)} rodape={<><button className="bt bt-texto" onClick={() => setNovo(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !novo?.titulo.trim()} onClick={criar}><Plus />Criar</button></>}>
      {novo && <>
        <Campo rotulo="Título" valor={novo.titulo} mudar={(v) => setNovo({ ...novo, titulo: v })} />
        <Campo rotulo="Subtítulo" valor={novo.subtitulo} mudar={(v) => setNovo({ ...novo, subtitulo: v })} />
      </>}
    </Modal>
  </>;
}

function Curso({ id, aoMudar }: { id: string; aoMudar: () => void }) {
  const { pode } = useSessao();
  const { dados: d, erro, carregando, recarregar } = useCarregar(() => get(`/area/cursos/${id}`), [id]);
  const [cur, setCur] = useState<any>(null);
  const [mod, setMod] = useState<any>(null);
  const [aula, setAula] = useState<any>(null);
  const [arq, setArq] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const edita = pode('cursos.editar');
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !d) return <Carregando />;
  const c = d.curso;
  const aulasTodas = d.modulos.flatMap((m: any) => m.aulas);
  const leitura = c.marca?.tema === 'leitura';
  const semVideo = aulasTodas.filter((a: any) => a.tipo !== 'leitura' && !(a.video_bunny || a.video_panda));
  const pdfs = d.arquivos.filter((f: any) => f.tipo === 'pdf');

  const salvarCurso = () => rodar('curso', async () => {
    const marca = cur.m_dominio?.trim() ? { dominio: cur.m_dominio, nome: cur.m_nome, autores: cur.m_autores, whatsapp: cur.m_whatsapp, pdf_arquivo_id: cur.m_pdf || null, tema: c.marca?.tema || 'leitura', cor: c.marca?.cor || null } : null;
    await patch(`/area/cursos/${c.id}`, { titulo: cur.titulo, subtitulo: cur.subtitulo, descricao: cur.descricao, capa_url: cur.capa_url, trailer_url: cur.trailer_url, cor: cur.cor, certificado_pct: Number(cur.certificado_pct), status: cur.status, tags: String(cur.tags || '').split(',').map((t) => t.trim()).filter(Boolean), marca });
    setCur(null); recarregar(); aoMudar();
  }, 'Curso salvo.');
  const salvarModulo = () => rodar('modulo', async () => {
    const corpo = { titulo: mod.titulo, descricao: mod.descricao, secao_id: mod.secao_id || null, liberacao: mod.liberacao, liberar_dias: mod.liberacao === 'dias' ? Number(mod.liberar_dias) || 0 : null, liberar_em: mod.liberacao === 'data' ? doCampoData(mod.liberar_em) : null };
    if (mod.id) await patch(`/area/modulos/${mod.id}`, corpo); else await post('/area/modulos', { ...corpo, curso_id: c.id });
    setMod(null); recarregar();
  }, 'Módulo salvo.');
  const mover = (tabela: string, lista: any[], i: number, delta: number) => rodar(`ordem-${tabela}`, async () => {
    const ids = lista.map((x) => x.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await post(`/area/ordem/${tabela}`, { ids });
    recarregar();
  });

  return <>
    <Grupo titulo={<>{c.titulo} <Etiqueta cor={STATUS_CONTEUDO[c.status]?.cor}>{STATUS_CONTEUDO[c.status]?.t || c.status}</Etiqueta></>}
      acoes={edita ? <button className="bt bt-mini" onClick={() => setCur({ ...c, tags: (c.tags || []).join(', '), m_dominio: c.marca?.dominio || '', m_nome: c.marca?.nome || '', m_autores: c.marca?.autores || '', m_whatsapp: c.marca?.whatsapp || '', m_pdf: c.marca?.pdf_arquivo_id || '' })}>Editar o curso</button> : undefined}
      rodape={c.marca?.dominio ? `${aulasTodas.length} ${leitura ? 'dúvidas' : 'aulas'} · ${d.arquivos.length} arquivos · área própria em ${c.marca.dominio}${c.marca.pdf_arquivo_id ? ' · com PDF' : ' · sem PDF escolhido'}` : `${aulasTodas.length} aulas · ${d.arquivos.length} arquivos · certificado com ${c.certificado_pct}% · /cursos/${c.slug} na área do aluno`}>
      <p className="mudo" style={{ margin: 0 }}>{c.subtitulo || 'Sem subtítulo.'}</p>
    </Grupo>
    {semVideo.length ? <Faixa tipo="aviso">{semVideo.length} de {aulasTodas.length} aulas ainda sem vídeo. Sem ele, a aula mostra só o texto e os materiais.</Faixa> : null}

    {d.modulos.map((m: any, i: number) => (
      <Grupo key={m.id} titulo={`Módulo ${m.numero} · ${m.titulo}`} acoes={edita ? <div className="barra-acoes">
        <button className="bt-icone" aria-label="Subir módulo" onClick={() => mover('modulos', d.modulos, i, -1)}><ArrowUp /></button>
        <button className="bt-icone" aria-label="Descer módulo" onClick={() => mover('modulos', d.modulos, i, 1)}><ArrowDown /></button>
        <button className="bt bt-mini" onClick={() => setMod({ ...m, liberar_em: paraCampoData(m.liberar_em) })}>Editar</button>
        <button className="bt bt-mini bt-tinta" onClick={() => setAula(novaAula(m, leitura))}><Plus />{leitura ? 'Dúvida' : 'Aula'}</button>
      </div> : undefined}>
        {m.liberacao !== 'imediata' ? <p className="mudo" style={{ margin: '0 0 8px', padding: '0 18px' }}>Libera {m.liberacao === 'dias' ? `${m.liberar_dias} dias depois da compra` : `em ${new Date(m.liberar_em).toLocaleDateString('pt-BR')}`}</p> : null}
        {m.aulas.length ? m.aulas.map((a: any, k: number) => (
          <div key={a.id} className="linha-com-setas">
            {edita ? <span className="setas"><button className="bt-icone" aria-label="Subir" onClick={() => mover('aulas', m.aulas, k, -1)}><ArrowUp /></button><button className="bt-icone" aria-label="Descer" onClick={() => mover('aulas', m.aulas, k, 1)}><ArrowDown /></button></span> : null}
            <Celula onClick={edita ? () => setAula(abrirAula(a)) : undefined} titulo={`${a.codigo} · ${a.titulo}`}
              sub={a.tipo === 'leitura'
                ? ['leitura', a.corpo?.minutos ? `${a.corpo.minutos} min` : null, (a.corpo?.biblia || []).length ? `${a.corpo.biblia.length} versículos` : null, (a.corpo?.e_se || []).length ? `${a.corpo.e_se.length} "e se"` : null, a.video_bunny ? 'com vídeo' : null].filter(Boolean).join(' · ')
                : [a.duracao_s ? mmss(a.duracao_s) : null, a.video_bunny ? 'vídeo no Bunny' : a.video_panda ? 'vídeo no Panda' : null, (a.marcadores || []).length ? `${a.marcadores.length} marcadores` : null, (a.pausas || []).length ? `${a.pausas.length} pausas` : null, (a.faca_agora || []).length ? `${a.faca_agora.length} passos` : null, a.gratis ? 'grátis' : null].filter(Boolean).join(' · ')}
              direita={<>{a.tipo !== 'leitura' && !(a.video_bunny || a.video_panda) ? <Etiqueta cor="ambar">Sem vídeo</Etiqueta> : null}{a.status !== 'publicado' ? <Etiqueta cor={STATUS_CONTEUDO[a.status]?.cor}>{STATUS_CONTEUDO[a.status]?.t || a.status}</Etiqueta> : null}</>} />
          </div>
        )) : <p className="mudo" style={{ padding: '0 18px' }}>Sem aulas ainda.</p>}
      </Grupo>
    ))}
    {edita ? <div className="barra-acoes" style={{ marginBottom: 18 }}><button className="bt" onClick={() => setMod({ titulo: '', descricao: '', liberacao: 'imediata', liberar_dias: '', liberar_em: '', secao_id: '' })}><Plus />Novo módulo</button></div> : null}

    <Grupo titulo="Arquivos do curso" acoes={edita ? <button className="bt bt-mini bt-tinta" onClick={() => setArq({ nome: '', tipo: 'guia', o_que: '', quando: '', como: '', tempo: '', previa: '', versao: '', aula_id: '', origem: 'storage', link: '', recompensa: false })}><FilePlus2 />Arquivo</button> : undefined}
      rodape="Os arquivos ficam num bucket privado: o aluno baixa por um link que vence em 10 minutos. Google Docs, Planilhas e Apresentações ganham &quot;Fazer cópia no meu Drive&quot;.">
      {d.arquivos.length ? d.arquivos.map((f: any) => (
        <Celula key={f.id} onClick={edita ? () => setArq({ ...f, como: (f.como || []).join('\n'), aula_id: f.aula_id || '' }) : undefined} titulo={f.nome}
          sub={`${f.tipo} · ${f.origem === 'storage' ? 'arquivo' : f.origem === 'drive' ? 'Google Drive' : 'link'}${f.aula_id ? ` · aula ${(aulasTodas.find((a: any) => a.id === f.aula_id) || {}).codigo || ''}` : ' · biblioteca do curso'} · ${f.downloads} downloads`}
          direita={f.recompensa ? <Etiqueta cor="ambar">Presente do depoimento</Etiqueta> : undefined} />
      )) : <Vazio titulo="Nenhum arquivo ainda." />}
    </Grupo>

    <Modal titulo="Editar o curso" aberto={!!cur} fechar={() => setCur(null)} rodape={<><button className="bt bt-texto" onClick={() => setCur(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvarCurso}><Save />Salvar</button></>}>
      {cur && <>
        <Campo rotulo="Título" valor={cur.titulo} mudar={(v) => setCur({ ...cur, titulo: v })} />
        <Campo rotulo="Subtítulo" valor={cur.subtitulo || ''} mudar={(v) => setCur({ ...cur, subtitulo: v })} />
        <AreaTexto rotulo="Sobre o curso" valor={cur.descricao || ''} mudar={(v) => setCur({ ...cur, descricao: v })} linhas={5} />
        <div className="campos-lado">
          <Campo rotulo="Capa (endereço da imagem)" valor={cur.capa_url || ''} mudar={(v) => setCur({ ...cur, capa_url: v })} />
          <Campo rotulo="Cor do pôster" tipo="color" valor={cur.cor || '#ff7a00'} mudar={(v) => setCur({ ...cur, cor: v })} />
        </div>
        <div className="campos-lado">
          <Campo rotulo="Certificado com (%)" tipo="number" min={1} max={100} valor={cur.certificado_pct} mudar={(v) => setCur({ ...cur, certificado_pct: v })} />
          <Escolha rotulo="Situação" valor={cur.status} mudar={(v) => setCur({ ...cur, status: v })} opcoes={SITUACAO} />
        </div>
        <Campo rotulo="Temas (tags)" valor={cur.tags} mudar={(v) => setCur({ ...cur, tags: v })} dica="Separados por vírgula. A oferta pelo tema da aula usa estes temas." />
        <h3 className="sub-titulo">Área própria (marca e endereço)</h3>
        <Faixa tipo="info">Com um endereço aqui, o curso abre com a cara dele (área, checkout, obrigado e e-mails) e sai da vitrine da Setup. O endereço novo só abre depois de entrar no Worker (wrangler.jsonc) e do deploy.</Faixa>
        <div className="campos-lado">
          <Campo rotulo="Endereço" valor={cur.m_dominio} mudar={(v) => setCur({ ...cur, m_dominio: v })} placeholder="nome.agenciasetup.com.br" mono />
          <Campo rotulo="Nome da marca" valor={cur.m_nome} mudar={(v) => setCur({ ...cur, m_nome: v })} placeholder={cur.titulo} />
        </div>
        <div className="campos-lado">
          <Campo rotulo="Quem assina" valor={cur.m_autores} mudar={(v) => setCur({ ...cur, m_autores: v })} placeholder="Filipe e Raquel" />
          <Campo rotulo="WhatsApp de ajuda" valor={cur.m_whatsapp} mudar={(v) => setCur({ ...cur, m_whatsapp: v })} placeholder="5511999999999" mono dica="Com 55 e DDD. Aparece na área, no obrigado e nos e-mails." />
        </div>
        <Escolha rotulo="PDF do curso (vai no e-mail e no obrigado)" valor={cur.m_pdf} mudar={(v) => setCur({ ...cur, m_pdf: v })} opcoes={[{ v: '', t: pdfs.length ? 'Sem PDF' : 'Nenhum arquivo PDF no curso ainda' }, ...pdfs.map((f: any) => ({ v: f.id, t: f.nome }))]} />
      </>}
    </Modal>

    <Modal titulo={mod?.id ? `Módulo ${mod.numero}` : 'Novo módulo'} aberto={!!mod} fechar={() => setMod(null)} rodape={<><button className="bt bt-texto" onClick={() => setMod(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !mod?.titulo?.trim()} onClick={salvarModulo}><Save />Salvar</button></>}>
      {mod && <>
        <Campo rotulo="Título" valor={mod.titulo} mudar={(v) => setMod({ ...mod, titulo: v })} />
        <AreaTexto rotulo="Descrição (opcional)" valor={mod.descricao || ''} mudar={(v) => setMod({ ...mod, descricao: v })} linhas={2} />
        {d.secoes.length ? <Escolha rotulo="Seção" valor={mod.secao_id || ''} mudar={(v) => setMod({ ...mod, secao_id: v })} opcoes={[{ v: '', t: 'Sem seção' }, ...d.secoes.map((s: any) => ({ v: s.id, t: s.titulo }))]} /> : null}
        <Escolha rotulo="Liberação" valor={mod.liberacao} mudar={(v) => setMod({ ...mod, liberacao: v })} opcoes={[{ v: 'imediata', t: 'Na hora da compra' }, { v: 'dias', t: 'X dias depois da compra' }, { v: 'data', t: 'Numa data' }]} />
        {mod.liberacao === 'dias' ? <Campo rotulo="Dias depois da compra" tipo="number" min={0} valor={mod.liberar_dias || ''} mudar={(v) => setMod({ ...mod, liberar_dias: v })} /> : null}
        {mod.liberacao === 'data' ? <Campo rotulo="Libera em" tipo="datetime-local" valor={mod.liberar_em || ''} mudar={(v) => setMod({ ...mod, liberar_em: v })} /> : null}
      </>}
    </Modal>

    {aula ? <AulaModal aula={aula} setAula={setAula} modulos={d.modulos} arquivos={d.arquivos} aoSalvar={() => { setAula(null); recarregar(); }} /> : null}
    {arq ? <ArquivoModal arq={arq} setArq={setArq} curso={c} aulas={aulasTodas} aoSalvar={() => { setArq(null); recarregar(); }} /> : null}
  </>;
}

const CORPO_VAZIO = { minutos: 3, resposta: '', explicacaoTexto: '', biblia: [], igreja: [], diga: '', e_se: [], guardar: '', imagem: { url: '', alt: '', legenda: '' } };
const novaAula = (m: any, leitura = false) => ({ modulo_id: m.id, titulo: '', codigo: '', status: 'rascunho', gratis: false, video_bunny: '', video_panda: '', duracao: '', abertura: '', final: '', capa_url: '', descricao: '', resumo: '', tags: '', marcadores: [], pausas: [], faca_agora: [], tipo: leitura ? 'leitura' : 'video', corpo: leitura ? { ...CORPO_VAZIO } : null });
const abrirAula = (a: any) => ({
  ...a, duracao: mmss(a.duracao_s), abertura: mmss(a.abertura_fim_s), final: mmss(a.final_inicio_s), tags: (a.tags || []).join(', '),
  corpo: a.tipo === 'leitura' ? { ...CORPO_VAZIO, ...(a.corpo || {}), explicacaoTexto: (a.corpo?.explicacao || []).join('\n\n'), imagem: { url: '', alt: '', legenda: '', ...(a.corpo?.imagem || {}) } } : null,
  marcadores: (a.marcadores || []).map((m: any) => ({ ...m, t: mmss(m.s), tipo: m.tipo || 'assunto' })), pausas: (a.pausas || []).map((p: any) => ({ ...p, t: mmss(p.s) })),
  faca_agora: (a.faca_agora || []).map((p: any) => ({ ...p, acoes: (p.acoes || []).join(', ') })),
});

// O texto da dúvida no formato que o app e o livro usam: a explicação vira parágrafos (separados por uma linha em branco).
function corpoParaSalvar(c: any) {
  const { explicacaoTexto, ...resto } = c;
  return { ...resto, explicacao: String(explicacaoTexto || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), imagem: c.imagem?.url ? c.imagem : null };
}

function CorpoLeitura({ aula, setAula }: { aula: any; setAula: (a: any) => void }) {
  const c = aula.corpo;
  const muda = (k: string, v: any) => setAula({ ...aula, corpo: { ...c, [k]: v } });
  const item = (k: string, i: number, campo: string, v: any) => muda(k, c[k].map((x: any, j: number) => (j === i ? { ...x, [campo]: v } : x)));
  const tira = (k: string, i: number) => muda(k, c[k].filter((_: any, j: number) => j !== i));
  return <>
    <h3 className="sub-titulo">A dúvida</h3>
    <Faixa tipo="info">Frases curtas e palavras simples: quem lê pode ter dificuldade. Versículo e citação da Igreja sempre literais, com a referência. Sem travessão.</Faixa>
    <AreaTexto rotulo="Resposta rápida" valor={c.resposta} mudar={(v) => muda('resposta', v)} linhas={3} dica="2 ou 3 frases que respondem direto. Também aparece na lista." />
    <AreaTexto rotulo="Explicando com calma" valor={c.explicacaoTexto} mudar={(v) => muda('explicacaoTexto', v)} linhas={10} dica="Um parágrafo por bloco, separados por uma linha em branco. Use aspas retas para citar; o app troca pelas curvas." />
    <h3 className="sub-titulo">Na Bíblia</h3>
    {c.biblia.map((v: any, i: number) => (
      <div key={i} className="caixa-sub">
        <AreaTexto rotulo="Versículo (literal)" valor={v.texto || ''} mudar={(t) => item('biblia', i, 'texto', t)} linhas={2} />
        <div className="linha-lista"><input className="curto" value={v.ref || ''} onChange={(e) => item('biblia', i, 'ref', e.target.value)} placeholder="Jo 20,23" aria-label="Referência" /><input value={v.nota || ''} onChange={(e) => item('biblia', i, 'nota', e.target.value)} placeholder="Nota curta (opcional)" aria-label="Nota" /><button className="bt-icone" aria-label="Tirar" onClick={() => tira('biblia', i)}><Trash2 /></button></div>
      </div>
    ))}
    <button className="bt bt-mini" onClick={() => muda('biblia', [...c.biblia, { texto: '', ref: '', nota: '' }])}><Plus />Versículo</button>
    <h3 className="sub-titulo">A Igreja ensina</h3>
    {c.igreja.map((v: any, i: number) => (
      <div key={i} className="caixa-sub">
        <AreaTexto rotulo="Citação (literal)" valor={v.texto || ''} mudar={(t) => item('igreja', i, 'texto', t)} linhas={2} />
        <div className="linha-lista"><input value={v.doc || ''} onChange={(e) => item('igreja', i, 'doc', e.target.value)} placeholder="Catecismo da Igreja Católica" aria-label="Documento" /><input className="curto" value={v.numero || ''} onChange={(e) => item('igreja', i, 'numero', e.target.value)} placeholder="n. 1466" aria-label="Número" /><button className="bt-icone" aria-label="Tirar" onClick={() => tira('igreja', i)}><Trash2 /></button></div>
        <Campo rotulo="Link oficial (vatican.va)" valor={v.url || ''} mudar={(t) => item('igreja', i, 'url', t)} mono />
      </div>
    ))}
    <button className="bt bt-mini" onClick={() => muda('igreja', [...c.igreja, { texto: '', doc: 'Catecismo da Igreja Católica', numero: '', url: '' }])}><Plus />Citação</button>
    <h3 className="sub-titulo">Na conversa</h3>
    <AreaTexto rotulo="Se alguém te perguntar, diga" valor={c.diga} mudar={(v) => muda('diga', v)} linhas={3} dica="2 ou 3 frases calmas, com uma referência escrita por extenso (ex.: João 20,23)." />
    {c.e_se.map((e: any, i: number) => (
      <div key={i} className="caixa-sub">
        <div className="linha-lista"><input value={e.pergunta || ''} onChange={(ev) => item('e_se', i, 'pergunta', ev.target.value)} placeholder='E se disserem: "..."?' aria-label="Pergunta" /><button className="bt-icone" aria-label="Tirar" onClick={() => tira('e_se', i)}><Trash2 /></button></div>
        <AreaTexto rotulo="Resposta" valor={e.resposta || ''} mudar={(t) => item('e_se', i, 'resposta', t)} linhas={2} />
      </div>
    ))}
    <button className="bt bt-mini" onClick={() => muda('e_se', [...c.e_se, { pergunta: '', resposta: '' }])}><Plus />"E se a conversa continuar?"</button>
    <Campo rotulo="Para guardar" valor={c.guardar} mudar={(v) => muda('guardar', v)} dica="Uma frase curta para lembrar." />
    <h3 className="sub-titulo">Imagem e tempo</h3>
    <Campo rotulo="Imagem (endereço)" valor={c.imagem.url} mudar={(v) => muda('imagem', { ...c.imagem, url: v })} mono />
    <div className="campos-lado">
      <Campo rotulo="Texto alternativo" valor={c.imagem.alt} mudar={(v) => muda('imagem', { ...c.imagem, alt: v })} />
      <Campo rotulo="Minutos de leitura" tipo="number" min={1} max={30} valor={c.minutos} mudar={(v) => muda('minutos', Number(v) || 3)} />
    </div>
    <Campo rotulo="Legenda da imagem" valor={c.imagem.legenda} mudar={(v) => muda('imagem', { ...c.imagem, legenda: v })} dica='Imagem feita com IA leva "Imagem feita com IA" na legenda.' />
    <h3 className="sub-titulo">Vídeo (opcional)</h3>
    <Campo rotulo="Vídeo do Bunny (id)" valor={aula.video_bunny || ''} mudar={(v) => setAula({ ...aula, video_bunny: v })} mono dica="Quando houver, aparece em cima da dúvida, com o texto embaixo." />
  </>;
}

function AulaModal({ aula, setAula, modulos, arquivos, aoSalvar }: { aula: any; setAula: (a: any) => void; modulos: any[]; arquivos: any[]; aoSalvar: () => void }) {
  const { ocupado, rodar } = useAcao();
  const [nota, setNota] = useState('');
  const lista = (k: string, i: number, campo: string, v: any) => setAula({ ...aula, [k]: aula[k].map((x: any, j: number) => (j === i ? { ...x, [campo]: v } : x)) });
  const tirar = (k: string, i: number) => setAula({ ...aula, [k]: aula[k].filter((_: any, j: number) => j !== i) });
  const salvar = () => rodar('aula', async () => {
    const corpo = {
      titulo: aula.titulo, codigo: aula.codigo || undefined, status: aula.status, gratis: aula.gratis, video_bunny: aula.video_bunny, video_panda: aula.video_panda, modulo_id: aula.modulo_id,
      duracao_s: aula.duracao ? seg(aula.duracao) : null, abertura_fim_s: aula.abertura ? seg(aula.abertura) : null, final_inicio_s: aula.final ? seg(aula.final) : null,
      capa_url: aula.capa_url, previa_url: aula.previa_url || null, descricao: aula.descricao, resumo: aula.resumo, tags: String(aula.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      marcadores: aula.marcadores.map((m: any) => ({ s: seg(m.t), titulo: m.titulo, tipo: m.tipo === 'oferta' ? 'oferta' : undefined, link: m.link || undefined, texto: m.texto || undefined })),
      pausas: aula.pausas.map((p: any) => ({ s: seg(p.t), texto: p.texto })),
      faca_agora: aula.faca_agora.map((p: any) => ({ titulo: p.titulo, texto: p.texto, prompt: p.prompt, acoes: p.acoes })),
      ...(aula.tipo === 'leitura' ? { tipo: 'leitura', corpo: corpoParaSalvar(aula.corpo) } : {}),
    };
    if (aula.id) await put(`/area/aulas/${aula.id}`, corpo); else await post('/area/aulas', corpo);
    aoSalvar();
  }, 'Aula salva.');
  const atualizada = () => rodar('atualizada', async () => { const r = await post(`/area/aulas/${aula.id}/atualizada`, { nota }); setNota(''); return r; }, 'Marcada como atualizada. Quem já tinha visto recebe o aviso no sino.');
  return (
    <Modal titulo={aula.tipo === 'leitura' ? (aula.id ? `Dúvida ${aula.codigo}` : 'Nova dúvida') : aula.id ? `Aula ${aula.codigo}` : 'Nova aula'} aberto fechar={() => setAula(null)} rodape={<><button className="bt bt-texto" onClick={() => setAula(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !aula.titulo?.trim()} onClick={salvar}><Save />Salvar</button></>}>
      <Campo rotulo="Título" valor={aula.titulo} mudar={(v) => setAula({ ...aula, titulo: v })} />
      <div className="campos-lado">
        <Campo rotulo="Código" valor={aula.codigo || ''} mudar={(v) => setAula({ ...aula, codigo: v })} placeholder="Ex.: 2.3" />
        <Escolha rotulo="Módulo" valor={aula.modulo_id} mudar={(v) => setAula({ ...aula, modulo_id: v })} opcoes={modulos.map((m) => ({ v: m.id, t: `Módulo ${m.numero} · ${m.titulo}` }))} />
      </div>
      <div className="campos-lado">
        <Escolha rotulo="Situação" valor={aula.status} mudar={(v) => setAula({ ...aula, status: v })} opcoes={SITUACAO} />
        <Marcar rotulo="Aula grátis (amostra)" valor={!!aula.gratis} mudar={(v) => setAula({ ...aula, gratis: v })} />
      </div>
      {aula.tipo === 'leitura' ? <CorpoLeitura aula={aula} setAula={setAula} /> : <>
      <h3 className="sub-titulo">Vídeo</h3>
      <div className="campos-lado">
        <Campo rotulo="Vídeo do Bunny (id)" valor={aula.video_bunny || ''} mudar={(v) => setAula({ ...aula, video_bunny: v })} mono dica="Tem a vez quando o Bunny está ligado." />
        <Campo rotulo="Vídeo do Panda (id)" valor={aula.video_panda || ''} mudar={(v) => setAula({ ...aula, video_panda: v })} mono />
      </div>
      <div className="campos-lado">
        <Campo rotulo="Duração (m:ss)" valor={aula.duracao} mudar={(v) => setAula({ ...aula, duracao: v })} placeholder="6:07" />
        <Campo rotulo="Capa (endereço)" valor={aula.capa_url || ''} mudar={(v) => setAula({ ...aula, capa_url: v })} />
      </div>
      <div className="campos-lado">
        <Campo rotulo="Prévia em vídeo (endereço)" valor={aula.previa_url || ''} mudar={(v) => setAula({ ...aula, previa_url: v })} dica="8 s sem som, toca no fundo do destaque do início. O scripts/previas.mjs faz e sobe." />
      </div>
      <div className="campos-lado">
        <Campo rotulo="Abertura termina em (m:ss)" valor={aula.abertura} mudar={(v) => setAula({ ...aula, abertura: v })} dica="Botão Pular abertura até aqui." />
        <Campo rotulo="Final começa em (m:ss)" valor={aula.final} mudar={(v) => setAula({ ...aula, final: v })} dica="Daqui em diante, Próxima aula." />
      </div>

      <h3 className="sub-titulo">Marcadores no vídeo</h3>
      {aula.marcadores.map((m: any, i: number) => (
        <div key={i} className="linha-lista">
          <input className="curto" value={m.t} onChange={(e) => lista('marcadores', i, 't', e.target.value)} placeholder="m:ss" aria-label="Minuto" />
          <select value={m.tipo} onChange={(e) => lista('marcadores', i, 'tipo', e.target.value)} aria-label="Tipo"><option value="assunto">Assunto</option><option value="oferta">Oferta</option></select>
          <input value={m.titulo || ''} onChange={(e) => lista('marcadores', i, 'titulo', e.target.value)} placeholder={m.tipo === 'oferta' ? 'Nome do produto' : 'Assunto'} aria-label="Título" />
          {m.tipo === 'oferta' ? <input value={m.link || ''} onChange={(e) => lista('marcadores', i, 'link', e.target.value)} placeholder="https://agenciasetup.com.br/checkout/..." aria-label="Link" /> : null}
          <button className="bt-icone" aria-label="Tirar" onClick={() => tirar('marcadores', i)}><Trash2 /></button>
        </div>
      ))}
      <button className="bt bt-mini" onClick={() => setAula({ ...aula, marcadores: [...aula.marcadores, { t: '', titulo: '', tipo: 'assunto' }] })}><Plus />Marcador</button>

      <h3 className="sub-titulo">Pausa prática</h3>
      {aula.pausas.map((p: any, i: number) => (
        <div key={i} className="linha-lista">
          <input className="curto" value={p.t} onChange={(e) => lista('pausas', i, 't', e.target.value)} placeholder="m:ss" aria-label="Minuto" />
          <input value={p.texto || ''} onChange={(e) => lista('pausas', i, 'texto', e.target.value)} placeholder='Agora faça no seu Claude: ...' aria-label="O que fazer" />
          <button className="bt-icone" aria-label="Tirar" onClick={() => tirar('pausas', i)}><Trash2 /></button>
        </div>
      ))}
      <button className="bt bt-mini" onClick={() => setAula({ ...aula, pausas: [...aula.pausas, { t: '', texto: '' }] })}><Plus />Pausa</button>

      <h3 className="sub-titulo">Faça agora</h3>
      {aula.faca_agora.map((p: any, i: number) => (
        <div key={i} className="caixa-sub">
          <div className="linha-lista"><input value={p.titulo || ''} onChange={(e) => lista('faca_agora', i, 'titulo', e.target.value)} placeholder={`Passo ${i + 1}`} aria-label="Título do passo" /><button className="bt-icone" aria-label="Tirar" onClick={() => tirar('faca_agora', i)}><Trash2 /></button></div>
          <AreaTexto rotulo="Texto" valor={p.texto || ''} mudar={(v) => lista('faca_agora', i, 'texto', v)} linhas={2} />
          <AreaTexto rotulo="Pedido pronto (prompt, opcional)" valor={p.prompt || ''} mudar={(v) => lista('faca_agora', i, 'prompt', v)} linhas={3} mono dica="Use [colchetes] para o que a pessoa troca." />
          <Campo rotulo="Botões" valor={p.acoes || ''} mudar={(v) => lista('faca_agora', i, 'acoes', v)} placeholder="copiar, claude, baixar:nome-do-arquivo.md" dica={`Arquivos: ${arquivos.slice(0, 4).map((f) => f.nome).join(', ')}${arquivos.length > 4 ? '...' : ''}`} />
        </div>
      ))}
      <button className="bt bt-mini" onClick={() => setAula({ ...aula, faca_agora: [...aula.faca_agora, { titulo: '', texto: '', prompt: '', acoes: 'copiar, claude' }] })}><Plus />Passo</button>

      <h3 className="sub-titulo">Textos</h3>
      <AreaTexto rotulo="Resumo de 1 minuto" valor={aula.resumo || ''} mudar={(v) => setAula({ ...aula, resumo: v })} linhas={3} />
      <AreaTexto rotulo="Descrição (opcional)" valor={aula.descricao || ''} mudar={(v) => setAula({ ...aula, descricao: v })} linhas={2} />
      <Campo rotulo="Temas (tags)" valor={aula.tags || ''} mudar={(v) => setAula({ ...aula, tags: v })} dica="A oferta 'Quer ir além?' aparece quando o tema casa com o de um produto." />
      </>}
      {aula.id ? <>
        <h3 className="sub-titulo">Curso vivo</h3>
        <Faixa tipo="info">Mudou o conteúdo da aula? Marque como atualizada: ela ganha o aviso "Atualizada" e quem já tinha visto recebe no sino.</Faixa>
        <Campo rotulo="O que mudou (vai no aviso)" valor={nota} mudar={setNota} />
        <button className="bt bt-mini" disabled={!!ocupado} onClick={atualizada}><Bell />Marcar como atualizada</button>
      </> : null}
    </Modal>
  );
}

function ArquivoModal({ arq, setArq, curso, aulas, aoSalvar }: { arq: any; setArq: (a: any) => void; curso: any; aulas: any[]; aoSalvar: () => void }) {
  const { ocupado, rodar } = useAcao();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const salvar = () => rodar('arquivo', async () => {
    let enviado: any = null;
    if (arq.origem === 'storage' && arquivo) {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      enviado = await api(`/area/cursos/${curso.id}/arquivo`, { metodo: 'POST', form: fd });
    }
    const corpo = {
      nome: arq.nome || (enviado && enviado.nome), tipo: arq.tipo, o_que: arq.o_que, quando: arq.quando, como: arq.como, tempo: arq.tempo, previa: arq.previa, versao: arq.versao,
      aula_id: arq.aula_id || null, origem: arq.origem, link: arq.origem === 'storage' ? null : arq.link, recompensa: arq.recompensa,
      ...(enviado ? { caminho: enviado.caminho, bytes: enviado.bytes } : {}),
    };
    if (arq.id) await patch(`/area/arquivos/${arq.id}`, corpo); else await post('/area/arquivos', { ...corpo, curso_id: curso.id });
    aoSalvar();
  }, 'Arquivo salvo.');
  const remover = () => rodar('remover', async () => { await post(`/area/arquivos/${arq.id}/remover`); aoSalvar(); }, 'Arquivo tirado do curso.');
  return (
    <Modal titulo={arq.id ? arq.nome : 'Novo arquivo'} aberto fechar={() => setArq(null)}
      rodape={<>{arq.id ? <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={remover}><Trash2 />Tirar do curso</button> : null}<button className="bt bt-tinta" disabled={!!ocupado || (!arq.id && arq.origem === 'storage' && !arquivo) || (arq.origem !== 'storage' && !arq.link)} onClick={salvar}><Save />Salvar</button></>}>
      <Escolha rotulo="De onde vem" valor={arq.origem} mudar={(v) => setArq({ ...arq, origem: v })} opcoes={[{ v: 'storage', t: 'Arquivo enviado (bucket privado)' }, { v: 'drive', t: 'Google Docs, Planilhas ou Slides (cópia no Drive)' }, { v: 'link', t: 'Link' }]} />
      {arq.origem === 'storage' ? (
        <div className="campo"><label>Arquivo</label><label className="bt bt-mini" style={{ justifySelf: 'start' }}><Upload />{arquivo ? arquivo.name : arq.caminho ? 'Trocar o arquivo' : 'Escolher o arquivo'}<input type="file" hidden onChange={(e) => setArquivo(e.target.files ? e.target.files[0] : null)} /></label>{arq.caminho ? <p className="campo-dica">Atual: {arq.caminho}</p> : null}</div>
      ) : <Campo rotulo="Link" valor={arq.link || ''} mudar={(v) => setArq({ ...arq, link: v })} placeholder="https://docs.google.com/document/d/.../edit" dica={arq.origem === 'drive' ? 'Compartilhe como "qualquer pessoa com o link pode ver". O aluno ganha a própria cópia.' : undefined} />}
      <div className="campos-lado">
        <Campo rotulo="Nome" valor={arq.nome} mudar={(v) => setArq({ ...arq, nome: v })} />
        <Escolha rotulo="Tipo" valor={arq.tipo} mudar={(v) => setArq({ ...arq, tipo: v })} opcoes={TIPOS_ARQ} />
      </div>
      <Escolha rotulo="Aula" valor={arq.aula_id} mudar={(v) => setArq({ ...arq, aula_id: v })} opcoes={[{ v: '', t: 'Só na biblioteca do curso' }, ...aulas.map((a) => ({ v: a.id, t: `${a.codigo} · ${a.titulo}` }))]} />
      <h3 className="sub-titulo">Ficha</h3>
      <Campo rotulo="O que é (1 frase)" valor={arq.o_que || ''} mudar={(v) => setArq({ ...arq, o_que: v })} />
      <Campo rotulo="Quando usar" valor={arq.quando || ''} mudar={(v) => setArq({ ...arq, quando: v })} />
      <AreaTexto rotulo="Como usar (um passo por linha)" valor={arq.como || ''} mudar={(v) => setArq({ ...arq, como: v })} linhas={4} />
      <div className="campos-lado">
        <Campo rotulo="Tempo" valor={arq.tempo || ''} mudar={(v) => setArq({ ...arq, tempo: v })} placeholder="10 min" />
        <Campo rotulo="Versão" valor={arq.versao || ''} mudar={(v) => setArq({ ...arq, versao: v })} placeholder="v2, 20/10/2026" />
      </div>
      <AreaTexto rotulo="Prévia (primeiras linhas)" valor={arq.previa || ''} mudar={(v) => setArq({ ...arq, previa: v })} linhas={3} mono />
      <Marcar rotulo="Presente do depoimento" valor={!!arq.recompensa} mudar={(v) => setArq({ ...arq, recompensa: v })} dica="Só aparece para quem contou como foi o curso (depois de 50%)." />
    </Modal>
  );
}

// ---------------------------------------------------------------- trilhas
export function Trilhas() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/trilhas'), []);
  const cursos = useCarregar(() => get('/area/cursos'), []);
  const [t, setT] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const opcoes = ((cursos.dados as any[]) || []).flatMap((c: any) => [
    { v: `curso:${c.id}`, t: `Curso: ${c.titulo}` },
    ...c.modulos.flatMap((m: any) => [{ v: `modulo:${m.id}`, t: `  Módulo ${m.numero}: ${m.titulo}` }, ...m.aulas.map((a: any) => ({ v: `aula:${a.id}`, t: `    Aula ${a.codigo}: ${a.titulo}` }))]),
  ]);
  const salvar = () => rodar('trilha', async () => {
    const corpo = { titulo: t.titulo, descricao: t.descricao, objetivo: t.objetivo || null, ativa: t.ativa, itens: t.itens.filter((i: any) => i.ref).map((i: any) => { const [tipo, idv] = i.ref.split(':'); return { tipo, id: idv, titulo: i.titulo || (opcoes.find((o) => o.v === i.ref) || { t: '' }).t.trim().replace(/^(Curso|Módulo \d+|Aula [\d.]+): /, '') }; }) };
    if (t.id) await patch(`/area/trilhas/${t.id}`, corpo); else await post('/area/trilhas', corpo);
    setT(null); recarregar();
  }, 'Trilha salva.');
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !dados) return <Carregando />;
  return <>
    {pode('cursos.editar') ? <div className="barra-acoes" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => setT({ titulo: '', descricao: '', objetivo: '', ativa: true, itens: [] })}><Plus />Nova trilha</button></div> : null}
    {dados?.length ? <Grupo>{dados.map((x: any) => <Celula key={x.id} titulo={x.titulo} sub={`${x.itens.length} passos${x.objetivo ? ` · para quem quer: ${OBJ[x.objetivo] || x.objetivo}` : ' · padrão'}`} direita={x.ativa ? <Etiqueta cor="verde">Ativa</Etiqueta> : <Etiqueta>Desligada</Etiqueta>} onClick={pode('cursos.editar') ? () => setT({ ...x, itens: x.itens.map((i: any) => ({ ref: `${i.tipo}:${i.id}`, titulo: i.titulo })) }) : undefined} />)}</Grupo>
      : <Vazio titulo="Nenhuma trilha ainda." texto="Trilha junta pedaços de vários cursos num caminho. O aluno vê a trilha do objetivo que escolheu nas boas-vindas." />}
    <Modal titulo={t?.id ? t.titulo : 'Nova trilha'} aberto={!!t} fechar={() => setT(null)} rodape={<><button className="bt bt-texto" onClick={() => setT(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !t?.titulo?.trim()} onClick={salvar}><Save />Salvar</button></>}>
      {t && <>
        <Campo rotulo="Título" valor={t.titulo} mudar={(v) => setT({ ...t, titulo: v })} placeholder="Do zero ao post automático" />
        <AreaTexto rotulo="Descrição" valor={t.descricao || ''} mudar={(v) => setT({ ...t, descricao: v })} linhas={2} />
        <Escolha rotulo="Para quem tem o objetivo" valor={t.objetivo || ''} mudar={(v) => setT({ ...t, objetivo: v })} opcoes={[{ v: '', t: 'Todos (trilha padrão)' }, ...Object.entries(OBJ).map(([v, tt]) => ({ v, t: tt }))]} />
        <h3 className="sub-titulo">Passos</h3>
        {t.itens.map((i: any, k: number) => (
          <div key={k} className="linha-lista">
            <select value={i.ref} onChange={(e) => setT({ ...t, itens: t.itens.map((y: any, j: number) => (j === k ? { ...y, ref: e.target.value } : y)) })} aria-label="Passo"><option value="">Escolha</option>{opcoes.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select>
            <input value={i.titulo || ''} onChange={(e) => setT({ ...t, itens: t.itens.map((y: any, j: number) => (j === k ? { ...y, titulo: e.target.value } : y)) })} placeholder="Nome do passo (opcional)" aria-label="Nome" />
            <button className="bt-icone" aria-label="Tirar" onClick={() => setT({ ...t, itens: t.itens.filter((_: any, j: number) => j !== k) })}><Trash2 /></button>
          </div>
        ))}
        <button className="bt bt-mini" onClick={() => setT({ ...t, itens: [...t.itens, { ref: '', titulo: '' }] })}><Plus />Passo</button>
        <Marcar rotulo="Ativa" valor={t.ativa} mudar={(v) => setT({ ...t, ativa: v })} />
      </>}
    </Modal>
  </>;
}
const OBJ: Record<string, string> = { automatizar: 'Automatizar os meus posts', clientes: 'Atender mais clientes com IA', design: 'Fazer design melhor com IA', comecar: 'Começar do zero na área' };
