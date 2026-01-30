/**
 * Helper: withTransaction
 * Wrapper para executar operações em transação
 *
 * @module shared/infrastructure/persistence
 */
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';

/**
 * Executa uma função dentro de uma transação SQL Server
 *
 * @example
 * const result = await withTransaction(async (tx) => {
 *   await tx.insert(tableA).values(dataA);
 *   await tx.insert(tableB).values(dataB);
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  work: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await work(tx as unknown as typeof db);
  });
}

/**
 * Versão que retorna Result ao invés de throw
 *
 * @example
 * const result = await withTransactionResult(async (tx) => {
 *   // operações...
 *   return Result.ok(data);
 * });
 */
export async function withTransactionResult<T>(
  work: (tx: typeof db) => Promise<Result<T, string>>
): Promise<Result<T, string>> {
  try {
    return await db.transaction(async (tx) => {
      return await work(tx as unknown as typeof db);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Transaction failed';
    return Result.fail(message);
  }
}
