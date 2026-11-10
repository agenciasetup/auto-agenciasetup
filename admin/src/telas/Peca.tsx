// Uma peça da fila: legenda, roteiro, slides e mídias editáveis; aprovar, agendar, publicar agora, cancelar.
// O perfil da peça (Brasil ou Inglês) fica no topo: ele decide por qual conta a peça sai.
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarClock, CheckCircle2, ExternalLink, ImagePlus, Plus, RotateCcw, Save, Send, Trash2, XCircle } from 'lucide-react';
import { enviarArquivo, get, patch, post } from '../nucleo/api';
import { Link, guardarSaida } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, PERFIS, dataHora, doCampoData, paraCampoData, perfilDe } from '../nucleo/util';
import { EtiquetaPeca, EtiquetaPerfil, NomeRede } from './comum';
import { OpcoesInstagram } from './postComum';

const EDITAVEL = ['rascunho', 'aprovado', 'erro'];
// Recusar pede o porquê (pedido do dono em 10/11/2026): o motivo vira lição no caderno do time (worker/lib/recusas.js).
const PARTES = [{ v: 'texto', t: 'O texto' }, { v: 'imagem', t: 'A imagem' }, { v: 'os_dois', t: 'Os dois' }];
const NOME_PARTE: Record<string, string> = { texto: 'o texto', imagem: 'a imagem', os_dois: 'o texto e a imagem' };

