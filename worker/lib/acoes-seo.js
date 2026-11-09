// A tela SEO do painel e o ver_seo do conector (fase C de docs/seo-geo.md): os números do Google Search Console,
// importados todo dia pela conta robô (lib/searchconsole.js), e as oportunidades que viram pauta.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { prepararIntegracoes } from './integracoes.js';
import { ENDERECO_DO_SITE, SITES, contaGuardada, importarDaVez, oportunidades } from './searchconsole.js';

const soma = (l, k) => l.reduce((n, x) => n + (x[k] || 0), 0);
// Totais de um período: CTR e posição ponderados pelas impressões (como o Search Console faz).
function totais(dias) {
  const imp = soma(dias, 'impressoes');
  const cli = soma(dias, 'cliques');
  return { cliques: cli, impressoes: imp, ctr: imp ? cli / imp : 0, posicao: imp ? dias.reduce((n, d) => n + (d.posicao || 0) * (d.impressoes || 0), 0) / imp : null };
}

export async function verSeo(x, { site } = {}) {
  exigir(x.u, 'conteudo.ver');
  await prepararIntegracoes(x.env);
  const s = SITES.includes(site) ? site : SITES[0];
  const [dias, itens, marca] = await Promise.all([
    db.select(x.env, 'seo_dias', { filtros: { site: `eq.${s}` }, ordem: 'dia.asc', limite: 120 }),
    db.select(x.env, 'seo_itens', { filtros: { site: `eq.${s}` }, select: 'tipo,consulta,pagina,cliques,impressoes,ctr,posicao,inicio,fim', ordem: 'impressoes.desc', limite: 8000 }),
    db.um(x.env, 'config', { chave: 'eq.seo_importacao' }),
  ]);
  const conta = contaGuardada(x.env);
  // Os últimos 28 dias com dado contra os 28 antes.
  const ult = dias.slice(-28);
  const ant = dias.slice(-56, -28);
  const base = ENDERECO_DO_SITE[s];
  const semDominio = (u) => (u && u.startsWith(base) ? u.slice(base.length) || '/' : u);
  return {
    site: s, sites: SITES,
    conectado: !!conta, conta: conta ? conta.email : null,
    importacao: (marca && marca.valor && marca.valor[s]) || null,
    periodo: itens[0] ? { inicio: itens[0].inicio, fim: itens[0].fim } : null,
    atual: totais(ult), anterior: ant.length >= 14 ? totais(ant) : null,
    serie: dias.slice(-90).map((d) => ({ dia: d.dia, cliques: d.cliques, impressoes: d.impressoes })),
    paginas: itens.filter((i) => i.tipo === 'pagina').slice(0, 100).map((i) => ({ ...i, pagina: semDominio(i.pagina) })),
    consultas: itens.filter((i) => i.tipo === 'consulta').slice(0, 200),
    oportunidades: oportunidades(itens),
  };
}

// "Importar agora" (painel) e importar_seo (conector): o site pedido, já, mesmo que tenha importado hoje.
export async function importarSeoAgora(x, { site } = {}) {
  exigir(x.u, 'conteudo.publicar');
  await prepararIntegracoes(x.env);
  if (!contaGuardada(x.env)) throw new Erro(400, 'Ligue a conta robô antes: Integrações > Google Search Console.');
  const r = await importarDaVez(x.env, Date.now(), { forcar: true, site: SITES.includes(site) ? site : SITES[0] });
  await auditar(x.env, x.u, 'seo.importar', `config:seo_importacao`, { site: r.site, erro: r.erro || null });
  if (r.erro) throw new Erro(400, r.erro);
  return r;
}

// Uma oportunidade vira pauta (o Claude ou a equipe escrevem o artigo a partir dela).
export async function oportunidadeParaPauta(x, { consulta, tipo, motivo, acao, pagina }) {
  exigir(x.u, 'pautas.editar');
  const c = String(consulta || '').trim().slice(0, 120);
  if (!c) throw new Erro(400, 'Falta a busca.');
  const titulo = (tipo === 'nova' ? `Artigo para a busca "${c}"` : tipo === 'titulo' ? `Título e resumo para "${c}"` : `Reforçar a página de "${c}"`).slice(0, 200);
  const ja = await db.um(x.env, 'pautas', { titulo: `eq.${titulo}`, status: 'eq.nova' });
  if (ja) return { ...ja, ja_existia: true };
  const [p] = await db.insert(x.env, 'pautas', { titulo, resumo: [motivo, acao, pagina ? `Página hoje: ${pagina}` : ''].filter(Boolean).join(' ').slice(0, 1000), fonte_nome: 'Search Console', tags: ['seo', tipo || 'seo'], status: 'nova' });
  await auditar(x.env, x.u, 'criar', `pautas:${p.id}`, { origem: 'search_console' });
  return p;
}
