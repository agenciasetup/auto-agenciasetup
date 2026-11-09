// Os 3 e-mails de venda do mini curso "Posts automáticos com Claude" para a lista de alunos dos cursos antigos.
// A cara da página de venda (worker/render/venda.js): fundo quase preto, título claro com itálico âmbar, botão verde,
// cards escuros de borda fina e a faixa de nichos. No e-mail não dá degradê no texto: vira cor sólida. Inter Tight e
// Instrument Serif aparecem onde o app carrega fonte (Apple Mail); no Gmail ficam Arial e Georgia.
// montar({ img, nome, sair }) devolve [{ slug, assunto, preheader, html, texto }]:
//   img   endereço da pasta das imagens (vitrine-leque.jpg e vitrine-grade.jpg), terminado em "/"
//   nome  o primeiro nome (no disparo, a variável do Resend; na prévia, um nome de exemplo)
//   sair  o link de descadastro (no disparo, a variável do Resend)
// Preço e o que vem no curso seguem a página de venda (/cursos/posts-automaticos). Mudou lá, mude aqui.

const PAGINA = 'https://agenciasetup.com.br/cursos/posts-automaticos';
const CHECKOUT = 'https://agenciasetup.com.br/checkout/posts-automaticos';
const LOGO = 'https://agenciasetup.com.br/img/logo-setup-128.png';
const VSL = 'https://sjwhbjldecbabexqdnis.supabase.co/storage/v1/object/public/midia/curso/posts-automaticos/vsl-capa.jpg?v=mvlopuq5';
const CAMPANHA = 'lista-alunos-posts-automaticos';

const FUNDO = '#08080A';
const CARTAO = '#121215';
const BORDA = '#26262C';
const TEXTO = '#F4F4F5';
const CORPO = '#C9C9D1';
const MUDO = '#A1A1AA';
const SUTIL = '#71717A';
const AMBAR = '#FFAD1F';
const VERDE = '#16C75A';
const DEGRADE = 'linear-gradient(100deg,#FFD66B 0%,#FFAD1F 45%,#FF6A1A 100%)';
const FONTE = "Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const TITULO = "'Inter Tight',Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIFA = "'Instrument Serif',Georgia,'Times New Roman',serif";
const FONTES_WEB = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Inter+Tight:wght@600;700&family=Instrument+Serif:ital@1&display=swap';

// Cada link leva as marcas da campanha: a venda aparece com origem "email" em Vendas e no Números.
function link(url, conteudo) {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', CAMPANHA);
  u.searchParams.set('utm_content', conteudo);
  return u.href;
}

const tabela = (estilo, conteudo, extra = '') => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${extra} style="${estilo}">${conteudo}</table>`;
const p = (t) => `<p style="margin:0 0 14px;font-family:${FONTE};font-size:16px;line-height:1.65;color:${CORPO}">${t}</p>`;
const titulo = (t) => `<h1 style="margin:0 0 14px;font-family:${TITULO};font-size:34px;line-height:1.08;font-weight:600;letter-spacing:-.035em;color:${TEXTO}">${t}</h1>`;
const laranja = (t) => `<span style="font-family:${SERIFA};font-style:italic;font-weight:400;letter-spacing:-.01em;color:${AMBAR}">${t}</span>`;
const selo = (t) => tabela('margin:0 0 18px', `<tr><td style="border:1px solid #3A2A10;border-radius:999px;padding:6px 13px;background-color:#17120A;font-family:${FONTE};font-size:12px;font-weight:600;color:#FFC56B">&#10022;&nbsp; ${t}</td></tr>`);
// O botão principal é verde, como na página de venda (o degradê aparece onde o app aceita; senão, verde liso).
const botao = (href, txt, margem = '22px auto 14px') => tabela(`margin:${margem}`, `<tr><td align="center" bgcolor="${VERDE}" style="border-radius:999px;background-color:${VERDE};background-image:linear-gradient(#3FE684,#16C75A)">
<a href="${href}" style="display:inline-block;padding:16px 28px;font-family:${FONTE};font-size:17px;font-weight:700;color:#03230F;text-decoration:none;border-radius:999px">${txt}</a></td></tr>`);
const linha = `<div style="height:1px;background-color:${BORDA};line-height:1px;font-size:1px;margin:0 0 24px">&nbsp;</div>`;

