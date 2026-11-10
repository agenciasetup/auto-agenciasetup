// Confere o setor de vídeo sem gravar nada e sem gastar IA: a conta do Caçador de virais (com um feed de mentira) e as
// travas da Roteirista (o que ela aceita e o que ela barra antes de pôr um roteiro na mesa).
//   node scripts/conferir-video.mjs           só as contas e as travas, sem rede
//   node scripts/conferir-video.mjs --feed    também lê um feed de verdade do YouTube (o canal da Anthropic)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const de = (p) => import(pathToFileURL(path.resolve(p)).href);
const { lerFeed, medir, feedDe, canalValido, lerCanais } = await de('worker/lib/agentes/cacador-de-virais.js');
const { conferirRoteiro, montarPedido, FORMATOS } = await de('worker/lib/agentes/roteirista.js');

let falhas = 0;
const ok = (nome, cond, visto) => { if (!cond) falhas++; console.log(cond ? 'ok  ' : 'ERRO', nome, cond ? '' : JSON.stringify(visto).slice(0, 300)); };

// ---------------------------------------------------------------- Caçador de virais
const agora = Date.parse('2026-11-10T12:00:00Z');
const dia = 86_400_000;
const entrada = (id, diasAtras, views, titulo = 'Um título') => `<entry><yt:videoId>${id}</yt:videoId><title>${titulo}</title><published>${new Date(agora - diasAtras * dia).toISOString()}</published><media:group><media:community><media:starRating count="12" average="5.00" min="1" max="5"/><media:statistics views="${views}"/></media:community></media:group></entry>`;
const xml = `<feed><title>x</title><author><name>Canal &amp; Teste</name></author>${[
  entrada('novoFORA001', 2, 90000, 'Claude &amp; posts &lt;3'), entrada('novoNORMAL1', 1, 9000), entrada('velhoGRANDE', 40, 200000),
  ...Array.from({ length: 8 }, (_, i) => entrada(`velho${i}xxxxx`, 6 + i, 10000 + i * 100)),
].join('')}</feed>`;
const f = lerFeed(xml);
ok('lê as 11 entradas do feed', f.itens.length === 11, f.itens.length);
ok('lê o nome do canal e o título sem código', f.canal === 'Canal & Teste' && f.itens[0].titulo === 'Claude & posts <3', [f.canal, f.itens[0].titulo]);
ok('lê visualizações e curtidas', f.itens[0].views === 90000 && f.itens[0].curtidas === 12, f.itens[0]);
const m = medir(f.itens, agora);
ok('a base é a mediana dos que já assentaram', m.base === 10400, m.base);
ok('só o Short novo e muito acima da base entra', m.fora.length === 1 && m.fora[0].id === 'novoFORA001', m.fora.map((x) => x.id));
ok('conta as vezes e as visualizações por dia', m.fora[0].vezes === 8.7 && m.fora[0].por_dia === 45000, m.fora[0]);
ok('vídeo antigo fica de fora mesmo sendo grande', !m.fora.some((x) => x.id === 'velhoGRANDE'));
ok('régua mais alta tira o achado', medir(f.itens, agora, { vezes: 10 }).fora.length === 0);
ok('mínimo de visualizações vale', medir(f.itens, agora, { views: 100000 }).fora.length === 0);
ok('id de canal e endereço do feed', canalValido('UCrDwWp7EBBv4NwvScIpBDOA') && !canalValido('UCcurto') && feedDe('UCrDwWp7EBBv4NwvScIpBDOA').endsWith('playlist_id=UUSHrDwWp7EBBv4NwvScIpBDOA'));
ok('lista de canais ignora id torto e canal desligado', lerCanais({ valor: { canais: [{ id: 'UCrDwWp7EBBv4NwvScIpBDOA' }, { id: 'x' }, { id: 'UCXZCJLdBC09xxGZ6gcdrc6A', ativo: false }] } }).canais.length === 1);
ok('feed vazio não quebra', lerFeed('').itens.length === 0 && medir([], agora).fora.length === 0);

