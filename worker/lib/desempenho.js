// Desempenho: o relógio guarda os números dos posts da conta conectada (os feitos pelo sistema e os antigos).
// Sem perfeição: curtidas e comentários de todos; alcance, salvos e compartilhamentos quando a permissão de métricas existe.
// Plano grátis da Cloudflare: cada execução faz uma fatia pequena (poucas chamadas), o resto fica para a próxima.
import { db } from '../nucleo/db.js';
import { hoje } from '../nucleo/util.js';
import { todas } from '../plataformas/index.js';
import { avisarSeTokenMorreu, credenciaisAtivas, temRecurso } from '../plataformas/credenciais.js';
import { marcar, palavraChave } from './temas.js';
import { PERFIS, perfilValido } from './perfis.js';

const DIA = 86400_000;
export const pago = (env) => env.WORKERS_PAGO === '1';

// Contas ativas cujas redes sabem ler posts (só as de uma rede e de um perfil, se pedir).
async function contas(env, rede, perfil) {
  const leem = todas().filter((m) => m.disponivel && m.lerPosts && (!rede || m.id === rede));
  if (!leem.length) return [];
  const conexoes = await db.select(env, 'conexoes', { filtros: { status: 'eq.ativa', plataforma: `in.(${leem.map((m) => m.id).join(',')})`, ...(PERFIS[perfil] ? { perfil: `eq.${perfil}` } : {}) }, ordem: 'criado_em.asc' });
  return conexoes.map((conexao) => ({ conexao, m: leem.find((m) => m.id === conexao.plataforma) }));
}

// Plano grátis (50 chamadas por execução): o relógio cuida de uma conta por vez, em rodízio guardado em config.
// Cada conta gasta umas 10 chamadas para posts e outras tantas para métricas; três contas juntas passavam do limite.
async function umaDaVez(env, tarefa, lista) {
  if (pago(env) || lista.length <= 1) return lista;
  const chave = `vez:${tarefa}`;
  const c = await db.um(env, 'config', { chave: `eq.${chave}` });
  const i = Number((c && c.valor && c.valor.i) || 0);
  await db.insert(env, 'config', { chave, valor: { i: i + 1 } }, { upsert: true, conflito: 'chave', select: 'chave' });
  return [lista[i % lista.length]];
}

const linhaPost = (conexao, p) => {
  const t = marcar(p.legenda);
  return {
    conexao_id: conexao.id, rede: conexao.plataforma, id_na_rede: p.id_na_rede, formato: p.formato, legenda: p.legenda,
    link: p.link, miniatura_url: p.miniatura_url, publicado_em: p.publicado_em, curtidas: p.curtidas, comentarios: p.comentarios,
    palavra_chave: palavraChave(p.legenda), temas: [...t.ferramentas, ...t.temas], perfil: perfilValido(conexao.perfil),
  };
};

// Seguidores do dia + a página mais nova de posts + uma página antiga (até trazer a conta inteira).
// Com "rede", só aquela rede (o botão do painel; com "perfil", só a conta daquele perfil); sem, uma conta da vez no
// plano grátis (o relógio).
export async function sincronizarPosts(env, { rede, perfil } = {}) {
  const feitos = [];
  const lista = await contas(env, rede, perfil);
  for (const { conexao, m } of rede ? lista : await umaDaVez(env, 'posts', lista)) {
    try {
      const credenciais = await credenciaisAtivas(env, conexao);
      const conta = await m.lerConta({ credenciais });
      await db.insert(env, 'contas_dia', { conexao_id: conexao.id, dia: hoje(), seguidores: conta.seguidores, posts: conta.posts }, { upsert: true, conflito: 'conexao_id,dia', select: 'dia' });
      // Fatias pequenas: no plano grátis, 100 posts de uma vez passaram do tempo de processamento prometido.
      const novos = await m.lerPosts({ credenciais, limite: pago(env) ? 50 : 25 });
      let lote = novos.itens;
      // Os antigos vêm aos poucos: o cursor fica guardado em config até a última página.
      const chave = `posts_cursor:${conexao.id}`;
      const cursor = await db.um(env, 'config', { chave: `eq.${chave}` });
      const estado = (cursor && cursor.valor) || {};
      if (!estado.fim && (estado.depois || novos.depois)) {
        const antigos = await m.lerPosts({ credenciais, limite: pago(env) ? 100 : 50, depois: estado.depois || novos.depois });
        lote = lote.concat(antigos.itens);
        await db.insert(env, 'config', { chave, valor: { depois: antigos.depois, fim: !antigos.depois, em: new Date().toISOString() } }, { upsert: true, conflito: 'chave', select: 'chave' });
      }
      const vistos = new Set();
      const linhas = lote.filter((p) => !vistos.has(p.id_na_rede) && vistos.add(p.id_na_rede)).map((p) => linhaPost(conexao, p));
      if (linhas.length) await db.insert(env, 'posts_redes', linhas, { upsert: true, conflito: 'rede,id_na_rede', select: 'id' });
      feitos.push({ rede: conexao.plataforma, perfil: perfilValido(conexao.perfil), conta: conexao.conta_nome, seguidores: conta.seguidores, posts: linhas.length, antigos_completos: !!estado.fim });
    } catch (e) {
      await avisarSeTokenMorreu(env, conexao, e);
      console.error('desempenho posts', conexao.plataforma, e && (e.message || e));
      feitos.push({ rede: conexao.plataforma, erro: e && e.message });
    }
  }
  return feitos;
}

