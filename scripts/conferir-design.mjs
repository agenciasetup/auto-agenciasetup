// Confere o setor de Design (worker/lib/agentes/olheiro-visual.js e diretor-de-arte.js) e o Zelador das tarefas de post.
//   node scripts/conferir-design.mjs                 só as contas e as travas, sem rede e sem IA
//   node scripts/conferir-design.mjs --banco         também simula os dois com o banco de verdade, SÓ LENDO (a rede
//                                                    deste script recusa qualquer escrita), sem gastar IA
// Rodar de verdade é pelo conector, com o código que está no ar (no computador a chave do Claude não abre, de propósito):
//   node scripts/conector.mjs design_olheiro '{}'    e    node scripts/conector.mjs design_diretor '{}'
import { env as local } from './env.mjs';
import { separar, tipoDe, conferirLeitura, contar, cartaoDe, textoLivre, tituloCurto, doGuiaEmTexto, rodarOlheiroVisual, montarPedido as pedidoDoOlheiro } from '../worker/lib/agentes/olheiro-visual.js';
import { GUIA, contraOGuia, blocoDoCaderno } from '../worker/lib/agentes/direcao-de-arte.js';
import { conferirTeste, medir, cartaoDoResultado, resumoDaLeitura, rodarDiretorDeArte, lerDesign, montarPedido as pedidoDoDiretor } from '../worker/lib/agentes/diretor-de-arte.js';
import { blocoDaMemoria, textoDaMemoria } from '../worker/lib/escritorio.js';
import { daTarefa, tarefasQueNaoRodaram } from '../worker/lib/agentes/zelador.js';
import { lerRecusa, licaoDaRecusa, tipoDaPeca } from '../worker/lib/recusas.js';

let falhas = 0;
const ok = (nome, cond, visto) => { if (!cond) falhas++; console.log(cond ? 'ok  ' : 'ERRO', nome, cond ? '' : JSON.stringify(visto).slice(0, 300)); };

// ---------------------------------------------------------------- Olheiro visual: a separação
const DIA = 86_400_000;
const agora = Date.parse('2026-11-16T12:00:00Z');
const ig = (n) => `https://scontent-gru1-1.cdninstagram.com/v/t51/${n}.jpg`;
const carrossel = { origem_tipo: 'recurso', titulo: 'Carrossel', slides: Array.from({ length: 8 }, () => ({ imagem_url: 'https://x.supabase.co/storage/v1/object/public/midia/a.webp' })) };
const frase = { origem_tipo: 'livre', titulo: '12h · Frase', slides: [{}, {}, {}] };
const post = (i, dias, nota, salvos, peca = carrossel, extra = {}) => ({
  id: `p${i}`, publicado_em: new Date(agora - dias * DIA).toISOString(), nota, salvos, comentarios: 3, alcance: 2000,
  palavra_chave: `P${i}`, link: `https://www.instagram.com/p/x${i}/`, miniatura_url: ig(i), peca, ...extra,
});
const notas = [30, 22, 20, 15, 12, 11, 10, 9, 8, 6, 5, 4];
const posts = [
  ...notas.map((n, i) => post(i, 5 + i, n, n * 5)),
  ...[6, 5, 4, 3, 3, 2, 1].map((n, i) => post(20 + i, 4 + i, n, 2, frase)),
  post(40, 1, 50, 900), // novo demais: os números ainda estão subindo
  post(41, 50, 50, 900), // velho demais
  post(42, 8, 50, 900, carrossel, { alcance: 0 }),
  post(43, 8, 50, 900, carrossel, { miniatura_url: 'https://site-estranho.com/a.jpg', peca: { origem_tipo: 'recurso', slides: [{ imagem_url: 'https://outro.com/b.jpg' }] } }),
];
ok('frase é post livre de até 4 cards', tipoDe({ peca: frase }) === 'frase' && tipoDe({ peca: carrossel }) === 'carrossel' && tipoDe({}) === 'carrossel');
const sel = separar(posts, agora);
ok('só entram posts assentados, dentro da janela, com alcance e com imagem de endereço conhecido', sel.total === 19, sel.total);
ok('mediana dos carrosséis separada da das frases', sel.carrossel.mediana === 10.5 && sel.frase.mediana === 3, [sel.carrossel.mediana, sel.frase.mediana]);
ok('acima da curva: até 5, da maior para a menor', sel.carrossel.topo.map((p) => p.nota).join() === '30,22,20,15', sel.carrossel.topo.map((p) => p.nota));
ok('abaixo da curva: até 4, da menor para a maior', sel.carrossel.baixo.map((p) => p.nota).join() === '4,5,6', sel.carrossel.baixo.map((p) => p.nota));
ok('frase com até 2 de cada lado', sel.capas.filter((c) => c.tipo === 'frase').length <= 4 && sel.capas.some((c) => c.tipo === 'frase'), sel.capas.filter((c) => c.tipo === 'frase').length);
ok('cada capa ganha uma referência curta', sel.capas.every((c, i) => c.ref === `c${i + 1}`));
ok('poucos carrosséis: não roda', separar(posts.slice(0, 5), agora).carrossel === null);

