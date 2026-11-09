// Cursos com marca e endereço próprios (o primeiro é o "Dúvidas da Fé", em duvidasdafe.agenciasetup.com.br).
// O mesmo Worker, o mesmo banco e o mesmo painel: o endereço decide a cara (app do aluno, checkout, obrigado e e-mails).
// A marca mora em cursos.marca: { nome, dominio, tema, autores, whatsapp, pdf_arquivo_id, cor, idioma }. Curso sem marca é
// da Setup. tema "leitura": o leitor (Dúvidas da Fé); tema "video": o app do aluno de sempre. idioma "en": o curso em
// inglês (página de venda, checkout em dólar, app e e-mails em inglês).
import { db } from '../nucleo/db.js';

const CAMPOS = 'id,slug,titulo,subtitulo,capa_url,status,marca';
const guardadas = new Map();

function daLinha(env, c) {
  if (!c || !c.marca || !c.marca.dominio) return null;
  const m = c.marca;
  return {
    nome: m.nome || c.titulo, dominio: m.dominio, tema: m.tema || 'leitura', autores: m.autores || null, whatsapp: m.whatsapp || null,
    pdf_arquivo_id: m.pdf_arquivo_id || null, cor: m.cor || null, idioma: m.idioma === 'en' ? 'en' : 'pt',
    curso: { id: c.id, slug: c.slug, titulo: c.titulo, subtitulo: c.subtitulo, capa_url: c.capa_url, status: c.status },
    url: urlDaMarca(env, m.dominio),
  };
}

// No computador, a segunda instância do app (npm run dev:duvidas) finge ser o endereço da marca: MARCA_LOCAL no --var.
export function urlDaMarca(env, dominio) {
  if (env.AMBIENTE === 'local' && env.MARCA_LOCAL === dominio) return (env.MARCA_LOCAL_URL || 'http://localhost:8789').replace(/\/+$/, '');
  return `https://${dominio}`;
}

// A marca do endereço (ou null, se o endereço é da Setup). Guarda por 1 minuto em cada instância do Worker.
// Um endereço pode ter mais de um curso (agenciasetup.com: o de posts e o de vídeos em inglês): a marca é a do curso
// principal (marca.principal, senão o mais antigo), que dá a página de venda da raiz, e .cursos lista todos (o app mostra os
// que a pessoa tem entre eles).
export async function marcaPorHost(env, host) {
  const dominio = env.AMBIENTE === 'local' && env.MARCA_LOCAL ? env.MARCA_LOCAL : String(host || '').toLowerCase();
  if (!dominio || dominio === 'agenciasetup.com.br' || dominio.startsWith('curso.') || dominio === 'localhost') return null;
  const g = guardadas.get(dominio);
  if (g && g.ate > Date.now()) return g.marca;
  const linhas = await db.select(env, 'cursos', { filtros: { 'marca->>dominio': `eq.${dominio}`, status: 'neq.arquivado' }, select: `${CAMPOS},criado_em`, ordem: 'criado_em.asc' }).catch(() => []);
  const c = linhas.find((x) => x.marca && x.marca.principal) || linhas[0] || null;
  const marca = daLinha(env, c);
  if (marca) marca.cursos = linhas.map((x) => x.id);
  guardadas.set(dominio, { marca, ate: Date.now() + 60_000 });
  return marca;
}

// Os cursos com marca própria (id -> marca, ou null se a marca ainda não tem endereço). O app da Setup não mostra estes
// cursos: quem tem um deles vê o botão para o app do curso (acesso.js e api/aluno.js). Guarda por 1 minuto.
let comMarca = { ate: 0, mapa: null };
export async function cursosComMarca(env) {
  if (comMarca.mapa && comMarca.ate > Date.now()) return comMarca.mapa;
  const linhas = await db.select(env, 'cursos', { filtros: { marca: 'not.is.null', status: 'neq.arquivado' }, select: CAMPOS });
  comMarca = { ate: Date.now() + 60_000, mapa: new Map(linhas.map((c) => [c.id, daLinha(env, c)])) };
  return comMarca.mapa;
}

// A marca de um pedido: a do primeiro curso com marca entre os produtos comprados.
export async function marcaDoPedido(env, itens) {
  const produtos = [...new Set((itens || []).map((i) => i.produto_id).filter(Boolean))];
  if (!produtos.length) return null;
  const acessos = await db.select(env, 'produto_acessos', { filtros: { produto_id: `in.(${produtos.join(',')})` }, select: `curso:cursos(${CAMPOS})` }).catch(() => []);
  const c = acessos.map((a) => a.curso).find((x) => x && x.marca && x.marca.dominio);
  return c ? daLinha(env, c) : null;
}

// A marca de uma oferta (o checkout e o obrigado usam para a cara e para o endereço de volta do cartão).
export async function marcaDaOferta(env, oferta) {
  return oferta && oferta.produto_id ? marcaDoPedido(env, [{ produto_id: oferta.produto_id }]) : null;
}

// Link assinado do PDF do curso (bucket privado "curso"). O e-mail usa um de 1 hora (o Resend busca o anexo na hora do
// envio); o botão "Baixar o PDF" pede um de 10 minutos a cada clique, pelo /checkout/pdf.
export async function linkDoPdf(env, marca, segundos = 600) {
  if (!marca || !marca.pdf_arquivo_id) return null;
  const f = await db.um(env, 'arquivos', { id: `eq.${marca.pdf_arquivo_id}` }, 'id,nome,caminho,origem,bytes');
  if (!f || f.origem !== 'storage' || !f.caminho) return null;
  const k = env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/curso/${f.caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn: segundos }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.signedURL) return null;
  const nome = f.caminho.split('/').pop();
  return { url: `${env.SUPABASE_URL}/storage/v1${d.signedURL}&download=${encodeURIComponent(nome)}`, nome, bytes: f.bytes || null };
}

// O PDF de um pedido pago (o botão do obrigado e o do e-mail): o id do pedido é o segredo, e vale enquanto o pedido estiver pago.
export async function pdfDoPedido(env, pedidoId) {
  if (!/^[0-9a-f-]{36}$/.test(String(pedidoId))) return null;
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'id,status,itens');
  if (!p || p.status !== 'pago') return null;
  const marca = await marcaDoPedido(env, p.itens);
  return marca ? linkDoPdf(env, marca) : null;
}
