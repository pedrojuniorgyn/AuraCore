/**
 * Route Logger Utility
 * 
 * Helper leve para logging em API routes do Next.js.
 * Usa o PinoLogger compartilhado com contexto de rota.
 * 
 * @example
 * ```typescript
 * import { routeLogger } from '@/shared/infrastructure/logging/route-logger';
 * 
 * const log = routeLogger('GET /api/strategic/goals');
 * 
 * log.info('Fetching goals', { page, pageSize });
 * log.error('Failed to fetch goals', error);
 * ```
 * 
 * @module shared/infrastructure/logging
 * @see E13.4 - Console Cleanup
 */
import { logger } from './PinoLogger';

interface RouteLoggerInstance {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Cria logger para uma rota API com contexto automatico.
 * 
 * @param route - Identificador da rota (ex: 'GET /api/strategic/goals')
 * @returns Logger com metodos info, warn, error, debug
 */
export function routeLogger(route: string): RouteLoggerInstance {
  const child = logger.child({ route });

  return {
    info(message: string, context?: Record<string, unknown>): void {
      child.info(message, context);
    },

    warn(message: string, context?: Record<string, unknown>): void {
      child.warn(message, context);
    },

    error(message: string, error?: unknown, context?: Record<string, unknown>): void {
      if (context) {
        child.error(message, error, context);
      } else {
        child.error(message, error);
      }
    },

    debug(message: string, context?: Record<string, unknown>): void {
      child.debug(message, context);
    },
  };
}