// ---------------------------------------------------------------- Olheiro visual: a conferência do que volta
const leituraBoa = {
  capas: sel.capas.map((c) => ({ ref: c.ref, assunto: c.grupo === 'topo' ? 'bicho' : 'so_texto', cor_fundo: 'Amarelo', cor_viva: c.grupo === 'topo' ? 'alta' : 'baixa', perto_da_lente: c.grupo === 'topo', palavra_grande: 'FUNDOS', descricao: 'Uma alpaca enorme perto da lente.' })),
  padrao_topo: 'Bicho enorme perto da lente, cor cheia e a palavra grande é o nome do que a pessoa ganha.',
  padrao_baixo: 'Só texto em fundo escuro, sem assunto e quase sem cor.',
  regra: 'Na próxima capa, ponha o assunto enorme perto da lente numa cena natural com cor cheia.',
};
const l = conferirLeitura(leituraBoa, sel.capas);
ok('leitura boa passa', typeof l === 'object' && l.capas.size === sel.capas.length && l.regra.startsWith('Na próxima'), l);
const barraL = (nome, muda, parte) => { const x = conferirLeitura({ ...leituraBoa, ...muda }, sel.capas); ok(`barra a leitura: ${nome}`, typeof x === 'string' && x.includes(parte), x); };
barraL('número inventado na regra', { regra: 'Capa com bicho dá 3 vezes mais nota, use sempre.' }, 'número');
barraL('travessão', { padrao_topo: 'Bicho perto da lente — cor cheia.' }, 'travessão');
barraL('link', { padrao_baixo: 'Igual ao que se vê em www.exemplo.com por aí.' }, 'link');
barraL('título rosa', { regra: 'Use o título em rosa para combinar com a imagem.' }, 'cor');
barraL('leu poucas capas', { capas: leituraBoa.capas.slice(0, 2) }, 'Leu só');
ok('referência que não está na lista é ignorada', conferirLeitura({ ...leituraBoa, capas: [...leituraBoa.capas, { ...leituraBoa.capas[0], ref: 'c99' }] }, sel.capas).capas.size === sel.capas.length);
ok('título em amarelo, preto ou branco passa', !textoLivre('Título em amarelo sobre a cena, nunca da cor da foto.', 'A regra', 10, 200).erro);
const k = contar(sel.capas, l.capas);
ok('a contagem é do código', k.carrossel.topo.assunto.bicho === 4 && k.carrossel.baixo.assunto.so_texto === 3 && k.carrossel.topo.perto === 4, k.carrossel);
const cartao = cartaoDe(sel, l, k);
ok('o cartão tem prova com os números, regra e links', cartao.prova.includes('10,5') && cartao.prova.includes('P0 30') && cartao.acao.includes(l.regra) && cartao.links.length >= 3 && cartao.titulo.length <= 158 && cartao.prova.length <= 1500, cartao);

