// Confere os chamados de suporte (worker/lib/chamados.js) sem banco e sem IA: a parte do código que decide se o
// Atendente abre um chamado e com quais dados. A regra: e-mail e telefone só entram se a pessoa escreveu de verdade.
// Uso: node scripts/conferir-chamados.mjs
import { emailDe, lerChamadoDaIa, telefoneDe } from '../worker/lib/chamados.js';

let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra ? `  ${extra}` : ''}`); if (!ok) falhas += 1; };

const conversa = 'oi comprei o combo e perdi o acesso meu email é Maria.Souza@Exemplo.com.br, e meu zap (11) 90000-0000';
const pedido = (m = {}) => ({ abrir: true, curso: 'Combo Black Calango', email: 'maria.souza@exemplo.com.br', telefone: '(11) 90000-0000', nome: 'Maria', problema: 'Comprou o combo e perdeu o acesso', ...m });

let c = lerChamadoDaIa(pedido(), conversa);
confere('com o problema contado, o chamado abre com os dados dela', !!c && c.curso === 'Combo Black Calango' && c.nome === 'Maria' && /perdeu o acesso/.test(c.problema));
confere('o e-mail entra como ela escreveu, em minúsculas', c.email === 'maria.souza@exemplo.com.br');
confere('o telefone entra só com os números', c.telefone === '11900000000');

c = lerChamadoDaIa(pedido({ email: 'outra@inventado.com', telefone: '11988887777' }), conversa);
confere('e-mail que ela não escreveu fica de fora', !!c && c.email === '');
confere('telefone que ela não escreveu fica de fora', !!c && c.telefone === '');

confere('sem "abrir", não tem chamado', lerChamadoDaIa(pedido({ abrir: false }), conversa) === null);
confere('"abrir" que não é true de verdade não abre', lerChamadoDaIa(pedido({ abrir: 'true' }), conversa) === null);
confere('sem o problema, não tem chamado', lerChamadoDaIa(pedido({ problema: ' ' }), conversa) === null);
confere('decisão sem o campo (IA antiga ou resposta pronta) não quebra', lerChamadoDaIa(undefined, conversa) === null && lerChamadoDaIa(null) === null && lerChamadoDaIa('x') === null);

c = lerChamadoDaIa(pedido({ curso: '', email: '', telefone: '', nome: '' }), 'perdi meu acesso');
confere('chamado sem curso nem contato abre do mesmo jeito (o time tem o @)', !!c && c.curso === '' && c.email === '' && c.telefone === '');

c = lerChamadoDaIa(pedido({ problema: `Ela — disse ${'x'.repeat(600)}`, curso: 'a'.repeat(300), nome: 'n'.repeat(200) }), conversa);
confere('os textos são cortados no tamanho da tabela e sem travessão', c.problema.length <= 400 && c.curso.length <= 160 && c.nome.length <= 80 && !/[—–]/.test(c.problema));

confere('acha o e-mail no meio da frase', emailDe('é fulano.silva+curso@site.com.br, ok?') === 'fulano.silva+curso@site.com.br' && emailDe('sem email aqui') === '');
confere('acha o telefone e ignora número curto', telefoneDe('me chama no +55 (11) 90000-0000 pfv') === '5511900000000' && telefoneDe('paguei 39,90 em 2 vezes') === '');

console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
