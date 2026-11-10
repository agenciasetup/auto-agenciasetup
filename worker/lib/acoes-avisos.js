// Avisos no celular (Web Push) de cada pessoa da equipe: ligar num aparelho, escolher os tipos, mandar um teste e
// desligar. Quem pode: vendas.ver (Administrador e Editor). Cada um vê e mexe só nos próprios aparelhos.
// O envio de verdade e o texto de cada aviso ficam em push.js.
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { MAX_APARELHOS, TIPOS_AVISO, TIPOS_PADRAO, TODOS_OS_TIPOS, chavesPush, gravarAparelhos, lerAparelhos, mandarPara, tiposDoAparelho } from './push.js';
import { deB64u, endpointAceito } from './webpush.js';

// eventos: o que o aparelho recebe de verdade, com os tipos novos que ele ainda não conhecia (push.js, querTipo).
const doAparelho = (i) => ({ id: i.id, aparelho: i.aparelho, eventos: tiposDoAparelho(i), criado_em: i.criado_em, ultimo_ok: i.ultimo_ok || null, ultimo_erro: i.ultimo_erro || null });
const tiposValidos = (l) => (Array.isArray(l) ? [...new Set(l.map(String))].filter((t) => TIPOS_AVISO[t]) : null);

function quem(x) {
  exigir(x.u, 'vendas.ver');
  if (!x.u.id) throw new Erro(400, 'Os avisos ficam ligados a uma pessoa da equipe: entre pelo painel com o seu login.');
  return x.u.id;
}

export async function verAvisos(x) {
  const eu = quem(x);
  const [chaves, lista] = await Promise.all([chavesPush(x.env), lerAparelhos(x.env)]);
  return {
    publica: chaves.publica,
    tipos: Object.entries(TIPOS_AVISO).map(([id, t]) => ({ id, t: t.t, sub: t.sub, padrao: t.padrao })),
    aparelhos: lista.filter((i) => i.equipe_id === eu).map(doAparelho),
  };
}

// d: { endpoint, keys: { p256dh, auth }, aparelho, eventos? }. O mesmo aparelho ligando de novo só atualiza.
export async function ligarAvisos(x, d = {}) {
  const eu = quem(x);
  const endpoint = String(d.endpoint || '');
  if (!endpointAceito(endpoint)) throw new Erro(400, 'Este navegador mandou um endereço de avisos que o sistema não conhece.');
  const p256dh = String((d.keys && d.keys.p256dh) || '');
  const auth = String((d.keys && d.keys.auth) || '');
  let ok = false;
  try { ok = deB64u(p256dh).length === 65 && deB64u(auth).length >= 16; } catch {}
  if (!ok) throw new Erro(400, 'A inscrição de avisos veio incompleta. Tente ligar de novo.');
  const aparelho = String(d.aparelho || 'Aparelho').replace(/\s+/g, ' ').trim().slice(0, 60);
  const lista = await lerAparelhos(x.env);
  const ja = lista.find((i) => i.endpoint === endpoint);
  const eventos = tiposValidos(d.eventos) || (ja && ja.equipe_id === eu ? tiposDoAparelho(ja) : null) || TIPOS_PADRAO;
  let item;
  if (ja) {
    Object.assign(ja, { equipe_id: eu, p256dh, auth, aparelho, eventos, conhece: TODOS_OS_TIPOS, ultimo_erro: null });
    item = ja;
  } else {
    if (lista.filter((i) => i.equipe_id === eu).length >= MAX_APARELHOS) throw new Erro(400, `Você já tem ${MAX_APARELHOS} aparelhos com avisos. Desligue um antes.`);
    item = { id: crypto.randomUUID(), equipe_id: eu, endpoint, p256dh, auth, aparelho, eventos, conhece: TODOS_OS_TIPOS, criado_em: new Date().toISOString() };
    lista.push(item);
  }
  await gravarAparelhos(x.env, lista);
  await auditar(x.env, x.u, 'avisos.ligar', `aparelho:${item.id}`, { aparelho, eventos });
  return doAparelho(item);
}

export async function mudarAvisos(x, id, d = {}) {
  const eu = quem(x);
  const lista = await lerAparelhos(x.env);
  const item = lista.find((i) => i.id === id && i.equipe_id === eu);
  if (!item) throw new Erro(404, 'Este aparelho não está mais com avisos ligados.');
  const eventos = tiposValidos(d.eventos);
  if (!eventos) throw new Erro(400, 'Mande a lista dos avisos que este aparelho recebe.');
  item.eventos = eventos;
  item.conhece = TODOS_OS_TIPOS; // a pessoa escolheu vendo todos os tipos de hoje: o que ficou de fora é desligado de propósito
  await gravarAparelhos(x.env, lista);
  await auditar(x.env, x.u, 'avisos.mudar', `aparelho:${item.id}`, { eventos });
  return doAparelho(item);
}

export async function desligarAvisos(x, id) {
  const eu = quem(x);
  const lista = await lerAparelhos(x.env);
  const item = lista.find((i) => i.id === id && i.equipe_id === eu);
  if (!item) return { ok: true };
  await gravarAparelhos(x.env, lista.filter((i) => i !== item));
  await auditar(x.env, x.u, 'avisos.desligar', `aparelho:${item.id}`, { aparelho: item.aparelho });
  return { ok: true };
}

// Um aviso de teste nos aparelhos da pessoa (ou só num). Devolve o resultado de cada um, com o erro do serviço de push.
export async function testarAvisos(x, d = {}) {
  const eu = quem(x);
  const lista = await lerAparelhos(x.env);
  const alvo = lista.filter((i) => i.equipe_id === eu && (!d.id || i.id === d.id));
  if (!alvo.length) throw new Erro(404, 'Nenhum aparelho com avisos ligados. Ligue os avisos primeiro.');
  const res = await mandarPara(x.env, lista, alvo, {
    tipo: 'teste', em: Date.now(), tag: 'teste', url: '/admin/celular?aba=avisos',
    titulo: 'Avisos ligados', corpo: 'É assim que chega cada venda, pedido e reembolso.',
  });
  return { resultados: res.map((r) => ({ ...r, aparelho: (alvo.find((i) => i.id === r.id) || {}).aparelho })) };
}
