// Confere se a Página conectada consegue ler o direct do Instagram pela API (só leitura, não manda nada).
// Serve para saber se "Permitir acesso às mensagens" está ligado na conta do Instagram e se a permissão
// instagram_manage_messages entrou na conexão. Não imprime nome nem texto de ninguém: só contagens e o erro da Meta.
// Uso: node scripts/meta-direct.mjs
import { env, sql } from './env.mjs';
import { decifrar } from '../worker/nucleo/cripto.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const ver = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { texto: t.slice(0, 200) }; } };

for (const p of await sql(`select conta_id, conta_nome, perfil, credenciais, escopos from conexoes where plataforma = 'facebook' and status = 'ativa' order by criado_em`)) {
  const pc = await decifrar(env, p.credenciais);
  const t = encodeURIComponent(pc.token);
  const temPermissao = (p.escopos || []).includes('instagram_manage_messages');
  const ig = await ver(await fetch(`${GRAPH}/${p.conta_id}?fields=instagram_business_account{id,username}&access_token=${t}`));
  const conta = ig.instagram_business_account || null;
  const conv = await ver(await fetch(`${GRAPH}/${p.conta_id}/conversations?platform=instagram&limit=5&fields=id,updated_time&access_token=${t}`));
  console.log(`Página ${p.conta_nome} (${p.perfil}): permissão de mensagens do Instagram ${temPermissao ? 'sim' : 'NÃO'}; Instagram ligado: ${conta ? `@${conta.username} (${conta.id})` : 'não achei'}`);
  if (conv.error) console.log(`  ler o direct: ERRO ${conv.error.code}${conv.error.error_subcode ? `/${conv.error.error_subcode}` : ''}: ${String(conv.error.message || '').slice(0, 220)}`);
  else console.log(`  ler o direct: ok, ${(conv.data || []).length} conversas devolvidas (pedi 5); a mais recente mudou em ${(conv.data || [])[0] ? conv.data[0].updated_time : 'nenhuma'}`);
}
