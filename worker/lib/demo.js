// Exemplos para revisar o visual NO COMPUTADOR (AMBIENTE=local e DEMO=1 no .dev.vars). Nunca em produção.
// Não é conteúdo real: serve só para ver as telas cheias.
// No Worker, o relógio fica parado em zero enquanto o código carrega: as datas são calculadas na hora do pedido.
const dias = (n) => new Date(Date.now() - n * 86400_000).toISOString();

const BASE_R = [
  { tipo: 'agente', titulo: 'Agente de pautas do dia', resumo: 'Traz 5 ideias de post por dia, já com gancho, a partir do seu nicho e das notícias da semana.', categoria_id: 3, ferramentas: ['chatgpt'], downloads: 1840, destaque: true, link_uso: 'https://chatgpt.com', itens: ['Agente pronto no ChatGPT', 'Roteiro de uso em 3 passos', 'Exemplos de pedidos'], formato: 'Link do ChatGPT', nivel: 'iniciante' },
  { tipo: 'agente', titulo: 'Copywriter de carrossel sem cara de IA', resumo: 'Transforma um tema em carrossel de 6 slides com gancho, virada e chamada para comentar.', categoria_id: 1, ferramentas: ['claude'], downloads: 1312, link_uso: 'https://claude.ai', formato: 'Projeto do Claude', nivel: 'iniciante' },
  { tipo: 'agente', titulo: 'Prospector de clientes locais', resumo: 'Monta uma lista de empresas da sua cidade com o que falta no Instagram de cada uma.', categoria_id: 5, ferramentas: ['chatgpt', 'sheets'], downloads: 987, link_uso: 'https://chatgpt.com', formato: 'Link do ChatGPT', nivel: 'intermediario' },
  { tipo: 'prompt', titulo: '10 prompts para carrossel que prende', resumo: 'Os prompts que a gente usa para sair do óbvio: gancho, cultura pop e virada no fim.', categoria_id: 1, ferramentas: ['chatgpt', 'claude'], downloads: 2210, destaque: true, itens: ['10 prompts comentados', 'Estrutura de 6 slides', 'Lista de ganchos'], formato: 'PDF', nivel: 'iniciante' },
  { tipo: 'prompt', titulo: 'Prompts de imagem no estilo cinematográfico', resumo: 'Luz dura, contraluz e profundidade: o visual dos posts da agência, em prompts prontos.', categoria_id: 2, ferramentas: ['magnific', 'midjourney'], downloads: 1650, formato: 'PDF', nivel: 'intermediario' },
  { tipo: 'planilha', titulo: 'CRM simples para social media', resumo: 'Funil de clientes, follow-up e valores numa planilha só. Copie e comece hoje.', categoria_id: 4, ferramentas: ['sheets'], downloads: 1420, formato: 'Planilha Google', nivel: 'iniciante' },
  { tipo: 'automacao', titulo: 'Automação de conteúdo diário no n8n', resumo: 'Busca as notícias do seu nicho toda manhã e entrega um resumo pronto para virar post.', categoria_id: 3, ferramentas: ['n8n', 'chatgpt'], downloads: 640, formato: 'JSON do n8n', nivel: 'avancado' },
  { tipo: 'template', titulo: 'Quadro de produção no Notion', resumo: 'O "trello" da agência: pauta, roteiro, design, aprovação e postado, com tudo ligado.', categoria_id: 4, ferramentas: ['notion'], downloads: 1105, formato: 'Notion', nivel: 'iniciante' },
  { tipo: 'pack', titulo: 'Pack de fontes para aposentar a Montserrat', resumo: '12 fontes gratuitas com combinações testadas para títulos e textos de carrossel.', categoria_id: 2, ferramentas: ['figma'], downloads: 3120, formato: 'ZIP', nivel: 'iniciante' },
  { tipo: 'guia', titulo: 'Guia: posts com IA sem cara de IA', resumo: 'As 7 marcas de texto de IA e como tirar cada uma, com antes e depois.', categoria_id: 1, ferramentas: ['chatgpt', 'claude'], downloads: 890, formato: 'PDF', nivel: 'iniciante' },
];
const montarR = () => BASE_R.map((r, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  slug: r.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  capa_url: null, galeria: [], tags: [], destaque: false, link_uso: null, itens: [], formato: null, nivel: null, video_url: null, arquivo_url: '#', arquivo_nome: 'arquivo.pdf', arquivo_bytes: 1_400_000,
  corpo_md: '## Para que serve\n\nUm exemplo de texto de como usar o recurso. Aqui entra o passo a passo de verdade.\n\n## Como usar\n\n1. Abra o recurso\n2. Troque pelo seu tema\n3. Revise e publique\n\n```\nVocê é um redator de carrossel. Escreva um gancho sobre {tema}...\n```',
  publicado_em: dias(i * 2 + 1), atualizado_em: dias(i), status: 'publicado',
  ...r,
}));

const BASE_A = [
  { titulo: 'O ChatGPT agora cria agentes que trabalham sozinhos', resumo: 'O que mudou, o que dá para fazer hoje e o que ainda é promessa.' },
  { titulo: 'Claude ganhou memória entre projetos: o que muda para quem cria conteúdo', resumo: 'Na prática, menos contexto repetido e mais consistência de marca.' },
  { titulo: 'Magnific lançou o modo de estilo: teste com os prompts da agência', resumo: 'Fizemos 30 imagens no mesmo estilo. O resultado e os prompts.' },
];
const montarA = () => BASE_A.map((a, i) => ({ id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, slug: `novidade-${i + 1}`, capa_url: null, categoria_id: 6, tags: [], destaque: false, publicado_em: dias(i * 3), atualizado_em: dias(i), corpo_md: 'Texto de exemplo da novidade.', fontes: [], ...a }));

export function recursos({ tipo, semTipo, categoria, ferramenta, busca, ordem, limite = 24, offset = 0, exceto }) {
  let l = montarR().filter((r) => !semTipo || r.tipo !== semTipo).filter((r) => (!tipo || r.tipo === tipo) && (!categoria || r.categoria_id === Number(categoria)) && (!ferramenta || r.ferramentas.includes(ferramenta)) && (!exceto || r.id !== exceto)
    && (!busca || `${r.titulo} ${r.resumo}`.toLowerCase().includes(String(busca).toLowerCase())));
  l = ordem === 'novos' ? [...l].sort((a, b) => b.publicado_em.localeCompare(a.publicado_em)) : [...l].sort((a, b) => (b.destaque - a.destaque) || (b.downloads - a.downloads));
  return { linhas: l.slice(offset, offset + limite), total: l.length };
}
export const recurso = (slug) => montarR().find((r) => r.slug === slug) || null;
export const artigos = ({ limite = 12, offset = 0 }) => ({ linhas: montarA().slice(offset, offset + limite), total: BASE_A.length });
export const artigo = (slug) => montarA().find((a) => a.slug === slug) || null;
export function contagens() {
  const R = montarR();
  const conta = (f) => R.reduce((o, r) => { for (const k of [].concat(f(r))) o[k] = (o[k] || 0) + 1; return o; }, {});
  return { total: R.length, tipos: conta((r) => r.tipo), categorias: conta((r) => r.categoria_id), ferramentas: conta((r) => r.ferramentas), artigos: BASE_A.length };
}
export function buscar(q) {
  const t = q.toLowerCase();
  return { recursos: montarR().filter((r) => `${r.titulo} ${r.resumo} ${r.ferramentas.join(' ')}`.toLowerCase().includes(t)).slice(0, 12), artigos: montarA().filter((a) => a.titulo.toLowerCase().includes(t)) };
}
