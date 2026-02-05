export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function serializeError(err: unknown): { name?: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

/**
 * Logger estruturado para produção (JSON) e desenvolvimento (console)
 * 
 * @example
 * log('info', 'User logged in', { userId: 123 });
 * log('error', 'Database error', { error: err, method: 'findById' });
 */
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Log de erro com contexto estruturado
 * Captura stack trace automaticamente
 * 
 * @example
 * logError('Failed to save OKR', error, { method: 'save', okrId: '123' });
 */
export function logError(message: string, error: unknown, context?: LogFields) {
  log("error", message, {
    ...context,
    error,
  });
}

/**
 * Log de warning com contexto
 * 
 * @example
 * logWarn('Mapping failed', { okrId: '123', reason: 'Invalid status' });
 */
export function logWarn(message: string, context?: LogFields) {
  log("warn", message, context);
}

/**
 * Log de informação
 * 
 * @example
 * logInfo('OKR created', { okrId: '123', userId: 'user-1' });
 */
export function logInfo(message: string, context?: LogFields) {
  log("info", message, context);
}

/**
 * Log de debug (só aparece se LOG_LEVEL=debug)
 * 
 * @example
 * logDebug('Query executed', { sql: 'SELECT...', duration: 15 });
 */
export function logDebug(message: string, context?: LogFields) {
  // Só loga se LOG_LEVEL for debug
  if (process.env.LOG_LEVEL === "debug") {
    log("debug", message, context);
  }
}

