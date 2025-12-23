export function getOrCreateRequestId(headers: Headers): string {
  const existing =
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("x-amzn-trace-id");
  if (existing && existing.trim()) return existing.trim();

  // Node runtime: crypto.randomUUID está disponível
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      // @ts-expect-error - TS lib pode não tipar randomUUID em todos os ambientes
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

