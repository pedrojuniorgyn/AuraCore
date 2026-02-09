/**
 * Pino Logger Implementation
 *
 * Logger estruturado para producao usando Pino.
 * Suporta JSON output, child loggers, e configuracao por ambiente.
 *
 * @see ILogger
 * @since Diagnostic Plan - Fase 2 (Logging Estruturado)
 */
import pino from 'pino';
import { injectable } from '@/shared/infrastructure/di/container';
import type { ILogger } from './ILogger';

/**
 * Cria instancia Pino configurada por ambiente
 */
function createPinoInstance(): pino.Logger {
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  return pino({
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')),
    // JSON em producao, pretty em dev
    ...(isDev
      ? {
          transport: {
            target: 'pino/file',
            options: { destination: 1 }, // stdout
          },
        }
      : {}),
    // Campos padrao em todo log
    base: {
      service: 'auracore',
      env: process.env.NODE_ENV || 'development',
    },
    // Redacao de campos sensiveis
    redact: {
      paths: ['password', 'token', 'authorization', 'cookie', 'secret', 'apiKey'],
      censor: '[REDACTED]',
    },
    // Serializacao de erros
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    // Timestamp ISO
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// Singleton Pino instance
let pinoInstance: pino.Logger | null = null;

function getPinoInstance(): pino.Logger {
  if (!pinoInstance) {
    pinoInstance = createPinoInstance();
  }
  return pinoInstance;
}

/**
 * Logger estruturado para producao.
 *
 * Produz JSON logs com campos padrao (service, env, timestamp).
 * Suporta child loggers para contexto adicional.
 *
 * @example
 * ```typescript
 * const logger = new PinoLogger();
 * logger.info('User created', { userId: '123', module: 'auth' });
 * // Output: {"level":"info","time":"2026-02-08T...","service":"auracore","msg":"User created","userId":"123","module":"auth"}
 * ```
 */
@injectable()
export class PinoLogger implements ILogger {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = getPinoInstance();
  }

  info(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      this.logger.info(args[0] as Record<string, unknown>, message);
    } else if (args.length > 0) {
      this.logger.info({ data: args }, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      this.logger.warn(args[0] as Record<string, unknown>, message);
    } else if (args.length > 0) {
      this.logger.warn({ data: args }, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.logger.error(
        { err: error, ...(args.length > 0 ? { data: args } : {}) },
        message
      );
    } else if (error !== undefined) {
      this.logger.error(
        { error, ...(args.length > 0 ? { data: args } : {}) },
        message
      );
    } else {
      this.logger.error(message);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      this.logger.debug(args[0] as Record<string, unknown>, message);
    } else if (args.length > 0) {
      this.logger.debug({ data: args }, message);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Cria child logger com contexto adicional
   * Util para adicionar module/requestId/userId a todos os logs
   */
  child(context: Record<string, unknown>): PinoLogger {
    const childLogger = new PinoLogger();
    (childLogger as unknown as { logger: pino.Logger }).logger = this.logger.child(context);
    return childLogger;
  }
}

/**
 * Singleton logger para uso em modulos que nao usam DI
 * Preferir injecao via container quando possivel
 */
export const logger = new PinoLogger();
