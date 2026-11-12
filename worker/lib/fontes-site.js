// As fontes do site público (pedido do dono em 11/11/2026: "use nossas fontes, mas não deixe exposto pra baixar").
// Os arquivos ficam em public/_f/ (fora do Git: o repositório é público), recortados e com nomes neutros; quem gera é
// _local/fontes-site/gerar.py. Esta porta só entrega quando o pedido é de fonte e vem de uma página nossa: o link direto,
// outro site, robô sem cabeçalho e nome fora da lista ficam sem arquivo. Não é cofre (o navegador precisa baixar a fonte
// para desenhar a página), é para dar trabalho e deixar o que vaza recortado e sem nome.

// Só estes arquivos existem. Nome novo entra aqui e no gerar.py.
const ARQUIVOS = new Set([
  'r4t9w.woff2', 'm1v7c.woff2', 'h6p3z.woff2', 'b2n8x.woff2', 'q5j2d.woff2', // sans 400 a 700 e a serifada itálica (11/11)
  'k3w8n.woff2', 'e7y2p.woff2', 't9c4f.woff2', 'u2g6s.woff2', 'z8d1k.woff2', // sans Light e os itálicos (12/11)
  'a5r7h.woff2', 'n4x6b.woff2', 'w1m3q.woff2', 'p7f5v.woff2', // serifada reta, bold, bold itálica e a assinatura (12/11)
]);

// Domínios nossos: os dois sites e os subdomínios (curso., duvidasdafe.). No computador, também o localhost.
function ehNosso(endereco, local) {
  let u;
  try { u = new URL(endereco); } catch { return false; }
  const h = u.hostname;
  if (local && (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost'))) return u.protocol === 'http:' || u.protocol === 'https:';
  if (u.protocol !== 'https:') return false;
  return h === 'agenciasetup.com.br' || h.endsWith('.agenciasetup.com.br') || h === 'agenciasetup.com' || h.endsWith('.agenciasetup.com');
}

const negado = (status) => new Response(status === 404 ? 'Não encontrado.' : 'Acesso negado.', {
  status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', vary: 'Origin, Referer, Sec-Fetch-Dest' },
});

export async function fonteDoSite(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return negado(405);
  const nome = url.pathname.slice('/_f/'.length);
  if (!ARQUIVOS.has(nome)) return negado(404);
  // O navegador diz para que quer o arquivo. Aba aberta no link direto vem como "document": não entrega.
  const destino = request.headers.get('Sec-Fetch-Dest');
  if (destino && destino !== 'font') return negado(403);
  // Precisa dizer de onde veio, e ser de uma página nossa. Navegador antigo sem Sec-Fetch-Dest cai só nesta.
  const origem = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  if (!origem && !referer) return negado(403);
  const local = env.AMBIENTE === 'local';
  if (origem && !ehNosso(origem, local)) return negado(403);
  if (referer && !ehNosso(referer, local)) return negado(403);

  const r = await env.ASSETS.fetch(new Request(new URL(`/_f/${nome}`, url.origin)));
  if (!r.ok) return negado(404);
  const h = new Headers({
    'content-type': 'font/woff2',
    'cross-origin-resource-policy': 'same-site',
    'x-content-type-options': 'nosniff',
    // Guarda só no navegador de quem visita, nunca num cache no meio do caminho (ele entregaria para qualquer um).
    'cache-control': 'private, max-age=2592000',
    vary: 'Origin, Referer, Sec-Fetch-Dest',
  });
  // Sem Access-Control-Allow-Origin: cada domínio nosso pede a fonte ao próprio endereço (/_f/ no CSS), então nenhuma
  // página de outra origem consegue usar o arquivo, mesmo que o pedido passasse.
  return new Response(request.method === 'HEAD' ? null : r.body, { status: 200, headers: h });
}
