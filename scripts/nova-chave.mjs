// Cria uma chave do conector do Claude (MCP) e grava só o hash no banco.
// A chave aparece uma vez: o script anota em .env.local (MCP_CHAVE) e não imprime.
// Uso: node scripts/nova-chave.mjs "Claude do Erick"
import { appendFileSync, readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { raiz, sql } from './env.mjs';

const nome = (process.argv[2] || 'Claude').replace(/'/g, "''").slice(0, 80);
const chave = 'as_' + randomBytes(24).toString('base64url');
const hash = createHash('sha256').update(chave).digest('hex');
await sql(`insert into chaves_mcp (nome, prefixo, hash) values ('${nome}', '${chave.slice(0, 7)}', '${hash}')`);

const arq = join(raiz, '.env.local');
const atual = readFileSync(arq, 'utf8');
const linha = `MCP_CHAVE=${chave}`;
appendFileSync(arq, (atual.endsWith('\n') ? '' : '\n') + `\n# Chave do conector do Claude (${nome}), criada em ${new Date().toISOString().slice(0, 10)}\n${linha}\n`);
console.log(`chave "${nome}" criada (${chave.slice(0, 7)}...). Está em .env.local como MCP_CHAVE.`);
