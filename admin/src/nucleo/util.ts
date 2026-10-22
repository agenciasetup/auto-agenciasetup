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

export function dinheiro(centavos?: number | null) {
  if (centavos === null || centavos === undefined || centavos === ('' as any)) return '';
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export const NOME_PAPEL: Record<string, string> = { administrador: 'Administrador', editor: 'Editor', redator: 'Redator' };
export const DESCRICAO_PAPEL: Record<string, string> = {
  administrador: 'Faz tudo: equipe, configurações, conectar redes e chaves de todos.',
  editor: 'Publica conteúdo, aprova e agenda peças, cuida de cursos e anúncios.',
  redator: 'Cria e edita rascunhos. Não publica nem aprova.',
};

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

export const FORMATOS: Record<string, string> = {
  carrossel: 'Carrossel', post: 'Post', story: 'Story', reels: 'Reels', video: 'Vídeo', short: 'Short', thread: 'Thread', texto: 'Texto',
};

export const TIPOS_RECURSO: Record<string, string> = {
  agente: 'Agente de IA', prompt: 'Prompt', template: 'Template', planilha: 'Planilha', automacao: 'Automação', guia: 'Guia', pack: 'Pack', ferramenta: 'Ferramenta', video: 'Vídeo',
};

export const NIVEIS: Record<string, string> = { '': 'Sem nível', iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

// Ferramentas mais usadas (o campo aceita outras, separadas por vírgula).
export const FERRAMENTAS_SUGERIDAS = ['chatgpt', 'claude', 'gemini', 'midjourney', 'magnific', 'n8n', 'make', 'notion', 'figma', 'capcut', 'sheets'];

export const ACOES_HISTORICO: Record<string, string> = {
  criar: 'Criou', editar: 'Editou', publicar: 'Publicou', arquivar: 'Arquivou', aprovar: 'Aprovou', agendar: 'Agendou', cancelar: 'Cancelou',
  voltar: 'Voltou para rascunho', enviar_arquivo: 'Enviou um arquivo', 'conector.ligar': 'Ligou um app ao painel', 'conector.autorizar': 'Permitiu um app',
  'conector.recusar': 'Recusou um app', 'chave.criar': 'Criou uma chave', 'chave.revogar': 'Revogou uma chave', 'equipe.convidar': 'Convidou alguém',
  'equipe.editar': 'Mudou alguém da equipe', 'rede.conectar': 'Conectou uma rede', 'rede.desligar': 'Desligou uma rede', 'peca.publicada': 'Publicou na rede',
  'peca.erro': 'Falhou ao publicar', 'config.editar': 'Mudou a configuração',
};
