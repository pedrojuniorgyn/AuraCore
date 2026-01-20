/**
 * Audit Trail Module
 * 
 * Sistema de auditoria append-only para compliance fiscal e segurança.
 * 
 * @example
 * ```typescript
 * import { auditService, type AuditContext } from '@/shared/infrastructure/audit';
 * 
 * const context: AuditContext = {
 *   userId: session.user.id,
 *   userName: session.user.name,
 *   organizationId: ctx.organizationId,
 *   branchId: ctx.branchId,
 *   requestId: headers.get('x-request-id'),
 * };
 * 
 * await auditService.recordAudit(
 *   'fiscal_documents',
 *   document.id,
 *   'UPDATE',
 *   context,
 *   oldDocument,
 *   newDocument
 * );
 * ```
 */

export { AuditService, auditService } from './AuditService';
export * from './audit.types';
export * from './audit.schema';
