// Web Push sem biblioteca, só com o WebCrypto do Worker: o conteúdo cifrado (RFC 8291, "aes128gcm" da RFC 8188) e a
// assinatura do servidor (VAPID, RFC 8292). É o que o iPhone (Safari 16.4+, app na tela de início), o Chrome, o Edge e
// o Firefox aceitam. Sem banco aqui: dá para testar no Node (scripts/conferir-push.mjs usa o exemplo da RFC 8291).
const enc = new TextEncoder();

export const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function deB64u(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
}
const junta = (...partes) => {
  const r = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of partes) { r.set(p, o); o += p.length; }
  return r;
};
const ZERO = new Uint8Array([0]);

async function hkdf(sal, ikm, info, bytes) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, bytes * 8));
}

// Os serviços de push de verdade. O endereço vem do navegador da pessoa: qualquer outro é recusado (o Worker nunca
// faz pedido para um endereço escolhido de fora).
const SERVICOS = [/^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
export function endpointAceito(endpoint) {
  try {
    const u = new URL(String(endpoint || ''));
    return u.protocol === 'https:' && SERVICOS.some((re) => re.test(u.hostname)) && String(endpoint).length <= 1000;
  } catch {
    return false;
  }
}

// As chaves do servidor (P-256). A pública vai para o navegador na hora de ligar os avisos; a privada fica cifrada no banco.
export async function novasChaves() {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica: b64u(publica), privada: { d: jwk.d, x: jwk.x, y: jwk.y } };
}

// "vapid t=<JWT>, k=<chave pública>": o serviço de push confere que o aviso saiu de quem a pessoa autorizou.
// contato: uma URL https (ou mailto:) de quem manda, exigida pela Apple.
export async function cabecalhoVapid(endpoint, chaves, contato, agora = Date.now()) {
  const cab = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(agora / 1000) + 12 * 3600, sub: contato })));
  const k = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', ...chaves.privada, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const ass = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, enc.encode(`${cab}.${corpo}`)));
  return `vapid t=${cab}.${corpo}.${b64u(ass)}, k=${chaves.publica}`;
}

// Cifra o texto para um aparelho (p256dh e auth vêm da inscrição dele). sal e efemera só nos testes.
export async function cifrarParaAparelho(texto, p256dh, auth, { sal, efemera } = {}) {
  const uaPublica = deB64u(p256dh);
  const segredo = deB64u(auth);
  if (uaPublica.length !== 65 || segredo.length < 16) throw new Error('Inscrição de push inválida.');
  const par = efemera || (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const uaChave = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChave }, par.privateKey, 256));
  const ikm = await hkdf(segredo, ecdh, junta(enc.encode('WebPush: info'), ZERO, uaPublica, asPublica), 32);
  const s = sal || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(s, ikm, junta(enc.encode('Content-Encoding: aes128gcm'), ZERO), 16);
  const nonce = await hkdf(s, ikm, junta(enc.encode('Content-Encoding: nonce'), ZERO), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // Um registro só: o texto e o delimitador 0x02 (último registro), sem enchimento.
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, junta(enc.encode(texto), new Uint8Array([2]))));
  // Cabeçalho: sal (16) + tamanho do registro (4096, 4 bytes) + tamanho da chave (1) + chave pública efêmera (65).
  return junta(s, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPublica.length]), asPublica, cifrado);
}

// Manda um aviso. inscricao: { endpoint, p256dh, auth }. Devolve { ok, status, erro } (404 e 410: o aparelho saiu).
export async function enviarPush(inscricao, dados, chaves, contato, { ttl = 86400, urgencia = 'high' } = {}) {
  if (!endpointAceito(inscricao.endpoint)) return { ok: false, status: 0, erro: 'Endereço de push desconhecido.' };
  const texto = JSON.stringify(dados);
  if (texto.length > 3000) throw new Error('Aviso grande demais.');
  const corpo = await cifrarParaAparelho(texto, inscricao.p256dh, inscricao.auth);
  try {
    const r = await fetch(inscricao.endpoint, {
      method: 'POST', body: corpo, signal: AbortSignal.timeout(8_000),
      headers: {
        authorization: await cabecalhoVapid(inscricao.endpoint, chaves, contato),
        'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(ttl), urgency: urgencia,
      },
    });
    const ok = r.status >= 200 && r.status < 300;
    return { ok, status: r.status, erro: ok ? null : `${r.status} ${(await r.text().catch(() => '')).slice(0, 160)}`.trim() };
  } catch (e) {
    return { ok: false, status: 0, erro: e && e.name === 'TimeoutError' ? 'O serviço de push demorou mais de 8 segundos.' : 'Não consegui chegar no serviço de push.' };
  }
}