// Abertura: uma linha que resume a oferta e o botão logo no começo, para quem não vai ler o e-mail inteiro.
const abertura = (resumo, href, txt) => `<p style="margin:0 0 4px;font-family:${FONTE};font-size:17px;line-height:1.55;color:${MUDO}">${resumo}</p>`
  + botao(href, txt, '18px 0 28px') + linha;

function lista(itens) {
  return tabela('margin:4px 0 18px', itens.map((t) => `<tr>
<td valign="top" width="26" style="padding:5px 0;font-family:${FONTE};font-size:16px;line-height:1.5;font-weight:700;color:${AMBAR}">&#10003;</td>
<td style="padding:5px 0;font-family:${FONTE};font-size:16px;line-height:1.5;color:${CORPO}">${t}</td></tr>`).join(''), 'width="100%"');
}

function passos(itens) {
  return tabela('margin:4px 0 20px', itens.map(([t, d], i) => `<tr>
<td valign="top" width="44" style="padding:9px 0;font-family:${SERIFA};font-size:26px;line-height:1;font-style:italic;color:${AMBAR}">0${i + 1}</td>
<td style="padding:9px 0;font-family:${FONTE};font-size:15px;line-height:1.5;color:${MUDO}"><b style="color:${TEXTO};font-size:16px">${t}</b><br>${d}</td></tr>`).join(''), 'width="100%"');
}

const imagem = (src, alt, href, legenda) => `<a href="${href}" style="text-decoration:none"><img src="${src}" width="512" alt="${alt}" style="display:block;width:100%;max-width:512px;height:auto;border:1px solid ${BORDA};border-radius:18px;margin:8px 0 ${legenda ? 10 : 20}px"></a>
${legenda ? `<p style="margin:0 0 20px;font-family:${FONTE};font-size:13px;line-height:1.5;color:${SUTIL};text-align:center">${legenda}</p>` : ''}`;

// A faixa amarela e laranja dos nichos, como a da página de venda.
const faixa = (itens) => tabela('margin:2px 0 24px', `<tr><td bgcolor="${AMBAR}" style="background-color:${AMBAR};background-image:${DEGRADE};border-radius:12px;padding:11px 14px;font-family:${FONTE};font-size:13px;line-height:1.7;font-weight:700;color:#1F1200;text-align:center">${itens.join(' &nbsp;&#10022;&nbsp; ')}</td></tr>`, 'width="100%"');

// As notificações do Claude, como aparecem na página de venda: card escuro com o ícone laranja.
function avisos(itens) {
  return itens.map(([hora, t]) => tabela('margin:0 0 10px', `<tr><td bgcolor="#17171B" style="background-color:#17171B;border:1px solid #2A2A31;border-radius:16px;padding:12px 14px">
${tabela('', `<tr><td valign="top" width="42"><div style="width:32px;height:32px;border-radius:9px;background-color:#FF7A00;background-image:linear-gradient(135deg,#FFAD1F,#FF6A1A);color:#ffffff;font-size:16px;line-height:32px;text-align:center">&#10022;</div></td>
<td style="font-family:${FONTE};font-size:15px;line-height:1.45;color:${CORPO}"><b style="color:${TEXTO};font-size:14px">Claude</b> <span style="font-size:12px;color:${SUTIL}">&middot; ${hora}</span><br>${t}</td></tr>`, 'width="100%"')}
</td></tr>`, 'width="100%"')).join('') + '<div style="height:12px"></div>';
}

