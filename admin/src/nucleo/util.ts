// Peças pequenas do painel: datas no fuso de São Paulo, dinheiro, nomes que a tela mostra.
const FUSO = 'America/Sao_Paulo';

export function dataHora(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(d).replace(':', 'h');
  return `${data} às ${hora}`;
}

export function data(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function haQuanto(iso?: string | null) {
  if (!iso) return 'nunca';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  if (d < 8) return d === 1 ? 'ontem' : `há ${d} dias`;
  return data(iso);
}

// <input type="datetime-local"> trabalha no horário do aparelho.
export function paraCampoData(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function doCampoData(v: string) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// moeda 'usd': pedido do curso em inglês (sai "US$ 28,00").
export function dinheiro(centavos?: number | null, moeda?: string | null) {
  if (centavos === null || centavos === undefined || centavos === ('' as any)) return '';
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: moeda === 'usd' ? 'USD' : 'BRL' });
}
// "197,90" -> 19790
export function centavosDe(texto: string) {
  const t = String(texto || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!t) return null;
  const n = Math.round(parseFloat(t) * 100);
  return isNaN(n) ? null : n;
}
export function textoDeCentavos(c?: number | null) {
  if (c === null || c === undefined) return '';
  return (Number(c) / 100).toFixed(2).replace('.', ',');
}