const longo = 'As de cima têm cor viva forte na imagem: céu azul, amarelo cheio, o bico do tucano, a alpaca no campo aberto e o resto todo junto numa frase só que não acaba nunca mais.';
const tc = tituloCurto('Capas fora da curva: ', longo);
ok('título longo corta numa palavra inteira, com reticências', tc.length <= 158 && tc.endsWith('...') && !/s...$/.test(tc) && longo.includes(tc.slice(21, -3)), tc);
ok('título fica só com a primeira frase', tituloCurto('X: ', 'Bicho perto da lente. O resto vem depois.') === 'X: Bicho perto da lente.');

// ---------------------------------------------------------------- Diretor de arte
const leituraGuardada = {
  em: '2026-11-16T12:03:00Z', de: sel.de, ate: sel.ate, proposta_id: null,
  carrossel: { n: sel.carrossel.n, mediana: sel.carrossel.mediana, mediana_salvos: sel.carrossel.mediana_salvos },
  capas: sel.capas.map((c) => ({ ...c, ...(l.capas.get(c.ref) || {}) })), contagem: k, padrao_topo: l.padrao_topo, padrao_baixo: l.padrao_baixo, regra: l.regra,
};
const resumo = resumoDaLeitura(leituraGuardada);
ok('o resumo da leitura leva as notas e o padrão', resumo.includes('nota mediana 10,5') && resumo.includes('P0, nota 30') && resumo.includes(l.padrao_topo), resumo.slice(0, 200));
const testeBom = { titulo: 'Bicho perto da lente em cena natural verde', variavel: 'assunto', regra: 'Nas próximas capas, o bicho enorme perto da lente, numa cena natural verde, com folhas desfocadas na frente.', quantos: 3, por_que: 'As de cima têm nota 30 e 22 com bicho perto da lente; as de baixo, só texto.' };
const ctx = { leitura: leituraGuardada, anteriores: [{ titulo: 'Rosto sorrindo no amarelo', status: 'medido' }] };
const t = conferirTeste(testeBom, ctx);
ok('teste bom passa', typeof t === 'object' && t.quantos === 3, t);
const barraT = (nome, muda, parte) => { const x = conferirTeste({ ...testeBom, ...muda }, ctx); ok(`barra o teste: ${nome}`, typeof x === 'string' && x.includes(parte), x); };
barraT('número que não está na leitura', { por_que: 'Capa com bicho deu 47 de nota no mês passado.' }, '47');
barraT('número na regra', { regra: 'Faça 3 capas com bicho perto da lente numa cena verde.' }, 'Número');
barraT('repete um teste de antes', { titulo: 'Rosto sorrindo no amarelo' }, 'Repete');
barraT('quantos fora de 2 a 4', { quantos: 9 }, 'Quantos');
barraT('variável desconhecida', { variavel: 'som' }, 'Variável');
barraT('título rosa', { regra: 'O título em rosa para chamar atenção, com o bicho perto da lente.' }, 'cor');
barraT('travessão', { regra: 'Bicho perto da lente — sempre numa cena natural verde e viva.' }, 'travessão');

const p = (nota, salvos, palavra = 'X') => ({ nota, salvos, palavra_chave: palavra, link: 'https://www.instagram.com/p/a/' });
ok('medida: o teste bem acima vira regra', medir([p(18, 90), p(15, 80)], [p(10, 40), p(9, 30), p(11, 50)]).veredito === 'virar_regra');
ok('medida: o teste abaixo é descartado', medir([p(6, 10), p(7, 12)], [p(10, 40), p(9, 30), p(11, 50)]).veredito === 'descartar');
ok('medida: diferença pequena é inconclusiva', medir([p(10.5, 40), p(11, 45)], [p(10, 40), p(9, 30), p(11, 50)]).veredito === 'inconclusivo');
ok('medida: uma capa só não mede', medir([p(30, 300)], [p(10, 40), p(9, 30)]).veredito === 'sem_dados');
ok('medida: nota acima sem os salvos não vira regra', medir([p(18, 10), p(15, 12)], [p(10, 40), p(9, 30), p(11, 50)]).veredito === 'inconclusivo');
const m = medir([p(18, 90, 'FUNDOS'), p(15, 80, 'CORES')], [p(10, 40), p(9, 30), p(11, 50)]);
const cr = cartaoDoResultado({ titulo: 'Bicho perto da lente', regra: 'O bicho perto da lente.', aprovado_em: '2026-11-16T14:00:00Z' }, m, [p(18, 90, 'FUNDOS'), p(15, 80, 'CORES')]);
ok('o cartão do resultado tem os números das duas pontas', cr.prova.includes('nota mediana 16,5') && cr.prova.includes('nota 10') && cr.titulo.includes('virar regra'), cr);