function preco(href, botaoTexto) {
  return tabela('margin:12px 0 24px', `<tr>
<td bgcolor="${CARTAO}" style="background-color:${CARTAO};background-image:linear-gradient(180deg,#22180A 0%,${CARTAO} 55%);border:1px solid #3A2A10;border-radius:22px;padding:28px 22px;text-align:center;font-family:${FONTE}">
<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${AMBAR}">Posts automáticos com Claude</div>
<div style="margin:12px 0 4px;font-family:${TITULO};font-size:54px;line-height:1;font-weight:700;letter-spacing:-.04em;color:${TEXTO}">R$ 39,90</div>
<div style="font-size:16px;font-weight:700;color:${TEXTO}">Pagamento único. Sem mensalidade.</div>
<div style="margin-top:6px;font-size:14px;line-height:1.5;color:${MUDO}">ou 9x de R$ 5,18 no cartão &middot; R$ 37,90 no Pix</div>
${botao(href, botaoTexto)}
<div style="font-size:13px;line-height:1.7;color:${MUDO}"><span style="color:${AMBAR}">&#10022;</span> Acesso na hora &nbsp;&nbsp; <span style="color:${AMBAR}">&#10022;</span> 7 dias de garantia</div>
</td></tr>`, 'width="100%"');
}

const assinatura = p(`Um abraço,<br><b style="color:${TEXTO}">Filipe Lourenço</b><br>Agência Setup`);

