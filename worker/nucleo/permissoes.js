// O que cada cargo pode fazer. Um lugar só: o painel, a API e o conector do Claude perguntam aqui.
// Modelo: worker/nucleo/permissoes.js do olharondoniense, com os cargos da agência.
//
// Administrador  tudo: equipe, configurações, conectar redes, chaves de todos.
// Editor         publica conteúdo, aprova e agenda peças, cuida de cursos e anúncios.
// Redator        cria e edita rascunhos (conteúdo, peças, pautas). Não publica nem aprova.
// Suporte        atende os alunos da área de membros: vê alunos e a tela Suporte (quem travou), reenvia acesso e libera matrícula. Não vê faturamento nem reembolsa.

export const PAPEIS = ['administrador', 'editor', 'redator', 'suporte'];
export const NOME_PAPEL = { administrador: 'Administrador', editor: 'Editor', redator: 'Redator', suporte: 'Suporte' };
const NIVEL = { administrador: 3, editor: 2, redator: 1, suporte: 1 };

const T = ['administrador', 'editor', 'redator'];
const TS = [...T, 'suporte'];
const AE = ['administrador', 'editor'];
const AES = ['administrador', 'editor', 'suporte'];
const A = ['administrador'];

export const REGRAS = {
  'painel.ver': TS,
  'alunos.ver': AES,
  'alunos.editar': AES,
  'suporte.ver': AES,
  'suporte.atender': AES,
  'vendas.ver': AE,
  'vendas.reembolsar': A,
  'ofertas.editar': AE,
  'pagamentos.configurar': A,
  'integracoes.configurar': A,
  'comunidade.ver': AES,
  'comunidade.editar': AES,
  'comunicacao.editar': AE,
  'ia.ver': AE,
  'numeros.ver': AE,
  'relatorio.gerar': AE,
  'recuperar.ver': AES,
  'recuperar.editar': AES,
  'followup.ver': AES,
  'followup.editar': AES,
  'followup.atendente': AE,
  'colmeia.ver': AES,
  'colmeia.editar': AE,
  'plano.ver': AE,
  'plano.gerar': AE,
  'escritorio.ver': AE,
  'escritorio.editar': AE,
  'escritorio.trabalhar': AE,
  'escritorio.decidir': AE,
  'conteudo.ver': T,
  'conteudo.editar': T,
  'conteudo.publicar': AE,
  'pecas.ver': T,
  'pecas.editar': T,
  'pecas.aprovar': AE,
  'pautas.ver': T,
  'pautas.editar': T,
  'desempenho.ver': T,
  'gatilhos.ver': T,
  'gatilhos.editar': T,
  'gatilhos.ativar': AE,
  'cursos.ver': TS,
  'cursos.editar': AE,
  'arquivos.enviar': T,
  'redes.ver': T,
  'redes.conectar': A,
  'equipe.ver': AE,
  'equipe.editar': A,
  'config.editar': A,
  'historico.ver': AE,
  'chaves.proprias': TS,
  'chaves.todas': A,
};

export function pode(papel, acao) {
  return !!(REGRAS[acao] && REGRAS[acao].includes(papel));
}

export function permissoes(papel) {
  return Object.keys(REGRAS).filter((a) => pode(papel, a));
}

export function menorPapel(a, b) {
  return NIVEL[a] <= NIVEL[b] ? a : b;
}

export function acimaOuIgual(a, b) {
  return (NIVEL[a] || 0) >= (NIVEL[b] || 0);
}

export const DESCRICAO_PAPEL = {
  administrador: 'Faz tudo, inclusive equipe, configurações e conectar as redes.',
  editor: 'Publica conteúdo no site, aprova e agenda os posts das redes, liga o "Comenta X", cuida de cursos e anúncios.',
  redator: 'Cria e edita rascunhos de conteúdo, posts, pautas e palavras do "Comenta X". Não publica, não aprova e não liga DM.',
  suporte: 'Atende os alunos: vê quem comprou, reenvia o acesso e libera matrícula. Não vê faturamento nem faz reembolso.',
};
