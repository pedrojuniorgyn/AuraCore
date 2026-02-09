/**
 * Logging Module Exports
 *
 * Exporta logger e interfaces para uso em toda a aplicacao.
 *
 * @example
 * ```typescript
 * import { logger } from '@/shared/infrastructure/logging';
 * logger.info('Operation completed', { module: 'fiscal', duration: 150 });
 * ```
 */
export { PinoLogger, logger } from './PinoLogger';
export { ConsoleLogger } from './ConsoleLogger';
export type { ILogger } from './ILogger';