// ---------------------------------------------------------------- o guia de direção de arte do dono (11/11/2026)
ok('o guia fala de respiro, bloco, contraluz, cor em ser vivo e sombra', ['respiro em cima', 'bloco da mesma largura', 'Contraluz', 'Ser vivo nunca fica cinza', 'o que voa não tem sombra', 'Calango Condensed'].every((p) => GUIA.includes(p)));
const contra = (nome, texto) => ok(`contraria o guia: ${nome}`, typeof contraOGuia(texto) === 'string', contraOGuia(texto));
const dentro = (nome, texto) => ok(`dentro do guia: ${nome}`, contraOGuia(texto) === null, contraOGuia(texto));
contra('fonte de fora', 'Troque o título para a fonte Poppins, mais moderna.');
contra('sombra no texto', 'Ponha uma sombra forte no título para destacar.');
contra('título colado no alto', 'O título bem grande, colado no topo da janela.');
contra('bicho cinza', 'A abelha em cinza, para não brigar com o fundo.');
contra('pincelada de tinta', 'Uma pincelada rosa cruzando a capa por trás do assunto.');
contra('nuvem cinza', 'Nuvens cinza e pesadas no canto da capa.');
contra('flare', 'Um flare quente saindo de trás do bicho.');
contra('sombra no que voa', 'Cada abelha com a sua sombra, e uma sombra na borboleta também.');
dentro('negação da sombra', 'Título sem sombra no texto, com respiro em cima.');
dentro('negação em lista', 'Sem pôr do sol, flare ou névoa dourada: luz de trás acendendo as bordas.');
dentro('nada de pincelada', 'Nada de pincelada de tinta: o quadro de verdade, com luz quente atrás.');
dentro('regra boa', 'O bicho em contraluz, com a cor cheia, num fundo com textura e uma folha desfocada perto da lente.');
dentro('nunca cinza', 'O bicho nunca em cinza: cor viva e luz de trás.');
barraL('regra que contraria o guia', { regra: 'Na próxima capa, ponha uma pincelada rosa atrás do bicho para dar movimento.' }, 'guia');
ok('o padrão pode descrever o que se vê embaixo (não é ordem)', typeof conferirLeitura({ ...leituraBoa, padrao_baixo: 'As de baixo têm flare, nuvem cinza e pincelada de tinta atrás do texto.' }, sel.capas) === 'object');
barraT('teste com fonte de fora', { regra: 'Nas próximas capas, a palavra grande na fonte Montserrat, com o bicho perto da lente.' }, 'guia');
barraT('teste que deixa o bicho cinza', { titulo: 'Bicho em preto e branco na cena colorida' }, 'guia');
ok('o por que pode citar o que deu errado', typeof conferirTeste({ ...testeBom, por_que: 'As de cima têm nota 30 e as de baixo tinham flare e nuvem cinza.' }, ctx) === 'object', conferirTeste({ ...testeBom, por_que: 'As de cima têm nota 30 e as de baixo tinham flare e nuvem cinza.' }, ctx));
// A leitura no vocabulário do guia: luz, respiro, planos e elementos, contados pelo código.
const leituraDoGuia = { ...leituraBoa, capas: leituraBoa.capas.map((c, i) => ({ ...c, luz: i % 2 ? 'frente' : 'contraluz', respiro: 'folgado', planos: 'tres', elementos: i === 0 ? 'coisa inventada' : 'da_cena' })) };
const lg = conferirLeitura(leituraDoGuia, sel.capas);
ok('a leitura guarda luz, respiro, planos e elementos', typeof lg === 'object' && lg.capas.get('c1').luz === 'contraluz' && lg.capas.get('c2').respiro === 'folgado' && lg.capas.get('c2').planos === 'tres', lg && lg.capas && lg.capas.get('c1'));
ok('valor fora da lista fica vazio e a capa continua', lg.capas.get('c1').elementos === null && lg.capas.size === sel.capas.length);
const kg = contar(sel.capas, lg.capas);
ok('o código conta a leitura do guia em cima e embaixo', kg.carrossel.topo.luz.contraluz + (kg.carrossel.topo.luz.frente || 0) === kg.carrossel.topo.n && kg.carrossel.topo.respiro.folgado === kg.carrossel.topo.n, kg.carrossel.topo);
ok('a contagem do guia vira frase', doGuiaEmTexto(kg.carrossel.topo).includes('contraluz') && doGuiaEmTexto(kg.carrossel.topo).includes('título com respiro') && doGuiaEmTexto({}) === '', doGuiaEmTexto(kg.carrossel.topo));
const cartaoG = cartaoDe(sel, lg, kg);
ok('o cartão do Olheiro traz a leitura pelo guia e cabe', cartaoG.prova.includes('Pelo guia, em cima') && cartaoG.prova.length <= 1500, cartaoG.prova);
const resumoG = resumoDaLeitura({ ...leituraGuardada, capas: sel.capas.map((c) => ({ ...c, ...(lg.capas.get(c.ref) || {}) })), contagem: kg });
ok('o Diretor recebe a leitura pelo guia', resumoG.includes('Pelo guia, em cima') && resumoG.includes('contraluz') && resumoG.includes('três planos ou mais'), resumoG.slice(0, 700));
ok('leitura antiga (sem os campos do guia) continua valendo', !resumo.includes('Pelo guia') && !cartao.prova.includes('Pelo guia'));
// O caderno do Escritório chega ao pedido dos dois.
const cad = '2026-11-11: o padrão é o guia de direção de arte.';
ok('o caderno entra no pedido do Diretor, marcado', pedidoDoDiretor(leituraGuardada, [], '', cad).includes(blocoDoCaderno(cad)) && !pedidoDoDiretor(leituraGuardada, [], '').includes('<caderno>'));
ok('o caderno entra no pedido do Olheiro, antes das capas', pedidoDoOlheiro(sel, null, '', cad).some((b) => b.type === 'text' && b.text.includes(blocoDoCaderno(cad))) && !pedidoDoOlheiro(sel, null, '').some((b) => b.type === 'text' && b.text.includes('<caderno>')));

