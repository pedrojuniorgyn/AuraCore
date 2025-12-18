import sql from "mssql";
import type { MssqlPool } from "@/lib/audit/db";

type MssqlColumnType = Parameters<sql.Table["columns"]["add"]>[1];

export type BulkColumn = {
  name: string;
  /**
   * Tipo aceito por `mssql.Table#columns.add`.
   */
  type: MssqlColumnType;
  nullable?: boolean;
};

export type BulkRowValue =
  | string
  | number
  | boolean
  | Date
  | Buffer
  | null
  | undefined;

// Envia BIGINT como string (seguro para valores > 2^53 e aceito pelo mssql)
export function toMssqlBigInt(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return Math.trunc(v).toString();
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
}

export async function bulkInsert(
  pool: MssqlPool,
  tableName: string,
  columns: BulkColumn[],
  rows: Array<Record<string, BulkRowValue>>
): Promise<void> {
  if (rows.length === 0) return;

  const t = new sql.Table(tableName);
  t.create = false;

  for (const c of columns) {
    t.columns.add(c.name, c.type, {
      nullable: Boolean(c.nullable),
    });
  }

  for (const r of rows) {
    const values = columns.map((c) => r[c.name]);
    t.rows.add(...(values as BulkRowValue[]));
  }

  await pool.request().bulk(t);
}
