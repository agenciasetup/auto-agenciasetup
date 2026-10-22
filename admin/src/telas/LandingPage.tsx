// Editor de landing page por blocos (/cursos/<slug> no site). Cada bloco tem um formulário próprio.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, ExternalLink, Plus, Save, Send, Trash2 } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { guardarSaida, useRota } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { CampoImagem } from './Cursos';
import { EtiquetaConteudo } from './comum';

const TIPOS: Record<string, { t: string; novo: () => any }> = {
  heroi: { t: 'Chamada principal', novo: () => ({ tipo: 'heroi', selo: '', titulo: '', subtitulo: '', cta: 'Quero entrar' }) },
  lista: { t: 'Lista (o que você aprende)', novo: () => ({ tipo: 'lista', titulo: '', itens: [''] }) },
  texto: { t: 'Texto livre', novo: () => ({ tipo: 'texto', titulo: '', md: '' }) },
  depoimentos: { t: 'Depoimentos', novo: () => ({ tipo: 'depoimentos', titulo: 'Quem já fez', itens: [{ nome: '', texto: '' }] }) },
  preco: { t: 'Preço', novo: () => ({ tipo: 'preco', texto: '', cta: 'Garantir minha vaga' }) },
  faq: { t: 'Perguntas frequentes', novo: () => ({ tipo: 'faq', titulo: 'Perguntas frequentes', itens: [{ p: '', r: '' }] }) },
  chamada: { t: 'Chamada final', novo: () => ({ tipo: 'chamada', titulo: '', cta: 'Quero entrar' }) },
};

function paraForm(d: any) {
  return {
    titulo: d?.titulo || '', slug: d?.slug || '', produto_id: d?.produto_id || '',
    blocos: Array.isArray(d?.blocos) ? d.blocos.map((b: any) => ({ ...b })) : [TIPOS.heroi.novo(), TIPOS.lista.novo(), TIPOS.preco.novo(), TIPOS.faq.novo()],
    seo: { titulo: d?.seo?.titulo || '', descricao: d?.seo?.descricao || '', imagem: d?.seo?.imagem || '' },
  };
}

