// Entrega os carrosséis de 24/10/2026 no painel, tudo como RASCUNHO: sobe os slides (e o card animado) no bucket
// "midia", o material grátis no "recursos", cria o recurso no site e a peça na fila com o "Comenta X" (modo direto,
// 2 versões). Usa o conector em produção com a chave da casa (MCP_CHAVE do .env.local). Não aprova, não agenda.
// Uso: node templates/carrossel/ferramentas/entregar.mjs [conteudo ...]   (sem nome: os 5)
// Grava o que criou em _local/carrossel/entrega.json (ids e endereços), para conferir e publicar depois.
// `--capas-site`: troca a capa deitada (capa-site.mjs) e a galeria do recurso que JÁ ESTÁ NO AR pelas da entrega atual.
// `--atualizar`: sobe os slides refeitos e troca na peça que já existe (rascunho), com o título e a legenda atuais.
// `--material`: sobe o material de novo (refeito a partir do Markdown) e troca o arquivo e o texto do recurso no ar.
// As duas mudam o que o público vê: só com o ok do dono para essa troca.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../../../scripts/env.mjs';

const raiz = join(import.meta.dirname, '..', '..', '..');
let n = 0, iniciado = false;
async function mcp(method, params = {}) {
  const r = await fetch('https://agenciasetup.com.br/mcp/ferramentas', { // /mcp é o modo código desde 09/11/2026
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(nome, args) {
  if (!iniciado) { await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregar', version: '1' } }); iniciado = true; }
  const r = await mcp('tools/call', { name: nome, arguments: args });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(`${nome}: ${c ? c.text : JSON.stringify(r.error)}`);
  try { return JSON.parse(c.text); } catch { return c.text; }
}
const subir = async (bucket, arq, nome, tipo) => (await chamar('enviar_arquivo', { bucket, nome, tipo, base64: readFileSync(arq).toString('base64') })).url;
const semH1 = (md) => readFileSync(md, 'utf8').replace(/\r/g, '').replace(/^# .+\n+/m, '');
const limpar = (h) => String(h || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const POSTS = {
  'posts-no-automatico': {
    material: { arq: '_local/materiais/pauteiro-diario-agencia-setup.pdf', md: 'materiais/prompts/pauteiro-diario.md', tipo: 'application/pdf' },
    recurso: {
      titulo: 'O pauteiro diário no Claude', slug: 'pauteiro-diario-no-claude', tipo: 'prompt', categoria_id: 3, formato: 'PDF', nivel: 'iniciante',
      resumo: 'Os 2 prompts que fazem o Claude acordar com a pauta do dia pronta, escrita do seu jeito: um ensina o seu estilo, o outro acha as notícias e escreve os posts.',
      itens: ['O prompt que monta o seu guia de estilo', 'O prompt da pauta do dia', 'Como deixar rodando todo dia às 7h'], ferramentas: ['claude'], tags: ['claude', 'pauta', 'automação', 'social media'],
    },
    titulo: 'Como deixar seus posts no automático',
    comenta: {
      palavra: 'PAUTA', nome: 'Carrossel do pauteiro: PAUTA',
      variantes: [
        { id: 'a', nome: 'direto e animado', dm: 'Opa! 🦎 Aqui estão os 2 prompts do pauteiro: um ensina o seu estilo e o outro acha a pauta do dia. É só tocar no botão:', botao: 'Pegar os prompts 🦎', publico: ['Te mandei no direct! 🦎', 'Corre no direct, calango 🔥', 'Enviado! Olha sua DM 💛'] },
        { id: 'b', nome: 'curiosidade', dm: 'Chegou! Amanhã às 7h o Claude já pode te entregar a pauta do dia 👀 Os 2 prompts estão aqui:', botao: 'Abrir os prompts 👀', publico: ['Já tá no seu direct 👀', 'Mandei lá, confere 🦎', 'Te chamei no direct 🔥'] },
      ],
    },
  },
  'arte-bonita-com-ia': {
    material: { arq: '_local/materiais/arte-em-5-etapas-agencia-setup.pdf', md: 'materiais/prompts/arte-em-5-etapas.md', tipo: 'application/pdf' },
    recurso: {
      titulo: 'A arte em 5 etapas no Claude', slug: 'arte-em-5-etapas-no-claude', tipo: 'prompt', categoria_id: 2, formato: 'PDF', nivel: 'iniciante',
      resumo: 'O prompt que faz o Claude montar a arte por camadas: fundo, título, foto, efeitos e textura. Arte bonita, sem cara de IA e sem abrir o Photoshop.',
      itens: ['O prompt das 5 etapas', 'Por que fazer por etapas', 'Dicas de revisão que fazem diferença'], ferramentas: ['claude'], tags: ['claude', 'design', 'carrossel', 'arte com ia'],
    },
    titulo: 'Como fazer arte bonita com IA',
    comenta: {
      palavra: 'CAMADAS', nome: 'Carrossel da arte em etapas: CAMADAS',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui está o prompt das 5 etapas, o mesmo que eu usei no carrossel: fundo, título, foto, efeitos e textura.', botao: 'Pegar o prompt 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Enviado, confere lá 🔥'] },
        { id: 'b', nome: 'provocação', dm: 'Bora fazer arte sem cara de IA? 🔥 O prompt das 5 etapas tá aqui, com as dicas de revisão:', botao: 'Abrir o prompt 🔥', publico: ['Mandei no direct 👀', 'Corre lá no direct 🦎', 'Te chamei no direct 💛'] },
      ],
    },
  },
  'skill-social-media': {
    material: { arq: '_local/materiais/social-media-no-automatico.skill', tipo: 'application/zip' },
    recurso: {
      titulo: 'Skill: Social Media no automático', slug: 'skill-social-media-no-automatico', tipo: 'automacao', categoria_id: 1, formato: 'Skill do Claude (.skill)', nivel: 'iniciante',
      resumo: 'Uma skill para o Claude que entende o seu nicho, pesquisa o que está em alta e entrega o post do dia pronto, no seu tom.',
      itens: ['A skill (arquivo .skill, é só instalar)', 'O modelo do seu perfil de social media', 'O formato da entrega do dia'], ferramentas: ['claude'], tags: ['claude', 'skill', 'social media', 'automação'],
      corpo_md: `## O que ela faz

A skill **Social Media no automático** faz o trabalho que mais come tempo de quem cuida de redes: achar o assunto do dia e escrever o post no jeito da marca.

1. **Entende o seu nicho** numa conversa só: o que você faz, para quem, o que vende e como você fala (4 perguntas). Fica guardado no seu perfil.
2. **Pesquisa o que está em alta** no seu nicho nos últimos 7 dias, cada assunto com a fonte e uma nota.
3. **Entrega o post pronto**: gancho, roteiro do carrossel ou do Reels, legenda e chamada, no seu tom.
4. **Aprende** com o que você aprova ou muda.

## Como instalar

1. Baixe o arquivo \`social-media-no-automatico.skill\` (o botão desta página).
2. No Claude, abra **Configurações > Capacidades > Skills** e envie o arquivo.
3. Numa conversa nova, peça: **"o que eu posto hoje?"**. Na primeira vez ela faz as 4 perguntas sobre o seu nicho.

## Rodar sozinha todo dia

Crie um projeto no Claude, coloque a skill e o seu perfil nele e peça: **"Todo dia às 7h, use a skill social-media-no-automatico e me mande o conteúdo do dia."**

## Quer o sistema inteiro?

No mini curso **Posts automáticos com Claude** eu ligo isso com você: pauta, texto e arte, todo dia, no seu estilo.`,
    },
    titulo: 'Essa é a melhor skill para Social Media',
    comenta: {
      palavra: 'SKILL', nome: 'Carrossel da skill de Social Media: SKILL',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui está a skill de Social Media. É só instalar no Claude e responder 4 perguntas sobre o seu nicho:', botao: 'Baixar a skill 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Corre no direct, calango 🔥'] },
        { id: 'b', nome: 'benefício', dm: 'Chegou a sua skill 👀 Ela entende o seu nicho, acha o que está em alta e escreve o post do dia. Toca no botão:', botao: 'Pegar a skill 👀', publico: ['Mandei no direct 👀', 'Enviado, confere lá 🦎', 'Te chamei no direct 🔥'] },
      ],
    },
  },
  'vale-a-pena-claude': {
    material: { arq: '_local/materiais/10-tarefas-pro-claude-agencia-setup.pdf', md: 'materiais/guias/10-tarefas-pro-claude.md', tipo: 'application/pdf' },
    recurso: {
      titulo: '10 tarefas de social media pra passar pro Claude', slug: '10-tarefas-pro-claude', tipo: 'guia', categoria_id: 1, formato: 'PDF', nivel: 'iniciante',
      resumo: 'As 10 tarefas que eu passaria pro Claude primeiro, cada uma com o pedido pronto para colar: da pauta do dia à leitura dos números.',
      itens: ['10 tarefas com o pedido pronto', 'Da pauta à leitura dos números', 'O que fica com você'], ferramentas: ['claude'], tags: ['claude', 'produtividade', 'social media'],
    },
    titulo: 'Vale a pena usar o Claude?',
    video: { slide: 5, arq: '_local/carrossel/vale-a-pena-claude/05.mp4' },
    comenta: {
      palavra: 'TEMPO', nome: 'Carrossel vale a pena o Claude: TEMPO',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui estão as 10 tarefas pra passar pro Claude ainda essa semana, com o pedido pronto de cada uma:', botao: 'Ver as 10 tarefas 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Enviado, confere lá 🔥'] },
        { id: 'b', nome: 'ganhar tempo', dm: 'Bora ganhar tempo? 🔥 As 10 tarefas que eu passaria pro Claude primeiro estão aqui:', botao: 'Abrir a lista 🔥', publico: ['Mandei no direct 👀', 'Corre lá no direct 🦎', 'Te chamei no direct 💛'] },
      ],
    },
  },
  'quatro-carrosseis-um-prompt': {
    material: { arq: '_local/materiais/4-prompts-carrosseis-agencia-setup.pdf', md: 'materiais/prompts/4-carrosseis.md', tipo: 'application/pdf' },
    recurso: {
      titulo: 'Os 4 prompts dos carrosséis', slug: '4-prompts-de-carrossel', tipo: 'prompt', categoria_id: 2, formato: 'PDF', nivel: 'iniciante',
      resumo: 'Os prompts dos 4 carrosséis feitos no Claude: o da Setup, o do advogado, o elegante e o religioso. Um prompt para cada estilo.',
      itens: ['O prompt do carrossel da Setup', 'O do advogado', 'O elegante', 'O religioso'], ferramentas: ['claude'], tags: ['claude', 'prompt', 'carrossel', 'design'],
    },
    titulo: '4 carrosséis que eu fiz com um prompt no Claude',
    comenta: {
      palavra: 'PROMPT', nome: 'Carrossel dos 4 estilos: PROMPT',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui estão os 4 prompts: o da Setup, o do advogado, o elegante e o religioso. É só copiar e colar no Claude:', botao: 'Pegar os prompts 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Corre no direct, calango 🔥'] },
        { id: 'b', nome: 'curto', dm: 'Chegou! 👀 Os 4 prompts dos carrosséis, prontos pra colar no Claude:', botao: 'Ver os 4 prompts 👀', publico: ['Mandei no direct 👀', 'Enviado, confere lá 🦎', 'Te chamei no direct 🔥'] },
      ],
    },
  },
};

// Segundo lote (25/10/2026). O FUTURO entrega as 10 tarefas, que já estão no site: o recurso vem do entrega.json.
Object.assign(POSTS, {
  'esculacho-do-perfil': {
    material: { arq: '_local/materiais/esculacho-do-perfil-agencia-setup.pdf', md: 'materiais/prompts/esculacho-do-perfil.md', tipo: 'application/pdf' },
    recurso: {
      titulo: 'O esculacho do seu perfil', slug: 'esculacho-do-perfil', tipo: 'prompt', categoria_id: 1, formato: 'PDF', nivel: 'iniciante',
      resumo: 'O prompt que faz o Claude esculachar o seu Instagram com os seus números: os 5 maiores erros, o conserto de cada um e o que fazer amanhã.',
      itens: ['O prompt do esculacho', 'Quais números mandar e onde achar', 'O que eu descobri com o meu perfil'], ferramentas: ['claude'], tags: ['claude', 'instagram', 'prompt', 'social media'],
    },
    titulo: 'Pedi pro Claude esculachar o meu Instagram',
    comenta: {
      palavra: 'ESCULACHO', nome: 'Carrossel do esculacho: ESCULACHO',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui está o prompt do esculacho. Manda os seus números junto que ele não perdoa:', botao: 'Pegar o prompt 🦎', publico: ['Te mandei no direct! 🦎', 'Corre no direct, calango 🔥', 'Enviado! Prepara o coração 😂'] },
        { id: 'b', nome: 'coragem', dm: 'Chegou! 😂 Coragem, hein? O prompt pra esculachar o seu perfil tá aqui:', botao: 'Quero o esculacho 😂', publico: ['Mandei no direct 👀', 'Tá na sua DM, boa sorte 😂', 'Te chamei no direct 🦎'] },
      ],
    },
  },
  'quem-cria-usa-menos-ia': {
    material: { arq: '_local/materiais/10-tarefas-pro-claude-agencia-setup.pdf', md: 'materiais/guias/10-tarefas-pro-claude.md', tipo: 'application/pdf' },
    titulo: 'Só 1 em cada 3 criativos usa IA no trabalho',
    comenta: {
      palavra: 'FUTURO', nome: 'Carrossel quem cria e a IA: FUTURO',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui estão as 10 tarefas pra passar pro Claude, cada uma com o pedido pronto:', botao: 'Ver as 10 tarefas 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Enviado, confere lá 🔥'] },
        { id: 'b', nome: 'não ser o último', dm: 'Bora não ser o último? 🔥 As 10 tarefas que eu passaria pro Claude primeiro estão aqui:', botao: 'Abrir a lista 🔥', publico: ['Mandei no direct 👀', 'Corre lá no direct 🦎', 'Te chamei no direct 💛'] },
      ],
    },
  },
  'texto-cara-de-ia': {
    material: { arq: '_local/materiais/tirar-cara-de-ia-agencia-setup.pdf', md: 'materiais/prompts/tirar-cara-de-ia.md', tipo: 'application/pdf' },
    recurso: {
      titulo: 'O prompt que tira a cara de IA', slug: 'prompt-tira-cara-de-ia', tipo: 'prompt', categoria_id: 3, formato: 'PDF', nivel: 'iniciante',
      resumo: 'O prompt que reescreve legenda, roteiro ou carrossel do seu jeito, sem as 4 manias que entregam que foi a IA.',
      itens: ['As 4 manias que entregam a IA', 'O prompt pronto pra colar', 'Como juntar com o seu guia de estilo'], ferramentas: ['claude'], tags: ['claude', 'copywriting', 'prompt', 'texto'],
    },
    titulo: 'Por que todo mundo percebe que foi a IA',
    comenta: {
      palavra: 'TEXTO', nome: 'Carrossel do texto com cara de IA: TEXTO',
      variantes: [
        { id: 'a', nome: 'direto', dm: 'Opa! 🦎 Aqui está o prompt que tira a cara de IA do seu texto. Cola junto 3 legendas suas:', botao: 'Pegar o prompt 🦎', publico: ['Te mandei no direct! 🦎', 'Já tá na sua DM 💛', 'Enviado, confere lá 🔥'] },
        { id: 'b', nome: 'curiosidade', dm: 'Chegou 👀 O prompt que tira as manias de IA do seu texto tá aqui:', botao: 'Abrir o prompt 👀', publico: ['Mandei no direct 👀', 'Corre lá no direct 🦎', 'Te chamei no direct 💛'] },
      ],
    },
  },
});

