export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

export function log(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload: LogFields = {
    ts: nowIso(),
    level,
    msg: message,
    service: "aura_core",
    env: process.env.NODE_ENV ?? "unknown",
    ...fields,
  };

  // Normaliza erro para JSON estável
  if (payload.error) {
    payload.error = serializeError(payload.error);
  }

  // Console JSON (Coolify/Docker-friendly)
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