export default function LandingPage({ params }: { params: { id: string } }) {
  const { pode } = useSessao();
  const { ir } = useRota();
  const novo = params.id === 'novo';
  const { dados, setDados, erro, carregando, recarregar } = useCarregar(() => (novo ? Promise.resolve(null) : get(`/landing-pages/${params.id}`)), [params.id]);
  const produtos = useCarregar(() => get('/produtos'), []);
  const [form, setForm] = useState<any>(null);
  const [novoTipo, setNovoTipo] = useState('texto');
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    if (!novo && !dados) return;
    setForm(paraForm(dados));
    document.title = `${novo ? 'Nova landing page' : dados?.titulo || 'Landing page'} | Painel Agência Setup`;
  }, [dados, novo]);
  const original = useMemo(() => JSON.stringify(paraForm(dados)), [dados]);
  const mudou = !!form && JSON.stringify(form) !== original;
  const mudouRef = useRef(false);
  mudouRef.current = mudou;
  useEffect(() => guardarSaida(() => (mudouRef.current ? 'Há alterações não salvas. Sair mesmo assim?' : null)), []);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if ((carregando && !dados && !novo) || !form) return <div className="tela"><Carregando /></div>;

  const podeEditar = pode('cursos.editar');
  const status = dados?.status || 'rascunho';
  const mudar = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const mudarBloco = (i: number, k: string, v: any) => setForm((f: any) => ({ ...f, blocos: f.blocos.map((b: any, j: number) => (j === i ? { ...b, [k]: v } : b)) }));
  const moverBloco = (i: number, d: number) => setForm((f: any) => {
    const b = [...f.blocos]; const j = i + d;
    if (j < 0 || j >= b.length) return f;
    [b[i], b[j]] = [b[j], b[i]];
    return { ...f, blocos: b };
  });
  const corpo = () => {
    const c: any = { titulo: form.titulo, produto_id: form.produto_id || null, blocos: form.blocos, seo: form.seo };
    if (form.slug) c.slug = form.slug;
    return c;
  };

  const salvar = () => rodar('salvar', async () => {
    if (!form.titulo.trim()) throw new Error('Dê um título à landing page.');
    if (novo) {
      const r = await post('/landing-pages', corpo());
      mudouRef.current = false;
      ir(`/cursos/landing-pages/${r.id}`, { trocar: true });
    } else {
      const r = await patch(`/landing-pages/${params.id}`, corpo());
      setDados({ ...dados, ...r });
    }
  }, 'Landing page salva.');

  const situacao = (acao: 'publicar' | 'arquivar') => rodar(acao, async () => {
    if (mudou) { const r = await patch(`/landing-pages/${dados.id}`, corpo()); setDados({ ...dados, ...r }); }
    const r = await post(`/landing-pages/${dados.id}/${acao}`);
    setDados((d: any) => ({ ...d, ...r }));
  }, acao === 'publicar' ? 'Landing page no ar.' : 'Landing page tirada do ar.');

  return (
    <div className="tela tela-estreita">
      <Titulo voltar={{ para: '/cursos?aba=landing-pages', t: 'Landing pages' }} titulo={novo ? 'Nova landing page' : dados.titulo}
        sub={novo ? 'Fica como rascunho até publicar.' : <EtiquetaConteudo status={status} />}
        acoes={<>
          {dados?.endereco && status === 'publicado' && <a className="bt bt-texto" href={dados.endereco} target="_blank" rel="noopener"><ExternalLink />Ver no site</a>}
          {podeEditar && <button className="bt" disabled={!!ocupado || (!mudou && !novo)} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button>}
          {!novo && podeEditar && status !== 'publicado' && <button className="bt bt-tinta" disabled={!!ocupado} onClick={() => { if (confirm('Publicar a landing page agora?')) situacao('publicar'); }}><Send />Publicar</button>}
          {!novo && podeEditar && status === 'publicado' && <button className="bt bt-texto bt-perigo" disabled={!!ocupado} onClick={() => { if (confirm('Tirar do ar?')) situacao('arquivar'); }}><Archive />Tirar do ar</button>}
        </>} />
      {!podeEditar && <Faixa>Seu cargo só lê as landing pages.</Faixa>}

      <Grupo titulo="Página">
        <Campo rotulo="Título" valor={form.titulo} mudar={(v) => mudar('titulo', v)} desativado={!podeEditar} autoFocus={novo} />
        <Campo rotulo="Endereço (slug)" valor={form.slug} mudar={(v) => mudar('slug', v)} desativado={!podeEditar} mono dica={form.slug ? `/cursos/${form.slug}` : 'Em branco, sai do título.'} />
        <Escolha rotulo="Produto" valor={form.produto_id} mudar={(v) => mudar('produto_id', v)} desativado={!podeEditar}
          dica="O preço e o link de pagamento vêm do produto."
          opcoes={[{ v: '', t: produtos.carregando ? 'Carregando…' : 'Nenhum' }, ...(((produtos.dados as any[]) || []).map((p: any) => ({ v: p.id, t: p.nome })))]} />
      </Grupo>

      <Grupo titulo={`Blocos (${form.blocos.length})`}>
        {form.blocos.length === 0 && <Vazio titulo="Nenhum bloco." texto="Adicione a chamada principal para começar." />}
        {form.blocos.map((b: any, i: number) => (
          <div className="bloco" key={i}>
            <div className="bloco-topo">
              <b>{i + 1}. {TIPOS[b.tipo]?.t || b.tipo}</b>
              {podeEditar && <>
                <button className="bt-icone" aria-label="Subir" disabled={i === 0} onClick={() => moverBloco(i, -1)}><ArrowUp /></button>
                <button className="bt-icone" aria-label="Descer" disabled={i === form.blocos.length - 1} onClick={() => moverBloco(i, 1)}><ArrowDown /></button>
                <button className="bt-icone" aria-label="Remover bloco" onClick={() => { if (confirm('Remover este bloco?')) mudar('blocos', form.blocos.filter((_: any, j: number) => j !== i)); }}><Trash2 /></button>
              </>}
            </div>
            <div className="bloco-corpo"><FormBloco b={b} mudar={(k, v) => mudarBloco(i, k, v)} desativado={!podeEditar} /></div>
          </div>
        ))}
        {podeEditar && (
          <div className="barra-acoes">
            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} aria-label="Tipo de bloco"
              style={{ background: 'var(--fundo)', border: '1px solid var(--borda-forte)', borderRadius: 10, padding: '8px 10px', minHeight: 38 }}>
              {Object.entries(TIPOS).map(([v, t]) => <option key={v} value={v}>{t.t}</option>)}
            </select>
            <button className="bt" onClick={() => mudar('blocos', [...form.blocos, TIPOS[novoTipo].novo()])}><Plus />Adicionar bloco</button>
          </div>
        )}
      </Grupo>

      <Grupo titulo="Google e redes" rodape="Em branco, usa o título e a chamada do produto.">
        <Campo rotulo="Título para o Google" valor={form.seo.titulo} mudar={(v) => mudar('seo', { ...form.seo, titulo: v })} desativado={!podeEditar} />
        <AreaTexto rotulo="Descrição" valor={form.seo.descricao} mudar={(v) => mudar('seo', { ...form.seo, descricao: v })} linhas={2} desativado={!podeEditar} />
        <CampoImagem rotulo="Imagem de prévia" valor={form.seo.imagem} mudar={(v) => mudar('seo', { ...form.seo, imagem: v })} desativado={!podeEditar} />
      </Grupo>
    </div>
  );
}

