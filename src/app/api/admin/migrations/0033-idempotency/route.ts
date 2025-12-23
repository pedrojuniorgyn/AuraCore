import { NextRequest, NextResponse } from "next/server";
import { ensureConnection, pool } from "@/lib/db";
import { withPermission } from "@/lib/auth/api-guard";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

function splitGoBatches(sqlText: string) {
  // Divide por linhas "GO" (SQL Server), ignorando case e espaços.
  // OBS: não tenta interpretar GO dentro de strings/comentários; para migrations idempotentes é suficiente.
  const parts: string[] = [];
  let current: string[] = [];
  for (const line of sqlText.split(/\r?\n/)) {
    if (/^\s*GO\s*$/i.test(line)) {
      const batch = current.join("\n").trim();
      if (batch) parts.push(batch);
      current = [];
    } else {
      current.push(line);
    }
  }
  const tail = current.join("\n").trim();
  if (tail) parts.push(tail);
  return parts;
}

/**
 * POST /api/admin/migrations/0033-idempotency
 * Executa a migration 0033 (dbo.idempotency_keys).
 *
 * Segurança:
 * - Por padrão exige ADMIN via RBAC (middleware /api/admin).
 * - Em produção (Coolify terminal), pode ser liberado por token no middleware (x-audit-token).
 */
export async function POST(req: NextRequest) {
  return withPermission(req, "admin.users.manage", async () => {
    await ensureConnection();

    const filePath = join(process.cwd(), "drizzle", "migrations", "0033_idempotency_keys.sql");
    const sqlText = readFileSync(filePath, "utf-8");
    const batches = splitGoBatches(sqlText);

    const results: { batch: number; ok: boolean; error?: string }[] = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        await pool.request().batch(batches[i]);
        results.push({ batch: i + 1, ok: true });
      } catch (e: any) {
        results.push({ batch: i + 1, ok: false, error: e?.message ?? String(e) });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      return NextResponse.json(
        { success: false, message: "Migration 0033 executada com falhas", results },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Migration 0033 executada com sucesso", results });
  });
}

