// Monta (ou atualiza) o mini curso "Posts automáticos com Claude" na área de membros, a partir da pasta Curso/.
// Pode rodar de novo: acha cada coisa pelo seu código (curso pelo slug, módulo pelo número, aula pelo código,
// arquivo pelo nome) e atualiza no lugar, sem apagar progresso de ninguém.
// Uso: node scripts/area-semente.mjs            (estrutura, aulas, falas, capas e arquivos do kit)
//      node scripts/area-semente.mjs --sem-kit  (não sobe os arquivos de novo)
//      node scripts/area-semente.mjs --so 1.1,1.2  (só o que vem do vídeo dessas aulas: duração, legendas, marcadores,
//                                                   resumo e "faça agora"; curso, títulos e capas ficam como estão no ar.
//                                                   Rode logo depois de trocar o vídeo no Bunny, nunca antes)
//      node scripts/area-semente.mjs --so-kit   (só os arquivos do kit, o do Claude e o do Codex; curso e aulas ficam
//                                                como estão no ar. Gere o do Codex antes: node Curso/_ferramentas/kit-codex.mjs)
// O curso (Curso/) fica fora do Git; os arquivos vão para o bucket privado "curso" e as capas para "midia".
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { env, exige, raiz } from './env.mjs';
import { exigirKitLimpo } from './kit-limpo.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const CURSO = join(raiz, 'Curso');
const KIT = join(CURSO, 'kit');
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };

