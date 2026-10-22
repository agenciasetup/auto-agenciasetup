// Cursos e anúncios: produtos (o que vendemos), landing pages (onde vendemos) e anúncios (como aparecem no site).
import { useEffect, useState } from 'react';
import { GraduationCap, ImagePlus, LayoutTemplate, Megaphone, Plus, Save } from 'lucide-react';
import { enviarArquivo, get, patch, post } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import {
  Abas, AreaTexto, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Grupo, Marcar, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao,
} from '../nucleo/ui';
import { centavosDe, dinheiro, doCampoData, listaDeTexto, numero, paraCampoData, textoDeCentavos, textoDeLista } from '../nucleo/util';
import { EtiquetaConteudo } from './comum';

export default function Cursos() {
  const { rota, ir } = useRota();
  const inicial = rota.busca.get('aba');
  const [aba, setAba] = useState(inicial === 'landing-pages' || inicial === 'anuncios' ? inicial : 'produtos');
  useEffect(() => { document.title = 'Cursos e anúncios | Painel Agência Setup'; }, []);
  const trocar = (a: string) => { setAba(a); ir(`/cursos?aba=${a}`, { trocar: true }); };
  return (
    <div className="tela">
      <Titulo titulo="Cursos e anúncios" sub="O que vendemos, onde vendemos e como aparece no site." />
      <Abas abas={[{ id: 'produtos', t: 'Produtos' }, { id: 'landing-pages', t: 'Landing pages' }, { id: 'anuncios', t: 'Anúncios' }]} atual={aba} mudar={trocar} />
      {aba === 'produtos' && <Produtos />}
      {aba === 'landing-pages' && <LandingPages />}
      {aba === 'anuncios' && <Anuncios />}
    </div>
  );
}

// ---------------------------------------------------------------- produtos
const PRODUTO_VAZIO = { nome: '', slug: '', chamada: '', descricao: '', preco: '', preco_de: '', link_checkout: '', imagem_url: '', tags: '', ativo: true };

