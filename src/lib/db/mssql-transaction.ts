import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";

export type MssqlTx = sql.Transaction;

/**
 * @deprecated Use `withTransaction` ou `withAuditedTransaction` de @/shared/infrastructure/persistence/.
 * Este helper usa o driver raw `mssql` diretamente, bypassando Drizzle ORM.
 * Rotas V2 DDD devem usar Drizzle transactions.
 * 
 * Rotas que ainda usam esta função:
 * - src/app/api/financial/payables/[id]/pay/route.ts
 * - src/app/api/financial/billing/route.ts
 * - src/app/api/accounting/journal-entries/route.ts → V2: /api/v2/accounting/journal-entries
 * - src/app/api/wms/inventory/counts/route.ts (fora do escopo Financial/Fiscal)
 * - src/app/api/fleet/maintenance/work-orders/route.ts (fora do escopo Financial/Fiscal)
 */
export async function withMssqlTransaction<T>(
  fn: (tx: MssqlTx) => Promise<T>,
  opts?: { isolationLevel?: number }
): Promise<T> {
  await ensureConnection();

  const tx = new sql.Transaction(pool);
  const isolationLevel =
    opts?.isolationLevel ?? sql.ISOLATION_LEVEL.READ_COMMITTED;

  await tx.begin(isolationLevel);
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      // noop (rollback can fail if already aborted)
    }
    throw err;
  }
}

