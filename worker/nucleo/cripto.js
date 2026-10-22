// Cofre das credenciais das redes: AES-GCM com a chave CRIPTO_CHAVE (32 bytes em base64, segredo do Worker).
// No banco fica só "v1.<iv>.<cifrado>": quem lê a tabela não vê token nenhum.
import { Erro } from './util.js';

let chaveCache = null;
let base = null;

async function chave(env) {
  const s = env.CRIPTO_CHAVE || '';
  if (!s) throw new Erro(503, 'Falta CRIPTO_CHAVE no Worker: sem ela não dá para guardar a conexão de uma rede.');
  if (chaveCache && base === s) return chaveCache;
  const bruto = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  if (bruto.length !== 32) throw new Erro(503, 'CRIPTO_CHAVE precisa ter 32 bytes em base64.');
  chaveCache = await crypto.subtle.importKey('raw', bruto, 'AES-GCM', false, ['encrypt', 'decrypt']);
  base = s;
  return chaveCache;
}

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function cifrar(env, objeto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = new TextEncoder().encode(JSON.stringify(objeto));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chave(env), dados));
  return `v1.${b64(iv)}.${b64(c)}`;
}

export async function decifrar(env, texto) {
  const [v, iv, c] = String(texto || '').split('.');
  if (v !== 'v1' || !iv || !c) throw new Erro(500, 'Credencial guardada num formato desconhecido.');
  const d = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, await chave(env), deB64(c));
  return JSON.parse(new TextDecoder().decode(d));
}
