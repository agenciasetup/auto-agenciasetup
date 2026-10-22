// Módulo YouTube. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'youtube',
  nome: 'YouTube',
  cor: '#FF0000',
  formatos: ['short', 'video'],
  descricao: 'Shorts e vídeos no canal.',
  requisitos: ['Projeto no Google Cloud com a YouTube Data API v3 ligada', 'Tela de consentimento OAuth configurada (até a verificação do Google, o vídeo pode subir como privado)'],
  segredos: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `YouTube não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 5000) return 'A legenda passa do limite de 5000 caracteres do YouTube.';
    return null;
  },
};
