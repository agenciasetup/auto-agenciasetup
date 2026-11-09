// Ações da plataforma (painel e conector): webhooks de saída (Integrações), a tela Números e o relatório da semana.
// Cargo e auditoria em toda escrita. O segredo do webhook aparece uma vez só, quando é criado ou trocado.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { pode } from '../nucleo/permissoes.js';
import { gerarPlano, marcarIdeia, verOPlano } from './plano.js';
import { listaRecuperacao, marcarLinha } from './recuperacao.js';
import { EVENTOS_SAIDA, esquecerWebhooks, gerarRelatorio, guardarSegredo, novoSegredo, numerosDaArea, postar } from './plataforma.js';

const UUID = /^[0-9a-f-]{36}$/;
const id = (v) => { if (!UUID.test(String(v))) throw new Erro(404, 'Não encontrado.'); return v; };
const CAMPOS_WEBHOOK = 'id,nome,url,eventos,ativo,falhas,ultimo_envio,ultimo_status,criado_em';

// ---------------------------------------------------------------- webhooks de saída
export async function listarWebhooks(x) {
  exigir(x.u, 'integracoes.configurar');
  const [webhooks, envios] = await Promise.all([
    db.select(x.env, 'webhooks_saida', { select: CAMPOS_WEBHOOK, ordem: 'criado_em.asc' }),
    db.select(x.env, 'webhook_envios', { select: 'id,webhook_id,evento,status,tentativas,erro,enviado_em,criado_em', ordem: 'criado_em.desc', limite: 30 }),
  ]);
  return { webhooks, envios, eventos: EVENTOS_SAIDA };
}

export async function salvarWebhook(x, d, wid) {
  exigir(x.u, 'integracoes.configurar');
  const dados = {};
  if (d.nome !== undefined) dados.nome = String(d.nome || '').trim().slice(0, 80);
  if (d.url !== undefined) {
    const url = String(d.url || '').trim();
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) throw new Erro(400, 'O endereço precisa começar com https:// (o do n8n, Make ou Zapier).');
    dados.url = url.slice(0, 500);
  }
  if (d.eventos !== undefined) dados.eventos = [...new Set((Array.isArray(d.eventos) ? d.eventos : []).filter((e) => EVENTOS_SAIDA[e]))];
  if (d.ativo !== undefined) { dados.ativo = !!d.ativo; if (dados.ativo) dados.falhas = 0; }
  let segredo = null;
  if (!wid || d.novo_segredo) { segredo = novoSegredo(); dados.segredo = await guardarSegredo(x.env, segredo); }
  if (!wid) {
    if (!dados.nome) throw new Erro(400, 'Dê um nome ao webhook (ex.: n8n, planilha de alunos).');
    if (!dados.url) throw new Erro(400, 'Cole o endereço do webhook.');
    if (!dados.eventos || !dados.eventos.length) throw new Erro(400, 'Escolha pelo menos um evento.');
  } else if (dados.eventos && !dados.eventos.length) throw new Erro(400, 'Escolha pelo menos um evento.');
  const [w] = wid ? await db.update(x.env, 'webhooks_saida', { id: `eq.${id(wid)}` }, dados, CAMPOS_WEBHOOK) : await db.insert(x.env, 'webhooks_saida', dados, { select: CAMPOS_WEBHOOK });
  if (!w) throw new Erro(404, 'Webhook não encontrado.');
  esquecerWebhooks();
  await auditar(x.env, x.u, wid ? 'webhook.editar' : 'webhook.criar', `webhook:${w.id}`, { campos: Object.keys(dados).filter((k) => k !== 'segredo'), segredo_novo: !!segredo });
  return segredo ? { ...w, segredo } : w;
}

