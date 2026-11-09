// Editor da página de venda por blocos (/cursos/<slug> no site). Cada bloco tem um formulário próprio.
// Aulas, kit, preço e depoimentos aprovados vêm do banco; aqui fica só o texto em volta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, ExternalLink, Plus, Save, Send, Trash2 } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { guardarSaida, useRota } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Marcar, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { CampoImagem } from './Cursos';
import { EtiquetaConteudo } from './comum';

const TIPOS: Record<string, { t: string; novo: () => any }> = {
  heroi: { t: 'Topo (título, vídeo e botão)', novo: () => ({ tipo: 'heroi', selo: '', titulo: '', destaque: '', subtitulo: '', cta: 'Quero entrar', video: '', video_rotulo: '', provas: [''] }) },
  marquee: { t: 'Faixa de palavras correndo', novo: () => ({ tipo: 'marquee', itens: [''] }) },
  historia: { t: 'Antes e depois (personagem)', novo: () => ({ tipo: 'historia', olho: 'Um exemplo', titulo: '', destaque: '', texto: '', antes: { foto: '', alt: '', titulo: '', destaque: '', texto: '', itens: [], chips: [''] }, chave: 'Modo automático', virada: '', depois: { foto: '', alt: '', titulo: '', destaque: '', texto: '', itens: [], notificacoes: [{ app: 'Claude', hora: '', texto: '' }] }, nota: '' }) },
  simulacao: { t: 'Simulação (o Claude trabalhando)', novo: () => ({ tipo: 'simulacao', olho: 'Como funciona', titulo: 'Veja o Claude trabalhando', destaque: 'trabalhando', texto: '', arquivo: '04-radar.md', nicho: '', assuntos: [{ t: '', calor: 80 }], post_titulo: '', imagem: '', perfil: '', palavra: '', curtidas: 1284, dm: '' }) },
  dia: { t: 'Linha do tempo (como fica o dia)', novo: () => ({ tipo: 'dia', olho: '', titulo: 'Como fica o seu dia', texto: '', itens: [{ hora: '', quem: '', texto: '' }], nota: '' }) },
  cards: { t: 'Cartões (o que você monta)', novo: () => ({ tipo: 'cards', olho: '', titulo: '', destaque: '', itens: [{ titulo: '', texto: '' }] }) },
  estilos: { t: 'Exemplos de estilo (galeria)', novo: () => ({ tipo: 'estilos', olho: 'Exemplos', titulo: '', destaque: '', texto: '', itens: [{ nome: '', nicho: '', imagens: [''] }] }) },
  lista: { t: 'Lista (o que você aprende)', novo: () => ({ tipo: 'lista', titulo: '', itens: [''] }) },
  para_quem: { t: 'Para quem é (e não é)', novo: () => ({ tipo: 'para_quem', sim: [''], nao: [''] }) },
  aulas: { t: 'Aulas do curso (automático)', novo: () => ({ tipo: 'aulas', olho: 'O curso', titulo: '', texto: '' }) },
  kit: { t: 'Kit do curso (automático)', novo: () => ({ tipo: 'kit', olho: 'Vem junto', titulo: 'O kit completo', texto: '' }) },
  autor: { t: 'Quem ensina', novo: () => ({ tipo: 'autor', nome: '', papel: '', foto: '', texto: '', numeros: [''] }) },
  texto: { t: 'Texto livre', novo: () => ({ tipo: 'texto', titulo: '', md: '' }) },
  depoimentos: { t: 'Depoimentos', novo: () => ({ tipo: 'depoimentos', titulo: 'Quem já fez', itens: [] }) },
  preco: { t: 'Preço e botão', novo: () => ({ tipo: 'preco', olho: 'Comece hoje', titulo: '', itens: [''], texto: '', cta: 'Quero entrar agora' }) },
  garantia: { t: 'Garantia', novo: () => ({ tipo: 'garantia', titulo: '', texto: '' }) },
  faq: { t: 'Perguntas frequentes', novo: () => ({ tipo: 'faq', titulo: 'Perguntas frequentes', itens: [{ p: '', r: '' }] }) },
  chamada: { t: 'Chamada final', novo: () => ({ tipo: 'chamada', titulo: '', destaque: '', texto: '', cta: 'Quero entrar' }) },
  // Curso de leitura (ex.: Dúvidas da Fé): uma dúvida de verdade, como aparece no app (resposta rápida, versículo e "diga").
  exemplo: { t: 'Exemplo de uma dúvida (curso de leitura)', novo: () => ({ tipo: 'exemplo', olho: 'Veja como é por dentro', titulo: 'Cada dúvida, do jeito que você precisa', codigo: '' }) },
  ajudante: { t: 'A ajudante que lê print (curso de leitura)', novo: () => ({ tipo: 'ajudante', olho: 'Para responder comentários', titulo: 'Recebeu um comentário difícil? Mande o print.', texto: '' }) },
};

