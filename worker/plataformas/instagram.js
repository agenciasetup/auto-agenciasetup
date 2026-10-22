// Módulo Instagram. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'instagram',
  nome: 'Instagram',
  cor: '#E1306C',
  formatos: ['carrossel', 'post', 'story', 'reels'],
  descricao: 'Carrosséis, posts, stories e Reels no perfil profissional.',
  requisitos: ['Conta profissional (Empresa ou Criador de conteúdo) no Instagram', 'App na Meta (developers.facebook.com) com o produto Instagram e a permissão de publicar conteúdo', 'Quem conecta precisa ter função no app enquanto ele estiver em modo de desenvolvimento'],
  segredos: ['META_APP_ID', 'META_APP_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Instagram não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 2200) return 'A legenda passa do limite de 2200 caracteres do Instagram.';
    return null;
  },
};
