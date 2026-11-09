// Analisador de SEO, GEO e voz da marca para os artigos do site, sem IA e sem custo (fase B de docs/seo-geo.md).
// Modelo: src/lib/analyzer/rules.ts do jk-portal. O mesmo arquivo roda em três lugares: no painel enquanto a pessoa
// escreve (admin/src/telas/Editor.tsx importa daqui), no conector (checar_seo) e na trava de publicar (acoes.js).
// Não importa nada: é JavaScript puro, para o painel (Vite) e o Worker usarem igual.
//
// Só barra a publicação o que é defeito objetivo (ERROS_QUE_BARRAM). Todo o resto é conselho: um analisador que barra
// tudo vira obstáculo, e obstáculo se contorna.

export const ERROS_QUE_BARRAM = new Set(['titulo', 'resumo', 'slug', 'h1', 'img-alt', 'travessao']);

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const palavras = (s) => (String(s || '').match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length;
// O texto do corpo sem a marcação, para contar palavras e achar a busca-alvo.
const textoPuro = (md) => String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`|-]/g, ' ');

// Os blocos do Markdown do site (worker/nucleo/util.js): tabela, prós e contras, produto, passos e chamada do curso.
const temBloco = (md, nome) => new RegExp('^```' + nome + '\\s*$', 'm').test(md || '');

const FRASES_VAZIAS = ['no mundo de hoje', 'neste artigo', 'vamos explorar', 'em resumo', 'nos dias de hoje', 'cada vez mais importante', 'sem sombra de duvida', 'e importante ressaltar', 'vale ressaltar que'];

// a: { titulo, slug, resumo, resposta, corpo_md, faqs, consulta_alvo, tipo, assunto, autor_id, fontes, capa_url,
//      afiliado, conferido_em, outros: [{ id, titulo, consulta_alvo }] } (outros = as outras páginas, para a canibalização)
export function analisar(a = {}) {
  const checks = [];
  const add = (id, grupo, nivel, titulo, dica) => checks.push({ id, grupo, nivel, titulo, ...(dica ? { dica } : {}) });
  const corpo = String(a.corpo_md || '');
  const nPal = palavras(textoPuro(corpo));
  const alvo = semAcento(a.consulta_alvo).trim();
  const tem = (onde) => alvo && semAcento(onde).includes(alvo);
  const tipo = a.tipo || 'noticia';
  const longo = ['guia', 'tutorial', 'comparativo', 'review', 'artigo'].includes(tipo);
  const faqs = (Array.isArray(a.faqs) ? a.faqs : []).filter((f) => f && String(f.pergunta || '').trim() && String(f.resposta || '').trim());
  const fontes = (Array.isArray(a.fontes) ? a.fontes : []).filter((f) => f && (f.url || typeof f === 'string'));

  // ---------------------------------------------------------------- SEO
  const tt = String(a.titulo || '').trim();
  if (!tt) add('titulo', 'SEO', 'erro', 'Falta o título');
  else if (tt.length < 30 || tt.length > 65) add('titulo-tamanho', 'SEO', 'aviso', `Título com ${tt.length} caracteres`, 'O Google mostra uns 60. Entre 30 e 65 cabe inteiro e diz o bastante.');
  else add('titulo-tamanho', 'SEO', 'ok', 'Título no tamanho certo');

  const rs = String(a.resumo || '').trim();
  if (!rs) add('resumo', 'SEO', 'erro', 'Falta o resumo', 'É a descrição que aparece embaixo do título no Google. Uma ou duas frases.');
  else if (rs.length < 70 || rs.length > 165) add('resumo-tamanho', 'SEO', 'aviso', `Resumo com ${rs.length} caracteres`, 'Entre 70 e 160 o Google mostra inteiro.');
  else add('resumo-tamanho', 'SEO', 'ok', 'Resumo no tamanho certo');

  const sl = String(a.slug || '').trim();
  if (a.slug !== undefined && !sl && !tt) add('slug', 'SEO', 'erro', 'Falta o endereço (slug)');
  else if (sl && (sl.length > 60 || sl.split('-').length > 7)) add('slug-tamanho', 'SEO', 'aviso', 'Endereço longo', 'Curto e com a busca-alvo: melhor-mac-para-designer.');

  if (!alvo) add('alvo', 'SEO', 'aviso', 'Sem a busca-alvo', 'Escreva a busca que esta página quer ganhar no Google (ex.: melhor mac para designer).');
  else {
    add('alvo-titulo', 'SEO', tem(tt) ? 'ok' : 'aviso', tem(tt) ? 'A busca-alvo está no título' : 'A busca-alvo não está no título', tem(tt) ? '' : 'Use as mesmas palavras que a pessoa digita, de preferência no começo.');
    add('alvo-resumo', 'SEO', tem(rs) ? 'ok' : 'aviso', tem(rs) ? 'A busca-alvo está no resumo' : 'A busca-alvo não está no resumo');
    const comeco = `${a.resposta || ''} ${textoPuro(corpo).split(/\s+/).slice(0, 120).join(' ')}`;
    add('alvo-comeco', 'SEO', tem(comeco) ? 'ok' : 'aviso', tem(comeco) ? 'A busca-alvo aparece logo no começo' : 'A busca-alvo não aparece no começo do texto');
    const iguais = (a.outros || []).filter((o) => o.id !== a.id && semAcento(o.consulta_alvo).trim() === alvo);
    if (iguais.length) add('canibalizacao', 'SEO', 'aviso', `Outra página quer a mesma busca: ${iguais.map((o) => o.titulo).join(', ')}`, 'Duas páginas brigando pela mesma busca se atrapalham. Mude o foco de uma ou junte as duas.');
  }

  if (/^#\s/m.test(corpo)) add('h1', 'SEO', 'erro', 'O corpo tem um título # (H1)', 'O título da página já é o H1. No corpo, use ## para intertítulo.');
  const h2 = (corpo.match(/^##\s/gm) || []).length;
  if (nPal > 350 && h2 < 2) add('intertitulos', 'SEO', 'aviso', 'Poucos intertítulos', 'A cada 3 ou 4 parágrafos, um ## com a pergunta que aquele trecho responde.');
  else if (nPal > 350) add('intertitulos', 'SEO', 'ok', `${h2} intertítulos`);

  const minimo = longo ? 700 : 250;
  add('tamanho', 'SEO', nPal >= minimo ? 'ok' : 'aviso', `${nPal} palavras`, nPal >= minimo ? '' : `Para ${tipo === 'noticia' ? 'uma notícia' : 'este tipo'}, uns ${minimo} ou mais. Mais útil, não mais enrolado.`);

  const links = [...corpo.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  const internos = links.filter((u) => u.startsWith('/') || /agenciasetup\.com\.br/.test(u)).length;
  add('links-internos', 'SEO', internos >= 2 ? 'ok' : 'aviso', `${internos} link${internos === 1 ? '' : 's'} para o próprio site`, internos >= 2 ? '' : 'Ligue para 2 ou mais páginas nossas (um recurso, um guia, o curso). É assim que o Google acha e entende as páginas.');

  const imgs = [...corpo.matchAll(/!\[([^\]]*)\]\(/g)];
  if (imgs.some((m) => !m[1].trim())) add('img-alt', 'SEO', 'erro', 'Imagem sem descrição', 'Escreva o que a imagem mostra entre os colchetes: ![tela do Claude com o prompt](...)');
  add('capa', 'SEO', a.capa_url ? 'ok' : 'aviso', a.capa_url ? 'Tem capa' : 'Sem capa', a.capa_url ? '' : 'A capa aparece no compartilhamento e no Discover.');

  // ---------------------------------------------------------------- GEO (ser a resposta citada pela IA)
  const nResp = palavras(a.resposta);
  if (!nResp) add('resposta', 'GEO', 'aviso', 'Sem resposta rápida', 'Responda a pergunta da página em 40 a 60 palavras, logo no topo. É o trecho que o Google destaca e que a IA cita.');
  else if (nResp < 25 || nResp > 80) add('resposta', 'GEO', 'aviso', `Resposta rápida com ${nResp} palavras`, 'Entre 40 e 60 palavras: direta e completa.');
  else add('resposta', 'GEO', 'ok', 'Resposta rápida no tamanho certo');

  if (longo) add('faq', 'GEO', faqs.length >= 3 ? 'ok' : 'aviso', `${faqs.length} pergunta${faqs.length === 1 ? '' : 's'} e resposta${faqs.length === 1 ? '' : 's'}`, faqs.length >= 3 ? '' : 'De 3 a 6 perguntas que as pessoas fazem de verdade, com resposta curta.');
  add('autor', 'GEO', a.autor_id ? 'ok' : 'aviso', a.autor_id ? 'Tem autor' : 'Sem autor', a.autor_id ? '' : 'Escolha quem assina. O Google e as IAs confiam mais em quem tem nome e página.');
  if (tipo === 'noticia' || longo) add('fontes', 'GEO', fontes.length ? 'ok' : 'aviso', fontes.length ? `${fontes.length} fonte${fontes.length === 1 ? '' : 's'}` : 'Sem fontes', fontes.length ? '' : 'Diga de onde veio cada dado, com o link. Notícia sem fonte não é citada.');
  const estruturado = /^\s*([-*]|\d+\.)\s/m.test(corpo) || /^\|.*\|\s*$/m.test(corpo) || temBloco(corpo, 'pros-contras') || temBloco(corpo, 'produto');
  if (longo) add('estrutura', 'GEO', estruturado ? 'ok' : 'aviso', estruturado ? 'Tem lista ou tabela' : 'Sem lista nem tabela', estruturado ? '' : 'Lista, passo a passo e tabela são o que a IA mais copia na resposta.');
  if (!/ag[eê]ncia setup/i.test(`${corpo} ${a.resposta || ''}`)) add('entidade', 'GEO', 'aviso', 'O texto não fala o nome Agência Setup', 'Uma menção natural (no exemplo, no curso, no recurso) ajuda a IA a ligar o conteúdo à marca.');

  const temProduto = temBloco(corpo, 'produto');
  if (temProduto && !a.afiliado) add('afiliado', 'GEO', 'aviso', 'Tem caixa de produto, mas não está marcado como afiliado', 'Se algum link paga comissão, marque "Tem link de afiliado": a página mostra o aviso.');
  if ((tipo === 'comparativo' || tipo === 'review' || a.afiliado) && !a.conferido_em) add('conferido', 'GEO', 'aviso', 'Sem a data em que os preços foram conferidos', 'Preço muda. Diga quando conferiu, ou tire o preço.');

  // ---------------------------------------------------------------- voz da marca
  const tudo = [tt, rs, a.resposta, corpo, ...faqs.flatMap((f) => [f.pergunta, f.resposta])].join('\n');
  if (/[—–]/.test(tudo)) add('travessao', 'Voz', 'erro', 'Tem travessão', 'Troque por vírgula, ponto ou parênteses.');
  const vazias = FRASES_VAZIAS.filter((f) => semAcento(tudo).includes(f));
  if (vazias.length) add('frases-vazias', 'Voz', 'aviso', `Frase de enchimento: "${vazias[0]}"`, 'Corte e vá direto ao ponto.');
  const longos = corpo.split(/\n\s*\n/).filter((p) => !/^\s*(```|\||[-*]|\d+\.|#)/.test(p) && palavras(p) > 90).length;
  if (longos) add('paragrafos', 'Voz', 'aviso', `${longos} parágrafo${longos === 1 ? '' : 's'} longo${longos === 1 ? '' : 's'}`, 'No celular, parágrafo de até 4 linhas se lê; mais que isso a pessoa pula.');

  // Nota: ok vale 1, aviso meio, erro zero; por grupo e geral.
  const nota = (grupo) => {
    const g = checks.filter((c) => !grupo || c.grupo === grupo);
    return g.length ? Math.round((g.reduce((n, c) => n + (c.nivel === 'ok' ? 1 : c.nivel === 'aviso' ? 0.5 : 0), 0) / g.length) * 100) : 100;
  };
  const bloqueios = checks.filter((c) => c.nivel === 'erro' && ERROS_QUE_BARRAM.has(c.id));
  return { nota: nota(), notaSeo: nota('SEO'), notaGeo: nota('GEO'), notaVoz: nota('Voz'), palavras: nPal, bloqueios, checks };
}