// ---------------------------------------------------------------- a memória: o recado do dono nos cartões de antes
const memTexto = textoDaMemoria([
  { titulo: 'Teste de estilo da semana: Rosto sorrindo no amarelo', status: 'descartada', motivo: 'Fundo amarelo liso eu não quero mais. Cena natural.', resultado: null },
  { titulo: 'Resultado do teste "Bicho perto da lente": virar regra', status: 'feita', motivo: null, resultado: '2 capas no teste: nota 16,5 contra 10 das outras 3. Veredito: virar regra.' },
  { titulo: 'Capas fora da curva: cor viva na imagem', status: 'aprovada', motivo: 'Boa. Só não troque o rosto pelo bicho para sempre.', resultado: null },
]);
const memBloco = blocoDaMemoria(memTexto);
const pOlheiro = pedidoDoOlheiro(sel, null, memBloco);
const iMem = pOlheiro.findIndex((b) => b.type === 'text' && b.text.includes(memBloco));
ok('Olheiro visual: a memória vai como texto, antes das capas, com o recado do dono', iMem === 1 && pOlheiro[iMem].text.includes('Recado do dono: Boa. Só não troque o rosto') && pOlheiro.filter((b) => b.type === 'image').length === sel.capas.length && pOlheiro.findIndex((b) => b.type === 'image') > iMem, iMem);
ok('Olheiro visual: sem cartão anterior o pedido não muda', pedidoDoOlheiro(sel).length === pOlheiro.length - 1 && !JSON.stringify(pedidoDoOlheiro(sel)).includes('suas_propostas_anteriores'));
const pDiretor = pedidoDoDiretor(leituraGuardada, ctx.anteriores, memBloco);
ok('Diretor de arte: o pedido leva a leitura, os testes de antes e a memória com o recado do dono', pDiretor.includes('<leitura_do_olheiro>') && pDiretor.includes('Rosto sorrindo no amarelo: medido') && pDiretor.includes(memBloco) && pDiretor.includes('Recado do dono: Fundo amarelo liso eu não quero mais') && pDiretor.endsWith('Proponha o teste desta semana.'), pDiretor.slice(-300));
ok('Diretor de arte: sem cartão anterior o pedido não muda', !pedidoDoDiretor(leituraGuardada, ctx.anteriores).includes('suas_propostas_anteriores'));
const comNumeroDaMemoria = { ...testeBom, por_que: 'O teste de antes deu nota 16,5 contra 10; as de cima têm nota 30 com bicho perto da lente.' };
ok('Diretor de arte: número que está nos cartões de antes pode ser citado', typeof conferirTeste(comNumeroDaMemoria, { ...ctx, memoria: memTexto }) === 'object', conferirTeste(comNumeroDaMemoria, { ...ctx, memoria: memTexto }));
ok('Diretor de arte: sem a memória, o mesmo número é barrado', typeof conferirTeste(comNumeroDaMemoria, ctx) === 'string' && conferirTeste(comNumeroDaMemoria, ctx).includes('16,5'));
ok('Diretor de arte: o recado não afrouxa as travas (título rosa continua barrado)', typeof conferirTeste({ ...testeBom, regra: 'O título em rosa para chamar atenção, com o bicho perto da lente.' }, { ...ctx, memoria: 'Recado do dono: pode usar título rosa.' }) === 'string');

