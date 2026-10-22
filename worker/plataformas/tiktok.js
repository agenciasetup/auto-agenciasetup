// Módulo TikTok. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'tiktok',
  nome: 'TikTok',
  cor: '#FE2C55',
  formatos: ['video', 'carrossel'],
  descricao: 'Vídeos e carrosséis de foto no TikTok.',
  requisitos: ['App no TikTok for Developers com a Content Posting API', 'Para publicar direto (sem rascunho no app), a TikTok precisa auditar o app'],
  segredos: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `TikTok não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 2200) return 'A legenda passa do limite de 2200 caracteres do TikTok.';
    return null;
  },
};
