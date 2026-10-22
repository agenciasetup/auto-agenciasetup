// A fila das redes, rodada pelo relógio: publica as peças agendadas que venceram, cada uma pelo módulo da sua rede.
import { auditar } from '../nucleo/auth.js';
import { cifrar, decifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { plataforma } from './index.js';

const MAX_TENTATIVAS = 3;
const RENOVAR_ANTES = 24 * 3600 * 1000;

async function marcar(env, peca, dados) {
  await db.update(env, 'pecas', { id: `eq.${peca.id}` }, dados, 'id');
}

// Erro definitivo (rede não pronta, sem conta, formato errado): sem nova tentativa.
async function falhar(env, peca, motivo) {
  await marcar(env, peca, { status: 'erro', erro: motivo, proxima_tentativa: null });
  await auditar(env, null, 'peca.erro', `pecas:${peca.id}`, { rede: peca.rede, motivo });
}

async function contaDaPeca(env, peca) {
  if (peca.conexao_id) return db.um(env, 'conexoes', { id: `eq.${peca.conexao_id}`, status: 'eq.ativa' });
  return db.um(env, 'conexoes', { plataforma: `eq.${peca.rede}`, status: 'eq.ativa' });
}

// Publica uma peça já marcada como "publicando". Usado pelo relógio e pelo "publicar agora" do painel.
export async function publicarPeca(env, peca) {
  const m = plataforma(peca.rede);
  if (!m) return falhar(env, peca, `Rede desconhecida: ${peca.rede}.`);
  if (!m.disponivel || !m.publicar) return falhar(env, peca, `${m.nome} ainda não está ligada ao sistema. A peça volta a valer quando o módulo entrar.`);
  const problema = m.validar ? m.validar(peca) : null;
  if (problema) return falhar(env, peca, problema);
  const conexao = await contaDaPeca(env, peca);
  if (!conexao) return falhar(env, peca, `Nenhuma conta de ${m.nome} conectada. Conecte em Redes, no painel.`);
  try {
    let credenciais = await decifrar(env, conexao.credenciais);
    if (m.renovar && conexao.expira_em && new Date(conexao.expira_em).getTime() - Date.now() < RENOVAR_ANTES) {
      const novo = await m.renovar({ env, credenciais, conexao });
      if (novo && novo.credenciais) {
        credenciais = novo.credenciais;
        await db.update(env, 'conexoes', { id: `eq.${conexao.id}` }, { credenciais: await cifrar(env, credenciais), expira_em: novo.expira_em || null, status: 'ativa', ultimo_erro: null }, 'id');
      }
    }
    const r = await m.publicar({ env, peca, credenciais, conexao });
    await marcar(env, peca, { status: 'publicado', publicado_em: new Date().toISOString(), id_na_rede: r.id_na_rede || null, url_publicada: r.url_publicada || null, erro: null, conexao_id: conexao.id, proxima_tentativa: null });
    await auditar(env, null, 'peca.publicar', `pecas:${peca.id}`, { rede: peca.rede, url: r.url_publicada });
  } catch (e) {
    const motivo = e instanceof Erro ? e.message : `Falha ao publicar em ${m.nome}.`;
    if (!(e instanceof Erro)) console.error('fila', peca.id, e && e.stack);
    if ((peca.tentativas || 1) >= MAX_TENTATIVAS) return falhar(env, peca, `${motivo} (depois de ${MAX_TENTATIVAS} tentativas)`);
    await marcar(env, peca, { status: 'agendado', erro: motivo, proxima_tentativa: new Date(Date.now() + 5 * 60_000 * (peca.tentativas || 1)).toISOString() });
  }
}

export async function processarFila(env) {
  await db.rpc(env, 'soltar_pecas_presas').catch((e) => console.error('soltar presas', e && e.message));
  const pecas = await db.rpc(env, 'pegar_pecas_para_publicar', { p_limite: 5 });
  for (const p of pecas || []) await publicarPeca(env, p);
  if ((pecas || []).length) console.log(`fila: ${pecas.length} peça(s) processada(s)`);
  return (pecas || []).length;
}
