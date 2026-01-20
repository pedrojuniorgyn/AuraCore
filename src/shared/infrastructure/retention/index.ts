/**
 * Retention Policies Module
 * 
 * Sistema de políticas de retenção e limpeza de dados temporários.
 * 
 * @example
 * ```typescript
 * import { retentionService } from '@/shared/infrastructure/retention';
 * 
 * // Executar cleanup
 * const summary = await retentionService.runCleanup();
 * 
 * // Listar políticas
 * const policies = await retentionService.listPolicies();
 * ```
 */

export { RetentionService, retentionService } from './RetentionService';
export * from './retention.types';
export * from './retention.schema';
