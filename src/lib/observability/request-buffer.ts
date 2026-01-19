/**
 * Request Buffer para Observabilidade
 * 
 * Buffer in-memory para requests com:
 * - Lista de requests lentas
 * - Agregação por endpoint (p50/p95/p99)
 * - Taxa de erro por endpoint
 * 
 * @module lib/observability/request-buffer
 * @see E8.5 - Observabilidade
 */

export type RequestLogItem = {
  ts: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  organizationId?: number;
  branchId?: number | null;
  permission?: string;
};

/**
 * Estatísticas agregadas por endpoint
 */
export interface EndpointStats {
  endpoint: string;  // "METHOD /path"
  method: string;
  path: string;
  count: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  errorCount: number;
  errorRate: number;
  lastRequestAt: string;
}

/**
 * Resposta de diagnóstico geral
 */
export interface DiagnosticsResponse {
  uptime: number;
  totalRequests: number;
  requestsInBuffer: number;
  slowRequests: RequestLogItem[];
  endpointStats: EndpointStats[];
  errors: RequestLogItem[];
  timestamp: string;
}

const GLOBAL_KEY = "__aura_request_buffer__";
const MAX_ITEMS = Number(process.env.OBS_MAX_REQUESTS) || 5000;

function getGlobal(): { items: RequestLogItem[] } {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { items: [] as RequestLogItem[] };
  return g[GLOBAL_KEY] as { items: RequestLogItem[] };
}

export function pushRequestLog(item: RequestLogItem, maxItems = MAX_ITEMS) {
  const buf = getGlobal();
  buf.items.push(item);
  if (buf.items.length > maxItems) {
    buf.items.splice(0, buf.items.length - maxItems);
  }
}

export function listRequestLogs(opts?: {
  sinceMs?: number;
  minDurationMs?: number;
  limit?: number;
}): RequestLogItem[] {
  const buf = getGlobal();
  const sinceMs = opts?.sinceMs;
  const minDurationMs = opts?.minDurationMs ?? 0;
  const limit = opts?.limit ?? 200;

  const now = Date.now();
  const filtered = buf.items.filter((i) => {
    if (minDurationMs && i.durationMs < minDurationMs) return false;
    if (sinceMs) {
      const t = Date.parse(i.ts);
      if (Number.isFinite(t) && now - t > sinceMs) return false;
    }
    return true;
  });

  // mais lentos primeiro
  filtered.sort((a, b) => b.durationMs - a.durationMs);
  return filtered.slice(0, limit);
}

/**
 * Retorna requests com erro (status >= 400)
 */
export function listErrorLogs(opts?: {
  sinceMs?: number;
  limit?: number;
}): RequestLogItem[] {
  const buf = getGlobal();
  const sinceMs = opts?.sinceMs;
  const limit = opts?.limit ?? 50;

  const now = Date.now();
  const filtered = buf.items.filter((i) => {
    if (i.status < 400) return false;
    if (sinceMs) {
      const t = Date.parse(i.ts);
      if (Number.isFinite(t) && now - t > sinceMs) return false;
    }
    return true;
  });

  // mais recentes primeiro
  filtered.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return filtered.slice(0, limit);
}

/**
 * Calcula percentil de um array ordenado
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Retorna estatísticas agregadas por endpoint
 */
export function getEndpointStats(opts?: {
  sinceMs?: number;
  limit?: number;
}): EndpointStats[] {
  const buf = getGlobal();
  const sinceMs = opts?.sinceMs ?? 60 * 60 * 1000; // Default: última hora
  const limit = opts?.limit ?? 100;

  const now = Date.now();
  
  // Filtrar por tempo
  const filtered = buf.items.filter((i) => {
    const t = Date.parse(i.ts);
    return Number.isFinite(t) && now - t <= sinceMs;
  });

  // Agrupar por endpoint (method + path normalizado)
  const grouped = new Map<string, RequestLogItem[]>();
  for (const req of filtered) {
    // Normalizar path (remover IDs numéricos e UUIDs)
    const normalizedPath = req.path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
    
    const key = `${req.method} ${normalizedPath}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(req);
  }

  // Calcular stats por grupo
  const stats: EndpointStats[] = [];
  for (const [endpoint, requests] of grouped) {
    const [method, ...pathParts] = endpoint.split(' ');
    const path = pathParts.join(' ');
    
    const durations = requests.map(r => r.durationMs).sort((a, b) => a - b);
    const errors = requests.filter(r => r.status >= 400);
    const lastRequest = requests.reduce((latest, r) => {
      const t = Date.parse(r.ts);
      const latestT = Date.parse(latest.ts);
      return t > latestT ? r : latest;
    }, requests[0]);

    stats.push({
      endpoint,
      method,
      path,
      count: requests.length,
      avgDurationMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50DurationMs: percentile(durations, 50),
      p95DurationMs: percentile(durations, 95),
      p99DurationMs: percentile(durations, 99),
      maxDurationMs: Math.max(...durations),
      minDurationMs: Math.min(...durations),
      errorCount: errors.length,
      errorRate: Math.round((errors.length / requests.length) * 100 * 100) / 100,
      lastRequestAt: lastRequest.ts,
    });
  }

  // Ordenar por p95 (mais lentos primeiro)
  stats.sort((a, b) => b.p95DurationMs - a.p95DurationMs);
  return stats.slice(0, limit);
}

/**
 * Retorna total de requests no buffer
 */
export function getTotalRequests(): number {
  return getGlobal().items.length;
}

/**
 * Limpa requests antigas do buffer
 */
export function cleanupOldRequests(olderThanMs: number): number {
  const buf = getGlobal();
  const now = Date.now();
  const before = buf.items.length;
  
  buf.items = buf.items.filter((i) => {
    const t = Date.parse(i.ts);
    return Number.isFinite(t) && now - t <= olderThanMs;
  });
  
  return before - buf.items.length;
}

