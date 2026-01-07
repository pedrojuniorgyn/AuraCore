export function getOrCreateRequestId(headers: Headers): string {
  const existing =
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("x-amzn-trace-id");
  if (existing && existing.trim()) return existing.trim();

  // Node runtime: crypto.randomUUID está disponível
  try {
     
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

