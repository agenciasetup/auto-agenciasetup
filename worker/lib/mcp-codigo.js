// O conector em modo código (o "Code Mode" da Cloudflare), em /mcp. Modelo: src/lib/conector/mcp.ts do jk-portal.
// Em vez de 66 ferramentas na conversa (cada uma com o seu esquema, lidas em toda conversa), três:
//   buscar     mostra as operações (setup.nome) com a assinatura, só quando o Claude pede;
//   consultar  roda JavaScript que só lê (o app do Claude libera sem pedir licença);
//   executar   roda JavaScript que pode escrever.
// O código junta várias operações numa chamada só e devolve só o que interessa: menos fichas e menos idas e voltas.
// As operações são as mesmas do conector de sempre (FERRAMENTAS e executar em mcp.js), com as mesmas travas.
// O modo antigo, uma ferramenta por operação, continua em /mcp/ferramentas.
import { rodarCodigo } from './sandbox.js';

const LIMITE_RESPOSTA = 90_000;

// Grupos só para a busca (o nome no código é o da ferramenta: setup.followup_lista).
export const AREAS = [
  { nome: 'guia', descricao: 'Comece aqui: números do sistema, estilo da marca e as skills (o processo de cada tarefa).', ops: ['visao_geral', 'ver_estilo', 'listar_skills', 'ver_skill'] },
  { nome: 'site', descricao: 'Recursos grátis, artigos (SEO e GEO), autores, produtos, landing pages, anúncios e pautas do site.', ops: ['listar', 'ler', 'listar_categorias', 'salvar_recurso', 'salvar_artigo', 'checar_seo', 'listar_autores', 'salvar_autor', 'salvar_produto', 'salvar_landing_page', 'salvar_anuncio', 'salvar_pauta', 'enviar_arquivo', 'publicar', 'arquivar'] },
  { nome: 'redes', descricao: 'Peças da fila das redes, posts publicados e o desempenho de cada um.', ops: ['listar_redes', 'criar_pecas', 'editar_peca', 'mudar_status_peca', 'publicar_peca_agora', 'listar_posts', 'ver_post', 'ver_desempenho', 'ver_resultados'] },
  { nome: 'comenta', descricao: 'Comenta X: palavra no comentário, resposta e material no direct.', ops: ['listar_comenta', 'salvar_comenta', 'escrever_comenta', 'nota_comenta', 'ligar_comenta'] },
  { nome: 'pauta', descricao: 'O que está em alta em IA e design, o plano de ideias e o Google (Search Console: o que buscam e onde dá para ganhar).', ops: ['ver_em_alta', 'atualizar_radar', 'ver_plano', 'gerar_plano', 'marcar_ideia', 'ver_seo', 'importar_seo', 'oportunidade_para_pauta'] },
  { nome: 'vendas', descricao: 'Oferta, vendas, carrinho abandonado, cupons e entregas fora da área.', ops: ['ver_oferta', 'salvar_oferta', 'area_vendas', 'area_venda', 'area_recuperar', 'area_marcar_recuperacao', 'area_cupons', 'area_salvar_cupom', 'entregas_pendentes', 'marcar_entregue'] },
  { nome: 'direct', descricao: 'Follow-up do direct do Instagram até a venda.', ops: ['followup_lista', 'followup_ver', 'followup_salvar', 'followup_responder_duvida', 'followup_sincronizar', 'followup_respostas'] },
  { nome: 'alunos', descricao: 'Área de membros: números, alunos, suporte, dúvidas, avisos, certificado e conquista.', ops: ['area_numeros', 'area_alunos', 'area_aluno', 'area_suporte', 'area_liberar_curso', 'area_duvidas', 'area_responder_duvida', 'area_avisos', 'area_salvar_aviso', 'area_ligar_aviso', 'area_certificado', 'area_salvar_certificado', 'area_conquista_dias', 'area_salvar_conquista_dias', 'area_relatorios'] },
];