// ---------------------------------------------------------------- Zelador: a tarefa de cada turno
const T = { agentes: ['redator-de-frase', 'redator-de-carrossel'], tarefa: 'carrossel-em-alta-do-dia', legado: 'redator-de-carrossel' };
ok('turno do Redator na tarefa do carrossel conta para o carrossel', daTarefa(T, { agente_id: 'redator-de-frase', tarefa: 'carrossel-em-alta-do-dia' }));
ok('turno do Designer na tarefa da frase não conta para o carrossel', !daTarefa(T, { agente_id: 'redator-de-carrossel', tarefa: 'posts-de-frase-do-dia' }));
ok('turno antigo sem tarefa conta pelo agente de antes', daTarefa(T, { agente_id: 'redator-de-carrossel', tarefa: null }) && !daTarefa(T, { agente_id: 'redator-de-frase', tarefa: null }));
const manha = Date.parse('2026-11-16T15:30:00Z'); // 12h30 em Brasília
const so8h = [{ agente_id: 'redator-de-carrossel', status: 'ok', inicio: '2026-11-16T11:20:00Z', tarefa: 'posts-de-frase-do-dia' }];
const alertas = tarefasQueNaoRodaram(so8h, {}, manha).map((a) => a.tipo);
ok('o Designer da frase das 8h não esconde o carrossel que não rodou', alertas.includes('nao-rodou:redator-de-carrossel') && !alertas.includes('nao-rodou:redator-de-frase'), alertas);