async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
async function salvar(tabela, filtro, dados) {
  const atual = await um(tabela, filtro);
  if (atual) return (await rest(`/${tabela}?id=eq.${atual.id}`, { method: 'PATCH', body: JSON.stringify(dados) }))[0];
  return (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
}
async function subir(bucket, caminho, corpo, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: corpo,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`;
}

// ---------------------------------------------------------------- o curso
const SECOES = ['Montar a base', 'Criar todo dia', 'Ir além'];
const MODULOS = [
  [1, 0, 'Comece por aqui'], [2, 0, 'O Claude aprende o seu estilo'], [3, 1, 'Assuntos quentes e posts do dia'],
  [4, 1, 'Design alto padrão'], [5, 2, 'Imagens com IA'], [6, 2, 'Tudo no automático'],
];
const AULAS = [
  ['1.1', 'O que você vai construir', ['00-LEIA-PRIMEIRO.md']],
  ['1.2', 'Instalando o Claude e conhecendo a tela', ['guia-da-tela.md']],
  ['1.3', 'Sua pasta de projeto e o kit', ['01-comece-aqui.md']],
  ['1.4', 'Liberando os acessos', ['02-liberar-acessos.md']],
  ['2.1', 'A entrevista do seu perfil', ['03-meu-estilo.md']],
  ['2.2', 'O Claude lê o seu Instagram', []],
  ['2.3', 'Testar e corrigir sua skill de estilo', ['exemplos-de-correcao.md', 'skills/meu-estilo']],
  ['3.1', 'O radar de assuntos quentes', ['04-radar.md', 'skills/radar']],
  ['3.2', 'O quadro de conteúdo', ['05-quadro.md']],
  ['3.3', 'Os posts do dia e as tarefas agendadas', ['06-posts-do-dia.md', 'skills/posts-do-dia']],
  ['4.1', 'O modelo de arte em camadas', ['07-design.md', 'modelo', 'ferramentas/exportar.mjs', 'ferramentas/recortar.mjs']],
  ['4.2', 'Capa intencional e a regra das 5 etapas', ['skills/design-alto-padrao']],
  ['4.3', 'Efeitos com motivo e acabamento', ['licoes-de-design.md']],
  ['4.4', 'Como corrigir o design do Claude', ['como-dar-feedback.md']],
  ['5.1', 'Nano Banana pela API do Google', ['08-nano-banana.md', 'ferramentas/gerar-imagem.mjs']],
  ['5.2', 'Magnific e a sua foto com o rosto idêntico', ['09-magnific.md']],
  ['6.1', 'Um dia no automático', ['10-rotina.md']],
  ['6.2', 'Quando algo dá errado', ['ERROS-E-SOLUCOES.md']],
];
// A ficha de cada arquivo: o que é, quando usar, como usar e o tempo.
const ABRIR = ['Abra a pasta do seu projeto no Claude (aba Code).', 'Arraste este arquivo para a conversa.', 'Responda às perguntas que ele fizer, uma de cada vez.'];
const FICHAS = {
  'Posts-Automaticos-Kit.zip': ['pacote', 'O kit inteiro numa pasta só: receitas, guias, skills e o modelo de arte.', 'Antes da aula 1.3. Baixe, descompacte e guarde a pasta em Documentos.', ['Baixe o arquivo.', 'Descompacte (clique duas vezes no Mac; no Windows, botão direito e Extrair tudo).', 'Mova a pasta Posts-Automaticos-Kit para Documentos.'], '2 min'],
  'Posts-Automaticos-Kit-Codex.zip': ['pacote', 'O mesmo kit, adaptado para quem usa o Codex (do ChatGPT) em vez do Claude.', 'Só se você usa o Codex. Antes da aula 1.3, no lugar do kit do Claude.', ['Baixe o arquivo.', 'Descompacte (clique duas vezes no Mac; no Windows, botão direito e Extrair tudo).', 'Mova a pasta Posts-Automaticos-Kit para Documentos.', 'Leia o guia-da-tela.md de dentro da pasta: as telas do Codex são diferentes das aulas.'], '5 min'],
  '00-LEIA-PRIMEIRO.md': ['guia', 'O que você precisa ter e a ordem de tudo, numa lista curta.', 'Antes de começar as aulas práticas.', ['Abra o arquivo e confira a lista.', 'Siga a ordem das aulas.'], '3 min'],
  'guia-da-tela.md': ['guia', 'A tela do Claude Desktop explicada, botão por botão.', 'Quando não achar um botão ou não souber onde clicar.', ['Abra e procure a parte da tela que você quer entender.'], '5 min'],
  '01-comece-aqui.md': ['receita', 'Monta a pasta do projeto e confere o que falta instalar.', 'Na aula 1.3, com o Claude aberto na pasta do projeto.', ABRIR, '10 min'],
  '02-liberar-acessos.md': ['receita', 'Libera o Claude in Chrome, as tarefas agendadas e as permissões.', 'Na aula 1.4.', ABRIR, '10 min'],
  '03-meu-estilo.md': ['receita', 'A entrevista do seu perfil, a leitura do seu Instagram e a ficha do seu estilo visual, medida nas capas que você manda como referência.', 'Nas aulas 2.1 e 2.2.', ABRIR, '30 min'],
  'exemplos-de-correcao.md': ['guia', 'Correções boas e ruins de estilo, com exemplos de vários nichos e frases prontas.', 'Sempre que um texto do Claude não soar como você.', ['Abra quando for corrigir um texto.', 'Escolha uma frase pronta parecida com o seu caso.', 'Troque o exemplo pelo seu jeito de falar e mande no Claude.'], '5 min'],
  'skills/meu-estilo': ['skill', 'O modelo da skill de estilo. A sua o Claude monta na aula 2.1; este serve para comparar.', 'Só se quiser conferir a sua (aula 2.3).', ['Descompacte.', 'Compare com a sua, na pasta .claude/skills do projeto.'], '5 min'],
  '04-radar.md': ['receita', 'Monta o radar de assuntos quentes do seu nicho.', 'Na aula 3.1.', ABRIR, '15 min'],
  'skills/radar': ['skill', 'O modelo da skill do radar.', 'Só se quiser comparar com a sua (aula 3.1).', ['Descompacte.', 'Compare com a sua, na pasta .claude/skills do projeto.'], '5 min'],
  '05-quadro.md': ['receita', 'Cria o quadro de conteúdo, tipo Trello, dentro da sua pasta.', 'Na aula 3.2.', ABRIR, '15 min'],
  '06-posts-do-dia.md': ['receita', 'Cria a skill dos posts do dia e a tarefa que roda sozinha.', 'Na aula 3.3.', ABRIR, '15 min'],
  'skills/posts-do-dia': ['skill', 'O modelo da skill dos posts do dia.', 'Só se quiser comparar com a sua (aula 3.3).', ['Descompacte.', 'Compare com a sua, na pasta .claude/skills do projeto.'], '5 min'],
  '07-design.md': ['receita', 'Põe o seu estilo no modelo de arte em camadas, instala o exportador de imagem e o recorte de fundo grátis, e faz a primeira arte ao lado das suas referências.', 'Na aula 4.1.', ABRIR, '40 min'],
  'modelo': ['modelo', 'O modelo de arte em camadas (HTML) que vira os seus posts, no seu estilo.', 'A receita 07 instala para você. Baixe só se quiser abrir à mão.', ['Descompacte.', 'Leia o LEIA.md dentro da pasta.'], '5 min'],
  'ferramentas/exportar.mjs': ['ferramenta', 'Exporta a arte em imagem pronta para o Instagram e mede as suas referências.', 'O Claude usa sozinho. Você não precisa abrir.', ['Deixe na pasta ferramentas do projeto.'], '1 min'],
  'ferramentas/recortar.mjs': ['ferramenta', 'Tira o fundo das fotos de graça, no seu computador, sem mandar a foto para lugar nenhum.', 'O Claude usa sozinho na receita 07, quando a capa pede. Você não precisa abrir.', ['Deixe na pasta ferramentas do projeto.'], '1 min'],
  'skills/design-alto-padrao': ['skill', 'Lê o seu estilo nas suas referências e faz a arte nele, pela regra das 5 etapas.', 'Na aula 4.2.', ['Descompacte.', 'Arraste a pasta na conversa e peça para o Claude instalar a skill no projeto.'], '5 min'],
  'licoes-de-design.md': ['guia', 'As lições de design da Agência Setup, explicadas para qualquer nicho.', 'Na aula 4.3 e sempre que for revisar uma arte.', ['Leia uma vez inteira.', 'Volte nele quando uma arte parecer "sem graça".'], '10 min'],
  'como-dar-feedback.md': ['guia', 'Como corrigir o design do Claude com texto, print ou referência.', 'Na aula 4.4 e toda vez que uma arte precisar de ajuste.', ['Escolha o jeito (texto, print ou referência).', 'Use a frase pronta do guia.'], '5 min'],
  '08-nano-banana.md': ['receita', 'Liga o Nano Banana pela chave do Google AI Studio.', 'Na aula 5.1. É opcional e pago por uso.', ABRIR, '15 min'],
  'ferramentas/gerar-imagem.mjs': ['ferramenta', 'Gera imagens pelo Nano Banana.', 'O Claude usa sozinho. Você não precisa abrir.', ['Deixe na pasta ferramentas do projeto.'], '1 min'],
  '09-magnific.md': ['receita', 'Liga o Magnific e faz a sua foto com o rosto idêntico.', 'Na aula 5.2. É opcional.', ABRIR, '15 min'],
  '10-rotina.md': ['receita', 'Agenda as três tarefas do dia e a revisão da semana.', 'Na aula 6.1.', ABRIR, '10 min'],
  'ERROS-E-SOLUCOES.md': ['guia', 'O que trava e como destravar, do jeito mais simples.', 'Quando algo der errado.', ['Procure o erro pelo título.', 'Faça o passo a passo.', 'Não resolveu? Pergunte ao tutor da aula com um print.'], '5 min'],
};

const duracao = (arq) => Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim()));
const lerJson = (arq) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8').replace(/^﻿/, '')) : null);
function previaDe(arq) {
  if (!existsSync(arq) || statSync(arq).isDirectory()) return null;
  return readFileSync(arq, 'utf8').split(/\r?\n/).filter((l) => l.trim()).slice(0, 6).join('\n').slice(0, 400);
}
// O tar do Windows grava o zip com "/" nos caminhos. O Compress-Archive grava "\", que no Mac pode virar um arquivo só.
function zipar(origem, destino) {
  rmSync(destino, { force: true });
  execFileSync(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', destino, '-C', dirname(origem), basename(origem)]);
}

const semKit = process.argv.includes('--sem-kit');
const soKit = process.argv.includes('--so-kit');
const iSo = process.argv.indexOf('--so');
const so = soKit ? [] : iSo > 0 ? String(process.argv[iSo + 1] || '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const tmp = join(raiz, '_local', 'area-semente');
mkdirSync(tmp, { recursive: true });

// Dados de cada aula que saem do vídeo (mudam quando o vídeo é refeito).
function doVideo(id) {
  const pasta = join(CURSO, 'aulas', id);
  const falas = lerJson(join(pasta, 'audio', 'falas.json')) || [];
  const tempos = (lerJson(join(pasta, 'audio', 'tempos.json')) || {}).falas || {};
  const area = lerJson(join(pasta, 'area.json')) || {};
  const dados = {
    duracao_s: duracao(join(CURSO, 'videos', `aula-${id}.mp4`)),
    falas: falas.filter((f) => tempos[f.id]).map((f) => ({ s: Math.floor(tempos[f.id].inicio), f: Math.ceil(tempos[f.id].fim), texto: f.texto })),
  };
  if (area.marcadores) dados.marcadores = area.marcadores;
  if (area.resumo) dados.resumo = area.resumo;
  if (area.faca_agora) dados.faca_agora = area.faca_agora;
  return dados;
}

if (so) {
  const c = await um('cursos', 'slug=eq.posts-automaticos-com-claude');
  for (const id of so) {
    const atual = c && await um('aulas', `curso_id=eq.${c.id}&codigo=eq.${id}`);
    if (!atual) { console.log(`${id}: aula não encontrada`); continue; }
    const d = doVideo(id);
    await rest(`/aulas?id=eq.${atual.id}`, { method: 'PATCH', body: JSON.stringify(d) });
    console.log(`${id}: ${atual.duracao_s} s -> ${d.duracao_s} s, ${d.falas.length} legendas, ${(d.marcadores || []).length} marcadores`);
  }
  if (semKit) process.exit(0);
}

// Curso, produto e oferta.
const curso = so ? await um('cursos', 'slug=eq.posts-automaticos-com-claude') : await salvar('cursos', 'slug=eq.posts-automaticos-com-claude', {
  slug: 'posts-automaticos-com-claude', titulo: 'Posts automáticos com Claude', subtitulo: 'Do zero ao post pronto, bonito e no seu estilo.',
  descricao: 'Uma pasta no seu computador que aprende o seu jeito, acha assunto quente todo dia, escreve os posts num quadro e faz a arte em alto padrão. Sem programar: você arrasta um arquivo na conversa e responde às perguntas que o Claude faz.',
  cor: '#ff7a00', certificado_pct: 70, status: 'publicado', publicado_em: new Date().toISOString(), tags: ['claude', 'automacao', 'posts', 'design'],
});
console.log('curso', curso.slug);

const aulas = {};
if (so) {
  // Só o kit: as aulas já estão no ar, basta achar cada uma pelo código.
  for (const a of await rest(`/aulas?curso_id=eq.${curso.id}&select=id,codigo`)) aulas[a.codigo] = a;
} else {
  const secoes = [];
  for (const [i, t] of SECOES.entries()) secoes.push(await salvar('secoes', `curso_id=eq.${curso.id}&titulo=eq.${encodeURIComponent(t)}`, { curso_id: curso.id, titulo: t, ordem: i }));
  const modulos = {};
  for (const [n, s, t] of MODULOS) modulos[n] = await salvar('modulos', `curso_id=eq.${curso.id}&numero=eq.${n}`, { curso_id: curso.id, secao_id: secoes[s].id, numero: n, titulo: t, ordem: n });

  for (const [i, [id, titulo]] of AULAS.entries()) {
    const capaLocal = join(raiz, '_local', 'prototipo-area', 'img', `aula-${id}.jpg`);
    const capa_url = existsSync(capaLocal) ? await subir('midia', `curso/posts-automaticos/aula-${id}.jpg`, readFileSync(capaLocal), 'image/jpeg') : null;
    const dados = {
      curso_id: curso.id, modulo_id: modulos[+id[0]].id, codigo: id, titulo, ordem: i + 1, status: 'publicado', capa_url,
      gratis: id === '1.1', ...doVideo(id),
    };
    aulas[id] = await salvar('aulas', `curso_id=eq.${curso.id}&codigo=eq.${id}`, dados);
    process.stdout.write(`${id} `);
  }
  console.log('\naulas', Object.keys(aulas).length);
  if (curso && aulas['1.1']) await rest(`/cursos?id=eq.${curso.id}`, { method: 'PATCH', body: JSON.stringify({ capa_url: aulas['1.1'].capa_url }) });
}

// Arquivos do kit (bucket privado). Pastas viram .zip.
if (!semKit) {
  // Trava: nada da família Calango (nem fonte nenhuma) vai para o curso. Derruba o envio antes de montar o pacote.
  exigirKitLimpo(KIT);
  if (existsSync(join(CURSO, 'kit-codex'))) exigirKitLimpo(join(CURSO, 'kit-codex'));
  const kitTmp = join(tmp, 'Posts-Automaticos-Kit');
  rmSync(kitTmp, { recursive: true, force: true });
  // Fora do pacote também: os modelos baixados pelas ferramentas (99 MB cada) e o node_modules, que cada pessoa instala.
  const foraDoPacote = (s) => /[\\/](modelos|node_modules)([\\/]|$)/.test(s);
  cpSync(KIT, kitTmp, { recursive: true, filter: (s) => !/[\\/](_testes|_CONVENCOES\.md)$/.test(s) && !/[\\/]_testes[\\/]/.test(s) && !foraDoPacote(s) });
  zipar(kitTmp, join(tmp, 'Posts-Automaticos-Kit.zip'));
  const usados = [['Posts-Automaticos-Kit.zip', null]];
  // O kit do Codex (gerado de Curso/kit). A pasta tem o mesmo nome, porque as receitas falam em Posts-Automaticos-Kit.
  const KIT_CODEX = join(CURSO, 'kit-codex');
  if (existsSync(KIT_CODEX)) {
    const codexTmp = join(tmp, 'codex', 'Posts-Automaticos-Kit');
    rmSync(join(tmp, 'codex'), { recursive: true, force: true });
    cpSync(KIT_CODEX, codexTmp, { recursive: true, filter: (s) => !/[\\/](_testes|_CONVENCOES\.md|TESTAR-NO-CODEX\.md)$/.test(s) && !/[\\/]_testes[\\/]/.test(s) && !foraDoPacote(s) });
    zipar(codexTmp, join(tmp, 'Posts-Automaticos-Kit-Codex.zip'));
    usados.push(['Posts-Automaticos-Kit-Codex.zip', null]);
  }
  for (const [id, , mats] of AULAS) for (const m of mats) if (!usados.some(([n]) => n === m)) usados.push([m, id]);
  for (const [ordem, [nome, aulaId]] of usados.entries()) {
    const [tipo, o_que, quando, como, tempo] = FICHAS[nome];
    let arq = nome.startsWith('Posts-Automaticos-Kit') ? join(tmp, nome) : join(KIT, nome);
    let publicado = basename(nome);
    if (existsSync(arq) && statSync(arq).isDirectory()) { const z = join(tmp, `${basename(nome)}.zip`); zipar(arq, z); arq = z; publicado = `${basename(nome)}.zip`; }
    const caminho = `posts-automaticos/${publicado}`;
    const corpo = readFileSync(arq);
    await subir('curso', caminho, corpo, publicado.endsWith('.zip') ? 'application/zip' : publicado.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'text/javascript; charset=utf-8');
    await salvar('arquivos', `curso_id=eq.${curso.id}&nome=eq.${encodeURIComponent(publicado)}`, {
      curso_id: curso.id, aula_id: aulaId ? aulas[aulaId].id : null, nome: publicado, tipo, o_que, quando, como, tempo,
      previa: previaDe(join(KIT, nome)), origem: 'storage', caminho, bytes: corpo.length, versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'), ordem,
    });
    process.stdout.write('.');
  }
  console.log(`\narquivos ${usados.length}`);
}
if (soKit) process.exit(0);

// Produto (o que dá acesso) e a oferta (como se vende). A oferta nasce desligada: o preço é decisão do dono.
// O produto só é criado quando não existe: rodar de novo não pode desligar a venda nem trocar o preço do que está no ar.
const produto = await um('produtos', 'slug=eq.posts-automaticos-com-claude') || (await rest('/produtos', { method: 'POST', body: JSON.stringify({
  slug: 'posts-automaticos-com-claude', nome: 'Posts automáticos com Claude', chamada: 'Do zero ao post pronto, bonito e no seu estilo.',
  descricao: 'Mini curso com 18 aulas, o kit com receitas e skills e o tutor de IA.', preco_centavos: 9700, ativo: false, tags: ['claude', 'automacao', 'posts'],
}) }))[0];
const acesso = await um('produto_acessos', `produto_id=eq.${produto.id}&curso_id=eq.${curso.id}`);
if (!acesso) await rest('/produto_acessos', { method: 'POST', body: JSON.stringify({ produto_id: produto.id, curso_id: curso.id, dias: 365 }) });
const oferta = await um('ofertas', 'slug=eq.posts-automaticos');
if (!oferta) {
  await rest('/ofertas', { method: 'POST', body: JSON.stringify({
    slug: 'posts-automaticos', produto_id: produto.id, nome: 'Posts automáticos com Claude', preco_centavos: 9700, parcelas_max: 12, juros_mes: 0.0319, pix_desconto_pct: 5, pix_minutos: 30,
    metodos: ['pix', 'cartao'], garantia_dias: 7, ativa: false,
    checkout: {
      subtitulo: 'Acesso por 1 ano · começa na hora',
      poster: { tipo: 'Mini curso', a: 'Posts automáticos', b: 'com Claude', pe: '18 aulas', cor: '#ff7a00' },
      inclui: ['18 aulas em vídeo, de 5 a 7 minutos', 'Kit com receitas, skills e modelo de arte', 'Faça agora em cada aula, com o pedido pronto', 'Certificado ao concluir 70%'],
      depoimentos: [],
    },
  }) });
}
console.log('produto e oferta prontos (oferta desligada até o dono definir o preço)');
