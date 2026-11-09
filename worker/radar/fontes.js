// Fontes do radar "Em alta". Testadas em 22/10/2026 (Canva e o blog da Adobe recusam leitura: entram pelo Google Notícias).
// jeito: rss (RSS ou Atom), hn (Hacker News, JSON), github (repositórios novos com mais estrelas, JSON).
// grupo: oficial (lançamento da própria empresa), imprensa, comunidade, tendencia. Pesa na nota.
// ferramentas: o assunto que a fonte já garante (o canal da Anthropic é sempre sobre Claude).

const gn = (q, br = true) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:2d`)}&${br ? 'hl=pt-BR&gl=BR&ceid=BR:pt-419' : 'hl=en-US&gl=US&ceid=US:en'}`;
const yt = (canal) => `https://www.youtube.com/feeds/videos.xml?channel_id=${canal}`;

export const FONTES = [
  { id: 'openai', nome: 'OpenAI', url: 'https://openai.com/news/rss.xml', jeito: 'rss', grupo: 'oficial', ferramentas: ['chatgpt'] },
  { id: 'anthropic', nome: 'Anthropic', url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml', jeito: 'rss', grupo: 'oficial', ferramentas: ['claude'] },
  { id: 'google-ai', nome: 'Google AI', url: 'https://blog.google/technology/ai/rss/', jeito: 'rss', grupo: 'oficial', ferramentas: ['gemini'] },
  { id: 'deepmind', nome: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', jeito: 'rss', grupo: 'oficial', ferramentas: ['gemini'] },
  { id: 'midjourney', nome: 'Midjourney', url: 'https://updates.midjourney.com/rss/', jeito: 'rss', grupo: 'oficial', ferramentas: ['midjourney'] },
  { id: 'figma', nome: 'Figma', url: 'https://www.figma.com/blog/feed/atom.xml', jeito: 'rss', grupo: 'oficial', ferramentas: ['figma'] },
  { id: 'github-ia', nome: 'GitHub (IA)', url: 'https://github.blog/ai-and-ml/feed/', jeito: 'rss', grupo: 'oficial', ferramentas: ['copilot'] },
  { id: 'yt-openai', nome: 'OpenAI no YouTube', url: yt('UCXZCJLdBC09xxGZ6gcdrc6A'), jeito: 'rss', grupo: 'oficial', ferramentas: ['chatgpt'] },
  { id: 'yt-anthropic', nome: 'Anthropic no YouTube', url: yt('UCrDwWp7EBBv4NwvScIpBDOA'), jeito: 'rss', grupo: 'oficial', ferramentas: ['claude'] },
  { id: 'gn-claude', nome: 'Notícias: Claude', url: gn('Claude OR Anthropic OR "Claude Code"'), jeito: 'rss', grupo: 'imprensa' },
  { id: 'gn-openai', nome: 'Notícias: OpenAI', url: gn('ChatGPT OR OpenAI OR Codex OR Sora'), jeito: 'rss', grupo: 'imprensa' },
  { id: 'gn-google', nome: 'Notícias: Gemini', url: gn('Gemini OR "Nano Banana" OR "Google Veo"'), jeito: 'rss', grupo: 'imprensa' },
  { id: 'gn-design', nome: 'Notícias: design', url: gn('Photoshop OR "Adobe Firefly" OR Canva OR Figma OR CapCut OR Midjourney'), jeito: 'rss', grupo: 'imprensa' },
  { id: 'gn-adobe', nome: 'News: Adobe', url: gn('"Adobe Firefly" OR Photoshop AI OR "Adobe MAX"', false), jeito: 'rss', grupo: 'imprensa' },
  { id: 'tecnoblog', nome: 'Tecnoblog', url: 'https://tecnoblog.net/feed/', jeito: 'rss', grupo: 'imprensa' },
  { id: 'canaltech', nome: 'Canaltech', url: 'https://canaltech.com.br/rss/', jeito: 'rss', grupo: 'imprensa' },
  { id: 'verge-ia', nome: 'The Verge (IA)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', jeito: 'rss', grupo: 'imprensa' },
  { id: 'techcrunch-ia', nome: 'TechCrunch (IA)', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', jeito: 'rss', grupo: 'imprensa' },
  { id: 'simonw', nome: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', jeito: 'rss', grupo: 'comunidade' },
  { id: 'hacker-news', nome: 'Hacker News', url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40', jeito: 'hn', grupo: 'comunidade' },
  { id: 'reddit-ia', nome: 'Reddit (Claude, ChatGPT, OpenAI)', url: 'https://www.reddit.com/r/ClaudeAI+ChatGPT+OpenAI/top/.rss?t=day', jeito: 'rss', grupo: 'comunidade' },
  { id: 'reddit-design', nome: 'Reddit (design e social media)', url: 'https://www.reddit.com/r/graphic_design+socialmedia+Design/top/.rss?t=day', jeito: 'rss', grupo: 'comunidade' },
  { id: 'product-hunt', nome: 'Product Hunt', url: 'https://www.producthunt.com/feed', jeito: 'rss', grupo: 'comunidade' },
  { id: 'github-alta', nome: 'GitHub em alta', jeito: 'github', grupo: 'comunidade' },
  { id: 'trends-br', nome: 'Google Trends Brasil', url: 'https://trends.google.com/trending/rss?geo=BR', jeito: 'rss', grupo: 'tendencia' },
];
