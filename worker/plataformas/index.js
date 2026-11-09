// Registro das redes. Cada uma é um módulo com o mesmo contrato (LEIA.md); quem usa (painel, fila, Claude) só fala daqui.
import { db } from '../nucleo/db.js';
import { PERFIS } from '../lib/perfis.js';
import instagram from './instagram.js';
import facebook from './facebook.js';
import threads from './threads.js';
import x from './x.js';
import tiktok from './tiktok.js';
import youtube from './youtube.js';
import linkedin from './linkedin.js';
import pinterest from './pinterest.js';

const MODULOS = [instagram, facebook, threads, x, tiktok, youtube, linkedin, pinterest];
const PORID = new Map(MODULOS.map((m) => [m.id, m]));

export const plataforma = (id) => PORID.get(id) || null;
export const todas = () => MODULOS;
export const configurada = (env, m) => m.segredos.every((s) => !!env[s]);

// O que o painel e o Claude veem de cada rede: nunca credenciais. Cada conta diz o perfil dela (lib/perfis.js); com
// "perfil", só as contas daquele perfil (e a situação "conectada" vale para ele).
export async function resumoRedes(env, { perfil } = {}) {
  const conexoes = await db.select(env, 'conexoes', {
    filtros: { status: 'neq.desligada', ...(PERFIS[perfil] ? { perfil: `eq.${perfil}` } : {}) },
    select: 'id,plataforma,conta_id,conta_nome,conta_foto,status,expira_em,ultimo_erro,criado_em,escopos,perfil',
    ordem: 'criado_em.asc',
  });
  // "faltam": funções que a conexão ainda não liberou (conectada antes de o módulo pedir a permissão). Reconectar resolve.
  const NOME_RECURSO = { metricas: 'métricas', comentarios: 'comentários', mensagens: 'mensagens' };
  return MODULOS.map((m) => {
    const minhas = conexoes.filter((c) => c.plataforma === m.id).map(({ escopos, ...c }) => ({
      ...c, faltam: Object.entries(m.recursos || {}).filter(([, e]) => !(escopos || []).includes(e)).map(([k]) => NOME_RECURSO[k] || k),
    }));
    return {
      id: m.id, nome: m.nome, cor: m.cor, formatos: m.formatos, descricao: m.descricao, requisitos: m.requisitos,
      disponivel: !!m.disponivel, configurada: configurada(env, m),
      situacao: !m.disponivel ? 'em_breve' : !configurada(env, m) ? 'falta_configurar' : minhas.some((c) => c.status === 'ativa') ? 'conectada' : 'pronta',
      conexoes: minhas.map(({ plataforma: _p, ...c }) => c),
    };
  });
}
