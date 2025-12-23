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

const GLOBAL_KEY = "__aura_request_buffer__";

function getGlobal(): { items: RequestLogItem[] } {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { items: [] as RequestLogItem[] };
  return g[GLOBAL_KEY];
}

export function pushRequestLog(item: RequestLogItem, maxItems = 500) {
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