// Uma lista de frases curtas (provas, itens, para quem é).
function ListaTexto({ rotulo, itens, mudar, desativado, rotuloItem = 'Item' }: { rotulo?: string; itens: any; mudar: (v: string[]) => void; desativado: boolean; rotuloItem?: string }) {
  const lista: string[] = Array.isArray(itens) ? itens : [];
  return <>
    {rotulo && <p className="campo-dica" style={{ margin: '4px 0 0', fontWeight: 600 }}>{rotulo}</p>}
    {lista.map((it, i) => <div className="item-lista" key={i}><div><Campo rotulo={`${rotuloItem} ${i + 1}`} valor={it} mudar={(v) => mudar(lista.map((x, j) => (j === i ? v : x)))} desativado={desativado} /></div>
      {!desativado && <button className="bt-icone" style={{ marginTop: 24 }} aria-label="Remover item" onClick={() => mudar(lista.filter((_, j) => j !== i))}><Trash2 /></button>}</div>)}
    {!desativado && <button className="bt bt-mini" onClick={() => mudar([...lista, ''])}><Plus />{rotuloItem}</button>}
  </>;
}

// Linha pequena acima do título, título e o trecho em destaque (letra cursiva laranja).
function Cabeca({ b, mudar, desativado, texto = false }: { b: any; mudar: (k: string, v: any) => void; desativado: boolean; texto?: boolean }) {
  return <>
    <Campo rotulo="Linha acima do título (opcional)" valor={b.olho} mudar={(v) => mudar('olho', v)} desativado={desativado} />
    <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
    <Campo rotulo="Trecho em destaque (opcional)" valor={b.destaque} mudar={(v) => mudar('destaque', v)} desativado={desativado} dica="Copie um pedaço do título: ele sai em letra cursiva laranja." />
    {texto && <AreaTexto rotulo="Texto de apoio (opcional)" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={2} desativado={desativado} />}
  </>;
}

