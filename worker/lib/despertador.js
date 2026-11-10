// O despertador do Atendente (10/11/2026, com o Workers pago): faz a resposta do direct sair uns 20 segundos depois da
// última mensagem da pessoa, em vez de esperar a próxima volta do relógio de minuto (que dava de 20 a 80 segundos).
//
// Como funciona:
// 1. A mensagem chega pelo aviso da Meta e fica "esperando" (atendente.js, atender). Com config.atendente.na_hora
//    ligado, o Worker pede ao despertador para tocar 21,5 segundos depois (armarDespertador).
// 2. O despertador é um Durable Object com um alarme só (a classe fica em worker/despertador.js, que só o index.js
//    importa). Ele guarda a hora mais próxima.
// 3. Quando toca, roda o mesmo Atendente do relógio (responderPendentes): responde quem já parou de escrever. Depois
//    olha quem ainda está escrevendo e marca a próxima hora. Sem ninguém, não marca nada.
// 4. O relógio de minuto continua igual, como reserva: se o alarme falhar, a pessoa é respondida no minuto seguinte.
//    As duas pontas nunca respondem a mesma conversa: quem pega as mensagens primeiro fica com elas (responderUm).
//
// Aqui fica só a lógica, sem nada da Cloudflare, para o ensaio rodar no computador (scripts/conferir-atendente.mjs).
import { db } from '../nucleo/db.js';

const NOME = 'atendente'; // um despertador só para o direct inteiro
const FOLGA_MS = 1500; // além da espera: a hora do banco e a do Worker não batem no milésimo
const JANELA = 6 * 3600_000; // a mesma da fila do Atendente (atendente_fila)

// Lado do Worker: pede ao despertador para tocar depois da espera. Nunca derruba quem chamou.
export async function armarDespertador(env, esperaMs, agora = Date.now()) {
  try {
    if (!env || !env.DESPERTADOR) return false;
    const stub = env.DESPERTADOR.get(env.DESPERTADOR.idFromName(NOME));
    await stub.armar(Math.round(agora + Math.max(0, Number(esperaMs) || 0) + FOLGA_MS));
    return true;
  } catch (e) {
    console.error('despertador armar', e && e.message);
    return false;
  }
}

// Lado do despertador: fica com a hora mais próxima. storage: o do Durable Object (getAlarm, setAlarm).
export async function armarNoEstado(storage, quando, agora = Date.now()) {
  const alvo = Math.max(agora + 500, Number(quando) || 0);
  const atual = await storage.getAlarm();
  if (atual && atual <= alvo) return { alarme: atual, mudou: false };
  await storage.setAlarm(alvo);
  return { alarme: alvo, mudou: true };
}

// A próxima hora em que alguma conversa termina de esperar. Só conta quem ainda não venceu: quem já venceu acabou de
// ser tentado (e, se continuou esperando, é porque não era para responder agora: modo ensaio, falta de folga). Esses
// ficam com o relógio de minuto, para o alarme nunca rodar em laço.
export async function proximaEspera(env, esperaMs, agora = Date.now()) {
  const linhas = await db.select(env, 'atendimentos', {
    filtros: { classe: 'eq.esperando', criado_em: `gte.${new Date(agora - JANELA).toISOString()}` },
    select: 'followup_id,criado_em', ordem: 'criado_em.desc', limite: 300,
  });
  const ultima = new Map();
  for (const l of linhas) {
    if (!l.followup_id) continue;
    const t = Date.parse(l.criado_em);
    if (t > (ultima.get(l.followup_id) || 0)) ultima.set(l.followup_id, t);
  }
  let proxima = null;
  for (const t of ultima.values()) {
    const vence = t + esperaMs + FOLGA_MS;
    if (vence > agora && (proxima === null || vence < proxima)) proxima = vence;
  }
  return proxima;
}

// O alarme tocou. responder: a função que roda o Atendente (recebe env). Erro aqui dentro não sobe: se subisse, a
// Cloudflare tocaria o alarme de novo várias vezes seguidas.
export async function aoDespertar(storage, env, { responder, esperaMs }) {
  let feito = null;
  try { feito = await responder(env); } catch (e) { console.error('despertador responder', e && (e.stack || e.message)); }
  let proxima = null;
  try {
    proxima = await proximaEspera(env, esperaMs);
    if (proxima) await storage.setAlarm(proxima);
  } catch (e) { console.error('despertador próxima', e && e.message); }
  return { feito, proxima };
}
