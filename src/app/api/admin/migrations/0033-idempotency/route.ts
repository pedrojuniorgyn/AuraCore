import { NextRequest, NextResponse } from "next/server";
import { ensureConnection, pool } from "@/lib/db";
import { withPermission } from "@/lib/auth/api-guard";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

function isInternalTokenOk(req: NextRequest) {
  // Opção 1: reutiliza token já existente (audit/migrações)
  const auditToken = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerAuditToken = req.headers.get("x-audit-token");
  if (auditToken && headerAuditToken && headerAuditToken === auditToken) return true;

  // Opção 2: token dedicado para diagnóstico/migrations
  const diagToken = process.env.INTERNAL_DIAGNOSTICS_TOKEN;
  const headerDiagToken =
    req.headers.get("x-internal-token") || req.headers.get("x-diagnostics-token");
  if (diagToken && headerDiagToken && headerDiagToken === diagToken) return true;

  return false;
}

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
  const handler = async () => {
    await ensureConnection();

    const filePath = join(process.cwd(), "drizzle", "migrations", "0033_idempotency_keys.sql");
    const sqlText = readFileSync(filePath, "utf-8");
    const batches = splitGoBatches(sqlText);

    const results: { batch: number; ok: boolean; error?: string }[] = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        await pool.request().batch(batches[i]);
        results.push({ batch: i + 1, ok: true });
      } catch (e: unknown) {
        results.push({ batch: i + 1, ok: false, error: e instanceof Error ? e.message : String(e) });
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
  };

  // Em ambiente Coolify, é comum operar via terminal do container sem sessão NextAuth.
  // Permitimos execução via token; caso contrário, exige permissão ADMIN.
  if (isInternalTokenOk(req)) return handler();
  return withPermission(req, "admin.users.manage", handler);
}

