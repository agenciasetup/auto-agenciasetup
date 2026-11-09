// Conversa com a API do aluno (/api/aluno), com o token do login em cada pedido.
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

let aoSair: (() => void) | null = null;
export function quandoSair(fn: () => void) { aoSair = fn; }

export async function api<T = any>(caminho: string, opcoes: { metodo?: string; corpo?: any; semLogin?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!opcoes.semLogin) {
    const t = await token();
    if (t) headers.authorization = `Bearer ${t}`;
  }
  if (opcoes.corpo !== undefined) headers['content-type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(`/api/aluno${caminho}`, { method: opcoes.metodo || (opcoes.corpo !== undefined ? 'POST' : 'GET'), headers, body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined });
  } catch {
    throw new ErroApi(0, 'Sem conexão. Confira a internet e tente de novo.', null);
  }
  const dados = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && aoSair) aoSair();
    throw new ErroApi(r.status, (dados && dados.erro) || `Erro ${r.status}`, dados);
  }
  return dados as T;
}

export const get = <T = any>(c: string) => api<T>(c);
export const post = <T = any>(c: string, corpo: any = {}) => api<T>(c, { metodo: 'POST', corpo });
export const patch = <T = any>(c: string, corpo: any) => api<T>(c, { metodo: 'PATCH', corpo });

// O site principal (checkout, cursos): o mesmo endereço sem o "curso." da frente.
// No computador o app roda na porta 8788 e o site na 8787 (npm run dev e npm run dev:curso).
export const SITE = location.port === '8788' ? `${location.protocol}//${location.hostname}:8787` : `${location.protocol}//${location.host.replace(/^curso\./, '')}`;
