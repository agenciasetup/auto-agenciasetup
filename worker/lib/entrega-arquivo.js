// Entrega de arquivo com licença (11/11/2026, a Família Calango; escolha do dono: "E-mail com link").
// A venda paga entra na lista (acoes-arquivos.js, arquivosPendentes). No Mac, o Claude faz a cópia identificada
// (montar.py: o número do pedido dentro de cada fonte e o certificado com o nome) e sobe o zip por um link de envio
// que vence (linkDeEnvio): o Mac não precisa de senha do banco. Marcado o "pronto", o comprador recebe o link da
// tela de download (/arquivo/<pedido_id>), que pede o aceite de novo e só então abre um link do zip que vence em
// minutos (linkParaBaixar).
//
// Travas: o zip fica só no bucket privado "curso", na pasta licencas/ (nunca no "midia", que é público). A marca de
// pronto mora em config 'entregas_arquivo' ({ <pedido_id>: { caminho, bytes, pronto_em, por, enviado_em, nota } }),
// sem tabela nova, como a do Combo (acoes-entregas.js). A oferta liga com checkout.entrega = { tipo: 'arquivo',
// o_que, prazo }.
import { db } from '../nucleo/db.js';

export const BUCKET = 'curso';
export const CHAVE_MARCAS = 'entregas_arquivo';
// licencas/<produto>/<numero>-<letras>.zip: o número do pedido e um pedaço sorteado (o caminho não se adivinha).
export const CAMINHO = /^licencas\/[a-z0-9-]{2,60}\/[0-9]{1,10}-[a-z0-9]{8,32}\.zip$/;

// A entrega de arquivo de uma oferta: checkout.entrega = { tipo: 'arquivo', o_que, prazo }. Nula nas outras.
export function arquivoDe(oferta) {
  const e = oferta && oferta.checkout && oferta.checkout.entrega;
  return e && e.tipo === 'arquivo' ? { o_que: e.o_que || null, prazo: e.prazo || null } : null;
}

export async function marcasDeArquivo(env) {
  return ((await db.um(env, 'config', { chave: `eq.${CHAVE_MARCAS}` })) || {}).valor || {};
}
export async function marcaDoArquivo(env, pedidoId) {
  return (await marcasDeArquivo(env))[pedidoId] || null;
}
// Grava (ou apaga, com null) a marca de um pedido. Lê e regrava a lista inteira: são poucas vendas por dia.
export async function gravarMarcaDoArquivo(env, pedidoId, marca) {
  const m = await marcasDeArquivo(env);
  if (marca) m[pedidoId] = marca; else delete m[pedidoId];
  await db.insert(env, 'config', { chave: CHAVE_MARCAS, valor: m }, { upsert: true, conflito: 'chave', select: 'chave' });
  return m[pedidoId] || null;
}

const cabecalho = (env) => {
  const k = env.SUPABASE_SECRET_KEY;
  return { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'content-type': 'application/json' };
};
const caminhoUrl = (c) => c.split('/').map(encodeURIComponent).join('/');

// Link de envio que vence (2 horas): quem tem o link sobe UM arquivo naquele caminho, sem chave do banco.
export async function linkDeEnvio(env, caminho) {
  if (!CAMINHO.test(caminho)) throw new Error('caminho fora da pasta licencas/');
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${caminhoUrl(caminho)}`, { method: 'POST', headers: { ...cabecalho(env), 'x-upsert': 'true' }, body: '{}' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error(`o banco de arquivos não deu o link de envio (${r.status} ${d.message || d.error || ''})`);
  return `${env.SUPABASE_URL}/storage/v1${d.url}`;
}

// O arquivo já está lá? Devolve o tamanho em bytes, ou null.
export async function arquivoGuardado(env, caminho) {
  if (!CAMINHO.test(caminho)) return null;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/info/${BUCKET}/${caminhoUrl(caminho)}`, { headers: cabecalho(env) });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return Number(d.size || (d.metadata && d.metadata.size) || 0) || 0;
}

// Link do zip que vence (padrão 10 minutos), já com o nome que o arquivo ganha ao baixar.
export async function linkParaBaixar(env, caminho, nome, segundos = 600) {
  if (!CAMINHO.test(caminho)) return null;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${caminhoUrl(caminho)}`, { method: 'POST', headers: cabecalho(env), body: JSON.stringify({ expiresIn: segundos }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.signedURL) return null;
  return `${env.SUPABASE_URL}/storage/v1${d.signedURL}&download=${encodeURIComponent(nome)}`;
}

// Apaga o zip (pedido devolvido ou cópia refeita). Sem erro se ele já não existe.
export async function apagarArquivo(env, caminho) {
  if (!CAMINHO.test(caminho)) return false;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: cabecalho(env), body: JSON.stringify({ prefixes: [caminho] }) });
  return r.ok;
}

// O endereço da tela de download do pedido (o id do pedido é o segredo, como o PDF do curso de leitura).
export const telaDoArquivo = (env, pedidoId) => `${env.SITE_URL || 'https://agenciasetup.com.br'}/arquivo/${pedidoId}`;