export default function Peca({ params }: { params: { id: string } }) {
  const { pode } = useSessao();
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/pecas/${params.id}`), [params.id]);
  const [form, setForm] = useState<any>(null);
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState('');
  const [recusa, setRecusa] = useState<{ motivo: string; parte: string } | null>(null);
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    if (!dados) return;
    document.title = `${dados.titulo || 'Peça'} | Painel Agência Setup`;
    setForm({
      titulo: dados.titulo || '', legenda: dados.legenda || '', roteiro: dados.roteiro || '',
      slides: Array.isArray(dados.slides) ? dados.slides.map((s: any) => ({ ...s })) : [],
      midias: Array.isArray(dados.midias) ? dados.midias.map((m: any) => ({ ...m })) : [],
      conexao_id: dados.conexao_id || '',
      opcoes: dados.opcoes || {},
      perfil: dados.perfil || 'br',
    });
  }, [dados]);

  const original = useMemo(() => dados && JSON.stringify({
    titulo: dados.titulo || '', legenda: dados.legenda || '', roteiro: dados.roteiro || '', slides: dados.slides || [], midias: dados.midias || [], conexao_id: dados.conexao_id || '', opcoes: dados.opcoes || {},
    perfil: dados.perfil || 'br',
  }), [dados]);
  const mudou = !!form && JSON.stringify(form) !== original;
  useEffect(() => guardarSaida(() => (mudou ? 'Há alterações não salvas nesta peça. Sair mesmo assim?' : null)), [mudou]);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if (carregando && !dados || !form) return <div className="tela"><Carregando /></div>;

  const p = dados;
  const podeEditar = pode('pecas.editar') && EDITAVEL.includes(p.status);
  const podeAprovar = pode('pecas.aprovar');
  // Só as contas do perfil da peça: a peça do Brasil nunca sai pela conta em inglês, nem o contrário.
  const contas = (p.rede?.conexoes || []).filter((c: any) => c.status === 'ativa' && (c.perfil || 'br') === (form.perfil || 'br'));
  const conectada = contas.length > 0;
  const nomePerfil = perfilDe(form.perfil).t;
  const mudar = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mudarSlide = (i: number, k: string, v: any) => setForm((f: any) => ({ ...f, slides: f.slides.map((s: any, j: number) => (j === i ? { ...s, [k]: v } : s)) }));
  const moverSlide = (i: number, d: number) => setForm((f: any) => {
    const s = [...f.slides]; const j = i + d;
    if (j < 0 || j >= s.length) return f;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...f, slides: s };
  });

  const salvar = () => rodar('salvar', async () => {
    const corpo = { ...form, conexao_id: form.conexao_id || null };
    const r = await patch(`/pecas/${p.id}`, corpo);
    setDados({ ...p, ...r });
  }, 'Peça salva.');

  // Antes de mudar a situação, salva o que foi editado.
  const acao = (nome: string, caminho: string, corpo: any = {}, ok?: string) => rodar(nome, async () => {
    if (mudou && podeEditar) await patch(`/pecas/${p.id}`, { ...form, conexao_id: form.conexao_id || null });
    const r = await post(`/pecas/${p.id}/${caminho}`, corpo);
    setDados({ ...p, ...r });
  }, ok);

  // Recusar: salva o que foi editado, grava o motivo e fecha a pergunta só se deu certo.
  const recusar = () => recusa && rodar('cancelar', async () => {
    if (mudou && podeEditar) await patch(`/pecas/${p.id}`, { ...form, conexao_id: form.conexao_id || null });
    const r = await post(`/pecas/${p.id}/cancelar`, { motivo: recusa.motivo.trim(), parte: recusa.parte });
    setDados({ ...p, ...r });
    setRecusa(null);
  }, 'Peça recusada. O motivo virou lição no caderno do time.');
  const recusaPronta = !!recusa && !!recusa.parte && recusa.motivo.trim().length >= 3;

  const subirImagem = async (arquivo: File, i: number | null) => {
    await rodar('imagem', async () => {
      const r = await enviarArquivo(arquivo, 'midia');
      if (i === null) mudar('midias', [...form.midias, { url: r.url, tipo: r.tipo && r.tipo.startsWith('video') ? 'video' : 'imagem' }]);
      else mudarSlide(i, 'imagem_url', r.url);
    }, 'Imagem enviada. Salve a peça para guardar.');
  };

  const titulo = p.titulo || (p.legenda ? String(p.legenda).split('\n')[0].slice(0, 80) : 'Peça sem título');
  return (
    <div className="tela">
      <Titulo voltar={{ para: '/posts', t: 'Posts e agenda' }} titulo={titulo}
        sub={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><EtiquetaPerfil perfil={p.perfil} sempre /><NomeRede rede={p.rede_id || p.rede?.id || (typeof p.rede === 'string' ? p.rede : '')} /> · {FORMATOS[p.formato] || p.formato} · <EtiquetaPeca status={p.status} /></span>}
        acoes={podeEditar ? <button className="bt bt-tinta" disabled={!mudou || !!ocupado} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button> : undefined} />

      {p.status === 'erro' && <Faixa tipo="erro"><b>Não publicou.</b> {p.erro || 'A rede recusou.'} {p.tentativas ? `(${p.tentativas} ${p.tentativas === 1 ? 'tentativa' : 'tentativas'})` : ''}</Faixa>}
      {p.status === 'agendado' && <Faixa><b>Agendada para {dataHora(p.agendado_para)}.</b> {conectada ? `O relógio publica sozinho na hora marcada, por ${contas.find((c: any) => c.id === form.conexao_id)?.conta_nome || contas[0]?.conta_nome || 'a conta do perfil'}.` : `A rede ainda não tem conta no perfil ${nomePerfil}: na hora marcada a peça vai dar erro. Conecte em Redes.`}</Faixa>}
      {p.status === 'publicado' && <Faixa tipo="ok"><b>Publicada {dataHora(p.publicado_em)}.</b> {p.url_publicada && <a href={p.url_publicada} target="_blank" rel="noopener">Ver na rede</a>}{p.id_na_rede && pode('desempenho.ver') && <> · <Link para={`/resultados/${p.id_na_rede}`}>Ver os resultados</Link></>}</Faixa>}
      {p.status === 'publicando' && <Faixa tipo="aviso">Publicando agora. Atualize em instantes.</Faixa>}
      {p.status === 'cancelado' && p.recusa?.motivo && <Faixa tipo="aviso"><b>Recusada {dataHora(p.recusa.em)}</b> (o problema: {NOME_PARTE[p.recusa.parte] || 'o texto e a imagem'}). {p.recusa.motivo}</Faixa>}
      {!podeEditar && pode('pecas.editar') && !['publicado', 'publicando'].includes(p.status) && <Faixa>Para editar, volte a peça para rascunho.</Faixa>}

      {(podeAprovar || pode('pecas.editar')) && !['publicado', 'publicando'].includes(p.status) && (
        <Grupo titulo="Situação">
          <div className="barra-acoes">
            {podeAprovar && ['rascunho', 'erro'].includes(p.status) && <button className="bt" disabled={!!ocupado} onClick={() => acao('aprovar', 'aprovar', {}, 'Peça aprovada.')}><CheckCircle2 />Aprovar</button>}
            {podeAprovar && ['rascunho', 'aprovado', 'erro', 'agendado'].includes(p.status) && <button className="bt" disabled={!!ocupado} onClick={() => { setQuando(paraCampoData(p.agendado_para) || paraCampoData(new Date(Date.now() + 3600_000).toISOString())); setAgendar(true); }}><CalendarClock />{p.status === 'agendado' ? 'Mudar horário' : 'Agendar'}</button>}
            {podeAprovar && ['rascunho', 'aprovado', 'erro', 'agendado'].includes(p.status) && (
              <button className="bt bt-tinta" disabled={!!ocupado || !conectada} title={conectada ? undefined : `Conecte a conta do perfil ${nomePerfil} em Redes para publicar`} onClick={() => { if (confirm(`Publicar esta peça agora no perfil ${nomePerfil}, por ${contas.find((c: any) => c.id === form.conexao_id)?.conta_nome || contas[0]?.conta_nome || 'a conta conectada'}?`)) acao('publicar', 'publicar-agora', {}, 'Peça enviada para a rede.'); }}><Send />{ocupado === 'publicar' ? 'Publicando…' : 'Publicar agora'}</button>
            )}
            {pode('pecas.editar') && ['aprovado', 'agendado', 'erro', 'cancelado'].includes(p.status) && <button className="bt bt-texto" disabled={!!ocupado} onClick={() => acao('voltar', 'voltar', {}, 'A peça voltou para rascunho.')}><RotateCcw />Voltar a rascunho</button>}
            {podeAprovar && p.status !== 'cancelado' && <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => setRecusa({ motivo: '', parte: '' })}><XCircle />Recusar</button>}
          </div>
          {!conectada && podeAprovar && <p className="campo-dica" style={{ marginTop: 10 }}>{p.rede && p.rede.situacao === 'em_breve'
            ? `O módulo de ${p.rede.nome} ainda não está ligado ao sistema. Dá para aprovar; publicar e agendar com efeito só depois que ele entrar.`
            : `Esta rede ainda não tem conta no perfil ${nomePerfil}. Dá para aprovar e agendar, mas publicar só depois de conectar a conta desse perfil em Redes.`}</p>}
        </Grupo>
      )}

      {p.origem && (
        <Grupo titulo="Origem">
          <p style={{ margin: 0 }}>{p.origem.tipo === 'recurso' ? 'Recurso' : p.origem.tipo === 'artigo' ? 'Novidade' : p.origem.tipo === 'produto' ? 'Produto' : 'Conteúdo'}: <b>{p.origem.titulo}</b>
            {p.origem.endereco && <> · <a href={p.origem.endereco} target="_blank" rel="noopener">ver no site <ExternalLink style={{ width: 14, height: 14, verticalAlign: '-2px' }} /></a></>}</p>
        </Grupo>
      )}

      <Grupo titulo="Texto">
        <Escolha rotulo="Perfil" valor={form.perfil} mudar={(v) => setForm((f: any) => ({ ...f, perfil: v, conexao_id: '' }))} desativado={!podeEditar}
          opcoes={Object.entries(PERFIS).map(([v, x]) => ({ v, t: x.t }))}
          dica={form.perfil === 'en' ? 'Sai pela conta em inglês. Legenda em inglês.' : 'Sai pela conta do Brasil.'} />
        <Campo rotulo="Título interno" valor={form.titulo} mudar={(v) => mudar('titulo', v)} desativado={!podeEditar} dica="Só para a equipe achar a peça. Não vai para a rede." />
        <AreaTexto rotulo="Legenda" valor={form.legenda} mudar={(v) => mudar('legenda', v)} linhas={8} desativado={!podeEditar}
          dica={`${(form.legenda || '').length} caracteres. Primeira linha é o gancho.`} />
        {(form.roteiro || ['reels', 'video', 'short', 'story'].includes(p.formato)) &&
          <AreaTexto rotulo="Roteiro" valor={form.roteiro} mudar={(v) => mudar('roteiro', v)} linhas={8} desativado={!podeEditar} />}
        {contas.length > 1 && (
          <Escolha rotulo="Publicar na conta" valor={form.conexao_id} mudar={(v) => mudar('conexao_id', v)} desativado={!podeEditar}
            opcoes={[{ v: '', t: `A primeira conta do perfil ${perfilDe(form.perfil).curto}` }, ...contas.map((c: any) => ({ v: c.id, t: c.conta_nome || c.id }))]} />
        )}
      </Grupo>

      {(p.rede_id || p.rede?.id || p.rede) === 'instagram' && p.formato !== 'story' && (
        <Grupo titulo="Instagram">
          <OpcoesInstagram op={form.opcoes} mudar={(o) => mudar('opcoes', o)} formato={p.formato} desativado={!podeEditar} />
        </Grupo>
      )}

      {(p.formato === 'carrossel' || form.slides.length > 0) && (
        <Grupo titulo={`Slides (${form.slides.length})`} acoes={podeEditar ? <button className="bt bt-mini" onClick={() => mudar('slides', [...form.slides, { titulo: '', texto: '', imagem_prompt: '', imagem_url: '' }])}><Plus />Slide</button> : undefined}>
          {form.slides.length === 0 ? <Vazio titulo="Nenhum slide ainda." texto="Peça ao Claude para montar os slides ou adicione aqui." /> : (
            <div className="slides">
              {form.slides.map((s: any, i: number) => (
                <div className="slide" key={i}>
                  <div className="slide-topo">
                    <span className="slide-n">{i === 0 ? 'Capa' : i === form.slides.length - 1 ? `${i + 1} · chamada` : `Slide ${i + 1}`}</span>
                    {podeEditar && <span style={{ display: 'flex' }}>
                      <button className="bt-icone" aria-label="Subir" disabled={i === 0} onClick={() => moverSlide(i, -1)}><ArrowUp /></button>
                      <button className="bt-icone" aria-label="Descer" disabled={i === form.slides.length - 1} onClick={() => moverSlide(i, 1)}><ArrowDown /></button>
                      <button className="bt-icone" aria-label="Remover slide" onClick={() => { if (confirm('Remover este slide?')) mudar('slides', form.slides.filter((_: any, j: number) => j !== i)); }}><Trash2 /></button>
                    </span>}
                  </div>
                  {s.video_url ? <video className="slide-img" src={s.video_url} poster={s.imagem_url || undefined} muted playsInline controls />
                    : s.imagem_url ? <img className="slide-img" src={s.imagem_url} alt={s.alt || `Slide ${i + 1}`} loading="lazy" />
                    : <div className="slide-semimg">{s.imagem_prompt ? 'Imagem ainda não gerada' : 'Sem imagem'}</div>}
                  <Campo rotulo="Título" valor={s.titulo} mudar={(v) => mudarSlide(i, 'titulo', v)} desativado={!podeEditar} />
                  <AreaTexto rotulo="Texto" valor={s.texto} mudar={(v) => mudarSlide(i, 'texto', v)} linhas={3} desativado={!podeEditar} />
                  <AreaTexto rotulo="Prompt da imagem" valor={s.imagem_prompt} mudar={(v) => mudarSlide(i, 'imagem_prompt', v)} linhas={2} desativado={!podeEditar} />
                  <Campo rotulo="Endereço da imagem" valor={s.imagem_url} mudar={(v) => mudarSlide(i, 'imagem_url', v)} desativado={!podeEditar} mono />
                  {podeEditar && pode('arquivos.enviar') && (
                    <label className="bt bt-mini" style={{ alignSelf: 'flex-start' }}><ImagePlus />Enviar imagem
                      <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) subirImagem(f, i); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </Grupo>
      )}

      <Grupo titulo="Mídias" acoes={podeEditar && pode('arquivos.enviar') ? (
        <label className="bt bt-mini"><ImagePlus />Enviar
          <input type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) subirImagem(f, null); e.target.value = ''; }} />
        </label>) : undefined}>
        {form.midias.length === 0 ? <p className="mudo" style={{ margin: 0 }}>Nenhuma mídia. Post, story, reels e vídeo usam as mídias daqui; carrossel usa as imagens dos slides.</p> : (
          <div className="midias">
            {form.midias.map((m: any, i: number) => (
              <div key={i} style={{ position: 'relative' }}>
                {m.tipo === 'video' ? <video src={m.url} muted /> : <img src={m.url} alt={`Mídia ${i + 1}`} loading="lazy" />}
                {podeEditar && <button className="bt-icone" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', color: '#fff' }} aria-label="Remover mídia"
                  onClick={() => mudar('midias', form.midias.filter((_: any, j: number) => j !== i))}><Trash2 /></button>}
              </div>
            ))}
          </div>
        )}
      </Grupo>

      <p className="mudo" style={{ fontSize: 13 }}>Criada {dataHora(p.criado_em)}{p.atualizado_em ? ` · mexida ${dataHora(p.atualizado_em)}` : ''}</p>

      <Modal titulo={p.status === 'agendado' ? 'Mudar horário' : 'Agendar peça'} aberto={agendar} fechar={() => setAgendar(false)}
        rodape={<>
          <button className="bt bt-texto" onClick={() => setAgendar(false)}>Cancelar</button>
          <button className="bt bt-tinta" disabled={!quando || !!ocupado} onClick={async () => {
            const iso = doCampoData(quando);
            if (!iso) return;
            await acao('agendar', 'agendar', { agendado_para: iso }, `Agendada para ${dataHora(iso)}.`);
            setAgendar(false);
          }}><CalendarClock />Agendar</button>
        </>}>
        <Campo rotulo="Data e hora (no horário deste aparelho)" tipo="datetime-local" valor={quando} mudar={setQuando} />
        {!conectada && <Faixa tipo="aviso">Esta rede ainda não tem conta no perfil {nomePerfil}. Se continuar assim até a hora marcada, a peça vai dar erro.</Faixa>}
      </Modal>

      <Modal titulo="Por que você recusou?" aberto={!!recusa} fechar={() => setRecusa(null)}
        rodape={<>
          <button className="bt bt-texto" onClick={() => setRecusa(null)}>Voltar</button>
          <button className="bt bt-tinta bt-perigo" disabled={!recusaPronta || !!ocupado} onClick={recusar}><XCircle />{ocupado === 'cancelar' ? 'Recusando…' : 'Recusar'}</button>
        </>}>
        {recusa && <>
          <div className="campo">
            <label>Onde está o problema?</label>
            <div className="barra-acoes">
              {PARTES.map((o) => (
                <button key={o.v} type="button" className={`bt bt-mini${recusa.parte === o.v ? ' bt-tinta' : ''}`} aria-pressed={recusa.parte === o.v} onClick={() => setRecusa({ ...recusa, parte: o.v })}>{o.t}</button>
              ))}
            </div>
          </div>
          <AreaTexto rotulo="O que ficou errado" valor={recusa.motivo} mudar={(v) => setRecusa({ ...recusa, motivo: v })} linhas={4}
            placeholder="Ex.: a capa ficou escura, sem cor, e o bicho está pequeno no quadro."
            dica="Vira lição: o texto vai para o caderno do Redator, a imagem para o do Designer, e o Revisor aprende os dois. A peça não vai ser publicada." />
        </>}
      </Modal>
    </div>
  );
}