export const numero = (n?: number | null) => (Number(n) || 0).toLocaleString('pt-BR');
// 128785 -> "128,8 mil"; 1520000 -> "1,5 mi".
export function compacto(n?: number | null) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} mi`;
  if (Math.abs(v) >= 1e4) return `${(v / 1e3).toFixed(1).replace('.', ',').replace(',0', '')} mil`;
  return numero(v);
}
// Engajamento em % com uma casa: 4.236 -> "4,2%".
export const porcento = (n?: number | null) => (n === null || n === undefined ? '' : `${Number(n).toFixed(1).replace('.', ',')}%`);
// Legenda sem o bloco de hashtags e os pontinhos de espaço.
export const limparLegenda = (t?: string | null) => String(t || '').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/(\s*[.·]\s*\n)+/g, ' ').replace(/\s+/g, ' ').trim();

export function tamanho(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const listaDeTexto = (t: string) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);
export const textoDeLista = (l?: string[] | null) => (l || []).join(', ');

export async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const a = document.createElement('textarea');
    a.value = texto; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    a.remove();
    return ok;
  }
}

export function iniciais(nome?: string) {
  const p = String(nome || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export const NOME_PAPEL: Record<string, string> = { administrador: 'Administrador', editor: 'Editor', redator: 'Redator', suporte: 'Suporte' };
export const DESCRICAO_PAPEL: Record<string, string> = {
  administrador: 'Faz tudo: equipe, configurações, conectar redes e chaves de todos.',
  editor: 'Publica conteúdo, aprova e agenda peças, cuida de cursos e anúncios.',
  redator: 'Cria e edita rascunhos. Não publica nem aprova.',
  suporte: 'Atende os alunos: vê quem comprou, reenvia o acesso e libera matrícula. Não vê faturamento nem faz reembolso.',
};

export const STATUS_PEDIDO: Record<string, { t: string; cor: string }> = {
  aberto: { t: 'Aberto', cor: 'cinza' }, aguardando: { t: 'Aguardando', cor: 'ambar' }, pago: { t: 'Pago', cor: 'verde' },
  recusado: { t: 'Recusado', cor: 'vermelho' }, expirado: { t: 'Expirado', cor: 'cinza' }, cancelado: { t: 'Cancelado', cor: 'cinza' },
  reembolsado: { t: 'Reembolsado', cor: 'azul' }, contestado: { t: 'Contestado', cor: 'vermelho' },
};
export const METODO: Record<string, string> = { pix: 'Pix', cartao: 'Cartão' };
// O número para o wa.me (o mesmo jeito do servidor, acoes-suporte.js): com DDD vira 55 + DDD; de fora vem com "+".
export function numeroWhats(celular?: string | null) {
  const bruto = String(celular || '').trim();
  const d = bruto.replace(/\D/g, '');
  if (bruto.startsWith('+')) return d.length >= 8 && d.length <= 15 ? d : null;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}
export const ORIGEM_MATRICULA: Record<string, string> = { compra: 'Compra', equipe: 'Equipe', presente: 'Presente', bonus: 'Bônus', teste: 'Teste' };
export const STATUS_EMAIL: Record<string, { t: string; cor: string }> = {
  fila: { t: 'Na fila', cor: 'ambar' }, enviado: { t: 'Enviado', cor: 'verde' }, erro: { t: 'Erro', cor: 'vermelho' }, simulado: { t: 'Simulado', cor: 'cinza' },
};
// Toque = de onde a pessoa veio (marcas utm_* do link). Vazio: entrou direto.
export function textoToque(t?: any) {
  if (!t || !t.origem) return 'Direto (sem marca)';
  // O servidor manda o nome do canal ("Instagram: link da bio"); a marca que o próprio Instagram põe não diz nada a mais.
  const resto = [t.campanha, t.conteudo].filter((v) => v && v !== 'link_in_bio');
  return (t.canal ? [t.canal, ...resto] : [t.origem, t.meio, ...resto]).filter(Boolean).join(' · ');
}

// As marcas como chegaram no link, para quem quer conferir a UTM.
export function marcasDoToque(t?: any) {
  if (!t || !t.origem) return '';
  return Object.entries({ source: t.origem, medium: t.meio, campaign: t.campanha, content: t.conteudo, term: t.termo }).filter(([, v]) => v).map(([k, v]) => `utm_${k}=${v}`).join(' · ');
}

export const STATUS_PECA: Record<string, { t: string; cor: string }> = {
  rascunho: { t: 'Rascunho', cor: 'cinza' },
  aprovado: { t: 'Aprovada', cor: 'azul' },
  agendado: { t: 'Agendada', cor: 'ambar' },
  publicando: { t: 'Publicando', cor: 'ambar' },
  publicado: { t: 'Publicada', cor: 'verde' },
  erro: { t: 'Com erro', cor: 'vermelho' },
  cancelado: { t: 'Cancelada', cor: 'cinza' },
};

export const STATUS_CONTEUDO: Record<string, { t: string; cor: string }> = {
  rascunho: { t: 'Rascunho', cor: 'cinza' },
  publicado: { t: 'Publicado', cor: 'verde' },
  arquivado: { t: 'Arquivado', cor: 'vermelho' },
};

export const STATUS_PAUTA: Record<string, { t: string; cor: string }> = {
  nova: { t: 'Nova', cor: 'ambar' },
  aproveitada: { t: 'Aproveitada', cor: 'verde' },
  descartada: { t: 'Descartada', cor: 'cinza' },
};

export const REDES: Record<string, { t: string; cor: string }> = {
  instagram: { t: 'Instagram', cor: '#E1306C' },
  facebook: { t: 'Facebook', cor: '#1877F2' },
  threads: { t: 'Threads', cor: '#A3A3A3' },
  x: { t: 'X', cor: '#E7E7E7' },
  tiktok: { t: 'TikTok', cor: '#25F4EE' },
  youtube: { t: 'YouTube', cor: '#FF0000' },
  linkedin: { t: 'LinkedIn', cor: '#0A66C2' },
  pinterest: { t: 'Pinterest', cor: '#E60023' },
};

// Os perfis da agência nas redes (worker/lib/perfis.js): o do Brasil, em português, e o internacional, em inglês.
// Cada conta conectada, peça, palavra do Comenta X e post é de um. Só o em inglês leva etiqueta nas listas.
export const PERFIS: Record<string, { t: string; curto: string; sigla: string; sobre: string }> = {
  br: { t: 'Agência Setup · Brasil', curto: 'Brasil', sigla: 'BR', sobre: 'O perfil principal, em português.' },
  en: { t: 'Setup Agency · Inglês', curto: 'Inglês', sigla: 'EN', sobre: 'O perfil internacional: os mesmos posts em inglês e o curso em dólar.' },
};
export const perfilDe = (p?: string | null) => PERFIS[p === 'en' ? 'en' : 'br'];

export const FORMATOS: Record<string, string> = {
  carrossel: 'Carrossel', post: 'Post', story: 'Story', reels: 'Reels', video: 'Vídeo', short: 'Short', thread: 'Thread', texto: 'Texto',
};

export const TIPOS_RECURSO: Record<string, string> = {
  agente: 'Agente de IA', prompt: 'Prompt', template: 'Template', planilha: 'Planilha', automacao: 'Automação', guia: 'Guia', pack: 'Pack', ferramenta: 'Ferramenta', video: 'Vídeo',
};

export const NIVEIS: Record<string, string> = { '': 'Sem nível', iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

// Ferramentas mais usadas (o campo aceita outras, separadas por vírgula).
export const FERRAMENTAS_SUGERIDAS = ['chatgpt', 'claude', 'gemini', 'midjourney', 'magnific', 'n8n', 'make', 'notion', 'figma', 'capcut', 'sheets'];

// Ferramentas e assuntos que o sistema reconhece (worker/lib/temas.js).
export const FERRAMENTA: Record<string, string> = {
  claude: 'Claude', codex: 'Codex', chatgpt: 'ChatGPT', sora: 'Sora', gemini: 'Gemini', 'nano-banana': 'Nano Banana', veo: 'Veo', midjourney: 'Midjourney',
  photoshop: 'Photoshop', firefly: 'Firefly', illustrator: 'Illustrator', adobe: 'Adobe', canva: 'Canva', figma: 'Figma', capcut: 'CapCut', kling: 'Kling',
  runway: 'Runway', magnific: 'Magnific', higgsfield: 'Higgsfield', elevenlabs: 'ElevenLabs', heygen: 'HeyGen', suno: 'Suno', perplexity: 'Perplexity',
  grok: 'Grok', deepseek: 'DeepSeek', 'meta-ai': 'Meta AI', copilot: 'Copilot', cursor: 'Cursor', lovable: 'Lovable', n8n: 'n8n', notion: 'Notion', manus: 'Manus', mcp: 'MCP',
};
export const TEMA: Record<string, string> = {
  ia: 'IA', prompt: 'Prompt', agente: 'Agentes', automacao: 'Automação', fontes: 'Fontes', textura: 'Texturas', mockup: 'Mockup', pack: 'Pack',
  template: 'Template', clientes: 'Clientes', dinheiro: 'Dinheiro', 'identidade-visual': 'Identidade visual', carrossel: 'Carrossel', video: 'Vídeo',
  meme: 'Meme', novidade: 'Novidade', tutorial: 'Tutorial', organizacao: 'Organização', infoproduto: 'Infoproduto', ...FERRAMENTA,
};
export const TIPO_PAUTA: Record<string, { t: string; cor: string }> = {
  lancamento: { t: 'Lançamento', cor: 'laranja' }, ferramenta: { t: 'Ferramenta', cor: 'azul' }, discussao: { t: 'Discussão', cor: 'cinza' },
  tendencia: { t: 'Tendência', cor: 'ambar' }, noticia: { t: 'Notícia', cor: 'cinza' },
};
export const DIA_SEMANA = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const STATUS_RESPOSTA: Record<string, { t: string; cor: string }> = {
  pendente: { t: 'Na fila', cor: 'ambar' }, enviando: { t: 'Enviando', cor: 'ambar' }, enviada: { t: 'Enviada', cor: 'verde' },
  pergunta: { t: 'Esperando o toque', cor: 'azul' }, respondendo: { t: 'Mandando o material', cor: 'ambar' }, link: { t: 'Material entregue', cor: 'verde' },
  falhou: { t: 'Falhou', cor: 'vermelho' }, ignorada: { t: 'Ignorada', cor: 'cinza' }, duplicada: { t: 'Já tinha recebido', cor: 'cinza' },
};

export const ACOES_HISTORICO: Record<string, string> = {
  'gatilho.criar': 'Criou uma palavra do Comenta X', 'gatilho.editar': 'Editou uma palavra do Comenta X', 'gatilho.ligar': 'Ligou o Comenta X',
  'gatilho.desligar': 'Desligou o Comenta X', 'gatilho.escrever_ia': 'Pediu ao Claude as versões do Comenta X', 'gatilho.nota': 'Escreveu a nota do Comenta X', 'comenta.ajustes': 'Mudou os ajustes do Comenta X', 'gatilho.nao_ligou': 'Não ligou o Comenta X (material fora do ar)', 'oferta.editar': 'Mudou a oferta do funil',
  'atualizar.radar': 'Atualizou o radar', 'atualizar.desempenho': 'Atualizou o desempenho', 'peca.publicar': 'Publicou na rede', 'rede.conectar_inicio': 'Abriu a conexão de uma rede',
  criar: 'Criou', editar: 'Editou', publicar: 'Publicou', arquivar: 'Arquivou', aprovar: 'Aprovou', agendar: 'Agendou', cancelar: 'Cancelou',
  voltar: 'Voltou para rascunho', enviar_arquivo: 'Enviou um arquivo', 'conector.ligar': 'Ligou um app ao painel', 'conector.autorizar': 'Permitiu um app',
  'conector.recusar': 'Recusou um app', 'chave.criar': 'Criou uma chave', 'chave.revogar': 'Revogou uma chave', 'equipe.convidar': 'Convidou alguém',
  'equipe.editar': 'Mudou alguém da equipe', 'rede.conectar': 'Conectou uma rede', 'rede.desligar': 'Desligou uma rede', 'rede.perfil': 'Mudou o perfil de uma conta', 'peca.publicada': 'Publicou na rede',
  'peca.erro': 'Falhou ao publicar', 'config.editar': 'Mudou a configuração',
  'venda.reembolsar': 'Reembolsou uma venda', 'venda.reembolso_agendar': 'Pôs um reembolso na fila', 'venda.reembolso_cancelar': 'Tirou um reembolso da fila', 'venda.reembolso_aluno': 'Aluno pediu reembolso pelo app', 'aluno.reenviar_acesso': 'Reenviou o acesso de um aluno', 'aluno.link': 'Gerou link de entrada de aluno',
  'aluno.liberar': 'Liberou um curso', 'aluno.revogar': 'Tirou o acesso a um curso', 'aula.editar': 'Editou uma aula',
  'oferta_curso.editar': 'Mudou uma oferta do checkout', 'link.criar': 'Criou um link rastreável',
};
