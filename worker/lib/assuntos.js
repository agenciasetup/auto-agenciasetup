// Os assuntos (grupos de páginas) e os tipos dos artigos do site (fase B de docs/seo-geo.md). JavaScript puro: o site,
// o conector e o painel (admin/src/telas/Editor.tsx) usam o mesmo arquivo. O assunto vira o endereço do artigo.
export const ASSUNTOS = {
  novidades: { nome: 'Novidades', icone: 'novidades', titulo: 'O que mudou na IA', destaque: 'esta semana', lead: 'Lançamentos e mudanças nas ferramentas de IA, explicados pelo que importa no seu trabalho.' },
  ia: { nome: 'IA', icone: 'agente', titulo: 'Tudo sobre IA para', destaque: 'quem cria conteúdo', lead: 'Claude, ChatGPT, Gemini e as IAs de imagem: o que cada uma faz bem, quanto custa e como usar no Social Media e no Design.' },
  equipamentos: { nome: 'Equipamentos', icone: 'ferramenta', titulo: 'O setup de quem', destaque: 'trabalha com design', lead: 'Notebook, Mac, celular, SSD e o PC certo para criar, editar e rodar IA sem travar, do mais barato ao melhor.' },
  tutoriais: { nome: 'Tutoriais', icone: 'video', titulo: 'Tutoriais de IA', destaque: 'para posts', lead: 'Passo a passo para fazer posts, carrosséis e artes com IA, do jeito que a gente faz na agência.' },
  guias: { nome: 'Guias', icone: 'guia', titulo: 'Guias para quem', destaque: 'vive de conteúdo', lead: 'Cursos, carreira, preço de post e o que mais ajuda quem trabalha com Social Media e Design.' },
};

export const TIPOS_ARTIGO = { noticia: 'Notícia', guia: 'Guia', artigo: 'Artigo', tutorial: 'Tutorial', comparativo: 'Comparativo', review: 'Review' };
export const INTENCOES = { informacional: 'Quer aprender (como, o que é)', comparacao: 'Está comparando (x ou y, melhor)', compra: 'Vai comprar (preço, onde)', navegacao: 'Procura a marca' };

// O endereço do artigo: /novidades/<slug> ou /<assunto>/<slug>.
export const caminhoArtigo = (a) => `/${a && a.assunto && ASSUNTOS[a.assunto] ? a.assunto : 'novidades'}/${a ? a.slug : ''}`;
