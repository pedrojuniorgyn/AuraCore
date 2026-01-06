import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";
import {
  ensureDocumentTables,
  getDocument,
  updateDocumentStatus,
  updateJobAsFinished,
  type JobRow,
} from "@/lib/documents/document-db";
import { downloadObjectToBuffer } from "@/lib/storage/s3";
import { importOfxToBankTransactions } from "@/lib/financial/ofx-import";
import { log } from "@/lib/observability/logger";

export const DOCUMENT_JOB_TYPES = {
  FINANCIAL_OFX_IMPORT: "FINANCIAL_OFX_IMPORT",
} as const;

type ClaimResult = JobRow | null;

async function claimNextJob(): Promise<ClaimResult> {
  await ensureDocumentTables();
  await ensureConnection();

  const result = await pool.request().query<JobRow>(`
    DECLARE @now DATETIME2 = SYSUTCDATETIME();

    ;WITH nextJob AS (
      SELECT TOP (1) *
      FROM dbo.document_jobs WITH (READPAST, UPDLOCK, ROWLOCK)
      WHERE status = 'QUEUED'
        AND scheduled_at <= @now
        AND attempts < max_attempts
      ORDER BY scheduled_at ASC, id ASC
    )
    UPDATE nextJob
    SET status = 'RUNNING',
        attempts = attempts + 1,
        started_at = @now,
        updated_at = @now
    OUTPUT
      INSERTED.id as id,
      INSERTED.organization_id as organizationId,
      INSERTED.document_id as documentId,
      INSERTED.job_type as jobType,
      INSERTED.status as status,
      INSERTED.attempts as attempts,
      INSERTED.max_attempts as maxAttempts,
      CONVERT(NVARCHAR(30), INSERTED.scheduled_at, 127) as scheduledAt,
      CASE WHEN INSERTED.started_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), INSERTED.started_at, 127) END as startedAt,
      CASE WHEN INSERTED.finished_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), INSERTED.finished_at, 127) END as finishedAt,
      INSERTED.last_error as lastError,
      INSERTED.payload_json as payloadJson,
      INSERTED.result_json as resultJson,
      CONVERT(NVARCHAR(30), INSERTED.created_at, 127) as createdAt,
      CONVERT(NVARCHAR(30), INSERTED.updated_at, 127) as updatedAt;
  `);

  return (result.recordset?.[0] as any) ?? null;
}

function safeJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function runJob(job: JobRow): Promise<void> {
  const orgId = job.organizationId;

  if (job.jobType === DOCUMENT_JOB_TYPES.FINANCIAL_OFX_IMPORT) {
    const payload = safeJson<{ bankAccountId: number; userId: string }>(job.payloadJson) ?? ({} as any);
    const bankAccountId = Number(payload.bankAccountId);
    const userId = String(payload.userId ?? "");
    if (!Number.isFinite(bankAccountId) || bankAccountId <= 0 || !userId) {
      throw new Error("Payload inválido para FINANCIAL_OFX_IMPORT");
    }

    const doc = await getDocument({ organizationId: orgId, documentId: job.documentId });
    if (!doc) {
      throw new Error("Documento não encontrado para o job");
    }

    await updateDocumentStatus({ organizationId: orgId, documentId: job.documentId, status: "PROCESSING" });

    const buf = await downloadObjectToBuffer({ key: doc.storageKey });
    const content = buf.toString("utf-8");

    const result = await importOfxToBankTransactions({
      organizationId: orgId,
      userId,
      bankAccountId,
      content,
    });

    await updateDocumentStatus({ organizationId: orgId, documentId: job.documentId, status: "SUCCEEDED" });
    await updateJobAsFinished({
      organizationId: orgId,
      jobId: job.id,
      status: "SUCCEEDED",
      result,
    });
    return;
  }

  throw new Error(`JobType não suportado: ${job.jobType}`);
}

export async function runDocumentJobsTick(args?: { maxJobs?: number }): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const maxJobs = Math.max(1, Math.min(50, args?.maxJobs ?? 5));
  await ensureDocumentTables();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < maxJobs; i++) {
    const job = await claimNextJob();
    if (!job) break;

    processed++;
    log("info", "documents.job.claimed", { jobId: job.id, jobType: job.jobType, organizationId: job.organizationId });

    try {
      await runJob(job);
      succeeded++;
      log("info", "documents.job.succeeded", { jobId: job.id, jobType: job.jobType, organizationId: job.organizationId });
    } catch (e: unknown) {
      failed++;
      const err = e?.message ?? String(e);
      log("error", "documents.job.failed", { jobId: job.id, jobType: job.jobType, organizationId: job.organizationId, error: e });

      // best-effort: marcar job/doc como FAILED
      try {
        await updateDocumentStatus({ organizationId: job.organizationId, documentId: job.documentId, status: "FAILED", lastError: err });
      } catch {
        // ignore
      }
      try {
        await updateJobAsFinished({
          organizationId: job.organizationId,
          jobId: job.id,
          status: "FAILED",
          lastError: err,
        });
      } catch {
        // ignore
      }
    }
  }

  return { processed, succeeded, failed };
}

