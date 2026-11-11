// Confere o Web Push do Worker (worker/lib/webpush.js) sem mandar nada para fora:
// 1. o exemplo oficial da RFC 8291 (apêndice A): mesmo sal e mesmas chaves têm de dar exatamente o mesmo corpo cifrado;
// 2. ida e volta com chaves novas: o "aparelho" (feito aqui) decifra o que o servidor cifrou;
// 3. a assinatura VAPID confere com a chave pública e o JWT tem aud, exp e sub.
// Uso: node scripts/conferir-push.mjs
import { b64u, cabecalhoVapid, cifrarParaAparelho, deB64u, endpointAceito, novasChaves } from '../worker/lib/webpush.js';

const enc = new TextEncoder();
let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra ? `  ${extra}` : ''}`); if (!ok) falhas += 1; };
const junta = (...p) => { const r = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let o = 0; for (const x of p) { r.set(x, o); o += x.length; } return r; };

async function parDeChaves(privadaB64u, publicaB64u) {
  const pub = deB64u(publicaB64u);
  const jwk = { kty: 'EC', crv: 'P-256', d: privadaB64u, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  return {
    privateKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
    publicKey: await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
  };
}

// O lado do aparelho: decifra o corpo aes128gcm com a chave privada dele.
async function decifrar(corpo, uaPrivada, uaPublica, auth) {
  const sal = corpo.slice(0, 16);
  const idlen = corpo[20];
  const asPublica = corpo.slice(21, 21 + idlen);
  const cifrado = corpo.slice(21 + idlen);
  const hk = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const asChave = await crypto.subtle.importKey('raw', asPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asChave }, uaPrivada, 256));
  const ikm = await hk(auth, ecdh, junta(enc.encode('WebPush: info'), new Uint8Array([0]), uaPublica, asPublica), 32);
  const cek = await hk(sal, ikm, junta(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hk(sal, ikm, junta(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cifrado));
  return { texto: new TextDecoder().decode(claro.slice(0, -1)), delimitador: claro[claro.length - 1] };
}

// 1. RFC 8291, apêndice A
{
  const efemera = await parDeChaves('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
  const corpo = await cifrarParaAparelho('When I grow up, I want to be a watermelon',
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', 'BTBZMqHH6r4Tts7J_aSIgg',
    { sal: deB64u('DGv6ra1nlYgDCS1FRnbzlw'), efemera });
  const esperado = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
  confere('exemplo da RFC 8291 (corpo idêntico)', b64u(corpo) === esperado);
  const ua = await parDeChaves('q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94', 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4');
  const d = await decifrar(corpo, ua.privateKey, deB64u('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'), deB64u('BTBZMqHH6r4Tts7J_aSIgg'));
  confere('exemplo da RFC 8291 (o aparelho decifra)', d.texto === 'When I grow up, I want to be a watermelon' && d.delimitador === 2);
}

// 2. Ida e volta com um aparelho novo e um aviso com acento e emoji
{
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublica = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const aviso = JSON.stringify({ titulo: 'Venda aprovada: R$ 27,00', corpo: 'Leondio Pinheiro · Posts automáticos com Claude 💸', url: '/admin/celular?pedido=x' });
  const corpo = await cifrarParaAparelho(aviso, b64u(uaPublica), b64u(auth));
  const d = await decifrar(corpo, ua.privateKey, uaPublica, auth);
  confere('ida e volta com chaves novas', d.texto === aviso, `${corpo.length} bytes`);
}

// 3. VAPID
{
  const chaves = await novasChaves();
  const h = await cabecalhoVapid('https://web.push.apple.com/QABC123', chaves, 'https://agenciasetup.com.br');
  const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  confere('cabeçalho VAPID no formato certo', !!m && m[4] === chaves.publica);
  const corpo = JSON.parse(new TextDecoder().decode(deB64u(m[2])));
  confere('JWT com aud da Apple, exp em até 24 h e sub https', corpo.aud === 'https://web.push.apple.com' && corpo.exp > Date.now() / 1000 && corpo.exp < Date.now() / 1000 + 86400 && corpo.sub === 'https://agenciasetup.com.br');
  const pub = await crypto.subtle.importKey('raw', deB64u(chaves.publica), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, deB64u(m[3]), enc.encode(`${m[1]}.${m[2]}`));
  confere('assinatura ES256 confere com a chave pública', ok && deB64u(m[3]).length === 64);
}

// 4. Só serviços de push de verdade
confere('aceita Apple, Google, Mozilla e Microsoft', ['https://web.push.apple.com/abc', 'https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://wns2-bl2p.notify.windows.com/w/?token=abc'].every(endpointAceito));
confere('recusa outros endereços', !['http://web.push.apple.com/abc', 'https://exemplo.com/push', 'https://web.push.apple.com.exemplo.com/x', 'https://127.0.0.1/x'].some(endpointAceito));

// 5. O formato do aviso (pedido do dono em 10/11/2026): a bolinha da cor da sala, o texto curto e a tela do app que abre
{
  const { BOLINHA, corpoCurto, formarAviso, telaDoApp } = await import('../worker/lib/push.js');
  const longo = 'Você conversou com essa pessoa pelo aplicativo nas últimas 12 horas, então ele só anotou: "Pronto pode deixar que vou fazer isso, e obrigado só pelo suporte a agência setup já é diferenciada"';
  const d = formarAviso('direct', { titulo: '@fulano escreveu e o Atendente está calado', corpo: longo, url: '/admin/followup?fase=duvida' });
  confere('aviso do direct sai com a bolinha verde da sala de Vendas', d.titulo.startsWith(`${BOLINHA.vendas} @fulano`) && d.sala === 'vendas');
  confere('texto comprido cabe em duas linhas e termina em reticências', d.corpo.length <= 80 && d.corpo.endsWith('…') && !d.corpo.includes('\n'), `(${d.corpo.length} letras)`);
  confere('o toque abre a tela do direct no app do celular e o painel no computador', d.app === '/admin/celular?tela=direct' && d.url === '/admin/followup?fase=duvida');
  confere('aviso do Escritório sem sala sai com a cor da Direção', formarAviso('escritorio', { titulo: 'Resumo das 8h', corpo: 'x' }).titulo === `${BOLINHA.direcao} Resumo das 8h`);
  confere('aviso com sala sai com a cor dela', formarAviso('escritorio', { titulo: 'Zelador: 2 alertas', corpo: 'x', sala: 'sistema' }).titulo.startsWith(BOLINHA.sistema) && formarAviso('escritorio', { titulo: 'Vídeo novo', corpo: 'x', sala: 'video' }).titulo.startsWith(BOLINHA.video));
  confere('sala que não existe cai na cor do tipo', formarAviso('escritorio', { titulo: 'A', corpo: 'x', sala: 'cozinha' }).titulo.startsWith(BOLINHA.direcao));
  const duas = formarAviso('direct', formarAviso('direct', { titulo: 'Dúvida no direct de @x', corpo: 'oi' }));
  confere('passar duas vezes não põe duas bolinhas', duas.titulo === `${BOLINHA.vendas} Dúvida no direct de @x`);
  const venda = formarAviso('venda', { titulo: 'Caiu mais uma!', corpo: 'R$ 39,90 no Pix\nMaria · Posts automáticos\nHoje: R$ 399,00 em 10 vendas', url: '/admin/celular?pedido=abc' });
  confere('a venda vai inteira, com as três linhas, e abre o pedido', venda.corpo.split('\n').length === 3 && venda.app === '/admin/celular?pedido=abc' && venda.titulo.startsWith(BOLINHA.vendas));
  confere('duas linhas curtas ficam; a terceira sai', corpoCurto('Maria · Posts automáticos\nAguardando o pagamento.\nMais uma linha') === 'Maria · Posts automáticos\nAguardando o pagamento.');
  confere('linha de mais de uma linha conta como duas', corpoCurto(`${'a'.repeat(50)}\nsegunda`) === 'a'.repeat(50));
  confere('tela do app só para o que o app tem', telaDoApp('/admin/colmeia') === '/admin/celular?tela=colmeia' && telaDoApp('/admin/escritorio') === '/admin/celular?tela=escritorio' && telaDoApp('/admin/suporte') === '/admin/celular?tela=vendas&aba=chamados' && telaDoApp('/admin/redes') === null && telaDoApp('/admin/escritoriox') === null);
}

console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
