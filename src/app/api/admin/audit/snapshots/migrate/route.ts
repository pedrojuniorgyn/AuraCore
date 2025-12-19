import { NextRequest, NextResponse } from "next/server";
import { getAuditFinPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

async function applyMigrate(req: Request, appliedByEmail: string) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const audit = await getAuditFinPool();

    // Idempotente em etapas (evita erro de compile/metadata no mesmo batch).
    // Multi-tenant: garantir colunas de segregação em audit_snapshot_runs.
    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_snapshot_runs', 'organization_id') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_snapshot_runs ADD organization_id int NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_user_id') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_snapshot_runs ADD requested_by_user_id nvarchar(255) NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_snapshot_runs', 'requested_by_email') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_snapshot_runs ADD requested_by_email nvarchar(255) NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_snapshot_runs', 'branch_id') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_snapshot_runs ADD branch_id int NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_snapshot_runs','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_snapshot_runs', 'legacy_company_branch_code') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_snapshot_runs ADD legacy_company_branch_code int NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_raw_conta_bancaria','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_raw_conta_bancaria', 'numero_conta') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_raw_conta_bancaria ADD numero_conta nvarchar(50) NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_id_inferida bigint NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_inferida_regra nvarchar(50) NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_confidence') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_fact_parcelas ADD conta_bancaria_inferida_confidence tinyint NULL;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'is_conta_bancaria_inferida') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_fact_parcelas ADD is_conta_bancaria_inferida bit NULL;
      END
    `);

    // Computed depende da coluna inferida existir; manter em batch separado.
    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') IS NULL
      BEGIN
        ALTER TABLE dbo.audit_fact_parcelas
          ADD conta_bancaria_id_efetiva AS (COALESCE(conta_bancaria_id, conta_bancaria_id_inferida)) PERSISTED;
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = 'IX_audit_fact_parcelas_run_conta_inferida'
            AND object_id = OBJECT_ID('dbo.audit_fact_parcelas')
        )
      BEGIN
        CREATE INDEX IX_audit_fact_parcelas_run_conta_inferida
          ON dbo.audit_fact_parcelas (run_id, conta_bancaria_id_inferida);
      END
    `);

    await audit.request().query(`
      IF OBJECT_ID('dbo.audit_fact_parcelas','U') IS NOT NULL
        AND COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = 'IX_audit_fact_parcelas_run_conta_efetiva'
            AND object_id = OBJECT_ID('dbo.audit_fact_parcelas')
        )
      BEGIN
        CREATE INDEX IX_audit_fact_parcelas_run_conta_efetiva
          ON dbo.audit_fact_parcelas (run_id, conta_bancaria_id_efetiva);
      END
    `);

    const check = await audit.request().query(`
      SELECT
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_inferida') as conta_bancaria_id_inferida,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_regra') as conta_bancaria_inferida_regra,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_inferida_confidence') as conta_bancaria_inferida_confidence,
        COL_LENGTH('dbo.audit_fact_parcelas', 'is_conta_bancaria_inferida') as is_conta_bancaria_inferida,
        COL_LENGTH('dbo.audit_fact_parcelas', 'conta_bancaria_id_efetiva') as conta_bancaria_id_efetiva
    `);

    const row = (check.recordset?.[0] ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      appliedBy: appliedByEmail,
      columns: {
        conta_bancaria_id_inferida: row.conta_bancaria_id_inferida ?? null,
        conta_bancaria_inferida_regra: row.conta_bancaria_inferida_regra ?? null,
        conta_bancaria_inferida_confidence: row.conta_bancaria_inferida_confidence ?? null,
        is_conta_bancaria_inferida: row.is_conta_bancaria_inferida ?? null,
        conta_bancaria_id_efetiva: row.conta_bancaria_id_efetiva ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      {
        error: "Falha ao aplicar migração do AuditFinDB",
        ...(isProd && !debugRequested ? {} : { debug: { message } }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Autorização: token (preferencial para automação) OU permissão via sessão (RBAC)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) return applyMigrate(req, "system");

  return withPermission(req, "audit.migrate", async (user) => applyMigrate(req, user.email ?? user.id));
}

