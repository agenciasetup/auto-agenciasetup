// O arquivo do Design: baixa os slides de uma amostra dos carrosséis antigos do @agenciasetup, de cada época, e monta
// uma folha por carrossel (os slides em ordem, lado a lado), para o time de Design estudar o que o dono fazia e não faz
// mais (carrossel infinito, elemento que passa de um slide para o outro, sombra, profundidade, efeitos).
// Só lê: a chave da conta é aberta aqui (como em scripts/meta-direct.mjs) e nunca é impressa. Nada vai para o Git:
// as imagens ficam em _local/design-arquivo/.
//   node scripts/design-arquivo.mjs              a amostra padrão (as 4 épocas)
//   node scripts/design-arquivo.mjs --listar     só mostra quais carrosséis entrariam
//   node scripts/design-arquivo.mjs --post DTycWllEa_C [--post ...]   um post de referência que o dono mandou (o código
//                                                do link instagram.com/p/<código>/), em _local/design-arquivo/ref-<código>/
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { env, sql } from './env.mjs';
import { decifrar } from '../worker/nucleo/cripto.js';

const GRAPH = 'https://graph.instagram.com';
const SAIDA = '_local/design-arquivo';
const listar = process.argv.includes('--listar');

// As épocas. Antes de novembro de 2024 o Instagram não devolve o alcance certo dos posts velhos, e a nota fica sem
// sentido: ali a ordem é por curtidas e comentários. Depois, pela nota.
const EPOCAS = [
  { id: 'a-auge', nome: 'O auge (jun/2022 a ago/2023)', de: '2022-06-01', ate: '2023-09-01', ordem: 'curtidas + 3 * comentarios', topo: 6, meio: 2 },
  { id: 'b-meio', nome: 'Depois do auge (set/2023 a out/2024)', de: '2023-09-01', ate: '2024-11-01', ordem: 'curtidas + 3 * comentarios', topo: 5, meio: 2 },
  { id: 'c-mao', nome: 'Feitos à mão, com alcance medido (nov/2024 a mai/2026)', de: '2024-11-01', ate: '2026-06-01', ordem: 'nota', topo: 6, meio: 2 },
  { id: 'd-auto', nome: 'Os automáticos (out e nov/2026)', de: '2026-10-01', ate: '2027-01-01', ordem: 'nota', topo: 3, baixo: 2 },
];

async function amostra(e) {
  const base = `from posts_redes where rede = 'instagram' and perfil = 'br' and formato = 'carrossel' and publicado_em >= '${e.de}' and publicado_em < '${e.ate}' and id_na_rede is not null and (${e.ordem}) is not null`;
  const campos = `id_na_rede, publicado_em, curtidas, comentarios, salvos, compartilhamentos, alcance, nota, palavra_chave, link, left(coalesce(legenda, ''), 140) legenda`;
  const topo = await sql(`select ${campos} ${base} order by (${e.ordem}) desc limit ${e.topo}`);
  // O "meio": dois do meio da fila, para ver o estilo de todo dia, não só o que explodiu.
  const meio = e.meio ? await sql(`select ${campos} from (select *, row_number() over (order by (${e.ordem}) desc) r, count(*) over () t ${base}) x where r between t / 2 and t / 2 + ${e.meio - 1}`) : [];
  const baixo = e.baixo ? await sql(`select ${campos} ${base} order by (${e.ordem}) asc limit ${e.baixo}`) : [];
  return [...topo.map((p) => ({ ...p, grupo: 'topo' })), ...meio.map((p) => ({ ...p, grupo: 'meio' })), ...baixo.map((p) => ({ ...p, grupo: 'baixo' }))];
}

async function baixar(url, arquivo) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`imagem ${r.status}`);
  fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
}

// A folha: os slides em ordem, 5 por linha, sem espaço entre eles (para ver o que atravessa de um para o outro).
async function folha(arquivos, destino) {
  const L = 320;
  const A = 400;
  const porLinha = 5;
  const linhas = Math.ceil(arquivos.length / porLinha);
  const partes = await Promise.all(arquivos.map(async (a, i) => ({ input: await sharp(a).resize(L, A, { fit: 'cover' }).toBuffer(), left: (i % porLinha) * L, top: Math.floor(i / porLinha) * A })));
  await sharp({ create: { width: porLinha * L, height: linhas * A, channels: 3, background: '#808080' } }).composite(partes).jpeg({ quality: 82 }).toFile(destino);
}

