// Módulo Pinterest. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'pinterest',
  nome: 'Pinterest',
  cor: '#E60023',
  formatos: ['post', 'video'],
  descricao: 'Pins com imagem ou vídeo levando para os recursos do site.',
  requisitos: ['Conta empresarial no Pinterest', 'App no Pinterest Developers com acesso de escrita'],
  segredos: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Pinterest não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 500) return 'A legenda passa do limite de 500 caracteres do Pinterest.';
    return null;
  },
};
