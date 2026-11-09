// Suporte: quem comprou, até onde chegou no curso e quem precisa de ajuda agora (o gargalo antes de virar problema).
// Pedido do dono (26/10/2026): "facilite pro meu time de suporte... identifica GARGALO... meu suporte pode agir antes".
// Só leitura: junta matrículas, pedidos, e-mails de acesso (com o rastreio do Resend: entregue, aberto, clicado, voltou,
// spam), progresso, certificados e dúvidas sem resposta, e devolve
// o funil (cada etapa conta quem chegou até ela ou passou), a etapa de cada pessoa, o motivo em uma frase e o link do
// WhatsApp com a mensagem pronta. Sem função no banco: poucas consultas (com páginas de 1000), cabe no plano grátis.
// Valor da venda só para quem tem vendas.ver (Editor e Administrador), como em Vendas.
import { exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { pode } from '../nucleo/permissoes.js';

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

// Lê a tabela inteira em páginas de 1000 (o limite do Supabase por consulta). Para em `max` páginas.
async function todas(env, tabela, opcoes, max = 8) {
  const linhas = [];
  for (let i = 0; i < max; i++) {
    const r = await db.select(env, tabela, { ...opcoes, limite: 1000, offset: i * 1000 });
    linhas.push(...r);
    if (r.length < 1000) break;
  }
  return linhas;
}

const tempo = (ms) => {
  if (ms < HORA) return `${Math.max(1, Math.floor(ms / MIN))} min`;
  if (ms < DIA) return `${Math.floor(ms / HORA)} h`;
  const d = Math.floor(ms / DIA);
  return d === 1 ? '1 dia' : `${d} dias`;
};
const ha = (iso, agora) => `há ${tempo(agora - new Date(iso).getTime())}`;
const primeiro = (nome) => {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : '';
};
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const maisTarde = (...isos) => isos.filter(Boolean).sort().pop() || null;
const nomeAula = (a) => (a ? `${a.codigo} (${a.titulo})` : 'a última aula');

// Celular guardado só com números (o checkout tira a máscara). Com DDD: 10 ou 11 dígitos; com o 55 na frente, 12 ou 13.
// Quem mora fora do Brasil fica com "+" e o código do país (ex.: +351912345678): vai como está, sem o 55.
export function numeroWhatsapp(celular) {
  const bruto = String(celular || '').trim();
  const d = bruto.replace(/\D/g, '');
  if (bruto.startsWith('+')) return d.length >= 8 && d.length <= 15 ? d : null;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

// A mensagem pronta, curta e no jeito da marca: primeiro nome, quem fala e uma pergunta só. Muda com o motivo.
function mensagem(motivo, p, quem, curso) {
  const n = primeiro(p.nome) || 'tudo bem';
  const eu = quem ? `${quem} aqui, da Agência Setup. ` : 'Aqui é da Agência Setup. ';
  const c = `curso ${curso}`;
  const aula = nomeAula(motivo && motivo.aula ? motivo.aula : p.ultima_aula);
  const textos = {
    sem_acesso: `Vi que o pagamento do ${c} foi confirmado, mas o acesso ainda não apareceu para você. Já estou resolvendo e te mando o link de entrada por aqui.`,
    contestado: `Recebemos uma contestação no cartão sobre a compra do ${c}. Aconteceu alguma coisa? Se quiser, a gente resolve por aqui mesmo.`,
    email: `Seu acesso ao ${c} já está liberado, mas acho que o e-mail com o link não chegou até você. Posso te mandar o link de entrada por aqui?`,
    email_voltou: `Seu acesso ao ${c} já está liberado, mas o e-mail com o link de entrada voltou. Confere para mim se o seu e-mail é ${p.email}? Enquanto isso, te mando o link por aqui.`,
    email_spam: `Seu acesso ao ${c} já está liberado. O e-mail com o link de entrada acabou indo para o spam, então te mando o link direto por aqui. Pode ser?`,
    nao_abriu: `Seu acesso ao ${c} já está liberado e te mandei o link de entrada por e-mail, mas acho que ele ficou perdido (às vezes cai em Promoções ou no spam). Te mando o link por aqui?`,
    abriu_nao_clicou: `Vi que você abriu o e-mail com o seu acesso ao ${c}, mas ainda não entrou. O botão "Entrar no curso" não funcionou? Te mando o link de entrada direto por aqui.`,
    clicou_nao_entrou: `Vi que você tocou no link de entrada do ${c}, mas acho que não deu certo (ele vence em 24 horas). Te mando um link novo por aqui?`,
    nao_entrou: `Seu acesso ao ${c} já está liberado. Achou o e-mail com o link de entrada? Se não achou, te mando o link direto por aqui.`,
    duvida: `Vi sua dúvida na aula ${aula} e quis te ajudar mais rápido por aqui. Ainda está precisando?`,
    nao_comecou: `Vi que você já entrou no ${c}. A primeira aula é curtinha e mostra tudo o que você vai construir. Quer ajuda para começar?`,
    instalacao: `Vi que você parou na aula ${aula}, na parte de instalação. É onde mais gente trava, e costuma ser rapidinho de resolver. Me conta em que passo ficou?`,
    parado: `Sentimos sua falta no ${c}. Você parou na aula ${aula}. Travou em alguma coisa? Me conta que eu te ajudo a seguir.`,
    reembolso: `Vi que você pediu o reembolso do ${c}, e está tudo certo com ele. Posso te perguntar o que faltou? Sua resposta ajuda muito a gente a melhorar.`,
    concluiu: `Parabéns por concluir o ${c}! Como foi? Já está usando no dia a dia?`,
    ok: `Passando para saber como está indo no ${c}. Precisa de alguma ajuda?`,
  };
  const chave = motivo ? motivo.id : p.etapa === 'concluiu' ? 'concluiu' : 'ok';
  return `Oi, ${n}! ${eu}${textos[chave] || textos.ok}`;
}

export async function verSuporte(x, { dias = 90, curso: cursoPedido, etapa, busca, so_ajuda, limite } = {}) {
  exigir(x.u, 'suporte.ver');
  const env = x.env;
  const agora = Date.now();
  dias = Math.max(0, Math.min(3650, Math.round(Number(dias) || 0)));
  const desde = dias ? agora - dias * DIA : 0;
  const veValor = pode(x.u.papel, 'vendas.ver');

  // 1) Os cursos e a ordem das aulas (o funil depende de módulo 1, módulo 3 e do fim).
  const cursos = await db.select(env, 'cursos', { select: 'id,slug,titulo,status,ordem,modulos(id,numero,titulo,ordem,aulas(id,codigo,titulo,ordem,status))', ordem: 'ordem.asc' });
  const publicados = cursos.filter((c) => c.status === 'publicado');
  const curso = cursos.find((c) => c.id === cursoPedido || c.slug === cursoPedido) || publicados[0] || cursos[0];
  const base = { dias, curso: null, cursos: publicados.map((c) => ({ id: c.id, titulo: c.titulo })), etapas: [], resumo: null, pessoas: [], total: 0, ve_valor: veValor, rastreio_email: false, rastreio_desde: null };
  if (!curso) return base;

  const modulos = [...(curso.modulos || [])].sort((a, b) => a.ordem - b.ordem);
  for (const m of modulos) m.aulas = (m.aulas || []).filter((a) => a.status === 'publicado').sort((a, b) => a.ordem - b.ordem);
  const comAulas = modulos.filter((m) => m.aulas.length);
  const aulas = comAulas.flatMap((m) => m.aulas.map((a) => ({ ...a, modulo: m })));
  const aulaPorId = new Map(aulas.map((a) => [a.id, a]));
  const mod1 = comAulas[0] || null;
  const mod3 = comAulas[2] || null;
  const primeiraAula = aulas[0] || null;

  // 2) Tudo o que diz em que pé cada pessoa está, em paralelo.
  const idsAulas = aulas.map((a) => a.id);
  const [matriculas, pagos, acessos, progresso, emails, certificados, tutor, comentarios, cfgEmail] = await Promise.all([
    todas(env, 'matriculas', {
      filtros: { origem: 'not.in.(teste,equipe)' }, ordem: 'inicio.desc',
      select: 'id,aluno_id,curso_id,pedido_id,origem,inicio,status,motivo,aluno:alunos(id,nome,email,celular,ultimo_acesso),pedido:pedidos(id,numero,status,metodo,total_centavos,pago_em,teste,atualizado_em)',
    }),
    todas(env, 'pedidos', {
      filtros: { status: 'eq.pago', teste: 'is.false', ...(desde ? { pago_em: `gte.${new Date(desde).toISOString()}` } : {}) }, ordem: 'pago_em.desc',
      select: 'id,numero,status,metodo,total_centavos,pago_em,itens,aluno:alunos!pedidos_aluno_id_fkey(id,nome,email,celular,ultimo_acesso)',
    }, 3),
    db.select(env, 'produto_acessos', { select: 'produto_id,curso_id' }),
    idsAulas.length ? todas(env, 'progresso', { filtros: { aula_id: `in.(${idsAulas.join(',')})` }, select: 'aluno_id,aula_id,concluida_em,atualizado_em', ordem: 'atualizado_em.desc' }) : [],
    todas(env, 'emails', { filtros: { tipo: 'eq.acesso', ...(desde ? { criado_em: `gte.${new Date(desde - 2 * DIA).toISOString()}` } : {}) }, select: 'para,status,criado_em,enviado_em,resend_id,entregue_em,aberto_em,clicado_em,devolvido_em,spam_em', ordem: 'criado_em.desc' }, 4),
    todas(env, 'certificados', { filtros: { curso_id: `eq.${curso.id}` }, select: 'aluno_id', ordem: 'emitido_em.desc' }, 3),
    db.select(env, 'tutor_conversas', { filtros: { status: 'eq.enviada' }, select: 'aluno_id,curso_id,enviada_em,atualizado_em,aula:aulas(codigo,titulo)', ordem: 'enviada_em.asc', limite: 500 }),
    db.select(env, 'comentarios', {
      filtros: { tipo: 'eq.duvida', status: 'eq.publicado', pai_id: 'is.null', resolvido: 'is.false', aluno_id: 'not.is.null' },
      select: 'aluno_id,curso_id,criado_em,aula:aulas(codigo,titulo),respostas:comentarios!pai_id(equipe_id)', ordem: 'criado_em.asc', limite: 500,
    }),
    // Desde quando o rastreio do e-mail (aberto, clicado) está ligado: scripts/resend-rastreio.mjs grava ao ligar.
    db.um(env, 'config', { chave: 'eq.email' }, 'rastreio_desde:valor->>rastreio_desde').catch(() => null),
  ]);
  const rastreioDesde = cfgEmail && cfgEmail.rastreio_desde && Number.isFinite(Date.parse(cfgEmail.rastreio_desde)) ? cfgEmail.rastreio_desde : null;
  const rastreio = !!rastreioDesde;
  const desdeRastreio = rastreio ? Date.parse(rastreioDesde) : 0;

  const porAluno = (lista, campo = 'aluno_id') => {
    const m = new Map();
    for (const l of lista) { const k = l[campo]; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }
    return m;
  };
  const progressoDe = porAluno(progresso);
  const emailsDe = porAluno(emails.map((e) => ({ ...e, para: String(e.para || '').toLowerCase() })), 'para');
  const certificado = new Set(certificados.map((c) => c.aluno_id));
  // Dúvida sem resposta: a do tutor que foi para a equipe e a dos comentários que ninguém da equipe respondeu.
  const duvidasDe = porAluno([
    ...tutor.filter((t) => !t.curso_id || t.curso_id === curso.id).map((t) => ({ aluno_id: t.aluno_id, desde: t.enviada_em || t.atualizado_em, aula: t.aula, onde: 'tutor' })),
    ...comentarios.filter((k) => k.curso_id === curso.id && !(k.respostas || []).some((r) => r.equipe_id)).map((k) => ({ aluno_id: k.aluno_id, desde: k.criado_em, aula: k.aula, onde: 'comentario' })),
  ]);
  const quem = x.u.casa ? '' : primeiro(x.u.nome);

  const pessoas = [];
  const pedido = (pd) => (pd ? { numero: pd.numero, metodo: pd.metodo, status: pd.status, pago_em: pd.pago_em, ...(veValor ? { total_centavos: pd.total_centavos } : {}) } : null);
  const fecharPessoa = (p, motivos) => {
    motivos.sort((a, b) => a.prioridade - b.prioridade || String(a.desde).localeCompare(String(b.desde)));
    const principal = motivos[0] || null;
    const numero = numeroWhatsapp(p.celular);
    const texto = mensagem(principal, p, quem, curso.titulo);
    pessoas.push({ ...p, motivos, motivo: principal, precisa_ajuda: !!principal, mensagem: texto, whatsapp: numero ? { numero, link: `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` } : null });
  };

  // 3) Cada matrícula do curso (compra, presente ou bônus) vira uma pessoa com etapa e motivos.
  for (const m of matriculas) {
    if (m.curso_id !== curso.id || !m.aluno) continue;
    const pd = m.pedido;
    if (pd && pd.teste) continue;
    const devolvido = pd && ['reembolsado', 'contestado'].includes(pd.status);
    if (m.status !== 'ativa' && !devolvido) continue; // acesso tirado pela equipe: fora
    const liberado = maisTarde(m.inicio, pd && pd.pago_em);
    if (desde && new Date(liberado).getTime() < desde) continue;
    const a = m.aluno;
    const linhas = (progressoDe.get(a.id) || []).filter((r) => aulaPorId.has(r.aula_id));
    const feitas = new Set(linhas.filter((r) => r.concluida_em).map((r) => r.aula_id));
    const ultima = linhas[0] || null; // já vem do mais recente para o mais antigo
    const desdeLib = new Date(liberado).getTime();
    const entrou = (a.ultimo_acesso && new Date(a.ultimo_acesso).getTime() >= desdeLib - 15 * MIN) || linhas.length > 0;
    const seus = (emailsDe.get(String(a.email || '').toLowerCase()) || []).filter((e) => new Date(e.criado_em).getTime() >= desdeLib - DIA);
    const emailOk = seus.some((e) => e.status === 'enviado');
    // Rastreado: saiu depois de ligar o rastreio e já tem algum aviso do Resend. Os de antes ficam "sem dado", nunca
    // "não abriu". `seus` vem do mais novo para o mais antigo.
    const rastreados = rastreio ? seus.filter((e) => e.status === 'enviado' && e.resend_id && e.enviado_em && Date.parse(e.enviado_em) >= desdeRastreio
      && (e.entregue_em || e.aberto_em || e.clicado_em || e.devolvido_em || e.spam_em)) : [];
    const rastreado = rastreados.length > 0;
    const primeiraVez = (campo) => rastreados.map((e) => e[campo]).filter(Boolean).sort()[0] || null;
    const entregue = primeiraVez('entregue_em');
    const aberto = primeiraVez('aberto_em');
    const clicado = primeiraVez('clicado_em');
    const ultimoR = rastreados[0] || null;
    const voltou = ultimoR && !aberto && !clicado ? (ultimoR.devolvido_em ? { id: 'email_voltou', em: ultimoR.devolvido_em } : ultimoR.spam_em ? { id: 'email_spam', em: ultimoR.spam_em } : null) : null;
    const comecou = linhas.length > 0;
    const mod1Feito = !!mod1 && mod1.aulas.every((au) => feitas.has(au.id));
    const noMod3 = !!mod3 && linhas.some((r) => comAulas.indexOf(aulaPorId.get(r.aula_id).modulo) >= 2);
    const concluiu = certificado.has(a.id) || (aulas.length > 0 && aulas.every((au) => feitas.has(au.id)));
    const passos = {
      comprou: true, email: emailOk || entrou, abriu: entrou || (rastreado && !!(aberto || clicado)), clicou: entrou || (rastreado && !!clicado),
      entrou, aula_1: comecou, modulo_1: mod1Feito, modulo_3: noMod3, concluiu,
    };

    const p = {
      id: m.id, aluno_id: a.id, nome: a.nome || a.email, email: a.email, celular: a.celular || null,
      origem: m.origem, liberado_em: liberado, pedido: pedido(pd),
      situacao: devolvido ? pd.status : 'ativo', passos,
      entrou_em: entrou ? a.ultimo_acesso : null,
      email_acesso: seus[0] ? seus[0].status : null,
      email_rastreio: rastreado ? { entregue_em: entregue, aberto_em: aberto, clicado_em: clicado, devolvido_em: ultimoR.devolvido_em || null, spam_em: ultimoR.spam_em || null } : null,
      aulas_feitas: feitas.size, aulas_total: aulas.length,
      ultima_aula: ultima ? { codigo: aulaPorId.get(ultima.aula_id).codigo, titulo: aulaPorId.get(ultima.aula_id).titulo, modulo: aulaPorId.get(ultima.aula_id).modulo.numero, concluida: !!ultima.concluida_em, em: ultima.atualizado_em } : null,
      ultima_atividade: maisTarde(ultima && ultima.atualizado_em, entrou ? a.ultimo_acesso : null),
    };

    const motivos = [];
    const verbo = m.origem === 'bonus' ? 'Ganhou o acesso' : m.origem === 'presente' ? 'Recebeu o curso de presente' : 'Pagou';
    if (devolvido) {
      const quando = pd.atualizado_em || liberado;
      if (agora - new Date(quando).getTime() <= 30 * DIA) {
        if (pd.status === 'contestado') motivos.push({ id: 'contestado', prioridade: 1, desde: quando, texto: `Abriu contestação no cartão ${ha(quando, agora)}. O acesso caiu.` });
        else motivos.push({ id: 'reembolso', prioridade: 4, desde: quando, texto: `Pediu reembolso (devolvido ${ha(quando, agora)}). Vale perguntar o que faltou.` });
      }
    } else {
      if (!entrou && !emailOk && agora - desdeLib > 10 * MIN) {
        const erro = seus.find((e) => e.status === 'erro');
        motivos.push({ id: 'email', prioridade: 1, desde: liberado, texto: erro ? `O e-mail de acesso deu erro e a pessoa ainda não entrou (${verbo.toLowerCase()} ${ha(liberado, agora)}).` : `O e-mail de acesso não saiu e a pessoa ainda não entrou (${verbo.toLowerCase()} ${ha(liberado, agora)}).` });
      } else if (!entrou && voltou) {
        motivos.push({ id: voltou.id, prioridade: 1, desde: voltou.em, texto: voltou.id === 'email_voltou' ? `O e-mail de acesso voltou ${ha(voltou.em, agora)} (endereço com erro ou caixa cheia) e a pessoa ainda não entrou.` : `Marcou o e-mail de acesso como spam ${ha(voltou.em, agora)} e ainda não entrou.` });
      } else if (!entrou && rastreado && !aberto && !clicado) {
        if (entregue && agora - new Date(entregue).getTime() > 2 * HORA) motivos.push({ id: 'nao_abriu', prioridade: 2, desde: entregue, texto: `Recebeu o e-mail de acesso ${ha(entregue, agora)} e não abriu.` });
      } else if (!entrou && rastreado && aberto && !clicado) {
        if (agora - new Date(aberto).getTime() > HORA) motivos.push({ id: 'abriu_nao_clicou', prioridade: 2, desde: aberto, texto: `Abriu o e-mail de acesso ${ha(aberto, agora)}, mas não clicou no link e não entrou.` });
      } else if (!entrou && rastreado && clicado) {
        if (agora - new Date(clicado).getTime() > HORA) motivos.push({ id: 'clicou_nao_entrou', prioridade: 2, desde: clicado, texto: `Clicou no link do e-mail ${ha(clicado, agora)}, mas não entrou na área (o link vence em 24 horas).` });
      } else if (!entrou && agora - desdeLib > HORA) {
        motivos.push({ id: 'nao_entrou', prioridade: 2, desde: liberado, texto: `${verbo} ${ha(liberado, agora)} e ainda não entrou na área.` });
      }
      if (entrou && !comecou && agora - desdeLib > DIA) {
        motivos.push({ id: 'nao_comecou', prioridade: 3, desde: liberado, texto: `Entrou na área, mas não assistiu nenhuma aula (${verbo.toLowerCase()} ${ha(liberado, agora)}).` });
      }
      if (ultima && !concluiu && agora - new Date(ultima.atualizado_em).getTime() >= 3 * DIA) {
        const au = aulaPorId.get(ultima.aula_id);
        const instalacao = mod1 && au.modulo === mod1;
        motivos.push({
          id: instalacao ? 'instalacao' : 'parado', prioridade: instalacao ? 2 : 3, desde: ultima.atualizado_em, aula: au,
          texto: ultima.concluida_em
            ? `Terminou a aula ${nomeAula(au)} ${ha(ultima.atualizado_em, agora)} e não abriu a próxima.`
            : `Parado na aula ${nomeAula(au)} ${ha(ultima.atualizado_em, agora)}${instalacao ? ', ainda na instalação' : ''}.`,
        });
      }
      for (const d of duvidasDe.get(a.id) || []) {
        motivos.push({ id: 'duvida', prioridade: 2, desde: d.desde, aula: d.aula, texto: d.onde === 'tutor' ? `Mandou uma dúvida para a equipe na aula ${nomeAula(d.aula)} ${ha(d.desde, agora)} e está sem resposta.` : `Deixou uma dúvida nos comentários da aula ${nomeAula(d.aula)} ${ha(d.desde, agora)}, sem resposta da equipe.` });
      }
    }
    fecharPessoa(p, motivos.map(({ aula, ...r }) => ({ ...r, aula: aula ? { codigo: aula.codigo, titulo: aula.titulo } : undefined })));
  }

  // 4) Pagou e não tem curso liberado: o problema mais urgente (só pedidos de produto que dá acesso a este curso).
  const temMatricula = new Set(matriculas.map((m) => m.pedido_id).filter(Boolean));
  const cursoDoProduto = porAluno(acessos, 'produto_id');
  for (const pd of pagos) {
    if (temMatricula.has(pd.id) || !pd.aluno || agora - new Date(pd.pago_em).getTime() < 10 * MIN) continue;
    const doCurso = (pd.itens || []).some((it) => (cursoDoProduto.get(it.produto_id) || []).some((ac) => ac.curso_id === curso.id));
    if (!doCurso) continue;
    const a = pd.aluno;
    fecharPessoa({
      id: `pedido:${pd.id}`, aluno_id: a.id, nome: a.nome || a.email, email: a.email, celular: a.celular || null,
      origem: 'compra', liberado_em: pd.pago_em, pedido: pedido(pd), situacao: 'ativo', passos: { comprou: true }, sem_acesso: true,
      entrou_em: null, email_acesso: null, aulas_feitas: 0, aulas_total: aulas.length, ultima_aula: null, ultima_atividade: null,
    }, [{ id: 'sem_acesso', prioridade: 1, desde: pd.pago_em, texto: `Pagou ${ha(pd.pago_em, agora)} e o curso não foi liberado.` }]);
  }

  // 5) O funil. Cada etapa conta quem chegou até ela ou passou; quem ganhou o curso na mão (bônus) fica fora.
  const etapas = [
    { id: 'comprou', t: 'Compraram', estado: 'Comprou, sem e-mail de acesso', dica: 'Pedidos pagos, fora os de teste. Presente conta para quem recebeu.' },
    { id: 'email', t: 'E-mail de acesso enviado', estado: rastreio ? 'E-mail enviado, não abriu' : 'E-mail enviado, não entrou', dica: rastreio ? 'O Resend aceitou o e-mail. Quem entrou por outro caminho também conta. E-mail de antes do rastreio fica fora de "pararam aqui": não dá para saber se abriu.' : 'O Resend aceitou o e-mail. Quem entrou por outro caminho também conta.' },
    ...(rastreio ? [
      { id: 'abriu', t: 'Abriram o e-mail de acesso', estado: 'Abriu o e-mail, não clicou', dica: 'Pelo rastreio do Resend. É um sinal, não uma certeza: alguns apps abrem o e-mail sozinhos (iPhone) e outros bloqueiam a imagem que conta a abertura. Quem clicou ou entrou também conta.' },
      { id: 'clicou', t: 'Clicaram no link', estado: 'Clicou no link, não entrou', dica: 'Tocaram no botão do e-mail. Quem entrou por outro caminho (código) também conta.' },
    ] : []),
    { id: 'entrou', t: 'Entraram na área', estado: 'Entrou, não começou', dica: 'Abriram a área do aluno pelo menos uma vez depois da compra.' },
    ...(primeiraAula ? [{ id: 'aula_1', t: `Começaram a aula ${primeiraAula.codigo}`, estado: mod1 ? `Começou, sem terminar o módulo ${mod1.numero}` : 'Começou as aulas', dica: `Abriram a aula ${primeiraAula.codigo} ou já passaram dela.` }] : []),
    ...(mod1 ? [{ id: 'modulo_1', t: `Terminaram o módulo ${mod1.numero}`, estado: `Terminou o módulo ${mod1.numero}`, dica: `${mod1.titulo}: todas as aulas concluídas. É a parte da instalação, onde mais gente trava.` }] : []),
    ...(mod3 ? [{ id: 'modulo_3', t: `Chegaram ao módulo ${mod3.numero}`, estado: `No módulo ${mod3.numero} em diante`, dica: `${mod3.titulo}: abriram alguma aula do módulo ${mod3.numero} ou de depois.` }] : []),
    { id: 'concluiu', t: 'Concluíram o curso', estado: 'Concluiu o curso', dica: 'Todas as aulas concluídas ou certificado emitido.' },
  ];
  for (const p of pessoas) {
    let i = 0;
    etapas.forEach((e, k) => { if (p.passos[e.id]) i = k; });
    // Parou no e-mail sem dado do rastreio (saiu antes de ligar ou ainda sem aviso): etapa à parte, nunca "não abriu".
    const semDado = rastreio && !p.sem_acesso && etapas[i].id === 'email' && !p.email_rastreio;
    p.etapa = p.sem_acesso ? 'sem_acesso' : semDado ? 'sem_rastreio' : etapas[i].id;
    p.etapa_n = i;
    const r = etapas[i].id === 'email' && p.email_rastreio;
    p.etapa_t = p.sem_acesso ? 'Pagou, curso não liberado' : semDado ? 'E-mail enviado, sem dado de abertura'
      : r && r.devolvido_em ? 'E-mail de acesso voltou' : r && r.spam_em ? 'E-mail marcado como spam' : etapas[i].estado;
    delete p.passos;
  }
  // A mensagem do WhatsApp sem motivo depende da etapa (concluiu): refaz para quem ficou sem motivo.
  for (const p of pessoas) if (!p.motivo && p.etapa === 'concluiu') {
    p.mensagem = mensagem(null, p, quem, curso.titulo);
    if (p.whatsapp) p.whatsapp.link = `https://wa.me/${p.whatsapp.numero}?text=${encodeURIComponent(p.mensagem)}`;
  }
  const compradores = pessoas.filter((p) => p.origem !== 'bonus');
  for (const [k, e] of etapas.entries()) {
    e.n = compradores.filter((p) => p.etapa_n >= k).length;
    e.parados = k < etapas.length - 1 ? compradores.filter((p) => p.etapa_n === k && p.etapa !== 'sem_rastreio').length : 0;
    e.sem_rastreio = e.id === 'email' ? compradores.filter((p) => p.etapa === 'sem_rastreio').length : 0;
  }

  // Quem precisa de ajuda primeiro (o mais urgente e o que espera há mais tempo); depois os outros, mais novos primeiro.
  pessoas.sort((a, b) => (a.motivo ? 0 : 1) - (b.motivo ? 0 : 1)
    || (a.motivo && b.motivo ? a.motivo.prioridade - b.motivo.prioridade || String(a.motivo.desde).localeCompare(String(b.motivo.desde)) : String(b.liberado_em).localeCompare(String(a.liberado_em))));

  const resumo = {
    compraram: etapas[0].n,
    entraram: (etapas.find((e) => e.id === 'entrou') || {}).n || 0,
    concluiram: etapas[etapas.length - 1].n,
    precisam_ajuda: pessoas.filter((p) => p.precisa_ajuda).length,
    reembolsos: pessoas.filter((p) => p.situacao !== 'ativo').length,
    na_mao: pessoas.filter((p) => p.origem === 'bonus').length,
    sem_telefone: pessoas.filter((p) => p.precisa_ajuda && !p.whatsapp).length,
  };

  // Filtros (o conector usa; o painel filtra na tela, que é mais rápido).
  let lista = pessoas;
  if (so_ajuda) lista = lista.filter((p) => p.precisa_ajuda);
  if (etapa === 'reembolso') lista = lista.filter((p) => p.situacao !== 'ativo');
  else if (etapa) lista = lista.filter((p) => p.etapa === etapa);
  const b = semAcento(busca).trim();
  if (b) lista = lista.filter((p) => semAcento(`${p.nome} ${p.email}`).includes(b) || (b.replace(/\D/g, '').length >= 4 && String(p.celular || '').includes(b.replace(/\D/g, ''))));
  const total = lista.length;
  if (limite) lista = lista.slice(0, Math.max(1, Math.min(500, Number(limite) || 30)));

  return {
    ...base,
    curso: { id: curso.id, titulo: curso.titulo, slug: curso.slug },
    etapas: etapas.map(({ id, t, estado, dica, n, parados, sem_rastreio }) => ({ id, t, estado, dica, n, parados, sem_rastreio })),
    resumo, pessoas: lista, total, rastreio_email: rastreio, rastreio_desde: rastreioDesde,
  };
}
