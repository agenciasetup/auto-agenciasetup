// Abre as credenciais de uma conta conectada e renova o token quando está perto de vencer.
// Fila, desempenho e "Comenta X" passam por aqui: o token não vence só porque a conta ficou dias sem publicar.
import { cifrar, decifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { perfilValido } from '../lib/perfis.js';
import { plataforma } from './index.js';

const RENOVAR_ANTES = 7 * 86400_000;
// Códigos da Meta para token vencido ou revogado.
const TOKEN_MORTO = [190, 102];

export async function credenciaisAtivas(env, conexao) {
  const m = plataforma(conexao.plataforma);
  let credenciais = await decifrar(env, conexao.credenciais);
  if (m && m.renovar && conexao.expira_em && new Date(conexao.expira_em).getTime() - Date.now() < RENOVAR_ANTES) {
    try {
      const novo = await m.renovar({ env, credenciais, conexao });
      if (novo && novo.credenciais) {
        credenciais = novo.credenciais;
        await db.update(env, 'conexoes', { id: `eq.${conexao.id}` }, { credenciais: await cifrar(env, credenciais), expira_em: novo.expira_em || null, status: 'ativa', ultimo_erro: null }, 'id');
      }
    } catch (e) {
      // Renovar falhou mas o token ainda vale: segue com ele e tenta de novo na próxima.
      console.error('renovar', conexao.plataforma, e && e.message);
    }
  }
  return credenciais;
}

// A conta ativa de uma rede num perfil (lib/perfis.js), com o módulo dela. Com duas contas no mesmo perfil, vale a mais
// antiga: a fila e o "Comenta X" pegam sempre a mesma. Sem perfil, o do Brasil (como antes de existir o segundo).
export async function contaAtiva(env, rede, perfil = 'br') {
  const [conexao] = await db.select(env, 'conexoes', { filtros: { plataforma: `eq.${rede}`, status: 'eq.ativa', perfil: `eq.${perfilValido(perfil)}` }, ordem: 'criado_em.asc', limite: 1 });
  return conexao ? { conexao, m: plataforma(rede) } : null;
}

// A conta pelo id dela na rede (o aviso da Meta diz em entry.id qual conta do Instagram ou qual Página recebeu).
export async function contaPorId(env, rede, contaId) {
  const id = String(contaId || '');
  if (!/^[\w-]{1,64}$/.test(id)) return null;
  const conexao = await db.um(env, 'conexoes', { plataforma: `eq.${rede}`, conta_id: `eq.${id}`, status: 'eq.ativa' });
  return conexao ? { conexao, m: plataforma(rede) } : null;
}

// As contas ativas de uma rede (todos os perfis), da mais antiga para a mais nova.
export async function contasAtivas(env, rede) {
  const linhas = await db.select(env, 'conexoes', { filtros: { plataforma: `eq.${rede}`, status: 'eq.ativa' }, ordem: 'criado_em.asc', limite: 20 });
  return linhas.map((conexao) => ({ conexao, m: plataforma(rede) }));
}

// A conexão deu a permissão que esta função precisa? (ex.: 'metricas', 'comentarios', 'mensagens')
export function temRecurso(conexao, m, nome) {
  const escopo = m && m.recursos && m.recursos[nome];
  return !!escopo && Array.isArray(conexao.escopos) && conexao.escopos.includes(escopo);
}

// Token morto: marca a conexão para o painel pedir "Reconectar". Vale o código da Meta ou o módulo dizendo
// tokenMorto (Pinterest e Google: HTTP 401).
export async function avisarSeTokenMorreu(env, conexao, e) {
  if (!e || !e.extra || !(e.extra.tokenMorto || TOKEN_MORTO.includes(e.extra.codigo))) return false;
  await db.update(env, 'conexoes', { id: `eq.${conexao.id}` }, { status: 'expirada', ultimo_erro: 'O acesso venceu ou foi retirado. Reconecte em Redes.' }, 'id').catch(() => {});
  return true;
}