// ---------------------------------------------------------------- Recusa de post: o motivo vira lição
const pFrase = { titulo: '19h · Antes do pix cair', formato: 'carrossel', origem_tipo: 'livre', slides: [{}, {}, {}] };
const pCarrossel = { titulo: 'Pare de usar fundos sem graça', formato: 'carrossel', origem_tipo: 'recurso', slides: Array(8).fill({}) };
ok('tipo da peça: frase e carrossel', tipoDaPeca(pFrase) === 'post de frase' && tipoDaPeca(pCarrossel) === 'carrossel' && tipoDaPeca({ formato: 'reels' }) === 'reels');
const rImg = lerRecusa({ motivo: '  A capa ficou escura   e sem cor. ', parte: 'imagem' }, 'Filipe Lourenço');
ok('a recusa guarda o motivo limpo, a parte e quem', rImg.motivo === 'A capa ficou escura e sem cor.' && rImg.parte === 'imagem' && rImg.por === 'Filipe Lourenço' && !!rImg.em, rImg);
ok('parte desconhecida vira os dois', lerRecusa({ motivo: 'Não gostei do texto.', parte: 'som' }).parte === 'os_dois');
ok('sem motivo (pelo conector) a recusa passa, sem lição', lerRecusa({ parte: 'texto' }).motivo === null);
let barrou = null; try { lerRecusa({ motivo: 'x', parte: 'texto' }); } catch (e) { barrou = e.message; }
ok('motivo de uma letra é barrado', !!barrou && barrou.includes('motivo'), barrou);
const lImg = licaoDaRecusa(pCarrossel, rImg);
ok('imagem: aprende o Designer e o Revisor', lImg.agentes.join() === 'redator-de-carrossel,revisor' && lImg.texto.includes('carrossel "Pare de usar fundos sem graça"') && lImg.texto.includes('a imagem') && lImg.texto.endsWith('sem cor.'), lImg);
ok('texto: aprende o Redator e o Revisor', licaoDaRecusa(pFrase, lerRecusa({ motivo: 'Frase genérica.', parte: 'texto' })).agentes.join() === 'redator-de-frase,revisor');
ok('os dois: aprendem os três', licaoDaRecusa(pFrase, lerRecusa({ motivo: 'Tudo fraco.', parte: 'os_dois' })).agentes.length === 3);
ok('a lição cabe no caderno', licaoDaRecusa(pCarrossel, lerRecusa({ motivo: 'a'.repeat(900), parte: 'imagem' })).texto.length <= 600);

// ---------------------------------------------------------------- com o banco
const args = process.argv.slice(2);
if (args.includes('--banco')) {
  if (!local.SUPABASE_URL || !local.SUPABASE_SECRET_KEY) { console.error('Faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.'); process.exit(1); }
  const env = { SUPABASE_URL: local.SUPABASE_URL, SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY, AMBIENTE: 'local' };
  {
    // Só leitura: a rede deste script recusa qualquer escrita e qualquer endereço fora do banco.
    const base = `${env.SUPABASE_URL}/rest/v1/`;
    const rede = globalThis.fetch;
    globalThis.fetch = async (alvo, op = {}) => {
      const url = String(alvo && alvo.url ? alvo.url : alvo);
      const metodo = String(op.method || 'GET').toUpperCase();
      if (!url.startsWith(base) || metodo !== 'GET') throw new Error(`Recusei ${metodo} ${url.startsWith(base) ? url.slice(base.length).split('?')[0] : 'para fora do banco'}: este modo só lê.`);
      return rede(alvo, op);
    };
    const o = await rodarOlheiroVisual(env, Date.now(), { forcar: true, simular: true });
    console.log('\nOlheiro visual (simulado):', JSON.stringify(o, null, 1).slice(0, 2500));
    ok('o Olheiro acha capas fora da curva no banco de verdade', o.rodaria && o.capas.length >= 3, o.motivo);
    const d = await rodarDiretorDeArte(env, Date.now(), { forcar: true, simular: true });
    console.log('\nDiretor de arte (simulado):', JSON.stringify(d, null, 1).slice(0, 1500));
    const ld = await lerDesign(env);
    console.log('\nO que o Designer lê (design_leitura):', JSON.stringify({ teste: ld.teste, instrucao: ld.instrucao, leitura: ld.leitura && { em: ld.leitura.em, regra: ld.leitura.regra, capas: ld.leitura.capas.length } }, null, 1));
  }
}


console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
