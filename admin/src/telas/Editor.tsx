// Editor de recurso ou novidade. Corpo em Markdown; arquivo e capa vão para o Storage pelo /arquivos.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ExternalLink, FileUp, ImagePlus, Plus, Save, Send, Trash2 } from 'lucide-react';
import { enviarArquivo, get, patch, post } from '../nucleo/api';
import { guardarSaida, useRota } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Marcar, Titulo, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { TIPOS_RECURSO, dataHora, listaDeTexto, tamanho, textoDeLista } from '../nucleo/util';
import { EtiquetaConteudo } from './comum';

const VAZIO_RECURSO = { titulo: '', slug: '', resumo: '', corpo_md: '', tipo: 'guia', categoria_id: '', capa_url: '', arquivo_url: '', arquivo_nome: '', arquivo_bytes: null, link_externo: '', tags: '', destaque: false };
const VAZIO_ARTIGO = { titulo: '', slug: '', resumo: '', corpo_md: '', categoria_id: '', capa_url: '', tags: '', fontes: [], recurso_id: '', destaque: false };

function paraForm(tipo: string, d: any) {
  const base: any = tipo === 'recursos' ? { ...VAZIO_RECURSO } : { ...VAZIO_ARTIGO };
  if (!d) return base;
  for (const k of Object.keys(base)) if (d[k] !== undefined && d[k] !== null) base[k] = d[k];
  base.tags = textoDeLista(d.tags);
  base.categoria_id = d.categoria_id ? String(d.categoria_id) : '';
  if (tipo === 'artigos') base.fontes = Array.isArray(d.fontes) ? d.fontes.map((f: any) => (typeof f === 'string' ? { nome: '', url: f } : { nome: f.nome || '', url: f.url || '' })) : [];
  return base;
}

function paraCorpo(tipo: string, f: any) {
  const c: any = { ...f, tags: listaDeTexto(f.tags), categoria_id: f.categoria_id ? Number(f.categoria_id) : null };
  if (!c.slug) delete c.slug;
  if (tipo === 'artigos') {
    c.fontes = (f.fontes || []).filter((x: any) => x.url).map((x: any) => ({ nome: x.nome || x.url, url: x.url }));
    c.recurso_id = f.recurso_id || null;
  } else {
    c.arquivo_bytes = f.arquivo_bytes ? Number(f.arquivo_bytes) : null;
  }
  return c;
}

