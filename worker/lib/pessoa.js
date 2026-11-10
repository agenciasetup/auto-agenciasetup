// A pessoa no link (10/11/2026). Cada link do curso que sai no direct leva um código curto de quem recebeu, para a
// compra ser ligada à pessoa do follow-up (antes era só por nome e e-mail, e quase ninguém casava) e para o placar
// enxergar quem vendeu. O código sai do perfil e do @ (10 letras do SHA-256, igual a followup_codigo no banco): não é
// segredo nem dado da pessoa, só uma etiqueta. Módulo sem banco, para o site, o Comenta X, o Atendente e o follow-up.
const USUARIO = /^[a-z0-9._]{1,30}$/;
const CODIGO = /^[a-f0-9]{10}$/;
export const codigoValido = (v) => (CODIGO.test(String(v || '')) ? String(v) : null);

// Quem mandou o link numa conversa: a letra vai no endereço ("?de=a-1a2b3c4d5e") e o nome fica gravado na visita.
const LETRA = { calango: 'c', pergunta: 'p', atendente: 'a' };
const QUEM = { c: 'calango', p: 'pergunta', a: 'atendente' };

export async function codigoDaPessoa(perfil, usuario) {
  const u = String(usuario || '').trim().replace(/^@/, '').toLowerCase();
  if (!USUARIO.test(u)) return '';
  const p = String(perfil || 'br').toLowerCase();
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${p}:${u}`));
  return Array.from(new Uint8Array(b).slice(0, 5), (x) => x.toString(16).padStart(2, '0')).join('');
}

// Põe o código num endereço que já tem as marcas (os botões do Comenta X): "&p=1a2b3c4d5e".
export function comPessoa(url, codigo) {
  const c = codigoValido(codigo);
  if (!c) return url;
  try { const u = new URL(url); u.searchParams.set('p', c); return u.toString(); } catch { return url; }
}

// A versão no link (10/11/2026). O botão do mini curso do Comenta X leva "&l=<código>": o código do link curto da versão
// da mensagem que saiu no mesmo direct (/l/<palavra>-<versão>-<post>, o do botão do material). A visita guarda esse
// código no mesmo campo em que o clique no link curto já guarda, e a venda cai direto na versão. O formato é o dos
// códigos da tabela links.
const LINK = /^[a-z0-9-]{2,40}$/;
export const codigoDeLink = (v) => (LINK.test(String(v || '')) ? String(v) : null);

// Os links de venda que os vendedores e o Atendente mandam numa conversa, ainda sem marca.
export const LINKS_VENDA = {
  posts: 'https://agenciasetup.com.br/cursos/posts-automaticos',
  combo: 'https://agenciasetup.com.br/cursos/combo-black-calango',
};
const VENDA = new RegExp('https://agenciasetup[.]com[.]br/cursos/(?:posts-automaticos|combo-black-calango)(?![A-Za-z0-9_/?#&=-])', 'g');
// Troca, num texto, cada link de venda sem marca pelo link da pessoa ("?de=<quem>-<código>"; sem código, "x"). Link
// que já tem marca fica como está, então dá para passar o mesmo texto duas vezes.
export function marcarLinks(texto, quem, codigo) {
  const letra = LETRA[quem];
  if (!letra || texto == null) return texto;
  return String(texto).replace(VENDA, (url) => `${url}?de=${letra}-${codigoValido(codigo) || 'x'}`);
}

// Lê o "de" de uma conversa: { quem, pessoa } ou null quando o "de" é de outro tipo ("dm-palavra", "pinterest").
export function lerConversa(de) {
  const m = String(de || '').match(/^([cpa])-([a-f0-9]{10}|x)$/);
  return m ? { quem: QUEM[m[1]], pessoa: codigoValido(m[2]) } : null;
}
