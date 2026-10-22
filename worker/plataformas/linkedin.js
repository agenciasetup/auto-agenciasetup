// Módulo LinkedIn. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'linkedin',
  nome: 'LinkedIn',
  cor: '#0A66C2',
  formatos: ['texto', 'post', 'carrossel', 'video'],
  descricao: 'Posts no perfil ou na Página da empresa.',
  requisitos: ['App no LinkedIn Developers com o produto Share on LinkedIn (perfil) ou Community Management API (Página)'],
  segredos: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `LinkedIn não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 3000) return 'A legenda passa do limite de 3000 caracteres do LinkedIn.';
    return null;
  },
};
