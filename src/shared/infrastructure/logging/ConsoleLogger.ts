import { injectable } from 'tsyringe';
import type { ILogger } from './ILogger';

/**
 * Console Logger Implementation
 * 
 * Implementação simples de logger usando console.log/warn/error.
 * Útil para desenvolvimento e testes.
 * 
 * Para produção, considere usar um logger mais robusto (Pino, Winston, etc).
 */
@injectable()
export class ConsoleLogger implements ILogger {
  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, error.message, error.stack, ...args);
    } else {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

