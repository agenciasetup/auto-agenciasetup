// O app do aluno em inglês (o curso "Posts on Autopilot with Claude", marca com idioma "en"): os textos que o SERVIDOR
// escreve em português (erros, avisos, nomes de nível e de selo, objetivos, o sino) saem em inglês nas respostas da API.
// O texto do app em si é traduzido no build (aluno/en.json, npm run aluno:en); aqui é só o que vem pronto da API.
//
// Como funciona: apiAluno (lib/api/aluno.js) devolve a resposta de sempre e passa por emIngles(). Se o endereço é o de um
// curso em inglês (marcaPorHost(...).idioma === 'en'), a resposta JSON é copiada trocando, só nestes campos, o texto
// que bate EXATO com uma frase de MENSAGENS (ou com um dos PADROES, que levam números): erro, aviso, nome, proximo,
// descricao, titulo, texto, rotulo e acao, mais os valores de "objetivos". Texto que não está aqui (aula, produto, aviso
// escrito pela equipe, resposta do tutor) passa como veio. Em qualquer outro endereço nada muda.
//
// Frase nova no servidor? Ponha a frase aqui (a chave é o português igual ao do código) quando ela puder chegar ao aluno.
import { marcaPorHost } from '../marcas.js';

const MENSAGENS = [
  // ---------------------------------------------------------------- erros gerais (nucleo/util.js, rota.js, db.js)
  ['Algo deu errado do nosso lado. Tente de novo em instantes.', 'Something went wrong on our side. Please try again in a moment.'],
  ['Método não aceito.', 'Method not allowed.'],
  ['Endereço da API não existe.', 'That API address does not exist.'],
  ['Conteúdo grande demais.', 'Content too large.'],
  ['O conteúdo enviado não é um JSON válido.', 'The content sent is not valid JSON.'],
  ['O banco de dados não está configurado neste ambiente.', 'The database is not set up in this environment.'],
  ['Algum campo está fora do formato aceito.', 'A field is not in an accepted format.'],
  ['O banco recusou a consulta.', 'The database rejected the request.'],
  ['O armazenamento recusou o arquivo.', 'Storage rejected the file.'],

  // ---------------------------------------------------------------- entrar (api/aluno.js, alunos.js)
  ['Confira o e-mail.', 'Check the email address.'],
  ['Muitos códigos pedidos. Espere 15 minutos e tente de novo.', 'Too many codes requested. Wait 15 minutes and try again.'],
  ['Pedido inválido.', 'Invalid order.'],
  ['Entre com o seu e-mail: mandamos o acesso para ele.', 'Sign in with your email: we sent your access to it.'],
  ['Este atalho já foi usado. Entre com o seu e-mail.', 'This shortcut was already used. Sign in with your email.'],
  ['Muitas entradas por este botão hoje. Entre com o seu e-mail.', 'Too many sign-ins through this button today. Sign in with your email.'],
  ['Não consegui criar o login do aluno.', "We couldn't create your login."],
  ['Entre para continuar.', 'Sign in to continue.'],
  ['Entre com o seu e-mail.', 'Sign in with your email.'],
  ['Este login não tem curso. Entre com o e-mail que você usou na compra.', 'This login has no course. Sign in with the email you used for your purchase.'],

  // ---------------------------------------------------------------- curso, aula e arquivos
  ['Curso não encontrado.', 'Course not found.'],
  ['Aula não encontrada.', 'Lesson not found.'],
  ['Arquivo não encontrado.', 'File not found.'],
  ['Você ainda não tem este curso.', "You don't have this course yet."],
  ['Esta aula ainda não foi liberada.', 'This lesson has not been unlocked yet.'],
  ['Esse material libera depois que você conta como foi o curso.', 'This material unlocks after you tell us how the course went.'],
  ['Os modelos prontos liberam amanhã.', 'The ready-to-use templates unlock tomorrow.'],
  ['Não consegui preparar o download agora. Tente de novo.', "We couldn't prepare the download right now. Try again."],
  ['Nada para salvar.', 'Nothing to save.'],

  // ---------------------------------------------------------------- comentários, notas e avaliação (turma.js)
  ['Escreva o comentário.', 'Write your comment.'],
  ['Muitos comentários seguidos. Espere um pouco.', 'Too many comments in a row. Wait a moment.'],
  ['Comentário não encontrado.', 'Comment not found.'],
  ['Reação inválida.', 'Invalid reaction.'],
  ['Esse comentário é seu.', 'That comment is yours.'],
  ['Seu comentário tem link ou palavra que a equipe confere antes. Ele aparece logo depois da aprovação.', 'Your comment has a link or a word the team checks first. It shows up right after approval.'],
  ['Escreva a anotação.', 'Write your note.'],
  ['Anotação não encontrada.', 'Note not found.'],
  ['A nota vai de 0 a 10.', 'The score goes from 0 to 10.'],

  // ---------------------------------------------------------------- tutor (tutor.js)
  ['O tutor ainda não está ligado. Use os comentários da aula ou mande para a equipe.', "The tutor isn't turned on yet. Use the lesson comments or send it to the team."],
  ['Escreva a sua dúvida.', 'Write your question.'],
  ['(print sem texto)', '(screenshot only)'],
  ['Mande o print em PNG, JPG ou WEBP.', 'Send the screenshot as PNG, JPG or WEBP.'],
  ['O print está grande demais. Recorte só a parte que importa.', 'The screenshot is too large. Crop only the part that matters.'],
  ['O tutor está pausado até o mês virar. Mande a dúvida para a equipe que a gente responde.', "The tutor is paused until next month. Send your question to the team and we'll reply."],
  ['O tutor está fora do ar (chave do Claude recusada). A equipe já pode ver isso no painel.', 'The tutor is offline (Claude key rejected). The team can already see this in the dashboard.'],
  ['Muita gente perguntando agora. Tente de novo em 1 minuto.', 'A lot of people are asking right now. Try again in 1 minute.'],
  ['O tutor não respondeu agora. Tente de novo em instantes.', "The tutor didn't answer just now. Try again in a moment."],
  ['Resposta não encontrada.', 'Reply not found.'],
  ['Conversa não encontrada.', 'Conversation not found.'],
  ['Muitas dúvidas seguidas. Espere um pouco.', 'Too many questions in a row. Wait a moment.'],

  // ---------------------------------------------------------------- certificado (certificados.js)
  ['O certificado libera amanhã.', 'The certificate unlocks tomorrow.'],
  ['Não consegui emitir o certificado agora. Tente de novo.', "We couldn't issue the certificate right now. Try again."],

  // ---------------------------------------------------------------- perfil (perfil.js)
  ['Escreva o seu nome.', 'Write your name.'],
  ['O usuário tem de 3 a 30 letras, números, ponto ou sublinhado.', 'The username has 3 to 30 letters, numbers, dots or underscores.'],
  ['Esse usuário é reservado. Escolha outro.', 'That username is reserved. Choose another one.'],
  ['Esse usuário já é de outra pessoa.', 'That username already belongs to someone else.'],
  ['Mande a foto em JPG, PNG ou WEBP.', 'Send the photo as JPG, PNG or WEBP.'],
  ['A foto ficou grande demais. Tente outra.', 'The photo is too large. Try another one.'],
  ['Muitas fotos seguidas. Espere um pouco.', 'Too many photos in a row. Wait a moment.'],
  // O que o aluno quer com o curso (boas-vindas): OBJETIVOS em perfil.js.
  ['Automatizar os meus posts', 'Automate my posts'],
  ['Atender mais clientes com IA', 'Serve more clients with AI'],
  ['Fazer design melhor com IA', 'Do better design with AI'],
  ['Começar do zero na área', 'Start from scratch in the field'],

  // ---------------------------------------------------------------- mural, desafios e depoimento (comunidade.js)
  ['Desafio não encontrado.', 'Challenge not found.'],
  ['Dê um título para a sua criação.', 'Give your creation a title.'],
  ['O link precisa começar com https://', 'The link must start with https://'],
  ['Mande o link do post ou uma imagem.', 'Send the post link or an image.'],
  ['Muitas entregas seguidas. Espere um pouco.', 'Too many submissions in a row. Wait a moment.'],
  ['Esse desafio não está aberto.', "That challenge isn't open."],
  ['O prazo desse desafio acabou.', 'The deadline for that challenge has passed.'],
  ['Você já entregou neste desafio.', 'You already submitted to this challenge.'],
  ['Mande a imagem em JPG, PNG ou WEBP.', 'Send the image as JPG, PNG or WEBP.'],
  ['A imagem ficou grande demais.', 'The image is too large.'],
  ['Criação não encontrada.', 'Creation not found.'],
  ['Essa criação é sua.', 'That creation is yours.'],
  ['O depoimento abre depois de metade das aulas.', 'The testimonial opens after half of the lessons.'],
  ['Conte um pouco mais: pelo menos uma frase.', 'Tell us a bit more: at least one sentence.'],
  ['O link do vídeo precisa começar com https://', 'The video link must start with https://'],
  ['Conte o resultado.', 'Tell us the result.'],
  ['Envie o depoimento antes.', 'Send your testimonial first.'],
  ['Ação inválida.', 'Invalid action.'],

  // ---------------------------------------------------------------- compras, pagamento e reembolso (vendas.js, pos-venda.js, pagamento/)
  ['Compra não encontrada.', 'Purchase not found.'],
  ['Esta compra já está paga.', 'This purchase is already paid.'],
  ['Esta compra não pode mais ser paga.', 'This purchase can no longer be paid.'],
  ['Essa forma de pagamento não vale para esta compra.', "That payment method isn't valid for this purchase."],
  ['Muitas trocas seguidas. Espere um pouco e tente de novo.', 'Too many changes in a row. Wait a bit and try again.'],
  ['Esse pagamento acabou de entrar. Atualize a página em alguns segundos.', 'That payment just came in. Refresh the page in a few seconds.'],
  ['Não achei o seu cadastro de pagamento. Fale com a gente.', "We couldn't find your payment profile. Please contact us."],
  ['Só dá para pedir reembolso de uma compra paga.', 'You can only request a refund for a paid purchase.'],
  ['O reembolso desta compra já foi pedido.', 'A refund was already requested for this purchase.'],
  ['O prazo de garantia desta compra já passou. Para falar sobre ela, escreva para contato@agenciasetup.com.br.', 'The guarantee period for this purchase has passed. To talk about it, write to contato@agenciasetup.com.br.'],
  ['Marque que concorda com os termos para confirmar.', 'Check that you agree to the terms to confirm.'],
  ['Escolha o motivo do reembolso.', 'Choose a reason for the refund.'],
  ['Escreva o nome completo.', 'Write your full name.'],
  ['Escreva o celular com o código do país, começando com +.', 'Write your mobile number with the country code, starting with +.'],
  ['Escreva o celular com DDD.', 'Write your mobile number with the area code.'],
  ['Esse CPF não confere. Confira os números.', "That CPF doesn't check out. Check the numbers."],
  ['Não consegui falar com o Stripe agora. Tente de novo em instantes.', "We couldn't reach Stripe right now. Try again in a moment."],
  ['O pagamento em dólar ainda não está configurado.', 'Payments in dollars are not set up yet.'],
  ['O pagamento ainda não está configurado. Tente de novo mais tarde.', 'Payments are not set up yet. Please try again later.'],
  ['Esta compra não tem pagamento no Stripe para devolver.', 'This purchase has no Stripe payment to refund.'],
  ['Essa compra não tem vagas de equipe.', "That purchase doesn't include team seats."],
  ['Você já está nesta compra.', 'You are already in this purchase.'],
  ['Essa pessoa já foi convidada.', 'That person was already invited.'],
  ['Todas as vagas já foram usadas.', 'All seats have been used.'],

  // ---------------------------------------------------------------- níveis (jogo.js, NIVEIS)
  ['Calango filhote', 'Baby Calango'],
  ['Calango curioso', 'Curious Calango'],
  ['Calango aplicado', 'Diligent Calango'],
  ['Calango criador', 'Creator Calango'],
  ['Calango mestre', 'Master Calango'],
  ['Calango lenda', 'Legend Calango'],

  // ---------------------------------------------------------------- selos iniciais (tabela conquistas; a equipe pode criar outros no painel)
  ['Primeira aula', 'First lesson'], ['Concluiu a primeira aula.', 'Completed the first lesson.'],
  ['Módulo completo', 'Module complete'], ['Terminou um módulo inteiro.', 'Finished a whole module.'],
  ['Aplicou 10 vezes', 'Applied it 10 times'], ['Fez 10 passos do "Faça agora".', 'Did 10 "Do it now" steps.'],
  ['Primeiro post automático', 'First automatic post'], ['Concluiu a aula dos posts do dia.', 'Completed the daily posts lesson.'],
  ['Sete dias seguidos', 'Seven-day streak'], ['Estudou 7 dias seguidos.', 'Studied 7 days in a row.'],
  ['Madrugador', 'Early bird'], ['Estudou antes das 7 da manhã.', 'Studied before 7 a.m.'],
  ['Ajudou a turma', 'Helped the community'], ['Recebeu 5 curtidas ou "resolveu" nos comentários.', 'Got 5 likes or "solved it" marks on comments.'],
  ['Criador', 'Creator'], ['Teve uma criação aprovada no mural.', 'Had a creation approved in the class feed.'],
  ['Criador destaque', 'Featured creator'], ['Teve uma criação escolhida como destaque.', 'Had a creation chosen as featured.'],
  ['Curso concluído', 'Course completed'], ['Terminou todas as aulas de um curso.', 'Finished all the lessons in a course.'],
  ['Certificado', 'Certificate'], ['Conquistou um certificado.', 'Earned a certificate.'],
  ['Deu a real', 'Kept it real'], ['Contou como foi o curso.', 'Told us how the course went.'],
  ['Trouxe a turma', 'Brought the crew'], ['Indicou alguém que comprou.', 'Referred someone who bought.'],

  // ---------------------------------------------------------------- sino (notificacoes) e o que a área de membros escreve sozinha
  ['A equipe respondeu o seu comentário', 'The team replied to your comment'],
  ['A equipe respondeu a sua dúvida', 'The team answered your question'],
  ['Módulo concluído', 'Module completed'],
  ['Mais um passo. Siga para o próximo módulo.', 'One more step. Move on to the next module.'],
  ['Seu certificado saiu', 'Your certificate is ready'],
  ['Sua indicação comprou!', 'Your referral bought!'],
  ['Obrigado por trazer gente nova para a turma. +50 XP.', 'Thanks for bringing new people to the community. +50 XP.'],
  ['Sua criação não entrou no mural', "Your creation didn't make it to the class feed"],
  ['Sua criação virou destaque!', 'Your creation was featured!'],
  ['Sua criação está no mural', 'Your creation is in the class feed'],
  ['Tem coisa nova nesta aula. Vale ver de novo.', 'There is something new in this lesson. Worth watching again.'],
  ['O link aparece no início 10 minutos antes.', 'The link shows up on Home 10 minutes before.'],

  // ---------------------------------------------------------------- etiqueta em cima do vídeo (vitrine.js) e o bônus dos 7 dias (conquista.js)
  ['Vídeo e voz gerados com IA', 'Video and voice generated with AI'],
  ['Ir para o curso', 'Go to the course'],
  ['Aprender', 'Learn'],
  ['Modelos prontos', 'Ready-to-use templates'],
  ['4 estilos de carrossel do curso, prontos para editar.', '4 carousel styles from the course, ready to edit.'],
  ['Padrão Setup', 'Setup Standard'], ['O modelo em camadas do curso, com o carrossel "criado no Claude".', 'The course layered template, with the "made in Claude" carousel.'],
  ['Advocacia', 'Law firm'], ['Escuro, vidro e verde-limão, no jeito do iPhone.', 'Dark, glass and lime green, iPhone style.'],
  ['Elegante', 'Elegant'], ['Tom quente, monograma dourado e espaço para a sua foto.', 'Warm tone, gold monogram and room for your photo.'],
  ['Religioso', 'Religious'], ['Pintura escura, texto claro e uma palavra manuscrita.', 'Dark painting, light text and a handwritten word.'],
];

