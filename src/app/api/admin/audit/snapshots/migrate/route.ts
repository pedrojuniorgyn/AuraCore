import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditFinPool } from "@/lib/audit/db";

export const runtime = "nodejs";

async function ensureAuthorized(req: Request): Promise<{ userId: string; email: string } | null> {
  // Autorização: token (preferencial para automação) OU sessão admin
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");

  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) return { userId: "system", email: "system" };

  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return { userId: session.user.id, email: session.user.email ?? session.user.id };
}

export async function POST(req: Request) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  const who = await ensureAuthorized(req);
  if (!who) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const audit = await getAuditFinPool();

    // Idempotente em etapas (evita erro de compile/metadata no mesmo batch).
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
      appliedBy: who.email,
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

