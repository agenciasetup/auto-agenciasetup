// Conversa com a API do Worker (/api/admin). Manda o token do login em cada pedido.
// Modelo: admin/src/nucleo/api.ts do olharondoniense.
import { token } from './auth';

export class ErroApi extends Error {
  status: number;
  dados: any;
  constructor(status: number, mensagem: string, dados: any) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

// No computador (wrangler dev) o painel avisa que é teste; em produção esse cabeçalho não vale nada.
export const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

let aoSair: (() => void) | null = null;
export function quandoSair(fn: () => void) { aoSair = fn; }

export async function api<T = any>(caminho: string, opcoes: { metodo?: string; corpo?: any; form?: FormData; sinal?: AbortSignal } = {}): Promise<T> {
  const t = await token();
  const headers: Record<string, string> = {};
  if (t) headers.authorization = `Bearer ${t}`;
  if (LOCAL) headers['x-teste'] = '1';
  if (opcoes.corpo !== undefined) headers['content-type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(`/api/admin${caminho}`, {
      method: opcoes.metodo || (opcoes.corpo !== undefined || opcoes.form ? 'POST' : 'GET'),
      headers, body: opcoes.form || (opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined), signal: opcoes.sinal,
    });
  } catch (e: any) {
    if (e && e.name === 'AbortError') throw e;
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira a internet e tente de novo.', null);
  }
  const tipo = r.headers.get('content-type') || '';
  const dados = tipo.includes('json') ? await r.json().catch(() => null) : await r.text();
  if (!r.ok) {
    if (r.status === 401 && aoSair && caminho !== '/eu') aoSair();
    throw new ErroApi(r.status, (dados && dados.erro) || `Erro ${r.status}`, dados);
  }
  return dados as T;
}

export const get = <T = any>(c: string) => api<T>(c);
export const post = <T = any>(c: string, corpo: any = {}) => api<T>(c, { metodo: 'POST', corpo });
export const patch = <T = any>(c: string, corpo: any) => api<T>(c, { metodo: 'PATCH', corpo });

// Envia um arquivo para o Storage (bucket recursos ou midia). Devolve { url, bytes, nome, tipo }.
export function enviarArquivo(arquivo: File, bucket: 'recursos' | 'midia') {
  const form = new FormData();
  form.append('arquivo', arquivo);
  form.append('bucket', bucket);
  return api<{ url: string; bytes: number; nome: string; tipo: string }>('/arquivos', { metodo: 'POST', form });
}
