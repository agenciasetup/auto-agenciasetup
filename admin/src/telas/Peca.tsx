// Uma peça da fila: legenda, roteiro, slides e mídias editáveis; aprovar, agendar, publicar agora, cancelar.
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarClock, CheckCircle2, ExternalLink, ImagePlus, Plus, RotateCcw, Save, Send, Trash2, XCircle } from 'lucide-react';
import { enviarArquivo, get, patch, post } from '../nucleo/api';
import { guardarSaida } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, dataHora, doCampoData, paraCampoData } from '../nucleo/util';
import { EtiquetaPeca, NomeRede } from './comum';

const EDITAVEL = ['rascunho', 'aprovado', 'erro'];

export default function Peca({ params }: { params: { id: string } }) {
  const { pode } = useSessao();
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => get(`/pecas/${params.id}`), [params.id]);
  const [form, setForm] = useState<any>(null);
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState('');
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    if (!dados) return;
    document.title = `${dados.titulo || 'Peça'} | Painel Agência Setup`;
    setForm({
      titulo: dados.titulo || '', legenda: dados.legenda || '', roteiro: dados.roteiro || '',
      slides: Array.isArray(dados.slides) ? dados.slides.map((s: any) => ({ ...s })) : [],
      midias: Array.isArray(dados.midias) ? dados.midias.map((m: any) => ({ ...m })) : [],
      conexao_id: dados.conexao_id || '',
    });
  }, [dados]);

  const original = useMemo(() => dados && JSON.stringify({
    titulo: dados.titulo || '', legenda: dados.legenda || '', roteiro: dados.roteiro || '', slides: dados.slides || [], midias: dados.midias || [], conexao_id: dados.conexao_id || '',
  }), [dados]);
  const mudou = !!form && JSON.stringify(form) !== original;
  useEffect(() => guardarSaida(() => (mudou ? 'Há alterações não salvas nesta peça. Sair mesmo assim?' : null)), [mudou]);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if (carregando && !dados || !form) return <div className="tela"><Carregando /></div>;

  const p = dados;
  const podeEditar = pode('pecas.editar') && EDITAVEL.includes(p.status);
  const podeAprovar = pode('pecas.aprovar');
  const contas = (p.rede?.conexoes || []).filter((c: any) => c.status === 'ativa');
  const conectada = contas.length > 0;
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
      <Titulo voltar={{ para: '/fila', t: 'Fila das redes' }} titulo={titulo}
        sub={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><NomeRede rede={p.rede_id || p.rede?.id || (typeof p.rede === 'string' ? p.rede : '')} /> · {FORMATOS[p.formato] || p.formato} · <EtiquetaPeca status={p.status} /></span>}
        acoes={podeEditar ? <button className="bt bt-tinta" disabled={!mudou || !!ocupado} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button> : undefined} />

      {p.status === 'erro' && <Faixa tipo="erro"><b>Não publicou.</b> {p.erro || 'A rede recusou.'} {p.tentativas ? `(${p.tentativas} ${p.tentativas === 1 ? 'tentativa' : 'tentativas'})` : ''}</Faixa>}
      {p.status === 'agendado' && <Faixa><b>Agendada para {dataHora(p.agendado_para)}.</b> {conectada ? 'O relógio publica sozinho na hora marcada.' : 'A rede ainda não está conectada: na hora marcada a peça vai dar erro. Conecte em Redes.'}</Faixa>}
      {p.status === 'publicado' && <Faixa tipo="ok"><b>Publicada {dataHora(p.publicado_em)}.</b> {p.url_publicada && <a href={p.url_publicada} target="_blank" rel="noopener">Ver na rede</a>}</Faixa>}
      {p.status === 'publicando' && <Faixa tipo="aviso">Publicando agora. Atualize em instantes.</Faixa>}
      {!podeEditar && pode('pecas.editar') && !['publicado', 'publicando'].includes(p.status) && <Faixa>Para editar, volte a peça para rascunho.</Faixa>}

      {(podeAprovar || pode('pecas.editar')) && !['publicado', 'publicando'].includes(p.status) && (
        <Grupo titulo="Situação">
          <div className="barra-acoes">
            {podeAprovar && ['rascunho', 'erro'].includes(p.status) && <button className="bt" disabled={!!ocupado} onClick={() => acao('aprovar', 'aprovar', {}, 'Peça aprovada.')}><CheckCircle2 />Aprovar</button>}
            {podeAprovar && ['rascunho', 'aprovado', 'erro', 'agendado'].includes(p.status) && <button className="bt" disabled={!!ocupado} onClick={() => { setQuando(paraCampoData(p.agendado_para) || paraCampoData(new Date(Date.now() + 3600_000).toISOString())); setAgendar(true); }}><CalendarClock />{p.status === 'agendado' ? 'Mudar horário' : 'Agendar'}</button>}
            {podeAprovar && ['rascunho', 'aprovado', 'erro', 'agendado'].includes(p.status) && (
              <button className="bt bt-tinta" disabled={!!ocupado || !conectada} title={conectada ? undefined : 'Conecte a rede em Redes para publicar'} onClick={() => { if (confirm('Publicar esta peça agora na rede?')) acao('publicar', 'publicar-agora', {}, 'Peça enviada para a rede.'); }}><Send />{ocupado === 'publicar' ? 'Publicando…' : 'Publicar agora'}</button>
            )}
            {pode('pecas.editar') && ['aprovado', 'agendado', 'erro', 'cancelado'].includes(p.status) && <button className="bt bt-texto" disabled={!!ocupado} onClick={() => acao('voltar', 'voltar', {}, 'A peça voltou para rascunho.')}><RotateCcw />Voltar a rascunho</button>}
            {podeAprovar && p.status !== 'cancelado' && <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => { if (confirm('Cancelar esta peça? Ela não vai ser publicada.')) acao('cancelar', 'cancelar', {}, 'Peça cancelada.'); }}><XCircle />Cancelar</button>}
          </div>
          {!conectada && podeAprovar && <p className="campo-dica" style={{ marginTop: 10 }}>{p.rede && p.rede.situacao === 'em_breve'
            ? `O módulo de ${p.rede.nome} ainda não está ligado ao sistema. Dá para aprovar; publicar e agendar com efeito só depois que ele entrar.`
            : 'Esta rede ainda não tem conta conectada. Dá para aprovar e agendar, mas publicar só depois de conectar em Redes.'}</p>}
        </Grupo>
      )}

      {p.origem && (
        <Grupo titulo="Origem">
          <p style={{ margin: 0 }}>{p.origem.tipo === 'recurso' ? 'Recurso' : p.origem.tipo === 'artigo' ? 'Novidade' : p.origem.tipo === 'produto' ? 'Produto' : 'Conteúdo'}: <b>{p.origem.titulo}</b>
            {p.origem.endereco && <> · <a href={p.origem.endereco} target="_blank" rel="noopener">ver no site <ExternalLink style={{ width: 14, height: 14, verticalAlign: '-2px' }} /></a></>}</p>
        </Grupo>
      )}

      <Grupo titulo="Texto">
        <Campo rotulo="Título interno" valor={form.titulo} mudar={(v) => mudar('titulo', v)} desativado={!podeEditar} dica="Só para a equipe achar a peça. Não vai para a rede." />
        <AreaTexto rotulo="Legenda" valor={form.legenda} mudar={(v) => mudar('legenda', v)} linhas={8} desativado={!podeEditar}
          dica={`${(form.legenda || '').length} caracteres. Primeira linha é o gancho.`} />
        {(form.roteiro || ['reels', 'video', 'short', 'story'].includes(p.formato)) &&
          <AreaTexto rotulo="Roteiro" valor={form.roteiro} mudar={(v) => mudar('roteiro', v)} linhas={8} desativado={!podeEditar} />}
        {contas.length > 1 && (
          <Escolha rotulo="Publicar na conta" valor={form.conexao_id} mudar={(v) => mudar('conexao_id', v)} desativado={!podeEditar}
            opcoes={[{ v: '', t: 'A primeira conta conectada' }, ...contas.map((c: any) => ({ v: c.id, t: c.conta_nome || c.id }))]} />
        )}
      </Grupo>

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
                  {s.imagem_url ? <img className="slide-img" src={s.imagem_url} alt={`Slide ${i + 1}`} loading="lazy" />
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
        {!conectada && <Faixa tipo="aviso">Esta rede ainda não está conectada. Se continuar assim até a hora marcada, a peça vai dar erro.</Faixa>}
      </Modal>
    </div>
  );
}