const arqEntrega = join(raiz, '_local', 'carrossel', 'entrega.json');
const entrega = existsSync(arqEntrega) ? JSON.parse(readFileSync(arqEntrega, 'utf8')) : {};
const capasSite = process.argv.includes('--capas-site');
const material = process.argv.includes('--material');
const atualizar = process.argv.includes('--atualizar');
// Os slides como a peça guarda: título e texto de cada um (para o texto alternativo e a busca) e a imagem.
const slidesDaPeca = (C, P, feito) => C.slides.map((s, k) => ({
  titulo: limpar(s.tipo === 'capa' ? `${s.titulo.pre} ${s.titulo.script}${s.titulo.condensada} ${s.titulo.pos || ''}` : s.tipo === 'chamada' ? `${s.titulo.pre} ${s.titulo.condensada}` : s.titulo),
  texto: limpar(s.texto || (s.blocos && s.blocos[0] && s.blocos[0].html) || ''),
  imagem_url: feito.slides[k],
  ...(P.video && P.video.slide === k + 1 ? { video_url: feito.video } : {}),
}));
const nomes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const pedidos = nomes.length ? nomes : Object.keys(POSTS);
for (const nome of pedidos) {
  const P = POSTS[nome];
  const pasta = join(raiz, '_local', 'carrossel', nome);
  const conteudo = readFileSync(join(raiz, 'templates', 'carrossel', 'conteudos', `${nome}.js`), 'utf8');
  const C = new Function('window', `${conteudo}; return window.CARROSSEL;`)({});
  const feito = entrega[nome] || {};
  console.log(`\n${nome}: ${C.slides.length} slides`);
  // 1. Slides (e o card animado). Com --atualizar, sobe de novo os que foram refeitos.
  if (!feito.slides || atualizar) {
    feito.slides = [];
    for (let i = 1; i <= C.slides.length; i++) {
      const url = await subir('midia', join(pasta, `${String(i).padStart(2, '0')}.jpg`), `carrossel-${nome}-${String(i).padStart(2, '0')}.jpg`, 'image/jpeg');
      feito.slides.push(url);
      process.stdout.write('.');
    }
    if (P.video) feito.video = await subir('midia', join(raiz, P.video.arq), `carrossel-${nome}-${String(P.video.slide).padStart(2, '0')}.mp4`, 'video/mp4');
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
  }
  // 2. Material grátis.
  if (!feito.arquivo) {
    const arq = join(raiz, P.material.arq);
    feito.arquivo = { url: await subir('recursos', arq, arq.split(/[\\/]/).pop(), P.material.tipo), nome: arq.split(/[\\/]/).pop(), bytes: statSync(arq).size };
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
  }
  // 3. Recurso no site (rascunho).
  if (!feito.recurso_id) {
    const r = await chamar('salvar_recurso', {
      ...P.recurso, corpo_md: P.recurso.corpo_md || semH1(join(raiz, P.material.md)),
      arquivo_url: feito.arquivo.url, arquivo_nome: feito.arquivo.nome, arquivo_bytes: feito.arquivo.bytes,
      capa_url: feito.slides[0], galeria: feito.slides.slice(0, 3).map((url, k) => ({ url, alt: `${P.titulo}, slide ${k + 1}` })),
    });
    feito.recurso_id = r.id; feito.recurso_endereco = r.endereco;
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
    console.log(`  recurso ${r.id} ${r.endereco || ''}`);
  }
  // 4. Peça na fila (rascunho), com o "Comenta X" (modo direto, 2 versões).
  if (!feito.peca_id) {
    const slides = slidesDaPeca(C, P, feito);
    const r = await chamar('criar_pecas', {
      origem_tipo: 'recurso', origem_id: feito.recurso_id,
      pecas: [{ rede: 'instagram', formato: 'carrossel', titulo: P.titulo, legenda: C.legenda, slides, comenta: { ...P.comenta, modo: 'direto', estrategia: 'melhor', responder_publico: true, resposta_ia: true } }],
    });
    const peca = Array.isArray(r) ? r[0] : (r.pecas || r)[0] || r;
    feito.peca_id = peca.id; feito.comenta = peca.comenta || null; feito.avisos = r.avisos || null;
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
    console.log(`  peça ${peca.id} ${JSON.stringify(peca.comenta || {})} ${r.avisos ? JSON.stringify(r.avisos) : ''}`);
  }
  // 5. Só com --capas-site: a capa e a galeria do recurso no ar passam a ser as desta entrega.
  if (capasSite) {
    feito.capa_site = await subir('midia', join(pasta, 'capa-site.jpg'), `recurso-${nome}-capa.jpg`, 'image/jpeg');
    await chamar('salvar_recurso', {
      id: feito.recurso_id, capa_url: feito.capa_site,
      galeria: feito.slides.slice(0, 3).map((url, k) => ({ url, alt: `${P.titulo}, slide ${k + 1}` })),
    });
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
    console.log(`  capa do recurso trocada: ${feito.recurso_endereco}`);
  }
  // 6. Só com --material: o arquivo e o texto do recurso no ar passam a ser os do material atual.
  if (material) {
    const arq = join(raiz, P.material.arq);
    feito.arquivo = { url: await subir('recursos', arq, arq.split(/[\\/]/).pop(), P.material.tipo), nome: arq.split(/[\\/]/).pop(), bytes: statSync(arq).size };
    await chamar('salvar_recurso', {
      id: feito.recurso_id, arquivo_url: feito.arquivo.url, arquivo_nome: feito.arquivo.nome, arquivo_bytes: feito.arquivo.bytes,
      corpo_md: P.recurso.corpo_md || semH1(join(raiz, P.material.md)),
    });
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
    console.log(`  material do recurso trocado: ${feito.arquivo.nome} (${feito.arquivo.bytes} bytes)`);
  }
  // 7. Só com --atualizar: a peça que já existe recebe os slides, o título e a legenda atuais (a palavra e as versões
  // do direct ficam). Peça agendada não se edita: volte para rascunho no painel antes.
  if (atualizar && feito.peca_id) {
    await chamar('editar_peca', { id: feito.peca_id, titulo: P.titulo, legenda: C.legenda, slides: slidesDaPeca(C, P, feito) });
    console.log(`  peça atualizada: ${feito.peca_id}`);
  }
}
console.log(`\nentrega em ${arqEntrega}`);