const [conta] = await sql(`select credenciais from conexoes where plataforma = 'instagram' and perfil = 'br' and status = 'ativa' order by criado_em limit 1`);
if (!conta) { console.error('Sem a conta do Instagram do Brasil conectada.'); process.exit(1); }
const token = encodeURIComponent((await decifrar(env, conta.credenciais)).token);

fs.mkdirSync(path.join(SAIDA, 'folhas'), { recursive: true });

// Um post de referência pelo código do link (o dono manda o link e o time estuda o post inteiro).
const posts = process.argv.flatMap((a, i, l) => (a === '--post' ? [l[i + 1]] : [])).filter(Boolean);
if (posts.length) {
  for (const codigo of posts) {
    const limpo = codigo.replace(/[^A-Za-z0-9_-]/g, '');
    const [p] = await sql(`select id_na_rede, publicado_em, curtidas, comentarios, salvos, nota, link from posts_redes where rede = 'instagram' and link like '%/${limpo}%' limit 1`);
    if (!p) { console.log(`${limpo}: não achei esse post na conta (só os posts da @agenciasetup)`); continue; }
    const m = await (await fetch(`${GRAPH}/${p.id_na_rede}?fields=children{media_type,media_url,thumbnail_url},media_url&access_token=${token}`)).json();
    if (m.error) { console.log(`${limpo}: Instagram: ${m.error.message}`); continue; }
    const filhos = (m.children && m.children.data) || [{ media_type: 'IMAGE', media_url: m.media_url }];
    const pasta = path.join(SAIDA, `ref-${limpo}`);
    fs.mkdirSync(pasta, { recursive: true });
    const arquivos = [];
    for (const [i, fi] of filhos.entries()) {
      const url = fi.media_type === 'VIDEO' ? fi.thumbnail_url : fi.media_url;
      if (!url) continue;
      const arq = path.join(pasta, `${String(i + 1).padStart(2, '0')}.jpg`);
      await baixar(url, arq);
      arquivos.push(arq);
    }
    if (arquivos.length) await folha(arquivos, path.join(pasta, 'folha.jpg'));
    console.log(`${limpo}: ${arquivos.length} slides em ${pasta} (curtidas ${p.curtidas}, comentários ${p.comentarios}, salvos ${p.salvos ?? '?'}, nota ${p.nota ?? '?'})`);
  }
  process.exit(0);
}
const indice = [];
for (const e of EPOCAS) {
  const lista = await amostra(e);
  console.log(`\n${e.nome}: ${lista.length} carrosséis`);
  for (const p of lista) {
    const dia = String(p.publicado_em).slice(0, 10);
    const nome = `${e.id}-${dia}-${(p.palavra_chave || p.id_na_rede).toString().toLowerCase().replace(/[^a-z0-9]+/g, '')}`.slice(0, 60);
    const linha = `${p.grupo.padEnd(5)} ${dia} curtidas ${p.curtidas} comentários ${p.comentarios} salvos ${p.salvos ?? '?'} nota ${p.nota ?? '?'} ${p.link || ''}`;
    console.log(`  ${linha}`);
    if (listar) continue;
    try {
      const m = await (await fetch(`${GRAPH}/${p.id_na_rede}?fields=children{media_type,media_url,thumbnail_url},media_url&access_token=${token}`)).json();
      if (m.error) throw new Error(`Instagram: ${m.error.message}`);
      const filhos = (m.children && m.children.data) || [];
      const pasta = path.join(SAIDA, nome);
      fs.mkdirSync(pasta, { recursive: true });
      const arquivos = [];
      for (const [i, f] of filhos.entries()) {
        const url = f.media_type === 'VIDEO' ? f.thumbnail_url : f.media_url;
        if (!url) continue;
        const arq = path.join(pasta, `${String(i + 1).padStart(2, '0')}.jpg`);
        await baixar(url, arq);
        arquivos.push(arq);
      }
      if (!arquivos.length) throw new Error('nenhum slide veio');
      const destino = path.join(SAIDA, 'folhas', `${nome}.jpg`);
      await folha(arquivos, destino);
      indice.push({ epoca: e.id, epoca_nome: e.nome, nome, folha: destino, slides: arquivos.length, ...p, publicado_em: dia, legenda: String(p.legenda).replace(/\s+/g, ' ') });
    } catch (err) {
      console.log(`    não deu: ${String(err.message).slice(0, 120)}`);
    }
  }
}
if (!listar) {
  fs.writeFileSync(path.join(SAIDA, 'indice.json'), JSON.stringify(indice, null, 1));
  console.log(`\n${indice.length} folhas em ${SAIDA}/folhas e o índice em ${SAIDA}/indice.json`);
}
