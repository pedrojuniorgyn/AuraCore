import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

/**
 * POST /api/admin/branches/migrate
 * Migração idempotente de colunas auxiliares em dbo.branches.
 *
 * Atualmente:
 * - legacy_company_branch_code: mapeia Branch (AuraCore) -> CodigoEmpresaFilial (legado)
 *   usado pelo módulo Auditoria/ETL para Data Scoping por filial.
 *
 * 🔐 Requer permissão: admin.users.manage
 */
export async function POST(req: NextRequest) {
  // Autorização: reutiliza o token do módulo Audit para automação (Coolify terminal),
  // ou exige permissão via sessão (admin.users.manage).
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) {
    return applyMigrate(req);
  }

  return withPermission(req, "admin.users.manage", async () => applyMigrate(req));
}

async function applyMigrate(req: Request) {
  const debugRequested = req.headers.get("x-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const { ensureConnection, pool } = await import("@/lib/db");
    await ensureConnection();

    await pool.request().query(`
      IF OBJECT_ID('dbo.branches','U') IS NOT NULL
        AND COL_LENGTH('dbo.branches', 'legacy_company_branch_code') IS NULL
      BEGIN
        ALTER TABLE dbo.branches ADD legacy_company_branch_code int NULL;
      END
    `);

    const check = await pool.request().query(`
      SELECT COL_LENGTH('dbo.branches', 'legacy_company_branch_code') as legacy_company_branch_code;
    `);

    const row = (check.recordset?.[0] ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      columns: {
        legacy_company_branch_code: row.legacy_company_branch_code ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao migrar branches",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}

