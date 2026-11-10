// A saúde do Worker na Cloudflare, na última hora (ou nas horas pedidas): quantas chamadas, quantas terminaram mal e
// por quê (estourou o processamento, erro no código), e o tempo de processador gasto. Serve para saber se o plano
// grátis está apertando (10 ms de processador e 50 chamadas externas por execução).
//   node scripts/worker-saude.mjs [horas]
// Lê CLOUDFLARE_API_KEY e CLOUDFLARE_EMAIL do .env.local. Não imprime chave nenhuma.
import { env, exige } from './env.mjs';

exige('CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL');
const horas = Math.max(1, Math.min(72, Number(process.argv[2]) || 1));
const cabecalhos = { 'X-Auth-Key': env.CLOUDFLARE_API_KEY, 'X-Auth-Email': env.CLOUDFLARE_EMAIL, 'Content-Type': 'application/json' };
const api = async (caminho, opcoes = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${caminho}`, { ...opcoes, headers: cabecalhos });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) throw new Error(`Cloudflare ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j;
};

const conta = env.CLOUDFLARE_ACCOUNT_ID || (await api('/accounts?per_page=5')).result[0].id;
const desde = new Date(Date.now() - horas * 3600_000).toISOString();
const consulta = `query ($conta: String!, $desde: Time!, $ate: Time!) {
  viewer { accounts(filter: { accountTag: $conta }) {
    workersInvocationsAdaptive(limit: 100, filter: { scriptName: "agenciasetup", datetime_geq: $desde, datetime_leq: $ate }) {
      dimensions { status }
      sum { requests errors subrequests }
      quantiles { cpuTimeP50 cpuTimeP99 }
    }
  } }
}`;
const j = await api('/graphql', { method: 'POST', body: JSON.stringify({ query: consulta, variables: { conta, desde, ate: new Date().toISOString() } }) });
const linhas = j.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
if (!linhas.length) { console.log(`Sem chamadas nas últimas ${horas} h.`); process.exit(0); }
const NOME = { success: 'deu certo', scriptThrewException: 'erro no código', exceededResources: 'estourou o processamento ou a memória', internalError: 'erro da Cloudflare', clientDisconnected: 'quem chamou desistiu', responseStreamDisconnected: 'resposta interrompida' };
console.log(`Worker agenciasetup, últimas ${horas} h:`);
for (const l of linhas.sort((a, b) => b.sum.requests - a.sum.requests)) {
  const ms = (v) => `${(Number(v) / 1000).toFixed(1)} ms`;
  console.log(`- ${NOME[l.dimensions.status] || l.dimensions.status}: ${l.sum.requests} chamada(s), ${l.sum.subrequests} chamada(s) externa(s), processador mediano ${ms(l.quantiles.cpuTimeP50)}, pior caso ${ms(l.quantiles.cpuTimeP99)}`);
}