export default function Editor({ params }: { params: { tipo: string; id: string } }) {
  const { pode } = useSessao();
  const { ir } = useRota();
  const tipo = params.tipo === 'artigos' ? 'artigos' : 'recursos';
  const novo = params.id === 'novo';
  const ehRecurso = tipo === 'recursos';
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => (novo ? Promise.resolve(null) : get(`/conteudo/${tipo}/${params.id}`)), [tipo, params.id]);
  const cats = useCarregar(() => get('/categorias'), []);
  const recursos = useCarregar(() => (ehRecurso ? Promise.resolve({ itens: [] }) : get('/conteudo/recursos?pagina=1')), [ehRecurso]);
  const [form, setForm] = useState<any>(null);
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    if (!novo && !dados) return;
    setForm(paraForm(tipo, dados));
    document.title = `${novo ? (ehRecurso ? 'Novo recurso' : 'Nova novidade') : dados?.titulo || 'Editar'} | Painel Agência Setup`;
  }, [dados, novo, tipo, ehRecurso]);

  const original = useMemo(() => JSON.stringify(paraForm(tipo, dados)), [dados, tipo]);
  const mudou = !!form && JSON.stringify(form) !== original;
  // A guarda lê de uma referência: logo depois de salvar um novo, o endereço muda antes de a tela redesenhar.
  const mudouRef = useRef(false);
  mudouRef.current = mudou;
  useEffect(() => guardarSaida(() => (mudouRef.current ? 'Há alterações não salvas. Sair mesmo assim?' : null)), []);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if ((carregando && !dados && !novo) || !form) return <div className="tela"><Carregando /></div>;

  const podeEditar = pode('conteudo.editar');
  const podePublicar = pode('conteudo.publicar');
  const status = dados?.status || 'rascunho';
  const mudar = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const salvar = async () => rodar('salvar', async () => {
    if (!form.titulo.trim()) throw new Error('Dê um título antes de salvar.');
    const corpo = paraCorpo(tipo, form);
    if (novo) {
      const r = await post(`/conteudo/${tipo}`, corpo);
      mudouRef.current = false;
      ir(`/conteudo/${tipo}/${r.id}`, { trocar: true });
    } else {
      const r = await patch(`/conteudo/${tipo}/${params.id}`, corpo);
      setDados({ ...dados, ...r });
    }
  }, 'Salvo.');

  const mudarSituacao = (acao: 'publicar' | 'arquivar') => rodar(acao, async () => {
    if (mudou) {
      const r = await patch(`/conteudo/${tipo}/${dados.id}`, paraCorpo(tipo, form));
      setDados({ ...dados, ...r });
    }
    const r = await post(`/conteudo/${tipo}/${dados.id}/${acao}`);
    setDados((d: any) => ({ ...d, ...r }));
  }, acao === 'publicar' ? 'Publicado no site.' : 'Tirado do ar.');

  const subir = (arquivo: File, onde: 'arquivo' | 'capa') => rodar(onde, async () => {
    const r = await enviarArquivo(arquivo, onde === 'arquivo' ? 'recursos' : 'midia');
    if (onde === 'arquivo') setForm((f: any) => ({ ...f, arquivo_url: r.url, arquivo_nome: r.nome || arquivo.name, arquivo_bytes: r.bytes }));
    else mudar('capa_url', r.url);
  }, onde === 'arquivo' ? 'Arquivo enviado. Salve para guardar.' : 'Capa enviada. Salve para guardar.');

  const endereco = dados?.endereco;
  return (
    <div className="tela tela-estreita">
      <Titulo voltar={{ para: `/conteudo?aba=${tipo}`, t: 'Recursos e novidades' }}
        titulo={novo ? (ehRecurso ? 'Novo recurso' : 'Nova novidade') : dados.titulo}
        sub={!novo ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><EtiquetaConteudo status={status} />{dados.publicado_em && <span>publicado {dataHora(dados.publicado_em)}</span>}</span> : 'Fica como rascunho até publicar.'}
        acoes={<>
          {endereco && status === 'publicado' && <a className="bt bt-texto" href={endereco} target="_blank" rel="noopener"><ExternalLink />Ver no site</a>}
          {podeEditar && <button className="bt" disabled={!!ocupado || (!mudou && !novo)} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button>}
          {!novo && podePublicar && status !== 'publicado' && <button className="bt bt-tinta" disabled={!!ocupado} onClick={() => { if (confirm('Publicar no site agora?')) mudarSituacao('publicar'); }}><Send />Publicar</button>}
          {!novo && podePublicar && status === 'publicado' && <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => { if (confirm('Tirar do ar? Dá para publicar de novo depois.')) mudarSituacao('arquivar'); }}><Archive />Tirar do ar</button>}
        </>} />

      {!podeEditar && <Faixa>Seu cargo só lê o conteúdo.</Faixa>}
      {!novo && !podePublicar && status !== 'publicado' && <Faixa>Quando estiver pronto, peça a um editor para publicar.</Faixa>}

      <Grupo titulo="Principal">
        <Campo rotulo="Título" valor={form.titulo} mudar={(v) => mudar('titulo', v)} desativado={!podeEditar} autoFocus={novo} />
        <Campo rotulo="Endereço (slug)" valor={form.slug} mudar={(v) => mudar('slug', v)} desativado={!podeEditar} mono
          dica={form.slug ? `${ehRecurso ? '/recursos/' : '/novidades/'}${form.slug}` : 'Em branco, sai do título.'} />
        <AreaTexto rotulo="Resumo" valor={form.resumo} mudar={(v) => mudar('resumo', v)} linhas={2} desativado={!podeEditar} dica="Uma ou duas frases. Aparece nas listas e no Google." />
        <div className="linha-campos">
          {ehRecurso && <Escolha rotulo="Tipo" valor={form.tipo} mudar={(v) => mudar('tipo', v)} desativado={!podeEditar} opcoes={Object.entries(TIPOS_RECURSO).map(([v, t]) => ({ v, t }))} />}
          <Escolha rotulo="Categoria" valor={form.categoria_id} mudar={(v) => mudar('categoria_id', v)} desativado={!podeEditar}
            opcoes={[{ v: '', t: cats.carregando ? 'Carregando…' : 'Sem categoria' }, ...((cats.dados as any[]) || []).map((c: any) => ({ v: String(c.id), t: c.nome }))]} />
        </div>
        <Campo rotulo="Tags" valor={form.tags} mudar={(v) => mudar('tags', v)} desativado={!podeEditar} dica="Separadas por vírgula. Ajudam a escolher o anúncio certo para a página." />
        <Marcar rotulo="Destaque" valor={form.destaque} mudar={(v) => mudar('destaque', v)} desativado={!podeEditar} dica={ehRecurso ? 'Aparece primeiro na lista de recursos.' : 'Aparece primeiro nas novidades.'} />
      </Grupo>

      {ehRecurso && (
        <Grupo titulo="Arquivo para baixar" rodape="O botão Baixar grátis leva ao arquivo; sem arquivo, leva ao link externo. Até 50 MB.">
          {form.arquivo_url ? (
            <div className="rede-conta" style={{ marginBottom: 12 }}>
              <FileUp />
              <div><b>{form.arquivo_nome || 'Arquivo'}</b><span>{tamanho(form.arquivo_bytes)}</span></div>
              <a className="bt bt-texto bt-mini" href={form.arquivo_url} target="_blank" rel="noopener">Abrir</a>
              {podeEditar && <button className="bt-icone" aria-label="Tirar arquivo" onClick={() => setForm((f: any) => ({ ...f, arquivo_url: '', arquivo_nome: '', arquivo_bytes: null }))}><Trash2 /></button>}
            </div>
          ) : <p className="mudo" style={{ marginTop: 0 }}>Nenhum arquivo enviado.</p>}
          {podeEditar && pode('arquivos.enviar') && (
            <label className="bt" style={{ marginBottom: 14 }}><FileUp />{ocupado === 'arquivo' ? 'Enviando…' : form.arquivo_url ? 'Trocar arquivo' : 'Enviar arquivo'}
              <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f, 'arquivo'); e.target.value = ''; }} />
            </label>
          )}
          <Campo rotulo="Link externo (opcional)" valor={form.link_externo} mudar={(v) => mudar('link_externo', v)} desativado={!podeEditar} placeholder="https://" />
        </Grupo>
      )}

      <Grupo titulo="Capa">
        {form.capa_url ? <img src={form.capa_url} alt="Capa" style={{ maxWidth: 280, width: '100%', borderRadius: 10, border: '1px solid var(--borda)', marginBottom: 12, display: 'block' }} />
          : <p className="mudo" style={{ marginTop: 0 }}>Sem capa. O site mostra um cartão com o tipo.</p>}
        <div className="barra-acoes" style={{ marginBottom: 12 }}>
          {podeEditar && pode('arquivos.enviar') && (
            <label className="bt"><ImagePlus />{ocupado === 'capa' ? 'Enviando…' : form.capa_url ? 'Trocar capa' : 'Enviar capa'}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f, 'capa'); e.target.value = ''; }} />
            </label>
          )}
          {podeEditar && form.capa_url && <button className="bt bt-texto" onClick={() => mudar('capa_url', '')}><Trash2 />Tirar capa</button>}
        </div>
        <Campo rotulo="Endereço da capa" valor={form.capa_url} mudar={(v) => mudar('capa_url', v)} desativado={!podeEditar} mono />
      </Grupo>

      <Grupo titulo="Texto">
        <AreaTexto rotulo="Corpo (Markdown)" valor={form.corpo_md} mudar={(v) => mudar('corpo_md', v)} linhas={18} mono desativado={!podeEditar}
          dica="## para intertítulo, **negrito**, *itálico*, - para lista, [texto](link), ![descrição](imagem). Sem travessão." />
      </Grupo>

      {!ehRecurso && (
        <Grupo titulo="Fontes e recurso ligado" acoes={podeEditar ? <button className="bt bt-mini" onClick={() => mudar('fontes', [...form.fontes, { nome: '', url: '' }])}><Plus />Fonte</button> : undefined}>
          {form.fontes.length === 0 && <p className="mudo" style={{ marginTop: 0 }}>Nenhuma fonte. Toda novidade deve citar de onde veio.</p>}
          {form.fontes.map((f: any, i: number) => (
            <div className="item-lista" key={i}>
              <div className="linha-campos">
                <Campo rotulo="Nome" valor={f.nome} mudar={(v) => mudar('fontes', form.fontes.map((x: any, j: number) => (j === i ? { ...x, nome: v } : x)))} desativado={!podeEditar} />
                <Campo rotulo="Endereço" valor={f.url} mudar={(v) => mudar('fontes', form.fontes.map((x: any, j: number) => (j === i ? { ...x, url: v } : x)))} desativado={!podeEditar} placeholder="https://" />
              </div>
              {podeEditar && <button className="bt-icone" style={{ marginTop: 24 }} aria-label="Remover fonte" onClick={() => mudar('fontes', form.fontes.filter((_: any, j: number) => j !== i))}><Trash2 /></button>}
            </div>
          ))}
          <Escolha rotulo="Recurso ligado (opcional)" valor={form.recurso_id} mudar={(v) => mudar('recurso_id', v)} desativado={!podeEditar}
            dica="A novidade mostra o link para baixar esse recurso."
            opcoes={[{ v: '', t: 'Nenhum' }, ...(((recursos.dados as any)?.itens || []) as any[]).map((r: any) => ({ v: r.id, t: r.titulo }))]} />
        </Grupo>
      )}
    </div>
  );
}