// ---------------------------------------------------------------- Roteirista
const virais = [{ video_id: 'novoFORA001', canal: 'Canal', idioma: 'en', titulo: 'Steal these 3', views: 90000, vezes: 8.7, por_dia: 45000 }];
const palavras = [{ palavra: 'POSTS', titulo: null }, { palavra: 'SKILL', titulo: 'Skill: Social Media no automático' }];
const ctx = { virais, palavras, preco: 'R$ 39,90' };
const bom = {
  viral: 'novoFORA001', formato: 'tela', gancho: 'Pedi pro Claude fazer meus posts da semana.',
  falas: ['Esse era o meu feed ontem.', 'Mandei uma foto e pedi uma direção nova.', 'Ele montou a arte em etapas.', 'É o que eu ensino no mini curso, por R$ 39,90.', 'Comenta POSTS que eu te mando.'],
  tela: 'O post pronto primeiro, depois o Claude trabalhando.', palavra: 'posts', vende: 'Mostra o resultado que o curso ensina.', segundos: 34,
};
const r = conferirRoteiro(bom, ctx);
ok('roteiro bom passa', typeof r === 'object' && r.palavra === 'POSTS' && r.falas.length === 5 && r.segundos === 34, r);
const barra = (nome, muda, parte) => { const x = conferirRoteiro({ ...bom, ...muda }, ctx); ok(`barra: ${nome}`, typeof x === 'string' && x.includes(parte), x); };
barra('viral que não está na lista', { viral: 'outroVIDEO01' }, 'não está na lista');
barra('formato que o motor não faz', { formato: 'holograma' }, 'Formato');
barra('palavra que não está ligada', { palavra: 'GRATIS' }, 'não está ligada');
barra('travessão', { gancho: 'Pedi pro Claude — e ele fez tudo.' }, 'travessão');
barra('link nas falas', { falas: [...bom.falas.slice(0, 4), 'Entra em www.site.com e comenta POSTS.'] }, 'link');
barra('última fala sem a palavra', { falas: [...bom.falas.slice(0, 4), 'Me segue para mais.'] }, 'última fala');
barra('preço inventado', { falas: ['Hoje sai por R$ 19,90.', ...bom.falas.slice(1)] }, 'valor');
barra('promessa de dinheiro', { vende: 'Você ganha R$ 5.000 por mês com isso.' }, 'valor');
barra('diminui o design do dono', { gancho: 'Pedi pro Claude reinventar o meu feed inteiro.' }, 'Diminui');
barra('chama o feed de sem graça', { falas: ['Esse era o meu feed ontem, sem graça.', ...bom.falas.slice(1)] }, 'Diminui');
barra('poucas falas', { falas: ['Comenta POSTS.'] }, 'Faltam falas');
barra('gancho comprido demais', { gancho: 'Eu pedi para o Claude fazer todos os meus posts da semana inteira e ele fez tudo sozinho mesmo viu' }, 'Gancho');
ok('sem preço na oferta, qualquer valor é barrado', typeof conferirRoteiro(bom, { ...ctx, preco: null }) === 'string');
const pedido = montarPedido({ oferta: { nome: 'Posts automáticos com Claude', texto: 'O mini curso.', venda: { preco_centavos: 3990 } }, palavras, virais, anteriores: ['Roteiro (tela): antigo'], estilo: 'Fale simples.', vagas: 2 });
ok('o pedido leva o preço, as palavras, os formatos e os virais como dados', pedido.includes('R$ 39,90') && pedido.includes('SKILL (manda: Skill') && pedido.includes('<virais_da_semana>') && Object.keys(FORMATOS).every((k) => pedido.includes(`- ${k}:`)) && pedido.includes('Escreva até 2 roteiro'), pedido.slice(0, 200));

if (process.argv.includes('--feed')) {
  const id = 'UCrDwWp7EBBv4NwvScIpBDOA';
  const real = lerFeed(await (await fetch(feedDe(id))).text());
  ok('feed de verdade do YouTube: Shorts com visualizações', real.itens.length >= 3 && real.itens.every((i) => i.views >= 0 && i.id) && real.canal.length > 0, { canal: real.canal, itens: real.itens.length });
}
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