function Produtos() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/produtos'), []);
  const [editando, setEditando] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const podeEditar = pode('cursos.editar');

  const abrir = (p?: any) => setEditando(p ? {
    id: p.id, nome: p.nome || '', slug: p.slug || '', chamada: p.chamada || '', descricao: p.descricao || '', preco: textoDeCentavos(p.preco_centavos),
    preco_de: textoDeCentavos(p.preco_de_centavos), link_checkout: p.link_checkout || '', imagem_url: p.imagem_url || '', tags: textoDeLista(p.tags), ativo: p.ativo !== false,
  } : { ...PRODUTO_VAZIO });
  const mudar = (k: string, v: any) => setEditando((e: any) => ({ ...e, [k]: v }));

  const salvar = () => rodar('salvar', async () => {
    if (!editando.nome.trim()) throw new Error('Dê um nome ao produto.');
    const corpo: any = {
      nome: editando.nome, chamada: editando.chamada, descricao: editando.descricao, preco_centavos: centavosDe(editando.preco), preco_de_centavos: centavosDe(editando.preco_de),
      link_checkout: editando.link_checkout, imagem_url: editando.imagem_url, tags: listaDeTexto(editando.tags), ativo: editando.ativo,
    };
    if (editando.slug) corpo.slug = editando.slug;
    if (editando.id) await patch(`/produtos/${editando.id}`, corpo); else await post('/produtos', corpo);
    setEditando(null);
    recarregar();
  }, 'Produto salvo.');

  return <>
    {podeEditar && <div className="barra-acoes barra-acoes-fim" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => abrir()}><Plus />Novo produto</button></div>}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && (dados.length ? (
      <Grupo>
        {dados.map((p: any) => (
          <Celula key={p.id} icone={<GraduationCap />} cor={p.ativo ? 'laranja' : undefined} titulo={p.nome}
            sub={[dinheiro(p.preco_centavos), p.chamada].filter(Boolean).join(' · ') || 'Sem preço'}
            direita={p.ativo ? <Etiqueta cor="verde">Ativo</Etiqueta> : <Etiqueta>Pausado</Etiqueta>}
            onClick={podeEditar ? () => abrir(p) : undefined} />
        ))}
      </Grupo>
    ) : <Vazio titulo="Nenhum produto cadastrado." texto="Cadastre os cursos com preço e link de pagamento. Eles alimentam as landing pages e os anúncios do site."
      acao={podeEditar ? <button className="bt bt-tinta" onClick={() => abrir()}><Plus />Cadastrar curso</button> : undefined} />)}

    <Modal titulo={editando?.id ? 'Editar produto' : 'Novo produto'} aberto={!!editando} fechar={() => setEditando(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setEditando(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button></>}>
      {editando && <>
        <Campo rotulo="Nome" valor={editando.nome} mudar={(v) => mudar('nome', v)} autoFocus />
        <Campo rotulo="Endereço (slug)" valor={editando.slug} mudar={(v) => mudar('slug', v)} mono dica="Em branco, sai do nome." />
        <Campo rotulo="Chamada" valor={editando.chamada} mudar={(v) => mudar('chamada', v)} dica="Uma frase que vende. Aparece nos anúncios." />
        <AreaTexto rotulo="Descrição" valor={editando.descricao} mudar={(v) => mudar('descricao', v)} linhas={3} />
        <div className="linha-campos">
          <Campo rotulo="Preço (R$)" valor={editando.preco} mudar={(v) => mudar('preco', v)} placeholder="197,00" />
          <Campo rotulo="Preço antigo (R$)" valor={editando.preco_de} mudar={(v) => mudar('preco_de', v)} placeholder="Opcional" />
        </div>
        <Campo rotulo="Link de pagamento" valor={editando.link_checkout} mudar={(v) => mudar('link_checkout', v)} placeholder="https://" />
        <CampoImagem rotulo="Imagem" valor={editando.imagem_url} mudar={(v) => mudar('imagem_url', v)} />
        <Campo rotulo="Tags" valor={editando.tags} mudar={(v) => mudar('tags', v)} dica="Separadas por vírgula." />
        <Marcar rotulo="Ativo" valor={editando.ativo} mudar={(v) => mudar('ativo', v)} dica="Produto pausado não aparece em anúncios." />
      </>}
    </Modal>
  </>;
}

// Campo de imagem: endereço ou envio para o Storage (bucket midia).
export function CampoImagem({ rotulo, valor, mudar, desativado }: { rotulo: string; valor: string; mudar: (v: string) => void; desativado?: boolean }) {
  const { pode } = useSessao();
  const { ocupado, rodar } = useAcao();
  return (
    <div className="campo">
      <label>{rotulo}</label>
      {valor && <img src={valor} alt="" style={{ maxWidth: 160, borderRadius: 8, border: '1px solid var(--borda)' }} />}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={valor || ''} onChange={(e) => mudar(e.target.value)} placeholder="https://" className="mono" disabled={desativado}
          style={{ flex: 1, minWidth: 0, background: 'var(--fundo)', border: '1px solid var(--borda-forte)', borderRadius: 10, padding: '10px 12px' }} />
        {!desativado && pode('arquivos.enviar') && (
          <label className="bt" title="Enviar imagem"><ImagePlus />{ocupado ? '…' : 'Enviar'}
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (f) rodar('img', async () => { const r = await enviarArquivo(f, 'midia'); mudar(r.url); }, 'Imagem enviada.');
            }} />
          </label>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- landing pages
function LandingPages() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/landing-pages'), []);
  const podeEditar = pode('cursos.editar');
  return <>
    {podeEditar && <div className="barra-acoes barra-acoes-fim" style={{ marginBottom: 12 }}><Link className="bt bt-tinta" para="/cursos/landing-pages/novo"><Plus />Nova landing page</Link></div>}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && (dados.length ? (
      <Grupo>
        {dados.map((l: any) => (
          <Celula key={l.id} para={`/cursos/landing-pages/${l.id}`} icone={<LayoutTemplate />} cor={l.status === 'publicado' ? 'verde' : undefined}
            titulo={l.titulo} sub={`/cursos/${l.slug}`} direita={<EtiquetaConteudo status={l.status} />} />
        ))}
      </Grupo>
    ) : <Vazio titulo="Nenhuma landing page ainda." texto="Monte a página de venda de um curso por blocos: chamada, o que aprende, depoimentos, preço e perguntas."
      acao={podeEditar ? <Link className="bt bt-tinta" para="/cursos/landing-pages/novo"><Plus />Criar landing page</Link> : undefined} />)}
  </>;
}

// ---------------------------------------------------------------- anúncios
const POSICOES = [{ v: 'topo', t: 'Topo' }, { v: 'meio', t: 'Meio' }, { v: 'lateral', t: 'Lateral' }, { v: 'fim', t: 'Fim' }];
const ANUNCIO_VAZIO = { produto_id: '', titulo: '', texto: '', cta: 'Quero conhecer', imagem_url: '', link: '', alvo_tags: '', alvo_categorias: [] as number[], posicoes: ['meio', 'fim'], peso: '1', ativo: true, inicio: '', fim: '' };

function Anuncios() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/anuncios'), []);
  const produtos = useCarregar(() => get('/produtos'), []);
  const cats = useCarregar(() => get('/categorias'), []);
  const [editando, setEditando] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const podeEditar = pode('cursos.editar');

  const abrir = (a?: any) => setEditando(a ? {
    id: a.id, produto_id: a.produto_id || '', titulo: a.titulo || '', texto: a.texto || '', cta: a.cta || '', imagem_url: a.imagem_url || '', link: a.link || '',
    alvo_tags: textoDeLista(a.alvo_tags), alvo_categorias: a.alvo_categorias || [], posicoes: a.posicoes || [], peso: String(a.peso || 1), ativo: a.ativo !== false,
    inicio: paraCampoData(a.inicio), fim: paraCampoData(a.fim),
  } : { ...ANUNCIO_VAZIO });
  const mudar = (k: string, v: any) => setEditando((e: any) => ({ ...e, [k]: v }));
  const alternar = (k: string, v: any) => setEditando((e: any) => ({ ...e, [k]: e[k].includes(v) ? e[k].filter((x: any) => x !== v) : [...e[k], v] }));

  const salvar = () => rodar('salvar', async () => {
    if (!editando.titulo.trim()) throw new Error('Dê um título ao anúncio.');
    if (!editando.posicoes.length) throw new Error('Escolha pelo menos uma posição.');
    const corpo = {
      produto_id: editando.produto_id || null, titulo: editando.titulo, texto: editando.texto, cta: editando.cta || 'Quero conhecer', imagem_url: editando.imagem_url, link: editando.link,
      alvo_tags: listaDeTexto(editando.alvo_tags), alvo_categorias: editando.alvo_categorias, posicoes: editando.posicoes,
      peso: Math.min(100, Math.max(1, parseInt(editando.peso, 10) || 1)), ativo: editando.ativo, inicio: doCampoData(editando.inicio), fim: doCampoData(editando.fim),
    };
    if (editando.id) await patch(`/anuncios/${editando.id}`, corpo); else await post('/anuncios', corpo);
    setEditando(null);
    recarregar();
  }, 'Anúncio salvo.');

  const nomeProduto = (id: string) => ((produtos.dados as any[]) || []).find((p: any) => p.id === id)?.nome;
  return <>
    {podeEditar && <div className="barra-acoes barra-acoes-fim" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => abrir()}><Plus />Novo anúncio</button></div>}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados && <Carregando />}
    {dados && (dados.length ? (
      <Grupo rodape="O site escolhe o anúncio pelo assunto da página: quem tem tag ou categoria em comum ganha; o peso desempata. Sem alvo, aparece em qualquer página.">
        {dados.map((a: any) => {
          const taxa = a.impressoes ? ((a.cliques / a.impressoes) * 100).toFixed(1).replace('.', ',') : '0';
          return (
            <Celula key={a.id} icone={<Megaphone />} cor={a.ativo ? 'laranja' : undefined} titulo={a.titulo}
              sub={`${nomeProduto(a.produto_id) || 'Sem produto'} · ${numero(a.impressoes)} vezes na tela · ${numero(a.cliques)} cliques (${taxa}%)`}
              direita={a.ativo ? <Etiqueta cor="verde">No ar</Etiqueta> : <Etiqueta>Pausado</Etiqueta>}
              onClick={podeEditar ? () => abrir(a) : undefined} />
          );
        })}
      </Grupo>
    ) : <Vazio titulo="Nenhum anúncio ainda." texto="Anúncios dos nossos cursos aparecem nas páginas do site cujo assunto combina com eles."
      acao={podeEditar ? <button className="bt bt-tinta" onClick={() => abrir()}><Plus />Criar anúncio</button> : undefined} />)}

    <Modal titulo={editando?.id ? 'Editar anúncio' : 'Novo anúncio'} aberto={!!editando} fechar={() => setEditando(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setEditando(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button></>}>
      {editando && <>
        <Escolha rotulo="Produto" valor={editando.produto_id} mudar={(v) => mudar('produto_id', v)}
          opcoes={[{ v: '', t: 'Nenhum (usa o link abaixo)' }, ...(((produtos.dados as any[]) || []).map((p: any) => ({ v: p.id, t: p.nome })))]} />
        <Campo rotulo="Título" valor={editando.titulo} mudar={(v) => mudar('titulo', v)} autoFocus />
        <AreaTexto rotulo="Texto" valor={editando.texto} mudar={(v) => mudar('texto', v)} linhas={2} />
        <div className="linha-campos">
          <Campo rotulo="Botão" valor={editando.cta} mudar={(v) => mudar('cta', v)} />
          <Campo rotulo="Peso (1 a 100)" tipo="number" min={1} max={100} valor={editando.peso} mudar={(v) => mudar('peso', v)} />
        </div>
        <Campo rotulo="Link (opcional)" valor={editando.link} mudar={(v) => mudar('link', v)} placeholder="https://" dica="Em branco, vai para a landing page do produto." />
        <CampoImagem rotulo="Imagem" valor={editando.imagem_url} mudar={(v) => mudar('imagem_url', v)} />
        <div className="campo"><label>Posições</label>
          <div className="chips">{POSICOES.map((p) => <button type="button" key={p.v} className={`chip ${editando.posicoes.includes(p.v) ? 'ativo' : ''}`} onClick={() => alternar('posicoes', p.v)}>{p.t}</button>)}</div>
        </div>
        <Campo rotulo="Tags do assunto" valor={editando.alvo_tags} mudar={(v) => mudar('alvo_tags', v)} dica="Separadas por vírgula. Páginas com essas tags preferem este anúncio." />
        <div className="campo"><label>Categorias</label>
          <div className="chips">{(((cats.dados as any[]) || [])).map((c: any) => <button type="button" key={c.id} className={`chip ${editando.alvo_categorias.includes(c.id) ? 'ativo' : ''}`} onClick={() => alternar('alvo_categorias', c.id)}>{c.nome}</button>)}</div>
        </div>
        <div className="linha-campos">
          <Campo rotulo="Começa em" tipo="datetime-local" valor={editando.inicio} mudar={(v) => mudar('inicio', v)} />
          <Campo rotulo="Termina em" tipo="datetime-local" valor={editando.fim} mudar={(v) => mudar('fim', v)} />
        </div>
        <Marcar rotulo="No ar" valor={editando.ativo} mudar={(v) => mudar('ativo', v)} />
      </>}
    </Modal>
  </>;
}