function FormBloco({ b, mudar, desativado }: { b: any; mudar: (k: string, v: any) => void; desativado: boolean }) {
  const itens: any[] = Array.isArray(b.itens) ? b.itens : [];
  const mudarItem = (i: number, v: any) => mudar('itens', itens.map((x, j) => (j === i ? v : x)));
  const tirarItem = (i: number) => mudar('itens', itens.filter((_, j) => j !== i));
  const botaoTirar = (i: number) => !desativado && <button className="bt-icone" style={{ marginTop: 24 }} aria-label="Remover item" onClick={() => tirarItem(i)}><Trash2 /></button>;
  switch (b.tipo) {
    case 'heroi': return <>
      <Campo rotulo="Selo (opcional)" valor={b.selo} mudar={(v) => mudar('selo', v)} desativado={desativado} placeholder="Turma aberta" />
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} dica="Em branco, usa o título da página." />
      <AreaTexto rotulo="Subtítulo" valor={b.subtitulo} mudar={(v) => mudar('subtitulo', v)} linhas={2} desativado={desativado} />
      <Campo rotulo="Botão" valor={b.cta} mudar={(v) => mudar('cta', v)} desativado={desativado} />
    </>;
    case 'lista': return <>
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      {itens.map((it, i) => <div className="item-lista" key={i}><div><Campo rotulo={`Item ${i + 1}`} valor={it} mudar={(v) => mudarItem(i, v)} desativado={desativado} /></div>{botaoTirar(i)}</div>)}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, ''])}><Plus />Item</button>}
    </>;
    case 'texto': return <>
      <Campo rotulo="Título (opcional)" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      <AreaTexto rotulo="Texto (Markdown)" valor={b.md} mudar={(v) => mudar('md', v)} linhas={6} mono desativado={desativado} />
    </>;
    case 'depoimentos': return <>
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <Campo rotulo="Nome" valor={it.nome} mudar={(v) => mudarItem(i, { ...it, nome: v })} desativado={desativado} />
            <AreaTexto rotulo="Depoimento" valor={it.texto} mudar={(v) => mudarItem(i, { ...it, texto: v })} linhas={2} desativado={desativado} />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { nome: '', texto: '' }])}><Plus />Depoimento</button>}
    </>;
    case 'preco': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>O valor vem do produto escolhido acima.</p>
      <AreaTexto rotulo="Texto de apoio" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={2} desativado={desativado} placeholder="Acesso por 1 ano, certificado e comunidade." />
      <Campo rotulo="Botão" valor={b.cta} mudar={(v) => mudar('cta', v)} desativado={desativado} />
    </>;
    case 'faq': return <>
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <Campo rotulo="Pergunta" valor={it.p} mudar={(v) => mudarItem(i, { ...it, p: v })} desativado={desativado} />
            <AreaTexto rotulo="Resposta" valor={it.r} mudar={(v) => mudarItem(i, { ...it, r: v })} linhas={2} desativado={desativado} />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { p: '', r: '' }])}><Plus />Pergunta</button>}
    </>;
    case 'chamada': return <>
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      <Campo rotulo="Botão" valor={b.cta} mudar={(v) => mudar('cta', v)} desativado={desativado} />
    </>;
    default: return <p className="mudo">Bloco de tipo desconhecido ({b.tipo}). O site ignora.</p>;
  }
}