function paraForm(d: any) {
  return {
    titulo: d?.titulo || '', slug: d?.slug || '', produto_id: d?.produto_id || '',
    blocos: Array.isArray(d?.blocos) ? d.blocos.map((b: any) => ({ ...b })) : [TIPOS.heroi.novo(), TIPOS.cards.novo(), TIPOS.aulas.novo(), TIPOS.kit.novo(), TIPOS.preco.novo(), TIPOS.garantia.novo(), TIPOS.faq.novo(), TIPOS.chamada.novo()],
    seo: { titulo: d?.seo?.titulo || '', descricao: d?.seo?.descricao || '', imagem: d?.seo?.imagem || '', vitrine: d?.seo?.vitrine !== false },
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
          dica="O preço, a oferta e o curso (aulas e kit) vêm do produto."
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

      <Grupo titulo="Onde aparece" rodape="Desligado, a página continua no ar para quem tem o link (anúncio, bio, direct), mas sai da lista de cursos do site e do mapa do site.">
        <Marcar rotulo="Aparece na lista de cursos" valor={form.seo.vitrine} mudar={(v) => mudar('seo', { ...form.seo, vitrine: v })} desativado={!podeEditar}
          dica="A lista fica em agenciasetup.com.br/cursos." />
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
      <Campo rotulo="Selo (opcional)" valor={b.selo} mudar={(v) => mudar('selo', v)} desativado={desativado} placeholder="Mini curso · 18 aulas" />
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} dica="Em branco, usa o título da página." />
      <Campo rotulo="Trecho em destaque (opcional)" valor={b.destaque} mudar={(v) => mudar('destaque', v)} desativado={desativado} dica="Copie um pedaço do título: ele sai em letra cursiva laranja." />
      <p className="campo-dica" style={{ margin: '4px 0 0' }}>Título em três partes (opcional): preenchido, ele substitui o título acima. O trecho em destaque vale para a última parte.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Campo rotulo="Antes" valor={b.pre} mudar={(v) => mudar('pre', v)} desativado={desativado} placeholder="seus posts" />
        <Campo rotulo="Palavra grande" valor={b.grande} mudar={(v) => mudar('grande', v)} desativado={desativado} placeholder="automáticos" />
        <Campo rotulo="Depois" valor={b.pos} mudar={(v) => mudar('pos', v)} desativado={desativado} placeholder="com Claude, no seu estilo." />
      </div>
      <AreaTexto rotulo="Subtítulo" valor={b.subtitulo} mudar={(v) => mudar('subtitulo', v)} linhas={2} desativado={desativado} />
      <Campo rotulo="Botão" valor={b.cta} mudar={(v) => mudar('cta', v)} desativado={desativado} />
      <Campo rotulo="Vídeo (opcional)" valor={b.video} mudar={(v) => mudar('video', v)} desativado={desativado} mono placeholder="aula:1.1" dica={'"aula:1.1" usa uma aula marcada como grátis; o id de um vídeo do Bunny usa esse vídeo (a VSL).'} />
      <Campo rotulo="Texto em cima do vídeo" valor={b.video_rotulo} mudar={(v) => mudar('video_rotulo', v)} desativado={desativado} placeholder="Assista à aula 1 de graça" />
      <CampoImagem rotulo="Capa do vídeo (opcional)" valor={b.video_capa || ''} mudar={(v) => mudar('video_capa', v)} desativado={desativado} />
      <ListaTexto rotulo="Provas embaixo do botão" itens={b.provas} mudar={(v) => mudar('provas', v)} desativado={desativado} rotuloItem="Prova" />
    </>;
    case 'marquee': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>Duas fitas cruzadas com as palavras correndo, entre dois blocos.</p>
      <ListaTexto rotulo="Palavras" itens={b.itens} mudar={(v) => mudar('itens', v)} desativado={desativado} rotuloItem="Palavra" />
    </>;
    case 'historia': {
      const lado = (k: 'antes' | 'depois', nome: string) => {
        const x = b[k] || {};
        const m = (campo: string, v: any) => mudar(k, { ...x, [campo]: v });
        const notifs: any[] = Array.isArray(x.notificacoes) ? x.notificacoes : [];
        return <>
          <p className="campo-dica" style={{ margin: '10px 0 0', fontWeight: 600 }}>{nome}</p>
          <CampoImagem rotulo="Foto (4:5)" valor={x.foto || ''} mudar={(v) => m('foto', v)} desativado={desativado} />
          <Campo rotulo="Descrição da foto" valor={x.alt} mudar={(v) => m('alt', v)} desativado={desativado} />
          <Campo rotulo="Título" valor={x.titulo} mudar={(v) => m('titulo', v)} desativado={desativado} />
          <Campo rotulo="Trecho em destaque (opcional)" valor={x.destaque} mudar={(v) => m('destaque', v)} desativado={desativado} />
          <AreaTexto rotulo="Texto" valor={x.texto} mudar={(v) => m('texto', v)} linhas={2} desativado={desativado} />
          <ListaTexto rotulo="Lista (opcional)" itens={x.itens} mudar={(v) => m('itens', v)} desativado={desativado} />
          {k === 'antes' && <ListaTexto rotulo="Avisos vermelhos em cima da foto" itens={x.chips} mudar={(v) => m('chips', v)} desativado={desativado} rotuloItem="Aviso" />}
          {k === 'depois' && <>
            <p className="campo-dica" style={{ margin: '4px 0 0', fontWeight: 600 }}>Notificações em cima da foto</p>
            {notifs.map((n, i) => (
              <div className="item-lista" key={i}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10 }}>
                  <Campo rotulo="Hora" valor={n.hora} mudar={(v) => m('notificacoes', notifs.map((y, j) => (j === i ? { ...y, hora: v } : y)))} desativado={desativado} placeholder="08:00" />
                  <Campo rotulo="Texto" valor={n.texto} mudar={(v) => m('notificacoes', notifs.map((y, j) => (j === i ? { ...y, texto: v } : y)))} desativado={desativado} />
                </div>
                {!desativado && <button className="bt-icone" style={{ marginTop: 24 }} aria-label="Remover notificação" onClick={() => m('notificacoes', notifs.filter((_, j) => j !== i))}><Trash2 /></button>}
              </div>
            ))}
            {!desativado && <button className="bt bt-mini" onClick={() => m('notificacoes', [...notifs, { app: 'Claude', hora: '', texto: '' }])}><Plus />Notificação</button>}
          </>}
        </>;
      };
      return <>
        <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
        {lado('antes', 'Antes')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Campo rotulo="Nome da chave" valor={b.chave} mudar={(v) => mudar('chave', v)} desativado={desativado} placeholder="Modo automático" />
          <Campo rotulo="Frase embaixo da chave" valor={b.virada} mudar={(v) => mudar('virada', v)} desativado={desativado} />
        </div>
        {lado('depois', 'Depois')}
        <Campo rotulo="Nota no fim (opcional)" valor={b.nota} mudar={(v) => mudar('nota', v)} desativado={desativado} placeholder="Personagem de exemplo." />
      </>;
    }
    case 'simulacao': {
      const assuntos: any[] = Array.isArray(b.assuntos) ? b.assuntos : [];
      return <>
        <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Campo rotulo="Arquivo enviado" valor={b.arquivo} mudar={(v) => mudar('arquivo', v)} desativado={desativado} mono placeholder="04-radar.md" />
          <Campo rotulo="Nicho" valor={b.nicho} mudar={(v) => mudar('nicho', v)} desativado={desativado} placeholder="direito do consumidor" />
        </div>
        <p className="campo-dica" style={{ margin: '4px 0 0', fontWeight: 600 }}>Assuntos em alta (até 3, com a nota de calor de 0 a 100)</p>
        {assuntos.map((a, i) => (
          <div className="item-lista" key={i}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
              <Campo rotulo={`Assunto ${i + 1}`} valor={a.t} mudar={(v) => mudar('assuntos', assuntos.map((y, j) => (j === i ? { ...y, t: v } : y)))} desativado={desativado} />
              <Campo rotulo="Calor" valor={String(a.calor ?? '')} mudar={(v) => mudar('assuntos', assuntos.map((y, j) => (j === i ? { ...y, calor: Number(v) || 0 } : y)))} desativado={desativado} />
            </div>
            {!desativado && <button className="bt-icone" style={{ marginTop: 24 }} aria-label="Remover assunto" onClick={() => mudar('assuntos', assuntos.filter((_, j) => j !== i))}><Trash2 /></button>}
          </div>
        ))}
        {!desativado && assuntos.length < 3 && <button className="bt bt-mini" onClick={() => mudar('assuntos', [...assuntos, { t: '', calor: 70 }])}><Plus />Assunto</button>}
        <Campo rotulo="Título do post que o Claude escreve" valor={b.post_titulo} mudar={(v) => mudar('post_titulo', v)} desativado={desativado} />
        <CampoImagem rotulo="Arte do post (4:5)" valor={b.imagem || ''} mudar={(v) => mudar('imagem', v)} desativado={desativado} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Campo rotulo="Perfil" valor={b.perfil} mudar={(v) => mudar('perfil', v)} desativado={desativado} placeholder="flavio.adv" />
          <Campo rotulo="Palavra dos comentários" valor={b.palavra} mudar={(v) => mudar('palavra', v)} desativado={desativado} placeholder="VOO" />
          <Campo rotulo="Curtidas" valor={String(b.curtidas ?? '')} mudar={(v) => mudar('curtidas', Number(v) || 0)} desativado={desativado} />
        </div>
        <Campo rotulo="Notificação do Instagram" valor={b.dm} mudar={(v) => mudar('dm', v)} desativado={desativado} placeholder="128 novos comentários no seu post" />
      </>;
    }
    case 'dia': return <>
      <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo rotulo="Hora" valor={it.hora} mudar={(v) => mudarItem(i, { ...it, hora: v })} desativado={desativado} placeholder="7h" />
              <Campo rotulo="Quem faz" valor={it.quem} mudar={(v) => mudarItem(i, { ...it, quem: v })} desativado={desativado} placeholder="Claude ou Você" />
            </div>
            <AreaTexto rotulo="O quê" valor={it.texto} mudar={(v) => mudarItem(i, { ...it, texto: v })} linhas={2} desativado={desativado} />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { hora: '', quem: '', texto: '' }])}><Plus />Momento</button>}
      <Campo rotulo="Nota no fim (opcional)" valor={b.nota} mudar={(v) => mudar('nota', v)} desativado={desativado} />
    </>;
    case 'cards': return <>
      <Cabeca b={b} mudar={mudar} desativado={desativado} />
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <Campo rotulo={`Cartão ${i + 1}`} valor={it.titulo} mudar={(v) => mudarItem(i, { ...it, titulo: v })} desativado={desativado} />
            <AreaTexto rotulo="Texto" valor={it.texto} mudar={(v) => mudarItem(i, { ...it, texto: v })} linhas={2} desativado={desativado} />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { titulo: '', texto: '' }])}><Plus />Cartão</button>}
    </>;
    case 'estilos': return <>
      <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo rotulo={`Estilo ${i + 1}`} valor={it.nome} mudar={(v) => mudarItem(i, { ...it, nome: v })} desativado={desativado} placeholder="Elegante" />
              <Campo rotulo="Nicho" valor={it.nicho} mudar={(v) => mudarItem(i, { ...it, nicho: v })} desativado={desativado} placeholder="Eventos e marca pessoal" />
            </div>
            <ListaTexto rotulo="Imagens do carrossel (a primeira é a capa)" itens={it.imagens} mudar={(v) => mudarItem(i, { ...it, imagens: v })} desativado={desativado} rotuloItem="Imagem" />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { nome: '', nicho: '', imagens: [''] }])}><Plus />Estilo</button>}
    </>;
    case 'para_quem': return <>
      <ListaTexto rotulo="É para você se" itens={b.sim} mudar={(v) => mudar('sim', v)} desativado={desativado} />
      <ListaTexto rotulo="Não é para você se" itens={b.nao} mudar={(v) => mudar('nao', v)} desativado={desativado} />
    </>;
    case 'aulas': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>Os módulos, as aulas e as durações vêm do curso ligado ao produto. A aula marcada como grátis ganha o selo "Grátis".</p>
      <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
    </>;
    case 'kit': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>Os números e a lista vêm dos arquivos do curso.</p>
      <Cabeca b={b} mudar={mudar} desativado={desativado} texto />
    </>;
    case 'autor': return <>
      <Campo rotulo="Nome" valor={b.nome} mudar={(v) => mudar('nome', v)} desativado={desativado} />
      <Campo rotulo="Quem é" valor={b.papel} mudar={(v) => mudar('papel', v)} desativado={desativado} placeholder="Fundador da Agência Setup" />
      <CampoImagem rotulo="Foto (de preferência sem fundo)" valor={b.foto || ''} mudar={(v) => mudar('foto', v)} desativado={desativado} />
      <AreaTexto rotulo="Texto (Markdown)" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={5} desativado={desativado} />
      {/* Curso de leitura: a história de cada autor num cartão, a frase em destaque e a linha final (o selo). */}
      {itens.map((it, i) => (
        <div className="item-lista" key={i}>
          <div>
            <Campo rotulo={`Pessoa ${i + 1}`} valor={it.nome} mudar={(v) => mudarItem(i, { ...it, nome: v })} desativado={desativado} />
            <Campo rotulo="Credencial (curta)" valor={it.selo} mudar={(v) => mudarItem(i, { ...it, selo: v })} desativado={desativado} placeholder="Palestrante em encontros católicos" />
            <CampoImagem rotulo="Foto (opcional; sem foto, aparece a inicial)" valor={it.foto || ''} mudar={(v) => mudarItem(i, { ...it, foto: v })} desativado={desativado} />
            <AreaTexto rotulo="História" valor={it.texto} mudar={(v) => mudarItem(i, { ...it, texto: v })} linhas={4} desativado={desativado} />
          </div>
          {botaoTirar(i)}
        </div>
      ))}
      {!desativado && <button className="bt bt-mini" onClick={() => mudar('itens', [...itens, { nome: '', selo: '', foto: '', texto: '' }])}><Plus />Pessoa com história (curso de leitura)</button>}
      {itens.length ? <>
        <AreaTexto rotulo="Frase em destaque" valor={b.destaque || ''} mudar={(v) => mudar('destaque', v)} linhas={2} desativado={desativado} />
        <Campo rotulo="Linha final (com o selo)" valor={b.fecho || ''} mudar={(v) => mudar('fecho', v)} desativado={desativado} />
      </> : null}
      <ListaTexto rotulo={'Números (escreva "número|texto", ex.: 128 mil|seguidores)'} itens={b.numeros} mudar={(v) => mudar('numeros', v)} desativado={desativado} rotuloItem="Número" />
    </>;
    case 'garantia': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>Os dias vêm da oferta.</p>
      <Campo rotulo="Título (opcional)" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} placeholder="7 dias de garantia" />
      <AreaTexto rotulo="Texto" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={2} desativado={desativado} />
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
    case 'ajudante': return <>
      <Campo rotulo="Olho (opcional)" valor={b.olho} mudar={(v) => mudar('olho', v)} desativado={desativado} />
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      <AreaTexto rotulo="Texto" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={3} desativado={desativado} dica="Ao lado, a página mostra um exemplo de print e a resposta pronta." />
    </>;
    case 'exemplo': return <>
      <Campo rotulo="Olho (opcional)" valor={b.olho} mudar={(v) => mudar('olho', v)} desativado={desativado} />
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      <Campo rotulo="Código da dúvida" valor={b.codigo} mudar={(v) => mudar('codigo', v)} desativado={desativado} placeholder="3.4" dica="O código que aparece em Área de membros > Cursos e aulas. A página mostra a imagem, a resposta rápida, o primeiro versículo e o &quot;diga&quot; dela." />
    </>;
    case 'depoimentos': return <>
      <p className="campo-dica" style={{ marginTop: 0 }}>Os depoimentos aprovados dos alunos entram sozinhos. Sem nenhum, o bloco não aparece.</p>
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
      <p className="campo-dica" style={{ marginTop: 0 }}>Preço, Pix e parcelas vêm da oferta ativa do produto. O botão leva ao checkout dela.</p>
      <Cabeca b={b} mudar={mudar} desativado={desativado} />
      <ListaTexto rotulo="O que inclui (em branco, usa a lista do checkout)" itens={b.itens} mudar={(v) => mudar('itens', v)} desativado={desativado} />
      <AreaTexto rotulo="Frase embaixo do botão" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={2} desativado={desativado} placeholder="O acesso chega no seu e-mail assim que o pagamento for aprovado." />
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
      <Campo rotulo="Texto gigante (opcional)" valor={b.grande} mudar={(v) => mudar('grande', v)} desativado={desativado} placeholder="Amanhã, 8h" />
      <Campo rotulo="Título" valor={b.titulo} mudar={(v) => mudar('titulo', v)} desativado={desativado} />
      <Campo rotulo="Trecho em destaque (opcional)" valor={b.destaque} mudar={(v) => mudar('destaque', v)} desativado={desativado} />
      <AreaTexto rotulo="Texto (opcional)" valor={b.texto} mudar={(v) => mudar('texto', v)} linhas={2} desativado={desativado} />
      <Campo rotulo="Botão" valor={b.cta} mudar={(v) => mudar('cta', v)} desativado={desativado} />
    </>;
    default: return <p className="mudo">Bloco de tipo desconhecido ({b.tipo}). O site ignora.</p>;
  }
}
