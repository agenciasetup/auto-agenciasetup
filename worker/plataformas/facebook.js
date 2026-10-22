// Módulo Facebook. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'facebook',
  nome: 'Facebook',
  cor: '#1877F2',
  formatos: ['post', 'carrossel', 'reels', 'video'],
  descricao: 'Posts, fotos e Reels na Página da agência.',
  requisitos: ['Página do Facebook com acesso de administrador', 'O mesmo app da Meta do Instagram, com as permissões de Página'],
  segredos: ['META_APP_ID', 'META_APP_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Facebook não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 63206) return 'A legenda passa do limite de 63206 caracteres do Facebook.';
    return null;
  },
};
