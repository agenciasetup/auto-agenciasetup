// O link do player do Bunny Stream, assinado pelo Worker (SHA-256 da chave do token + id + validade de 6 horas).
// Sem a chave do token, sai sem assinatura (a biblioteca precisa estar sem a proteção de token).
export async function videoBunny(env, id, extra = 'autoplay=false&preload=true&responsive=true') {
  const base = `https://player.mediadelivery.net/embed/${env.BUNNY_BIBLIOTECA}/${id}`;
  if (!env.BUNNY_TOKEN) return { tipo: 'bunny', id, url: `${base}?${extra}` };
  const expira = Math.floor(Date.now() / 1000) + 6 * 3600;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.BUNNY_TOKEN}${id}${expira}`));
  const token = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { tipo: 'bunny', id, url: `${base}?token=${token}&expires=${expira}&${extra}` };
}
