// Ferramentas e assuntos que importam para a Agência Setup. Marcam os posts (o que funcionou) e as pautas do radar
// (o que está em alta) com as mesmas palavras, para o painel e o Claude cruzarem as duas coisas.

export const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Hashtag e @ não contam como assunto: a conta põe #photoshop em quase tudo.
const semMarcacoes = (t) => String(t || '').replace(/[#@][\p{L}\p{N}_.]+/gu, ' ');

// [id, regra]. O id é o mesmo de recursos.ferramentas (minúsculas, sem espaço).
export const FERRAMENTAS = [
  ['claude', /\bclaude\b|anthropic/],
  ['codex', /\bcodex\b/],
  ['chatgpt', /chat ?gpt|\bopenai\b|\bgpt-?[45o]/],
  ['sora', /\bsora\b/],
  ['gemini', /\bgemini\b|google ai studio/],
  ['nano-banana', /nano ?banana/],
  ['veo', /\bveo ?[234]\b|google veo/],
  ['midjourney', /midjourney/],
  ['photoshop', /photoshop/],
  ['firefly', /firefly/],
  ['illustrator', /illustrator/],
  ['adobe', /\badobe\b/],
  ['canva', /\bcanva\b/],
  ['figma', /\bfigma\b/],
  ['capcut', /capcut/],
  ['kling', /\bkling\b/],
  ['runway', /\brunway ?(ml|gen-?\d|aleph)\b/],
  ['magnific', /magnific|freepik/],
  ['higgsfield', /higgsfield/],
  ['elevenlabs', /elevenlabs|eleven labs/],
  ['heygen', /heygen/],
  ['suno', /\bsuno\b/],
  ['perplexity', /perplexity/],
  ['grok', /\bgrok\b/],
  ['deepseek', /deepseek/],
  ['meta-ai', /\bmeta ai\b|\bllama\b/],
  ['copilot', /\bcopilot\b/],
  ['cursor', /\bcursor (ai|ide|editor)\b|anysphere/],
  ['lovable', /lovable/],
  ['n8n', /\bn8n\b/],
  ['notion', /\bnotion\b/],
  ['manus', /\bmanus (ai|agent)\b|\bmanus\b.*\bagente?\b/],
  ['mcp', /\bmcp\b|model context protocol/],
];

// Como cada ferramenta aparece escrita no painel e nos ângulos sugeridos.
export const NOMES = {
  claude: 'Claude', codex: 'Codex', chatgpt: 'ChatGPT', sora: 'Sora', gemini: 'Gemini', 'nano-banana': 'Nano Banana', veo: 'Veo',
  midjourney: 'Midjourney', photoshop: 'Photoshop', firefly: 'Firefly', illustrator: 'Illustrator', adobe: 'Adobe', canva: 'Canva',
  figma: 'Figma', capcut: 'CapCut', kling: 'Kling', runway: 'Runway', magnific: 'Magnific', higgsfield: 'Higgsfield',
  elevenlabs: 'ElevenLabs', heygen: 'HeyGen', suno: 'Suno', perplexity: 'Perplexity', grok: 'Grok', deepseek: 'DeepSeek',
  'meta-ai': 'Meta AI', copilot: 'Copilot', cursor: 'Cursor', lovable: 'Lovable', n8n: 'n8n', notion: 'Notion', manus: 'Manus', mcp: 'MCP',
};

// Assuntos dos posts (o que a pessoa ganha ou sente), para comparar o que engaja.
// "IA" é conferido à parte, em maiúsculas: "ia" minúsculo é verbo ("eu ia fazer").
const IA = /\bI\.?A\.?s?\b|\bAI\b/;
export const TEMAS = [
  ['ia', /inteligencia artificial|artificial intelligence/],
  ['prompt', /prompt/],
  ['agente', /\bagentes?\b/],
  ['automacao', /automac|automatiz/],
  ['fontes', /\bfontes?\b|tipografia/],
  ['textura', /textura/],
  ['mockup', /mockup/],
  ['pack', /\bpack\b|\bpackzin|\bkit\b/],
  ['template', /template|modelo editavel/],
  ['clientes', /\bclientes?\b|freela|orcamento|cobrar|precific|prospec/],
  ['dinheiro', /dinheiro|\brenda\b|\b\d+ ?k\b|faturar|\bvender\b|vendas/],
  ['identidade-visual', /identidade visual|\blogo|branding/],
  ['carrossel', /carross/],
  ['video', /\bvideos?\b|\breels\b|edicao/],
  ['meme', /\bmeme|kkk|hahah|quem nunca|so quem/],
  ['novidade', /novidade|atualizac|lancamento|lancou|chegou|nova funcao|\bupdate\b/],
  ['tutorial', /passo a passo|tutorial|aprenda|como fazer|como criar|\bdica/],
  ['organizacao', /\bcrm\b|trello|organiza|planilha|notion/],
  ['infoproduto', /infoproduto|\bcurso\b|\baula\b|workshop|\blive\b|mentoria/],
];

function achar(lista, texto) {
  return lista.filter(([, re]) => re.test(texto)).map(([id]) => id);
}

// Ferramentas e temas de um texto (legenda, título de notícia).
export function marcar(texto) {
  const original = semMarcacoes(texto);
  const t = normalizar(original);
  const temas = achar(TEMAS, t);
  if (!temas.includes('ia') && IA.test(original)) temas.unshift('ia');
  return { ferramentas: achar(FERRAMENTAS, t), temas };
}

// O "Comenta X" da legenda: entre aspas ('Comente "VIDRO"') ou a palavra em maiúsculas ('Comenta STUDIO').
export function palavraChave(legenda) {
  const t = String(legenda || '');
  let m = t.match(/coment(?:a|e|ar)\b[^"“”'‘’\n]{0,20}?["“”'‘’]([^"“”'‘’\n]{2,30})["“”'‘’]/i);
  if (m && /[\p{L}\p{N}]/u.test(m[1])) return m[1].trim().toUpperCase();
  m = t.match(/[Cc]oment(?:a|e)\s+(?:a palavra\s+)?(\d+k|[A-ZÀ-Ý0-9]{2,25})(?![a-zà-ÿ])/);
  return m ? m[1].toUpperCase() : null;
}

// Mesma palavra, com ou sem acento, maiúscula ou minúscula, com emoji em volta.
export const normalPalavra = (p) => normalizar(p).replace(/[^a-z0-9]+/g, ' ').trim();

// Comentário com erro também vale (pedido do dono, 05/11/2026: "POSTS deve absorver Post, poost, posstss; CLIENTES:
// clients, client. Tem gente que erra"). Com `tolerante`, cada palavra do comentário é comparada à palavra pedida:
// letra repetida conta uma vez ("poost", "posstss"), e cabe 1 erro (letra a mais, a menos, trocada ou invertida) na
// palavra de 5 ou 6 letras e 2 na de 7 ou mais ("client" para CLIENTES). Palavra de até 4 letras e de mais de uma
// palavra: só igual. No direct a busca continua exata: lá a pessoa conversa, e "vi seu post" não é pedido.
const colapsa = (s) => s.replace(/(.)\1+/g, '$1');
const folga = (n) => (n >= 7 ? 2 : n >= 5 ? 1 : 0);
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let ant2 = null, ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const at = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (ant2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, ant2[j - 2] + 1);
      at[j] = d;
      if (d < menor) menor = d;
    }
    if (menor > max) return max + 1;
    ant2 = ant; ant = at;
  }
  return ant[b.length];
}
export function pediu(comentario, palavra, { tolerante = false } = {}) {
  const alvo = normalPalavra(palavra);
  if (!alvo) return false;
  const texto = normalPalavra(comentario);
  if (` ${texto} `.includes(` ${alvo} `)) return true;
  const max = folga(alvo.length);
  if (!tolerante || alvo.includes(' ')) return false;
  const a = colapsa(alvo);
  return texto.split(' ').some((w) => {
    const c = colapsa(w);
    if (c === a) return true;
    return !!max && c.length >= 3 && distancia(c, a, max) <= max;
  });
}