// Muda o que o público vê ou o que não volta sozinho: o Claude pede o "sim" antes, mesmo onde a ferramenta é "escrita".
const PEDE_SIM = new Set(['publicar', 'arquivar', 'mudar_status_peca', 'publicar_peca_agora', 'ligar_comenta', 'area_liberar_curso', 'area_ligar_aviso']);

export const FERRAMENTAS_CODIGO = {
  buscar: {
    name: 'buscar',
    description: 'Acha as operações do sistema da Agência Setup e devolve a assinatura de cada uma (setup.nome). Sem nada: as áreas e o que cada uma tem. area: a área inteira (guia, site, redes, comenta, pauta, vendas, direct, alunos). consulta: procura por palavra (ex.: "recurso", "venda", "comenta").',
    inputSchema: { type: 'object', properties: { area: { type: 'string', description: 'Uma área inteira.' }, consulta: { type: 'string', description: 'Palavras do que você quer fazer.' } } },
    annotations: { title: 'Buscar operações', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  consultar: {
    name: 'consultar',
    description: 'Roda JavaScript que só LÊ o sistema. O código é o corpo de uma função async: use await setup.nome({...}) e devolva com return só o que interessa (filtre, conte e resuma no código). Junte várias leituras num código só. Sem fetch, require, env ou rede. Operação que escreve não existe aqui.',
    inputSchema: { type: 'object', properties: { codigo: { type: 'string', description: 'Corpo de função async. Ex.: const r = await setup.listar({ tipo: "recursos", status: "rascunho" }); return r.itens.map((i) => i.titulo);' } }, required: ['codigo'] },
    annotations: { title: 'Consultar (só leitura)', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  executar: {
    name: 'executar',
    description: 'Roda JavaScript com todas as operações desta conexão, inclusive as que escrevem. Mesmo formato do consultar. Antes de operação marcada [PEDE SIM] (publicar no site, aprovar ou agendar peça, publicar agora, ligar Comenta X ou aviso, liberar curso, arquivar), diga o que vai fazer e espere o sim da pessoa.',
    inputSchema: { type: 'object', properties: { codigo: { type: 'string', description: 'Corpo de função async que chama await setup.nome({...}).' } }, required: ['codigo'] },
    annotations: { title: 'Executar (pode escrever)', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
};

export const PREAMBULO_CODIGO = `MODO CÓDIGO. Este conector tem três ferramentas: buscar (mostra as operações e a assinatura de cada uma), consultar (roda JavaScript que só lê) e executar (roda JavaScript que pode escrever). Toda operação citada abaixo ou numa skill (ver_estilo, salvar_recurso, followup_lista, entregas_pendentes...) é chamada dentro do código como await setup.ver_estilo({}). Na dúvida dos campos, use buscar({ consulta }) antes. Junte as leituras num código só e devolva só o que precisa (filtre, conte, resuma, corte textos longos): gasta menos e responde mais rápido. Antes de operação [PEDE SIM], diga o que vai fazer e espere o sim da pessoa.

`;

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// JSON Schema para um tipo no jeito do TypeScript, curto: é o que o Claude lê para escrever o código sem tatear.
function tipo(s, fundo = 0) {
  if (!s || typeof s !== 'object') return 'unknown';
  if (Array.isArray(s.enum)) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (s.type === 'string') return 'string';
  if (s.type === 'number' || s.type === 'integer') return 'number';
  if (s.type === 'boolean') return 'boolean';
  if (s.type === 'array') { const t = tipo(s.items, fundo + 1); return /[|{ ]/.test(t) ? `(${t})[]` : `${t}[]`; }
  if (s.type === 'object') {
    if (!s.properties || fundo > 1) return 'object';
    const req = new Set(s.required || []);
    return `{ ${Object.entries(s.properties).map(([k, v]) => `${k}${req.has(k) ? '' : '?'}: ${tipo(v, fundo + 1)}`).join('; ')} }`;
  }
  return 'unknown';
}

const marca = (f) => (PEDE_SIM.has(f.name) || f.risco === 'perigosa' ? ' [PEDE SIM]' : f.risco === 'escrita' ? ' [escreve]' : '');

function assinatura(f) {
  const props = (f.inputSchema && f.inputSchema.properties) || {};
  const req = new Set((f.inputSchema && f.inputSchema.required) || []);
  const campos = Object.entries(props).map(([k, v]) => `  ${k}${req.has(k) ? '' : '?'}: ${tipo(v)};${v.description ? ` // ${String(v.description).replace(/\s+/g, ' ')}` : ''}`);
  return `/** ${f.description}${marca(f)} */\nsetup.${f.name}(${campos.length ? `{\n${campos.join('\n')}\n}` : '{}'})`;
}

const areaDe = (nome) => (AREAS.find((a) => a.ops.includes(nome)) || { nome: 'outros' }).nome;

// ops: as ferramentas que esta conexão pode usar (já filtradas pelo cargo).
export function buscar(args, ops) {
  const area = semAcento(args.area).trim();
  const consulta = semAcento(args.consulta).trim();
  if (!area && !consulta) {
    const grupos = [...AREAS, { nome: 'outros', descricao: 'O resto.', ops: [] }].map((a) => {
      const da = ops.filter((f) => areaDe(f.name) === a.nome);
      if (!da.length) return null;
      return `## ${a.nome}: ${a.descricao}\n${da.map((f) => `- ${f.name}: ${String(f.description).split(/(?<=\.)\s/)[0]}${marca(f)}`).join('\n')}`;
    }).filter(Boolean);
    return `Operações desta conexão (${ops.length}). Chame no código como await setup.nome({...}). Para os campos, buscar({ area }) ou buscar({ consulta }).\n\n${grupos.join('\n\n')}`;
  }
  let achadas = ops;
  if (area) achadas = achadas.filter((f) => areaDe(f.name) === area);
  if (consulta) {
    const termos = consulta.split(/\s+/).filter(Boolean);
    const pontos = (f) => {
      const alvo = semAcento(`${f.name} ${f.description}`);
      return termos.reduce((n, t) => n + (alvo.includes(t) ? (semAcento(f.name).includes(t) ? 3 : 1) : 0), 0);
    };
    achadas = achadas.map((f) => [f, pontos(f)]).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f]) => f);
  }
  if (!achadas.length) return `Nada encontrado. Áreas: ${AREAS.map((a) => a.nome).join(', ')}.`;
  return achadas.map(assinatura).join('\n\n');
}

const caber = (t) => (t.length <= LIMITE_RESPOSTA ? t : `${t.slice(0, LIMITE_RESPOSTA)}\n…[cortado: a resposta tinha ${t.length} caracteres. Filtre ou resuma dentro do código e devolva só o que precisa.]`);

// chamar(f, args) roda uma operação de verdade (mcp.js: cargo, executar, erros legíveis).
export async function rodar(codigo, ops, chamar, soLeitura) {
  if (typeof codigo !== 'string' || !codigo.trim()) return { texto: 'Mande o código em "codigo".', erro: true };
  if (codigo.length > 100_000) return { texto: 'Código grande demais (máximo de 100 mil caracteres).', erro: true };
  const pode = ops.filter((f) => !soLeitura || f.risco === 'leitura');
  const porNome = new Map(pode.map((f) => [f.name, f]));
  // Todas as operações da conexão existem no código; no consultar, a que escreve responde dizendo para usar o executar.
  const r = await rodarCodigo(codigo, ops.map((f) => f.name), async (nome, args) => {
    const f = porNome.get(nome);
    if (!f) throw new Error(soLeitura && ops.some((o) => o.name === nome) ? `${nome} escreve: rode pela ferramenta executar, não pela consultar.` : `${nome} não está disponível nesta conexão.`);
    return chamar(f, args && typeof args === 'object' && !Array.isArray(args) ? args : {});
  });
  const corpo = r.ok
    ? { resultado: r.valor, ...(r.registros.length ? { console: r.registros } : {}) }
    : { erro: r.erro, ...(r.registros.length ? { console: r.registros } : {}) };
  return { texto: caber(JSON.stringify(corpo)), erro: !r.ok };
}
