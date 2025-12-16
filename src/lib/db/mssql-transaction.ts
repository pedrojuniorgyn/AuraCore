import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";

export type MssqlTx = sql.Transaction;

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

