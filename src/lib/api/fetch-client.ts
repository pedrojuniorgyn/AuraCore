/**
 * 🔐 FETCH CLIENT CENTRALIZADO
 * 
 * Wrapper para fetch() que garante:
 * - credentials: 'include' (cookies de sessão)
 * - Content-Type padrão JSON
 * - Tratamento de erros consistente
 * - Tipagem TypeScript
 * 
 * CRÍTICO: Este wrapper foi criado para corrigir bug 500 onde
 * chamadas fetch() não enviavam cookies de sessão, causando
 * falha no getTenantContext() que depende de auth().
 * 
 * @module lib/api/fetch-client
 * @see Sprint Blindagem S2 - Bug 500 Fix (25/01/2026)
 */

export interface FetchAPIOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export interface APIError {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

/**
 * Erro customizado para respostas de API
 */
export class APIResponseError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly data: APIError;

  constructor(response: Response, data: APIError) {
    const message = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
    super(message);
    this.name = 'APIResponseError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
  }
}

/**
 * Cliente fetch centralizado com credentials e error handling.
 * 
 * CRÍTICO: Sempre usa credentials: 'include' para enviar cookies de sessão.
 * Isso é necessário porque getTenantContext() depende de auth() que lê cookies.
 * 
 * @example
 * ```typescript
 * // GET simples
 * const goals = await fetchAPI<GoalsResponse>('/api/strategic/goals');
 * 
 * // POST com body
 * const newGoal = await fetchAPI<Goal>('/api/strategic/goals', {
 *   method: 'POST',
 *   body: { title: 'Novo objetivo', ... }
 * });
 * 
 * // Com query params
 * const url = buildURL('/api/strategic/goals', { status: 'ACTIVE', pageSize: 50 });
 * const filtered = await fetchAPI<GoalsResponse>(url);
 * 
 * // Preservar headers customizados (ex: x-branch-id)
 * const result = await fetchAPI('/api/financial/payables', {
 *   headers: { 'x-branch-id': branchId },
 * });
 * ```
 */
export async function fetchAPI<T = unknown>(
  url: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, ...restOptions } = options;

  // 🔐 CRÍTICO: Sempre incluir credentials para enviar cookies de sessão
  const response = await fetch(url, {
    ...restOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse response
  let data: T | APIError;
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    const text = await response.text();
    data = text ? JSON.parse(text) : ({} as T);
  } else {
    data = {} as T;
  }

  // Handle errors
  if (!response.ok) {
    throw new APIResponseError(response, data as APIError);
  }

  return data as T;
}

/**
 * Versão safe que não lança exceção - retorna { data, error }
 * 
 * @example
 * ```typescript
 * const { data, error } = await fetchAPISafe<Goal[]>('/api/goals');
 * if (error) {
 *   console.error('Falha:', error.message);
 *   return;
 * }
 * setGoals(data);
 * ```
 */
export async function fetchAPISafe<T = unknown>(
  url: string,
  options: FetchAPIOptions = {}
): Promise<{ data: T | null; error: APIResponseError | null }> {
  try {
    const data = await fetchAPI<T>(url, options);
    return { data, error: null };
  } catch (err) {
    if (err instanceof APIResponseError) {
      return { data: null, error: err };
    }
    return {
      data: null,
      error: new APIResponseError(
        new Response(null, { status: 0, statusText: 'Network Error' }),
        { error: err instanceof Error ? err.message : 'Erro de conexão' }
      ),
    };
  }
}

/**
 * Helper para construir URL com query params
 * 
 * @example
 * ```typescript
 * const url = buildURL('/api/goals', { status: 'ACTIVE', page: 1, limit: 20 });
 * // Resultado: '/api/goals?status=ACTIVE&page=1&limit=20'
 * 
 * // Ignora valores null/undefined
 * const url2 = buildURL('/api/goals', { status: undefined, page: 1 });
 * // Resultado: '/api/goals?page=1'
 * ```
 */
export function buildURL(
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return baseUrl;

  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  if (!queryString) return baseUrl;

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
}
