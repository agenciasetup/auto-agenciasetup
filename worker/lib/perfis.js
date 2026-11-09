// Os perfis da agência nas redes (pedido do dono em 29/10/2026): o Brasil (@agenciasetup, em português) e o
// internacional (@setupagency_eng, em inglês), com os mesmos posts traduzidos e o curso vendido em dólar.
// Cada conta conectada, peça, palavra do "Comenta X" e post importado é de um perfil (coluna `perfil`). O padrão é
// 'br', então tudo o que existia antes continua no perfil do Brasil.
// O perfil diz o idioma (posts, directs, respostas da IA), a oferta do fim do funil (config) e o site para onde os
// links levam. O site em inglês é a marca do curso em inglês (cursos.marca.dominio); sem domínio no ar, fica no
// SITE_URL_EN (computador) ou no endereço planejado.
import { urlDaMarca } from './marcas.js';

export const PERFIS = {
  br: { id: 'br', nome: 'Agência Setup', rotulo: 'Brasil', idioma: 'pt', moeda: 'brl', oferta: 'oferta', dominio: 'agenciasetup.com.br' },
  en: { id: 'en', nome: 'Setup Agency', rotulo: 'Inglês', idioma: 'en', moeda: 'usd', oferta: 'oferta_en', dominio: 'agenciasetup.com' },
};
export const IDS_PERFIS = Object.keys(PERFIS);

// Valor de fora (painel, conector): o que não for um perfil conhecido vira o do Brasil.
export const perfilValido = (p) => (PERFIS[p] ? p : 'br');
export const perfilDe = (p) => PERFIS[perfilValido(p)];
export const idiomaDe = (p) => perfilDe(p).idioma;

// O endereço do site de um perfil, sem barra no fim. O do Brasil é o SITE_URL; o em inglês, o da marca.
export function siteDoPerfil(env, p) {
  if (perfilValido(p) === 'br') return (env.SITE_URL || 'https://agenciasetup.com.br').replace(/\/+$/, '');
  if (env.SITE_URL_EN) return env.SITE_URL_EN.replace(/\/+$/, '');
  return urlDaMarca(env, PERFIS.en.dominio);
}
