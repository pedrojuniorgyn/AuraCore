import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";

export type OpsHealthStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export type OpsHealthRunRow = {
  id: number;
  runId: string;
  status: OpsHealthStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  summaryJson: string | null;
  detailsJson: string | null;
  errorMessage: string | null;
};

export async function ensureOpsHealthTable(): Promise<void> {
  await ensureConnection();

  // Idempotente: cria tabela + índice se não existirem
  await pool.request().batch(`
    IF OBJECT_ID('dbo.ops_health_runs', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ops_health_runs (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        run_id NVARCHAR(64) NOT NULL,
        status NVARCHAR(16) NOT NULL,
        started_at DATETIME2 NOT NULL CONSTRAINT DF_ops_health_started_at DEFAULT SYSUTCDATETIME(),
        finished_at DATETIME2 NULL,
        duration_ms INT NULL,
        summary_json NVARCHAR(MAX) NULL,
        details_json NVARCHAR(MAX) NULL,
        error_message NVARCHAR(MAX) NULL
      );
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.ops_health_runs')
        AND name = 'UX_ops_health_runs_run_id'
    )
    BEGIN
      CREATE UNIQUE INDEX UX_ops_health_runs_run_id ON dbo.ops_health_runs(run_id);
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.ops_health_runs')
        AND name = 'IX_ops_health_runs_started_at'
    )
    BEGIN
      CREATE INDEX IX_ops_health_runs_started_at ON dbo.ops_health_runs(started_at DESC);
    END;
  `);
}

export async function insertOpsHealthRun(runId: string): Promise<number> {
  await ensureOpsHealthTable();
  const result = await pool
    .request()
    .input("runId", sql.NVarChar(64), runId)
    .input("status", sql.NVarChar(16), "RUNNING")
    .query<{ id: number }>(`
      INSERT INTO dbo.ops_health_runs (run_id, status)
      OUTPUT INSERTED.id as id
      VALUES (@runId, @status);
    `);
  const id = Number(result.recordset?.[0]?.id);
  return id;
}

export async function finishOpsHealthRun(args: {
  id: number;
  status: OpsHealthStatus;
  durationMs: number;
  summary: unknown;
  details: unknown;
  errorMessage?: string | null;
}) {
  await ensureOpsHealthTable();
  await pool
    .request()
    .input("id", sql.Int, args.id)
    .input("status", sql.NVarChar(16), args.status)
    .input("durationMs", sql.Int, Math.max(0, Math.round(args.durationMs)))
    .input("summaryJson", sql.NVarChar(sql.MAX), JSON.stringify(args.summary ?? null))
    .input("detailsJson", sql.NVarChar(sql.MAX), JSON.stringify(args.details ?? null))
    .input("errorMessage", sql.NVarChar(sql.MAX), args.errorMessage ? String(args.errorMessage) : null)
    .query(`
      UPDATE dbo.ops_health_runs
      SET status = @status,
          finished_at = SYSUTCDATETIME(),
          duration_ms = @durationMs,
          summary_json = @summaryJson,
          details_json = @detailsJson,
          error_message = @errorMessage
      WHERE id = @id;
    `);
}

export async function getLatestOpsHealthRun(): Promise<OpsHealthRunRow | null> {
  await ensureOpsHealthTable();
  const result = await pool.request().query<OpsHealthRunRow>(`
    SELECT TOP 1
      id as id,
      run_id as runId,
      status as status,
      CONVERT(NVARCHAR(30), started_at, 127) as startedAt,
      CASE WHEN finished_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), finished_at, 127) END as finishedAt,
      duration_ms as durationMs,
      summary_json as summaryJson,
      details_json as detailsJson,
      error_message as errorMessage
    FROM dbo.ops_health_runs
    ORDER BY started_at DESC, id DESC;
  `);
  return (result.recordset?.[0] as any) ?? null;
}

export async function listOpsHealthRuns(limit = 50): Promise<OpsHealthRunRow[]> {
  await ensureOpsHealthTable();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;
  const result = await pool
    .request()
    .input("limit", sql.Int, safeLimit)
    .query<OpsHealthRunRow>(`
      SELECT TOP (@limit)
        id as id,
        run_id as runId,
        status as status,
        CONVERT(NVARCHAR(30), started_at, 127) as startedAt,
        CASE WHEN finished_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), finished_at, 127) END as finishedAt,
        duration_ms as durationMs,
        summary_json as summaryJson,
        details_json as detailsJson,
        error_message as errorMessage
      FROM dbo.ops_health_runs
      ORDER BY started_at DESC, id DESC;
    `);
  return (result.recordset as any) ?? [];
}

