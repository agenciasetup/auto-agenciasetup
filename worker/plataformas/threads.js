// Módulo Threads. Contrato em worker/plataformas/LEIA.md.
// Ainda não conecta nem publica (disponivel: false): o painel mostra "Em breve" e a fila avisa na peça em vez de publicar.
export default {
  id: 'threads',
  nome: 'Threads',
  cor: '#101010',
  formatos: ['texto', 'post', 'carrossel'],
  descricao: 'Textos, imagens e carrosséis no perfil do Threads.',
  requisitos: ['Perfil no Threads ligado ao Instagram da agência', 'App na Meta com o produto Threads API'],
  segredos: ['THREADS_APP_ID', 'THREADS_APP_SECRET'],
  disponivel: false,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Threads não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 500) return 'A legenda passa do limite de 500 caracteres do Threads.';
    return null;
  },
};