// Alcance, salvos e compartilhamentos: primeiro os posts recentes com número velho, depois os que nunca foram medidos.
export async function atualizarMetricas(env, { limite, rede, perfil } = {}) {
  const n = limite || (pago(env) ? 40 : 8);
  const feitos = [];
  const lista = await contas(env, rede, perfil);
  for (const { conexao, m } of rede ? lista : await umaDaVez(env, 'metricas', lista)) {
    if (!m.lerMetricas || !temRecurso(conexao, m, 'metricas')) {
      feitos.push({ rede: conexao.plataforma, aviso: 'Reconecte a conta em Redes para liberar alcance, salvos e compartilhamentos.' });
      continue;
    }
    const agora = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const posts = await db.select(env, 'posts_redes', {
      filtros: {
        conexao_id: `eq.${conexao.id}`,
        or: `(metricas_em.is.null,and(publicado_em.gt.${iso(agora - 7 * DIA)},metricas_em.lt.${iso(agora - 6 * 3600_000)}),and(publicado_em.gt.${iso(agora - 60 * DIA)},metricas_em.lt.${iso(agora - DIA)}))`,
      },
      select: 'id,rede,id_na_rede,publicado_em,metricas_em', ordem: 'publicado_em.desc', limite: n,
    });
    if (!posts.length) { feitos.push({ rede: conexao.plataforma, medidos: 0 }); continue; }
    const credenciais = await credenciaisAtivas(env, conexao);
    const linhas = [];
    for (const p of posts) {
      try {
        const v = await m.lerMetricas({ credenciais, post: p });
        linhas.push({ rede: p.rede, id_na_rede: p.id_na_rede, alcance: v.alcance, salvos: v.salvos, compartilhamentos: v.compartilhamentos, visualizacoes: v.visualizacoes, metricas_em: new Date().toISOString() });
      } catch (e) {
        if (await avisarSeTokenMorreu(env, conexao, e)) break;
        // Sem permissão: para tudo (precisa reconectar). Post sem métrica (muito antigo, apagado): marca e segue.
        if (e.extra && [10, 200].includes(e.extra.codigo)) { feitos.push({ rede: conexao.plataforma, aviso: e.message }); break; }
        linhas.push({ rede: p.rede, id_na_rede: p.id_na_rede, alcance: null, salvos: null, compartilhamentos: null, visualizacoes: null, metricas_em: new Date().toISOString() });
      }
    }
    if (linhas.length) await db.insert(env, 'posts_redes', linhas, { upsert: true, conflito: 'rede,id_na_rede', select: 'id' });
    feitos.push({ rede: conexao.plataforma, medidos: linhas.filter((l) => l.alcance != null).length, sem_metrica: linhas.filter((l) => l.alcance == null).length });
  }
  return feitos;
}

// Quase ao vivo (pedido do dono em 26/10/2026, "por que não atualiza em tempo real?"): a cada 5 minutos, os 5 posts
// mais novos de cada conta (curtidas, comentários, imagem) e as métricas dos publicados nas últimas 48 horas.
// Umas 6 chamadas por conta, cabe no plano grátis junto com a fila e o Comenta X.
export async function atualizarRecentes(env, { horas = 48 } = {}) {
  const feitos = [];
  for (const { conexao, m } of await contas(env)) {
    try {
      const credenciais = await credenciaisAtivas(env, conexao);
      const { itens } = await m.lerPosts({ credenciais, limite: 5 });
      if (itens.length) await db.insert(env, 'posts_redes', itens.map((p) => linhaPost(conexao, p)), { upsert: true, conflito: 'rede,id_na_rede', select: 'id' });
      const recentes = itens.filter((p) => p.publicado_em && Date.parse(p.publicado_em) > Date.now() - horas * 3600_000);
      const linhas = [];
      if (m.lerMetricas && temRecurso(conexao, m, 'metricas')) {
        for (const p of recentes) {
          try {
            const v = await m.lerMetricas({ credenciais, post: p });
            linhas.push({ rede: conexao.plataforma, id_na_rede: p.id_na_rede, alcance: v.alcance, salvos: v.salvos, compartilhamentos: v.compartilhamentos, visualizacoes: v.visualizacoes, metricas_em: new Date().toISOString() });
          } catch (e) {
            if (await avisarSeTokenMorreu(env, conexao, e)) break;
          }
        }
      }
      if (linhas.length) await db.insert(env, 'posts_redes', linhas, { upsert: true, conflito: 'rede,id_na_rede', select: 'id' });
      feitos.push({ rede: conexao.plataforma, posts: itens.length, medidos: linhas.length });
    } catch (e) {
      await avisarSeTokenMorreu(env, conexao, e);
      feitos.push({ rede: conexao.plataforma, erro: e && e.message });
    }
  }
  return feitos;
}

// Situação das contas para o painel: o que já dá para medir e o que pede reconexão. Com "perfil", só as dele.
export async function situacaoContas(env, { perfil } = {}) {
  return (await contas(env, null, perfil)).map(({ conexao, m }) => ({
    rede: conexao.plataforma, perfil: perfilValido(conexao.perfil), conta: conexao.conta_nome, foto: conexao.conta_foto,
    metricas: temRecurso(conexao, m, 'metricas'), comentarios: temRecurso(conexao, m, 'comentarios'), mensagens: temRecurso(conexao, m, 'mensagens'),
  }));
}
