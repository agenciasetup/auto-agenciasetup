// Liga o Asaas sem a chave passar pelo chat nem pelo terminal. Nunca imprime chave nem token.
//   node scripts/asaas.mjs chave   lê a chave da área de transferência (botão "copiar" do Asaas), confere e grava ASAAS_CHAVE no .env.local
//   node scripts/asaas.mjs conta   situação da conta: aprovação, chaves Pix e avisos (webhooks) cadastrados
//   node scripts/asaas.mjs aviso   cria ou atualiza o aviso de pagamento (webhook) com um token novo em ASAAS_AVISO_TOKEN
// Depois: npm run segredos -- ASAAS_CHAVE ASAAS_AVISO_TOKEN (grava no Worker). A chave fica fora do .dev.vars de propósito:
// no computador o checkout continua no pagamento simulado e nenhum teste cobra de verdade.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, raiz } from './env.mjs';

const AVISO_URL = 'https://agenciasetup.com.br/api/asaas/aviso';
const EVENTOS = [
  'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS', 'PAYMENT_REFUNDED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
];

const arquivo = join(raiz, '.env.local');
function gravar(nome, valor) {
  const linhas = readFileSync(arquivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const i = linhas.findIndex((l) => l.startsWith(`${nome}=`));
  if (i >= 0) linhas[i] = `${nome}=${valor}`;
  else {
    while (linhas.length && linhas[linhas.length - 1] === '') linhas.pop();
    linhas.push(`${nome}=${valor}`, '');
  }
  writeFileSync(arquivo, linhas.join('\n'));
  env[nome] = valor;
}

const baseDe = (chave) => (/^\$aact_prod_/.test(chave) ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');
async function asaas(caminho, opcoes = {}, chave = env.ASAAS_CHAVE) {
  const r = await fetch(`${baseDe(chave)}${caminho}`, { ...opcoes, headers: { access_token: chave, 'Content-Type': 'application/json', 'User-Agent': 'AgenciaSetup/1.0', ...(opcoes.headers || {}) } });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`Asaas ${caminho.split('?')[0]} respondeu ${r.status}: ${(d?.errors || []).map((e) => e.description).join(' ') || ''}`);
  return d;
}

const acao = process.argv[2];
if (acao === 'chave') {
  const copiado = execFileSync('powershell', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], { encoding: 'utf8' }).replace(/^﻿/, '').trim();
  if (!/^\$aact_(prod|hmlg)_[A-Za-z0-9_:=+/.-]{20,}$/.test(copiado)) {
    console.error('A área de transferência não tem uma chave do Asaas. Clique em "copiar" na chave do Asaas e rode de novo.');
    process.exit(1);
  }
  const conta = await asaas('/myAccount/status', {}, copiado);
  gravar('ASAAS_CHAVE', copiado);
  // Limpa a área de transferência: a chave não fica dando sopa.
  execFileSync('powershell', ['-NoProfile', '-Command', "Set-Clipboard -Value ' '"]);
  console.log(`Chave ${/_prod_/.test(copiado) ? 'de PRODUÇÃO' : 'do sandbox'} conferida e gravada no .env.local (ASAAS_CHAVE).`);
  console.log('Situação da conta:', JSON.stringify(conta));
} else if (acao === 'conta') {
  if (!env.ASAAS_CHAVE) { console.error('Falta ASAAS_CHAVE (rode: node scripts/asaas.mjs chave).'); process.exit(1); }
  const [status, info, pix, avisos] = await Promise.all([
    asaas('/myAccount/status'),
    asaas('/myAccount/commercialInfo').catch((e) => ({ erro: e.message })),
    asaas('/pix/addressKeys?limit=20').catch((e) => ({ erro: e.message })),
    asaas('/webhooks?limit=20').catch((e) => ({ erro: e.message })),
  ]);
  console.log('Ambiente:', /_prod_/.test(env.ASAAS_CHAVE) ? 'produção' : 'sandbox');
  console.log('Aprovação:', JSON.stringify(status));
  console.log('Conta:', info.erro || `${info.companyName || info.name || ''} (${info.personType || ''})`);
  console.log('Chaves Pix:', pix.erro || (pix.data || []).map((k) => `${k.type} ${k.status}`).join(', ') || 'nenhuma');
  console.log('Avisos:', avisos.erro || (avisos.data || []).map((w) => `${w.name} -> ${w.url} (${w.enabled ? 'ligado' : 'desligado'}${w.interrupted ? ', interrompido' : ''})`).join(' | ') || 'nenhum');
} else if (acao === 'aviso') {
  if (!env.ASAAS_CHAVE) { console.error('Falta ASAAS_CHAVE (rode: node scripts/asaas.mjs chave).'); process.exit(1); }
  const token = randomBytes(24).toString('hex');
  const info = await asaas('/myAccount/commercialInfo');
  const corpo = {
    name: 'Área de membros Agência Setup', url: AVISO_URL, email: info.email, enabled: true, interrupted: false,
    apiVersion: 3, authToken: token, sendType: 'SEQUENTIALLY', events: EVENTOS,
  };
  const lista = await asaas('/webhooks?limit=50');
  const ja = (lista.data || []).find((w) => w.url === AVISO_URL);
  const w = ja ? await asaas(`/webhooks/${ja.id}`, { method: 'PUT', body: JSON.stringify(corpo) }) : await asaas('/webhooks', { method: 'POST', body: JSON.stringify(corpo) });
  gravar('ASAAS_AVISO_TOKEN', token);
  console.log(`Aviso ${ja ? 'atualizado' : 'criado'}: ${w.name} -> ${w.url}, ${w.events.length} eventos, ${w.enabled ? 'ligado' : 'desligado'}. Token novo gravado no .env.local (ASAAS_AVISO_TOKEN).`);
  console.log('Agora: npm run segredos -- ASAAS_CHAVE ASAAS_AVISO_TOKEN');
} else {
  console.log('Use: node scripts/asaas.mjs chave | conta | aviso');
}