const EXATOS = new Map(MENSAGENS);
const plural = (n, um, varios) => (Number(n) === 1 ? um : varios);

// Frases com número ou nome no meio. O trecho em português é o do código, com o valor trocado por um grupo.
const PADROES = [
  [/^Você usou as (\d+) perguntas de hoje\. Amanhã tem mais; se for urgente, mande para a equipe\.$/, (n) => `You used your ${n} questions for today. There are more tomorrow; if it is urgent, send it to the team.`],
  [/^Faltam (\d+) (aula|aulas) para o certificado\.$/, (n) => `${n} more ${plural(n, 'lesson', 'lessons')} to go before the certificate.`],
  [/^O certificado libera em (\d+) dias\.$/, (n) => `The certificate unlocks in ${n} days.`],
  [/^Os modelos prontos liberam em (\d+) dias\.$/, (n) => `The ready-to-use templates unlock in ${n} days.`],
  [/^Este curso abre no app dele, o (.+)\.$/, (nome) => `This course opens in its own app, ${nome}.`],
  // Sino: o nome do selo, o desafio, a aula e o evento vêm do banco; só o começo é nosso.
  [/^Selo novo: (.+)$/, (nome) => `New badge: ${ingles(nome)}`],
  [/^Desafio novo: (.+)$/, (titulo) => `New challenge: ${titulo}`],
  [/^Aula atualizada: (.+)$/, (aula) => `Lesson updated: ${aula}`],
  [/^Hoje às (\d{2}:\d{2}): (.+)$/, (hora, titulo) => `Today at ${hora}: ${titulo}`],
  [/^Até (\d{2})\/(\d{2})\/(\d{4})$/, (d, m, a) => `Until ${m}/${d}/${a}`],
];

