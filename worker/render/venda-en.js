// A página de venda em inglês (curso com marca de idioma "en"): o mesmo desenho de render/venda.js. O texto vem dos
// blocos da landing page, escritos em inglês; aqui ficam só os rótulos fixos da página, trocados no HTML pronto por esta
// tabela (português -> inglês). A página em português não passa por aqui e não muda.
// Um par que não aparece no HTML não é erro (o bloco pode não estar na página).
const PARES = [
  ['<html lang="pt-BR">', '<html lang="en">'],
  ['<meta property="og:locale" content="pt_BR">', '<meta property="og:locale" content="en_US">'],
  ['"priceCurrency":"BRL"', '"priceCurrency":"USD"'],
  ['aria-label="Nesta página"', 'aria-label="On this page"'],
  ['<a href="#historia">Exemplo</a><a href="#como-funciona">Como funciona</a><a href="#estilos">Estilos</a><a href="#aulas">Aulas</a><a href="#comprar">Preço</a>', '<a href="#historia">Example</a><a href="#como-funciona">How it works</a><a href="#estilos">Styles</a><a href="#aulas">Lessons</a><a href="#comprar">Price</a>'],
  ['>Já sou aluno<', ">I'm a student<"],
  [' dias de garantia</li>', '-day guarantee</li>'],
  [' dias de garantia</span>', '-day guarantee</span>'],
  ['Acesso na hora</li>', 'Instant access</li>'],
  ['Pix ou cartão</li>', 'Card, Apple Pay or Google Pay</li>'],
  [' à vista</p>', ' one-time payment</p>'],
  ['<span>Vitalício por + ', '<span>Lifetime access for + '],
  ['O vitalício tira o prazo de 1 ano: toda aula nova ou refeita fica sua.', 'Lifetime access removes the 1-year limit: every new or updated lesson is yours.'],
  ['Pagamento seguro. ', 'Secure payment. '],
  ['<span>no cartão</span>', '<span>one-time payment, in US dollars</span>'],
  ['<span>dias</span></div>', '<span>days</span></div>'],
  ['Arraste para o lado</p>', 'Swipe sideways</p>'],
  ['Toque num post para ver o carrossel inteiro.', 'Tap a post to see the whole carousel.'],
  ['aria-label="Exemplo de carrossel"', 'aria-label="Carousel example"'],
  ['aria-label="Fechar"', 'aria-label="Close"'],
  ['</b> aulas <i>·</i>', '</b> lessons <i>·</i>'],
  ['</b> de vídeo <i>·</i>', '</b> of video <i>·</i>'],
  ['</b> módulos</p>', '</b> modules</p>'],
  [' aulas · ', ' lessons · '],
  [' aula · ', ' lesson · '],
  ['data-assistir>Grátis</a>', 'data-assistir>Free</a>'],
  ['<h3>É para você se</h3>', "<h3>It's for you if</h3>"],
  ['<h3>Não é para você se</h3>', "<h3>It's not for you if</h3>"],
  ['</b> curtidas</p>', '</b> likes</p>'],
  ['<small>agora</small>', '<small>now</small>'],
  ['<span>Seu post de hoje está pronto para aprovar ✓</span>', "<span>Today's post is ready to approve ✓</span>"],
  ['</span>siga este arquivo</div>', '</span>follow this file</div>'],
  ['<span>Procurando o que está em alta em <b>', '<span>Looking for what is trending in <b>'],
  ['<span>Escrevi o post do dia no seu estilo: <q>', '<span>I wrote today\'s post in your style: <q>'],
  ['</q> Aprova?</span>', '</q> Approve?</span>'],
  ['data-aprovar>Aprovar</span><span>Pedir ajuste</span>', 'data-aprovar>Approve</span><span>Ask for changes</span>'],
  ['<b>fundo</b>', '<b>background</b>'],
  ['<b>título</b>', '<b>title</b>'],
  ['<b>elementos</b>', '<b>elements</b>'],
  ['<b>acabamento</b>', '<b>finish</b>'],
  ['alt="Post de exemplo"', 'alt="Example post"'],
  ['<b>O seu estilo</b><small>aprendido do seu Instagram</small>', '<b>Your style</b><small>learned from your Instagram</small>'],
  ['<em>seu</em><span>estilo</span>', '<em>your</em><span>style</span>'],
  ['alt="Capa do exemplo ', 'alt="Example cover '],
  ['Ver os ', 'See all '],
  [' arquivos<svg', ' files<svg'],
  ['<span>receita</span>', '<span>recipe</span>'], ['<span>receitas</span>', '<span>recipes</span>'],
  ['Você arrasta na conversa e o Claude faz o passo inteiro.', 'You drag it into the chat and Claude does the whole step.'],
  ['<span>guia</span>', '<span>guide</span>'], ['<span>guias</span>', '<span>guides</span>'],
  ['Modelos prontos que o Claude usa sozinho.', 'Ready-made templates Claude uses on its own.'],
  ['Para ler com calma, sem jargão.', 'To read at your own pace, no jargon.'],
  ['<span>modelo de arte</span>', '<span>design template</span>'], ['<span>modelos de arte</span>', '<span>design templates</span>'],
  ['Em camadas, vira o seu post.', 'Layered, it becomes your post.'],
  ['<span>ferramenta</span>', '<span>tool</span>'], ['<span>ferramentas</span>', '<span>tools</span>'],
  ['Exporta a arte e gera imagens.', 'Exports the design and creates images.'],
  ['>Quero entrar</span>', '>Get started</span>'],
  ['aria-label="Assistir ao vídeo"', 'aria-label="Watch the video"'],
  ['<b>Assista de graça</b>', '<b>Watch for free</b>'],
];

export function emIngles(html) {
  let s = html;
  for (const [pt, en] of PARES) s = s.split(pt).join(en);
  return s;
}

// O cabeçalho e o rodapé do site em inglês: entrar no app da marca e o Instagram em inglês.
export function topoERodapeEn(html, { entrar, instagram = 'setupagency_eng', nome = 'Agência Setup' }) {
  return html
    .replace('href="https://curso.agenciasetup.com.br/">I\'m a student<', `href="${entrar}">I'm a student<`)
    .replace(/<p>Dúvidas\? Chama no Instagram <a href="https:\/\/instagram\.com\/agenciasetup"[^>]*>@agenciasetup<\/a>\.<\/p>/, `<p>Questions? Message us on Instagram <a href="https://instagram.com/${instagram}" target="_blank" rel="noopener">@${instagram}</a>.</p>`)
    .replace('<nav><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a><a href="/recursos">Recursos grátis</a></nav>', '<nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a></nav>')
    .replace(/(<a class="v-logo" href="\/"><img[^>]*>)Agência Setup(<\/a>)/g, `$1${nome}$2`);
}
