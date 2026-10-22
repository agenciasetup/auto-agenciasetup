// Módulo X. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'x',
  nome: 'X',
  cor: '#000000',
  formatos: ['texto', 'thread', 'post'],
  descricao: 'Posts e threads no perfil do X.',
  requisitos: ['Conta de desenvolvedor no X (developer.x.com) com plano que permite publicar', 'App com OAuth 2.0 e permissão de leitura e escrita'],
  segredos: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `X não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 25000) return 'A legenda passa do limite de 25000 caracteres do X.';
    return null;
  },
};
