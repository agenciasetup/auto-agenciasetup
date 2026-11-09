// A fila das redes, rodada pelo relógio: publica as peças agendadas que venceram, cada uma pelo módulo da sua rede.
import { auditar } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { marcar as marcarTemas, palavraChave } from '../lib/temas.js';
import { perfilDe, perfilValido } from '../lib/perfis.js';
import { avisarSeTokenMorreu, contaAtiva, credenciaisAtivas } from './credenciais.js';
import { plataforma } from './index.js';

const MAX_TENTATIVAS = 3;

async function marcar(env, peca, dados) {
  await db.update(env, 'pecas', { id: `eq.${peca.id}` }, dados, 'id');
}

// Erro definitivo (rede não pronta, sem conta, formato errado): sem nova tentativa.
async function falhar(env, peca, motivo) {
  await marcar(env, peca, { status: 'erro', erro: motivo, proxima_tentativa: null });
  await auditar(env, null, 'peca.erro', `pecas:${peca.id}`, { rede: peca.rede, motivo });
}

// A conta escolhida na peça ou, sem escolha, a conta ativa da rede no perfil da peça (lib/perfis.js). Peça do Brasil
// nunca sai pela conta em inglês, nem o contrário: conta escolhida de outro perfil é erro, não troca silenciosa.
export async function contaDaPeca(env, peca) {
  const perfil = perfilValido(peca.perfil);
  if (peca.conexao_id) {
    const c = await db.um(env, 'conexoes', { id: `eq.${peca.conexao_id}`, status: 'eq.ativa' });
    if (c && perfilValido(c.perfil) !== perfil) return { outroPerfil: c };
    return c;
  }
  const c = await contaAtiva(env, peca.rede, perfil);
  return c ? c.conexao : null;
}

// Publica uma peça já marcada como "publicando". Usado pelo relógio e pelo "publicar agora" do painel.
export async function publicarPeca(env, peca) {
  const m = plataforma(peca.rede);
  if (!m) return falhar(env, peca, `Rede desconhecida: ${peca.rede}.`);
  if (!m.disponivel || !m.publicar) return falhar(env, peca, `${m.nome} ainda não está ligada ao sistema. A peça volta a valer quando o módulo entrar.`);
  const problema = m.validar ? m.validar(peca) : null;
  if (problema) return falhar(env, peca, problema);
  const conexao = await contaDaPeca(env, peca);
  const nomePerfil = perfilDe(peca.perfil).rotulo;
  if (conexao && conexao.outroPerfil) return falhar(env, peca, `A conta escolhida (${conexao.outroPerfil.conta_nome || m.nome}) é do perfil ${perfilDe(conexao.outroPerfil.perfil).rotulo} e a peça é do perfil ${nomePerfil}. Escolha outra conta na peça.`);
  if (!conexao) return falhar(env, peca, `Nenhuma conta de ${m.nome} conectada no perfil ${nomePerfil}. Conecte em Redes.`);
  try {
    const credenciais = await credenciaisAtivas(env, conexao);
    const r = await m.publicar({ env, peca, credenciais, conexao });
    await marcar(env, peca, { status: 'publicado', publicado_em: new Date().toISOString(), id_na_rede: r.id_na_rede || null, url_publicada: r.url_publicada || null, erro: null, conexao_id: conexao.id, proxima_tentativa: null });
    await auditar(env, null, 'peca.publicar', `pecas:${peca.id}`, { rede: peca.rede, url: r.url_publicada, ...(r.avisos && r.avisos.length ? { avisos: r.avisos } : {}) });
    if (r.id_na_rede) await depoisDePublicar(env, peca, conexao, r).catch((e) => console.error('depois de publicar', peca.id, e && e.message));
  } catch (e) {
    const motivo = e instanceof Erro ? e.message : `Falha ao publicar em ${m.nome}.`;
    if (!(e instanceof Erro)) console.error('fila', peca.id, e && e.stack);
    if (await avisarSeTokenMorreu(env, conexao, e)) return falhar(env, peca, `${motivo} Reconecte ${m.nome} em Redes.`);
    if ((peca.tentativas || 1) >= MAX_TENTATIVAS) return falhar(env, peca, `${motivo} (depois de ${MAX_TENTATIVAS} tentativas)`);
    await marcar(env, peca, { status: 'agendado', erro: motivo, proxima_tentativa: new Date(Date.now() + 5 * 60_000 * (peca.tentativas || 1)).toISOString() });
  }
}

// O post entra no desempenho na hora, ligado à peça. E o "Comenta X" da peça liga sozinho: a aprovação da peça
// já foi a aprovação da DM. Só liga se o material estiver no ar (sem material, a DM sairia sem link).
async function depoisDePublicar(env, peca, conexao, r) {
  const legenda = peca.legenda || '';
  const t = marcarTemas(legenda);
  // O perfil do post é o da conta que publicou.
  await db.insert(env, 'posts_redes', {
    conexao_id: conexao.id, rede: peca.rede, id_na_rede: String(r.id_na_rede), peca_id: peca.id, formato: peca.formato,
    legenda, link: r.url_publicada || null, publicado_em: new Date().toISOString(), palavra_chave: palavraChave(legenda), temas: [...t.ferramentas, ...t.temas],
    perfil: perfilValido(conexao.perfil),
  }, { upsert: true, conflito: 'rede,id_na_rede', select: 'id' });
  const gatilhos = await db.select(env, 'gatilhos', { filtros: { peca_id: `eq.${peca.id}` }, select: 'id,link,perfil,recurso:recursos(status,perfil)' });
  for (const g of gatilhos) {
    // O material da DM: o recurso publicado do mesmo perfil (o em inglês mora em agenciasetup.com/free) ou o link.
    const doPerfil = g.recurso && perfilValido(g.recurso.perfil) === perfilValido(g.perfil);
    const pronto = !!g.link || !!(doPerfil && g.recurso.status === 'publicado');
    if (!pronto) {
      await auditar(env, null, 'gatilho.nao_ligou', `gatilhos:${g.id}`, { motivo: 'O material ainda não está publicado no site.' });
      continue;
    }
    await db.update(env, 'gatilhos', { id: `eq.${g.id}` }, { ativo: true, posts: [String(r.id_na_rede)], ativado_em: new Date().toISOString(), ativado_por: peca.aprovado_por || null }, 'id');
    await auditar(env, null, 'gatilho.ligar', `gatilhos:${g.id}`, { post: r.id_na_rede, automatico: true });
  }
}

export async function processarFila(env) {
  await db.rpc(env, 'soltar_pecas_presas').catch((e) => console.error('soltar presas', e && e.message));
  const pecas = await db.rpc(env, 'pegar_pecas_para_publicar', { p_limite: 5 });
  for (const p of pecas || []) await publicarPeca(env, p);
  if ((pecas || []).length) console.log(`fila: ${pecas.length} peça(s) processada(s)`);
  return (pecas || []).length;
}
