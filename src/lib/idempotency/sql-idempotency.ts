import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";
import { log } from "@/lib/observability/logger";

export type IdempotencyAcquireResult =
  | { outcome: "execute" }
  | { outcome: "hit"; status: "SUCCEEDED"; resultRef?: string | null }
  | { outcome: "in_progress"; status: "IN_PROGRESS" };

type AcquireArgs = {
  organizationId: number;
  scope: string;
  key: string;
  ttlMinutes?: number;
};

export async function acquireIdempotency(args: AcquireArgs): Promise<IdempotencyAcquireResult> {
  const ttlMinutes = args.ttlMinutes ?? 24 * 60; // 24h default

  await ensureConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const req = new sql.Request(tx);
    req.input("orgId", sql.Int, args.organizationId);
    req.input("scope", sql.NVarChar(255), args.scope);
    req.input("key", sql.NVarChar(128), args.key);
    req.input("ttl", sql.Int, ttlMinutes);

    const result = await req.query<{
      status: "EXECUTE" | "IN_PROGRESS" | "SUCCEEDED";
      resultRef?: string | null;
    }>(`
      DECLARE @now DATETIME2 = SYSUTCDATETIME();
      DECLARE @status NVARCHAR(16);
      DECLARE @resultRef NVARCHAR(255);
      DECLARE @expiresAt DATETIME2;

      SELECT TOP 1 @status = status,
                   @resultRef = result_ref,
                   @expiresAt = expires_at
      FROM dbo.idempotency_keys WITH (UPDLOCK, HOLDLOCK)
      WHERE organization_id = @orgId
        AND scope = @scope
        AND idem_key = @key;

      IF @status IS NULL
      BEGIN
        INSERT INTO dbo.idempotency_keys (
          organization_id, scope, idem_key, result_ref, status, created_at, updated_at, expires_at
        ) VALUES (
          @orgId, @scope, @key, NULL, 'IN_PROGRESS', @now, @now, DATEADD(minute, @ttl, @now)
        );
        SELECT CAST('EXECUTE' AS NVARCHAR(16)) AS status, CAST(NULL AS NVARCHAR(255)) AS resultRef;
      END
      ELSE IF @expiresAt IS NOT NULL AND @expiresAt <= @now
      BEGIN
        -- Linha expirada ainda existe e é coberta pelo índice único.
        -- Reutiliza a mesma linha ao invés de tentar INSERT (evita violação do UNIQUE).
        UPDATE dbo.idempotency_keys
        SET status = 'IN_PROGRESS',
            last_error = NULL,
            result_ref = NULL,
            updated_at = @now,
            expires_at = DATEADD(minute, @ttl, @now)
        WHERE organization_id = @orgId
          AND scope = @scope
          AND idem_key = @key;
        SELECT CAST('EXECUTE' AS NVARCHAR(16)) AS status, CAST(NULL AS NVARCHAR(255)) AS resultRef;
      END
      ELSE IF @status = 'FAILED'
      BEGIN
        UPDATE dbo.idempotency_keys
        SET status = 'IN_PROGRESS',
            last_error = NULL,
            result_ref = NULL,
            updated_at = @now,
            expires_at = DATEADD(minute, @ttl, @now)
        WHERE organization_id = @orgId
          AND scope = @scope
          AND idem_key = @key;
        SELECT CAST('EXECUTE' AS NVARCHAR(16)) AS status, CAST(NULL AS NVARCHAR(255)) AS resultRef;
      END
      ELSE
      BEGIN
        SELECT @status AS status, @resultRef AS resultRef;
      END
    `);

    await tx.commit();

    const status = result.recordset?.[0]?.status;
    const resultRef = (result.recordset?.[0] as unknown)?.resultRef ?? null;
    if (status === "EXECUTE") {
      log("info", "idempotency.miss", { organizationId: args.organizationId, scope: args.scope });
      return { outcome: "execute" };
    }
    if (status === "SUCCEEDED") {
      log("info", "idempotency.hit", { organizationId: args.organizationId, scope: args.scope });
      return { outcome: "hit", status: "SUCCEEDED", resultRef };
    }
    log("info", "idempotency.in_progress", { organizationId: args.organizationId, scope: args.scope });
    return { outcome: "in_progress", status: "IN_PROGRESS" };
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // ignore
    }
    const msg = (error as unknown)?.message ? String((error as unknown).message) : String(error);
    // Safety: se a migration ainda não foi aplicada, não derruba a operação.
    if (msg.includes("Invalid object name") && msg.includes("idempotency_keys")) {
      log("warn", "idempotency.missing_table", { organizationId: args.organizationId, scope: args.scope });
      return { outcome: "execute" };
    }
    throw error;
  }
}

type FinalizeArgs = {
  organizationId: number;
  scope: string;
  key: string;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
  resultRef?: string | null;
};

export async function finalizeIdempotency(args: FinalizeArgs): Promise<void> {
  await ensureConnection();
  try {
    await pool
      .request()
      .input("orgId", sql.Int, args.organizationId)
      .input("scope", sql.NVarChar(255), args.scope)
      .input("key", sql.NVarChar(128), args.key)
      .input("status", sql.NVarChar(16), args.status)
      .input("err", sql.NVarChar(4000), args.errorMessage ? String(args.errorMessage).slice(0, 4000) : null)
      .input("resultRef", sql.NVarChar(255), args.resultRef ?? null)
      .query(`
        UPDATE dbo.idempotency_keys
        SET status = @status,
            result_ref = CASE WHEN @status = 'SUCCEEDED' THEN @resultRef ELSE result_ref END,
            last_error = @err,
            updated_at = SYSUTCDATETIME()
        WHERE organization_id = @orgId
          AND scope = @scope
          AND idem_key = @key;
      `);
  } catch (error: unknown) {
    const msg = error?.message ? String(error.message) : String(error);
    if (msg.includes("Invalid object name") && msg.includes("idempotency_keys")) {
      log("warn", "idempotency.missing_table_finalize", { organizationId: args.organizationId, scope: args.scope });
      return;
    }
    throw error;
  }
}

