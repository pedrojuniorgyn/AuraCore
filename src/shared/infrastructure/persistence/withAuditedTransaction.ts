/**
 * Helper: withAuditedTransaction
 * Combina transação Drizzle com audit trail automático
 *
 * Padrão: Interceptor + Unit of Work (Fowler, 2002)
 *
 * @module shared/infrastructure/persistence
 */
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import { auditLogTable } from '../audit/audit-log.schema';
import type { AuditOperation, AuditContext } from '../audit/AuditLog';

/**
 * Representa uma operação auditável dentro de uma transação
 */
export interface AuditEntry {
  entityType: string;
  entityId: string;
  operation: AuditOperation;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Contexto disponível dentro da transação auditada
 */
export interface AuditedTransactionContext {
  /** Instância do Drizzle dentro da transação (usar para queries/inserts) */
  tx: typeof db;
  /** Adiciona um registro de auditoria ao batch (será gravado atomicamente) */
  audit(entry: AuditEntry): void;
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /credential/i,
  /certificate/i,
];

function sanitize(values: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (SENSITIVE_PATTERNS.some(p => p.test(key))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Executa operações dentro de uma transação com audit trail automático.
 *
 * Todas as audit entries são gravadas na mesma transação,
 * garantindo atomicidade entre dados de negócio e logs de auditoria.
 *
 * @example
 * const result = await withAuditedTransaction(
 *   { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId },
 *   async ({ tx, audit }) => {
 *     await tx.insert(payableTable).values(data);
 *     audit({
 *       entityType: 'AccountPayable',
 *       entityId: data.id,
 *       operation: 'INSERT',
 *       newValues: data,
 *     });
 *     return Result.ok(data);
 *   }
 * );
 */
export async function withAuditedTransaction<T>(
  context: AuditContext,
  work: (ctx: AuditedTransactionContext) => Promise<Result<T, string>>
): Promise<Result<T, string>> {
  const auditEntries: AuditEntry[] = [];

  try {
    const result = await db.transaction(async (tx) => {
      const txDb = tx as unknown as typeof db;

      const txContext: AuditedTransactionContext = {
        tx: txDb,
        audit(entry: AuditEntry) {
          auditEntries.push(entry);
        },
      };

      const workResult = await work(txContext);

      // Se work retornou falha, o Drizzle fará rollback quando detectar o throw
      if (Result.isFail(workResult)) {
        // Não gravar audit em caso de falha de negócio
        throw new BusinessFailure(workResult.error);
      }

      // Gravar todas as audit entries atomicamente na transação
      if (auditEntries.length > 0) {
        const now = new Date();
        const auditRows = auditEntries.map(entry => ({
          id: globalThis.crypto.randomUUID(),
          entityType: entry.entityType,
          entityId: entry.entityId,
          operation: entry.operation,
          userId: context.userId,
          userName: context.userName || null,
          organizationId: context.organizationId,
          branchId: context.branchId,
          timestamp: now,
          previousValues: entry.previousValues
            ? JSON.stringify(sanitize(entry.previousValues))
            : null,
          newValues: entry.newValues
            ? JSON.stringify(sanitize(entry.newValues))
            : null,
          changedFields: entry.changedFields
            ? JSON.stringify(entry.changedFields)
            : null,
          clientIp: context.clientIp || null,
          userAgent: context.userAgent || null,
          metadata: entry.metadata
            ? JSON.stringify(entry.metadata)
            : null,
        }));

        // Batch insert de audit logs (mais eficiente que N inserts)
        for (const row of auditRows) {
          await txDb.insert(auditLogTable).values(row);
        }
      }

      return workResult;
    });

    return result;
  } catch (error: unknown) {
    if (error instanceof BusinessFailure) {
      return Result.fail(error.message);
    }
    const message = error instanceof Error ? error.message : 'Transaction failed';
    return Result.fail(message);
  }
}

/**
 * Versão simplificada que não retorna Result (lança exceção em erro)
 */
export async function withAuditedTransactionRaw<T>(
  context: AuditContext,
  work: (ctx: AuditedTransactionContext) => Promise<T>
): Promise<T> {
  const auditEntries: AuditEntry[] = [];

  return await db.transaction(async (tx) => {
    const txDb = tx as unknown as typeof db;

    const txContext: AuditedTransactionContext = {
      tx: txDb,
      audit(entry: AuditEntry) {
        auditEntries.push(entry);
      },
    };

    const result = await work(txContext);

    // Gravar audit entries na transação
    if (auditEntries.length > 0) {
      const now = new Date();
      for (const entry of auditEntries) {
        await txDb.insert(auditLogTable).values({
          id: globalThis.crypto.randomUUID(),
          entityType: entry.entityType,
          entityId: entry.entityId,
          operation: entry.operation,
          userId: context.userId,
          userName: context.userName || null,
          organizationId: context.organizationId,
          branchId: context.branchId,
          timestamp: now,
          previousValues: entry.previousValues
            ? JSON.stringify(sanitize(entry.previousValues))
            : null,
          newValues: entry.newValues
            ? JSON.stringify(sanitize(entry.newValues))
            : null,
          changedFields: entry.changedFields
            ? JSON.stringify(entry.changedFields)
            : null,
          clientIp: context.clientIp || null,
          userAgent: context.userAgent || null,
          metadata: entry.metadata
            ? JSON.stringify(entry.metadata)
            : null,
        });
      }
    }

    return result;
  });
}

/**
 * Erro interno para distinguir falha de negócio de erro de sistema
 */
class BusinessFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessFailure';
  }
}