function moldura({ preheader, corpo, sair, inicio }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>Agência Setup</title>
<link href="${FONTES_WEB}" rel="stylesheet"></head>
<body style="margin:0;padding:0;background-color:${FUNDO};font-family:${FONTE};color:${TEXTO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}${'&nbsp;&zwnj;'.repeat(60)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${FUNDO}" style="background-color:${FUNDO}"><tr><td align="center" style="padding:0">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px">
<tr><td style="padding:26px 22px 30px;background-color:${FUNDO};background-image:linear-gradient(180deg,#1C1407 0%,${FUNDO} 100%)">
<a href="${inicio}" style="font-family:${TITULO};font-size:16px;font-weight:600;letter-spacing:-.02em;color:${TEXTO};text-decoration:none"><img src="${LOGO}" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;margin-right:9px;border:0">Agência Setup</a></td></tr>
<tr><td style="padding:0 22px 8px">${corpo}</td></tr>
<tr><td style="padding:22px 22px 34px;border-top:1px solid ${BORDA};font-family:${FONTE};font-size:12px;line-height:1.6;color:${SUTIL}">Você recebeu este e-mail porque fez um curso da Agência Setup. Dúvidas? Responda este e-mail ou escreva para contato@agenciasetup.com.br.<br><a href="${sair}" style="color:${MUDO}">Não quero mais receber estes e-mails</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function montar({ img, nome, sair }) {
  const emails = [];

  // 1. A dor: sem tempo para postar.
  {
    const c = 'email-1';
    const corpo = selo('Para quem vive sem tempo')
      + titulo(`Tá sem tempo de produzir conteúdo pro seu ${laranja('perfil')}?`)
      + abertura('Monte um Claude que acha o assunto, escreve e faz a arte dos seus posts. Você só aprova. R$ 39,90.', link(PAGINA, `${c}-topo`), 'Conhecer o curso')
      + p(`Fala, ${nome}!`)
      + p('Você já fez curso com a gente, então eu sei que você entende de conteúdo. O problema quase nunca é saber fazer. É ter tempo.')
      + p('Caçar assunto, escrever, abrir o Canva. E o post sai correndo, de madrugada. Quando sai.')
      + p(`Por isso eu gravei o <b style="color:${TEXTO}">Posts automáticos com Claude</b>. Em 18 aulas curtas, você monta, sem programar, um Claude que:`)
      + lista(['acha o assunto quente do seu nicho todo dia às 7h;', 'escreve o post do jeito que você fala;', 'faz a arte em alto padrão, sem cara de IA.'])
      + p(`Você só lê, aprova e posta.`)
      + imagem(`${img}vitrine-leque.jpg`, 'Quatro carrosséis feitos pelo Claude com o método do curso', link(`${PAGINA}#estilos`, `${c}-vitrine`), 'Posts feitos pelo Claude com o método do curso.')
      + faixa(['Advocacia', 'Social media', 'Marca pessoal', 'Conteúdo católico', 'Nutrição', 'Imobiliária'])
      + preco(link(PAGINA, `${c}-preco`), 'Quero meus posts no automático')
      + p('P.S. Se você assistir e achar que não é para você, é só pedir em até 7 dias e a gente devolve todo o seu dinheiro.')
      + assinatura;
    emails.push({
      slug: c,
      assunto: 'Tá sem tempo de produzir conteúdo pro seu perfil?',
      preheader: 'Monte um Claude que acha o assunto, escreve e faz a arte. Você só aprova.',
      html: moldura({ preheader: 'Monte um Claude que acha o assunto, escreve e faz a arte. Você só aprova.', corpo, sair, inicio: link(PAGINA, `${c}-logo`) }),
      texto: `Fala, ${nome}!\n\nVocê já fez curso com a gente, então eu sei que você entende de conteúdo. O problema quase nunca é saber fazer. É ter tempo.\n\nNo Posts automáticos com Claude você monta, sem programar, um Claude que acha o assunto quente do seu nicho, escreve do jeito que você fala e faz a arte em alto padrão. Você só aprova e posta.\n\nR$ 39,90, pagamento único (ou 9x de R$ 5,18; R$ 37,90 no Pix). 7 dias de garantia.\n\nVer o curso: ${link(PAGINA, `${c}-texto`)}\n\nUm abraço,\nFilipe Lourenço\nAgência Setup\n\nNão quer mais receber? ${sair}`,
    });
  }

  // 2. Como funciona: o Claude trabalhando.
  {
    const c = 'email-2';
    const corpo = selo('Veja funcionando')
      + titulo(`Quer posts automáticos no seu perfil, com ${laranja('Claude')}?`)
      + abertura('Assunto, texto e arte prontos de manhã. Você só aprova. Veja em 2 minutos.', link(`${PAGINA}#video`, `${c}-topo`), 'Ver funcionando')
      + p(`${nome}, imagina abrir o computador de manhã e ver isso:`)
      + avisos([['07:00', 'Achei 3 assuntos em alta no seu nicho hoje.'], ['08:00', 'Post escrito no seu estilo. Aprova?'], ['13:00', 'Arte pronta &#10003;']])
      + p('É isso que você monta no curso. Uma pasta no seu computador que trabalha por você:')
      + passos([
        ['Um Claude que escreve igual a você', 'Ele te entrevista e lê os posts que mais deram certo no seu Instagram.'],
        ['Um radar de assunto quente', 'Todo dia às 7h ele anota o que está em alta no seu nicho.'],
        ['Um quadro de conteúdo', 'Ideias, para aprovar, aprovado, postado. Tipo Trello, dentro da sua pasta.'],
        ['Arte em alto padrão', 'Modelo em camadas e a regra das 5 etapas. Post bonito, sem cara de IA.'],
        ['Imagens com IA', 'Nano Banana e, se você assina o Magnific, a sua foto com o rosto idêntico.'],
        ['Tudo no automático', 'Tarefas agendadas que rodam sozinhas, todo dia.'],
      ])
      + imagem(VSL, 'Vídeo de 2 minutos mostrando o curso', link(`${PAGINA}#video`, `${c}-video`), 'Veja funcionando em 2 minutos.')
      + p('E nada vai para o Instagram sem você aprovar. Você continua no controle, só que sem perder o dia nisso.')
      + preco(link(PAGINA, `${c}-preco`), 'Quero montar o meu')
      + assinatura;
    emails.push({
      slug: c,
      assunto: 'Quer posts automáticos no seu perfil com Claude?',
      preheader: 'Assunto, texto e arte prontos de manhã. Você só aprova. Veja em 2 minutos.',
      html: moldura({ preheader: 'Assunto, texto e arte prontos de manhã. Você só aprova. Veja em 2 minutos.', corpo, sair, inicio: link(PAGINA, `${c}-logo`) }),
      texto: `${nome}, imagina abrir o computador de manhã e o Claude já ter achado o assunto, escrito o post no seu estilo e feito a arte.\n\nNo curso você monta isso: um Claude que escreve igual a você, um radar de assunto quente, um quadro de conteúdo, arte em alto padrão, imagens com IA e tudo rodando sozinho. Nada vai para o Instagram sem você aprovar.\n\nVeja em 2 minutos: ${link(`${PAGINA}#video`, `${c}-texto`)}\n\nR$ 39,90, pagamento único. 7 dias de garantia.\n\nUm abraço,\nFilipe Lourenço\nAgência Setup\n\nNão quer mais receber? ${sair}`,
    });
  }

  // 3. A oferta: design e preço, com as respostas antes de comprar.
  {
    const c = 'email-3';
    const corpo = selo('Design absurdo, sem Canva')
      + titulo(`Automatize seus posts com ${laranja('design absurdo')}`)
      + abertura('R$ 39,90, pagamento único, com 7 dias de garantia.', link(PAGINA, `${c}-topo`), 'Conhecer o curso')
      + p(`${nome}, post bonito não precisa de horas no Canva.`)
      + p('No curso eu ensino o método que a gente usa aqui na Setup: modelo em camadas, capa com intenção e a regra das 5 etapas. Funciona em qualquer nicho:')
      + imagem(`${img}vitrine-grade.jpg`, 'Carrosséis de social media, advocacia, marca pessoal e conteúdo católico feitos pelo Claude', link(`${PAGINA}#estilos`, `${c}-vitrine`), 'Social media, advocacia, marca pessoal e conteúdo católico. Todos feitos pelo Claude.')
      + faixa(['Psicologia', 'Restaurantes', 'Infoprodutos', 'Nutrição', 'Estética', 'O seu nicho'])
      + p(`<b style="color:${TEXTO}">O que vem no curso:</b>`)
      + lista(['18 aulas de 5 a 7 minutos, direto ao ponto;', 'o kit: 10 receitas, 5 skills, guias e o modelo de arte;', '"Faça agora" em cada aula, com o pedido pronto para colar no Claude;', 'tutor de IA para tirar dúvida dentro da aula;', 'certificado ao concluir.'])
      + p(`<b style="color:${TEXTO}">Antes de comprar, saiba:</b>`)
      + lista(['Não precisa programar.', 'Precisa de um computador (Windows ou Mac) e do Claude Pro.', 'Ele não posta sozinho: você aprova cada post antes.'])
      + preco(link(CHECKOUT, `${c}-preco`), 'Quero entrar agora')
      + p('O acesso dura 1 ano. Se quiser para sempre, no checkout tem o vitalício por mais R$ 19,90.')
      + p('Se entrar, assistir e achar que não é para você, é só pedir em até 7 dias e a gente devolve tudo.')
      + assinatura;
    emails.push({
      slug: c,
      assunto: 'Design absurdo nos seus posts, por R$ 39,90',
      preheader: 'Pagamento único, 18 aulas, kit pronto e 7 dias de garantia.',
      html: moldura({ preheader: 'Pagamento único, 18 aulas, kit pronto e 7 dias de garantia.', corpo, sair, inicio: link(PAGINA, `${c}-logo`) }),
      texto: `${nome}, post bonito não precisa de horas no Canva.\n\nNo Posts automáticos com Claude eu ensino o método que a gente usa na Setup: modelo em camadas, capa com intenção e a regra das 5 etapas. Funciona em qualquer nicho.\n\nVem: 18 aulas curtas, o kit (10 receitas, 5 skills, guias e o modelo de arte), tutor de IA e certificado. Precisa de um computador e do Claude Pro. Você aprova cada post antes.\n\nR$ 39,90, pagamento único (ou 9x de R$ 5,18; R$ 37,90 no Pix). 7 dias de garantia.\n\nEntrar agora: ${link(CHECKOUT, `${c}-texto`)}\n\nUm abraço,\nFilipe Lourenço\nAgência Setup\n\nNão quer mais receber? ${sair}`,
    });
  }

  return emails;
}