// Manda um evento "teste" agora e mostra o que o outro sistema respondeu.
export async function testarWebhook(x, wid) {
  exigir(x.u, 'integracoes.configurar');
  const w = await db.um(x.env, 'webhooks_saida', { id: `eq.${id(wid)}` }, 'id,url,segredo,falhas');
  if (!w) throw new Erro(404, 'Webhook não encontrado.');
  const [e] = await db.insert(x.env, 'webhook_envios', { webhook_id: w.id, evento: 'teste', payload: { evento: 'teste', em: new Date().toISOString(), dados: { mensagem: 'Teste do painel da Agência Setup. Se chegou, está tudo certo.' } } }, { select: 'id,evento,payload' });
  const r = await postar(x.env, w, e);
  const agora = new Date().toISOString();
  await db.update(x.env, 'webhook_envios', { id: `eq.${e.id}` }, { status: r.status, tentativas: 6, erro: r.erro, ...(r.ok ? { enviado_em: agora } : {}) }, 'id');
  await db.update(x.env, 'webhooks_saida', { id: `eq.${w.id}` }, { ultimo_envio: agora, ultimo_status: r.status }, 'id');
  await auditar(x.env, x.u, 'webhook.testar', `webhook:${w.id}`, { status: r.status });
  return r;
}

// ---------------------------------------------------------------- números e relatório
export async function verNumeros(x, { dias = 30, moeda = 'brl' } = {}) {
  exigir(x.u, 'numeros.ver');
  const [n, rel] = await Promise.all([
    numerosDaArea(x.env, dias, moeda),
    db.select(x.env, 'relatorios', { select: 'id,semana,texto,modelo,custo_usd,criado_em', ordem: 'semana.desc', limite: 1 }),
  ]);
  return { ...n, relatorio: rel[0] || null, ia: !!x.env.ANTHROPIC_CHAVE };
}

export async function listarRelatorios(x) {
  exigir(x.u, 'numeros.ver');
  return db.select(x.env, 'relatorios', { select: 'id,semana,texto,modelo,custo_usd,criado_em', ordem: 'semana.desc', limite: 12 });
}

// Recuperar vendas (lib/recuperacao.js): quem chegou no checkout e não comprou. Suporte atende, sem ver valores.
export async function verRecuperacao(x, { aba, busca, limite } = {}) {
  exigir(x.u, 'recuperar.ver');
  const quem = x.u.casa ? '' : String(x.u.nome || '').trim().split(/\s+/)[0];
  return listaRecuperacao(x.env, { aba, busca, limite: Math.min(100, Math.max(1, Number(limite) || 50)), quem, veValor: pode(x.u.papel, 'vendas.ver') });
}

export async function marcarRecuperacao(x, id, { situacao, nota } = {}) {
  exigir(x.u, 'recuperar.editar');
  const r = await marcarLinha(x.env, id, { situacao, nota, quem: x.u.casa ? null : x.u.id });
  await auditar(x.env, x.u, 'recuperacao.marcar', `recuperacao:${r.id}`, { situacao: situacao || null, nota: nota !== undefined });
  return r;
}

// O plano (lib/plano.js): o que fazer agora, ideias de posts e como vender e alcançar mais.
export async function verPlano(x) {
  exigir(x.u, 'plano.ver');
  return verOPlano(x.env);
}

export async function gerarPlanoAgora(x) {
  exigir(x.u, 'plano.gerar');
  const p = await gerarPlano(x.env);
  await auditar(x.env, x.u, 'plano.gerar', 'config:plano_ia', { ideias: p.ideias.length, custo_usd: p.custo_usd });
  return p;
}

export async function marcarIdeiaDoPlano(x, id, status) {
  exigir(x.u, 'plano.gerar');
  const p = await marcarIdeia(x.env, String(id || ''), status);
  await auditar(x.env, x.u, 'plano.ideia', 'config:plano_ia', { ideia: id, status });
  return p;
}

// Gera (ou refaz) o relatório desta semana agora. Custa uma chamada ao Claude (centavos de dólar).
export async function gerarRelatorioAgora(x) {
  exigir(x.u, 'relatorio.gerar');
  const r = await gerarRelatorio(x.env, { forcar: true });
  await auditar(x.env, x.u, 'relatorio.gerar', `relatorio:${r.id}`, { semana: r.semana, custo_usd: r.custo_usd });
  return r;
}