// O texto em inglês, ou o mesmo texto se não for um dos nossos.
export function ingles(texto) {
  if (typeof texto !== 'string' || !texto) return texto;
  const certo = EXATOS.get(texto);
  if (certo !== undefined) return certo;
  for (const [re, fn] of PADROES) {
    const m = texto.match(re);
    if (m) return fn(...m.slice(1));
  }
  return texto;
}

// Os campos da resposta que levam texto nosso. Os outros (nomes de pessoas, comentários, e-mail, endereços) nunca são tocados.
const CAMPOS = new Set(['erro', 'aviso', 'nome', 'proximo', 'descricao', 'titulo', 'texto', 'rotulo', 'acao']);

function andar(v, chave, estado) {
  if (typeof v === 'string') {
    if (!CAMPOS.has(chave)) return v;
    const novo = ingles(v);
    if (novo !== v) estado.mudou = true;
    return novo;
  }
  if (Array.isArray(v)) return v.map((x) => andar(x, chave, estado));
  if (v && typeof v === 'object') {
    const saida = {};
    for (const [k, x] of Object.entries(v)) {
      // "objetivos" é um mapa chave -> frase (as opções das boas-vindas): todos os valores são nossos.
      if (chave === 'objetivos' && typeof x === 'string') { saida[k] = ingles(x); if (saida[k] !== x) estado.mudou = true; } else saida[k] = andar(x, k, estado);
    }
    return saida;
  }
  return v;
}

// O JSON de uma resposta com os textos do servidor em inglês: { dados, mudou }.
export function jsonEmIngles(dados) {
  const estado = { mudou: false };
  const novo = andar(dados, '', estado);
  return { dados: novo, mudou: estado.mudou };
}

// Passa pela resposta da API do aluno: no endereço do curso em inglês, troca os textos do servidor; senão devolve a mesma resposta.
export async function emIngles(env, url, resposta) {
  const marca = await marcaPorHost(env, url.hostname).catch(() => null);
  if (!marca || marca.idioma !== 'en') return resposta;
  if (!/json/i.test(resposta.headers.get('content-type') || '')) return resposta;
  let dados;
  try { dados = await resposta.clone().json(); } catch { return resposta; }
  const r = jsonEmIngles(dados);
  if (!r.mudou) return resposta;
  return new Response(JSON.stringify(r.dados), { status: resposta.status, headers: resposta.headers });
}
