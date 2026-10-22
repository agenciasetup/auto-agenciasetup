// O que cada cargo pode fazer. Um lugar só: o painel, a API e o conector do Claude perguntam aqui.
// Modelo: worker/nucleo/permissoes.js do olharondoniense, com os cargos da agência.
//
// Administrador  tudo: equipe, configurações, conectar redes, chaves de todos.
// Editor         publica conteúdo, aprova e agenda peças, cuida de cursos e anúncios.
// Redator        cria e edita rascunhos (conteúdo, peças, pautas). Não publica nem aprova.

export const PAPEIS = ['administrador', 'editor', 'redator'];
export const NOME_PAPEL = { administrador: 'Administrador', editor: 'Editor', redator: 'Redator' };
const NIVEL = { administrador: 3, editor: 2, redator: 1 };

const T = ['administrador', 'editor', 'redator'];
const AE = ['administrador', 'editor'];
const A = ['administrador'];

export const REGRAS = {
  'painel.ver': T,
  'conteudo.ver': T,
  'conteudo.editar': T,
  'conteudo.publicar': AE,
  'pecas.ver': T,
  'pecas.editar': T,
  'pecas.aprovar': AE,
  'pautas.ver': T,
  'pautas.editar': T,
  'cursos.ver': T,
  'cursos.editar': AE,
  'arquivos.enviar': T,
  'redes.ver': T,
  'redes.conectar': A,
  'equipe.ver': AE,
  'equipe.editar': A,
  'config.editar': A,
  'historico.ver': AE,
  'chaves.proprias': T,
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
  editor: 'Publica conteúdo no site, aprova e agenda os posts das redes, cuida de cursos e anúncios.',
  redator: 'Cria e edita rascunhos de conteúdo, posts e pautas. Não publica nem aprova.',
};
