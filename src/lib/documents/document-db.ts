import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";

export type DocumentStatus = "UPLOADED" | "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type DocumentRow = {
  id: number;
  organizationId: number;
  docType: string;
  entityTable: string | null;
  entityId: number | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string | null;
  storageProvider: string;
  storageBucket: string | null;
  storageKey: string;
  storageUrl: string | null;
  status: DocumentStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
  metadataJson: string | null;
};

export type JobRow = {
  id: number;
  organizationId: number;
  documentId: number;
  jobType: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  payloadJson: string | null;
  resultJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function ensureDocumentTables(): Promise<void> {
  await ensureConnection();

  await pool.request().batch(`
    IF OBJECT_ID('dbo.document_store', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.document_store (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        organization_id INT NOT NULL,
        doc_type NVARCHAR(64) NOT NULL,
        entity_table NVARCHAR(128) NULL,
        entity_id INT NULL,
        file_name NVARCHAR(255) NOT NULL,
        mime_type NVARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        sha256 NVARCHAR(64) NULL,
        storage_provider NVARCHAR(20) NOT NULL CONSTRAINT DF_document_store_provider DEFAULT('S3'),
        storage_bucket NVARCHAR(255) NULL,
        storage_key NVARCHAR(1024) NOT NULL,
        storage_url NVARCHAR(1024) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_document_store_status DEFAULT('UPLOADED'),
        metadata_json NVARCHAR(MAX) NULL,
        last_error NVARCHAR(MAX) NULL,
        created_by NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_document_store_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_document_store_updated_at DEFAULT SYSUTCDATETIME(),
        deleted_at DATETIME2 NULL
      );
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.document_store')
        AND name = 'IX_document_store_org_created_at'
    )
    BEGIN
      CREATE INDEX IX_document_store_org_created_at
      ON dbo.document_store(organization_id, created_at DESC);
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.document_store')
        AND name = 'UX_document_store_org_storage_key'
    )
    BEGIN
      CREATE UNIQUE INDEX UX_document_store_org_storage_key
      ON dbo.document_store(organization_id, storage_key);
    END;

    IF OBJECT_ID('dbo.document_jobs', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.document_jobs (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        organization_id INT NOT NULL,
        document_id BIGINT NOT NULL,
        job_type NVARCHAR(64) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_document_jobs_status DEFAULT('QUEUED'),
        attempts INT NOT NULL CONSTRAINT DF_document_jobs_attempts DEFAULT(0),
        max_attempts INT NOT NULL CONSTRAINT DF_document_jobs_max_attempts DEFAULT(5),
        scheduled_at DATETIME2 NOT NULL CONSTRAINT DF_document_jobs_scheduled_at DEFAULT SYSUTCDATETIME(),
        started_at DATETIME2 NULL,
        finished_at DATETIME2 NULL,
        payload_json NVARCHAR(MAX) NULL,
        result_json NVARCHAR(MAX) NULL,
        last_error NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_document_jobs_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_document_jobs_updated_at DEFAULT SYSUTCDATETIME()
      );
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.document_jobs')
        AND name = 'IX_document_jobs_queue'
    )
    BEGIN
      CREATE INDEX IX_document_jobs_queue
      ON dbo.document_jobs(status, scheduled_at, id);
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.document_jobs')
        AND name = 'IX_document_jobs_org_created_at'
    )
    BEGIN
      CREATE INDEX IX_document_jobs_org_created_at
      ON dbo.document_jobs(organization_id, created_at DESC);
    END;
  `);
}

export async function insertDocument(args: {
  organizationId: number;
  docType: string;
  entityTable?: string | null;
  entityId?: number | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string | null;
  storageProvider: string;
  storageBucket?: string | null;
  storageKey: string;
  storageUrl?: string | null;
  status?: DocumentStatus;
  metadata?: unknown;
  createdBy?: string | null;
}): Promise<number> {
  await ensureDocumentTables();
  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("docType", sql.NVarChar(64), args.docType)
    .input("entityTable", sql.NVarChar(128), args.entityTable ?? null)
    .input("entityId", sql.Int, args.entityId ?? null)
    .input("fileName", sql.NVarChar(255), args.fileName)
    .input("mimeType", sql.NVarChar(100), args.mimeType)
    .input("sizeBytes", sql.BigInt, BigInt(Math.max(0, Math.trunc(args.sizeBytes))))
    .input("sha256", sql.NVarChar(64), args.sha256 ?? null)
    .input("storageProvider", sql.NVarChar(20), args.storageProvider)
    .input("storageBucket", sql.NVarChar(255), args.storageBucket ?? null)
    .input("storageKey", sql.NVarChar(1024), args.storageKey)
    .input("storageUrl", sql.NVarChar(1024), args.storageUrl ?? null)
    .input("status", sql.NVarChar(20), args.status ?? "UPLOADED")
    .input("metadataJson", sql.NVarChar(sql.MAX), args.metadata ? JSON.stringify(args.metadata) : null)
    .input("createdBy", sql.NVarChar(255), args.createdBy ?? null)
    .query<{ id: number }>(`
      INSERT INTO dbo.document_store (
        organization_id, doc_type, entity_table, entity_id,
        file_name, mime_type, size_bytes, sha256,
        storage_provider, storage_bucket, storage_key, storage_url,
        status, metadata_json, created_by
      )
      OUTPUT INSERTED.id as id
      VALUES (
        @orgId, @docType, @entityTable, @entityId,
        @fileName, @mimeType, @sizeBytes, @sha256,
        @storageProvider, @storageBucket, @storageKey, @storageUrl,
        @status, @metadataJson, @createdBy
      );
    `);
  return Number(result.recordset?.[0]?.id);
}

export async function updateDocumentStatus(args: {
  organizationId: number;
  documentId: number;
  status: DocumentStatus;
  lastError?: string | null;
}): Promise<void> {
  await ensureDocumentTables();
  await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("docId", sql.BigInt, BigInt(args.documentId))
    .input("status", sql.NVarChar(20), args.status)
    .input("err", sql.NVarChar(sql.MAX), args.lastError ? String(args.lastError) : null)
    .query(`
      UPDATE dbo.document_store
      SET status = @status,
          last_error = @err,
          updated_at = SYSUTCDATETIME()
      WHERE organization_id = @orgId
        AND id = @docId
        AND deleted_at IS NULL;
    `);
}

export async function insertJob(args: {
  organizationId: number;
  documentId: number;
  jobType: string;
  payload?: unknown;
  scheduledAt?: Date;
  maxAttempts?: number;
}): Promise<number> {
  await ensureDocumentTables();
  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("docId", sql.BigInt, BigInt(args.documentId))
    .input("jobType", sql.NVarChar(64), args.jobType)
    .input("payloadJson", sql.NVarChar(sql.MAX), args.payload ? JSON.stringify(args.payload) : null)
    .input("scheduledAt", sql.DateTime2, args.scheduledAt ?? new Date())
    .input("maxAttempts", sql.Int, Math.max(1, Math.min(20, args.maxAttempts ?? 5)))
    .query<{ id: number }>(`
      INSERT INTO dbo.document_jobs (
        organization_id, document_id, job_type, status,
        attempts, max_attempts, scheduled_at, payload_json
      )
      OUTPUT INSERTED.id as id
      VALUES (
        @orgId, @docId, @jobType, 'QUEUED',
        0, @maxAttempts, @scheduledAt, @payloadJson
      );
    `);
  return Number(result.recordset?.[0]?.id);
}

export async function getDocument(args: { organizationId: number; documentId: number }): Promise<DocumentRow | null> {
  await ensureDocumentTables();
  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("docId", sql.BigInt, BigInt(args.documentId))
    .query<DocumentRow>(`
      SELECT TOP 1
        id as id,
        organization_id as organizationId,
        doc_type as docType,
        entity_table as entityTable,
        entity_id as entityId,
        file_name as fileName,
        mime_type as mimeType,
        CAST(size_bytes AS BIGINT) as sizeBytes,
        sha256 as sha256,
        storage_provider as storageProvider,
        storage_bucket as storageBucket,
        storage_key as storageKey,
        storage_url as storageUrl,
        status as status,
        created_by as createdBy,
        CONVERT(NVARCHAR(30), created_at, 127) as createdAt,
        CONVERT(NVARCHAR(30), updated_at, 127) as updatedAt,
        last_error as lastError,
        metadata_json as metadataJson
      FROM dbo.document_store
      WHERE organization_id = @orgId
        AND id = @docId
        AND deleted_at IS NULL;
    `);
  return (result.recordset?.[0] as any) ?? null;
}

export async function updateJobAsRunning(args: { organizationId: number; jobId: number }): Promise<void> {
  await ensureDocumentTables();
  await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("jobId", sql.BigInt, BigInt(args.jobId))
    .query(`
      UPDATE dbo.document_jobs
      SET status = 'RUNNING',
          started_at = SYSUTCDATETIME(),
          updated_at = SYSUTCDATETIME()
      WHERE organization_id = @orgId
        AND id = @jobId;
    `);
}

export async function updateJobAsFinished(args: {
  organizationId: number;
  jobId: number;
  status: "SUCCEEDED" | "FAILED";
  lastError?: string | null;
  result?: unknown;
}): Promise<void> {
  await ensureDocumentTables();
  await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("jobId", sql.BigInt, BigInt(args.jobId))
    .input("status", sql.NVarChar(20), args.status)
    .input("err", sql.NVarChar(sql.MAX), args.lastError ? String(args.lastError) : null)
    .input("resultJson", sql.NVarChar(sql.MAX), args.result ? JSON.stringify(args.result) : null)
    .query(`
      UPDATE dbo.document_jobs
      SET status = @status,
          finished_at = SYSUTCDATETIME(),
          last_error = @err,
          result_json = @resultJson,
          updated_at = SYSUTCDATETIME()
      WHERE organization_id = @orgId
        AND id = @jobId;
    `);
}

export async function getJob(args: { organizationId: number; jobId: number }): Promise<JobRow | null> {
  await ensureDocumentTables();
  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("jobId", sql.BigInt, BigInt(args.jobId))
    .query<JobRow>(`
      SELECT TOP 1
        id as id,
        organization_id as organizationId,
        document_id as documentId,
        job_type as jobType,
        status as status,
        attempts as attempts,
        max_attempts as maxAttempts,
        CONVERT(NVARCHAR(30), scheduled_at, 127) as scheduledAt,
        CASE WHEN started_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), started_at, 127) END as startedAt,
        CASE WHEN finished_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), finished_at, 127) END as finishedAt,
        last_error as lastError,
        payload_json as payloadJson,
        result_json as resultJson,
        CONVERT(NVARCHAR(30), created_at, 127) as createdAt,
        CONVERT(NVARCHAR(30), updated_at, 127) as updatedAt
      FROM dbo.document_jobs
      WHERE organization_id = @orgId
        AND id = @jobId;
    `);
  return (result.recordset?.[0] as any) ?? null;
}

export async function listJobs(args: { organizationId: number; limit?: number }): Promise<JobRow[]> {
  await ensureDocumentTables();
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(200, Number(args.limit))) : 50;
  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("limit", sql.Int, limit)
    .query<JobRow>(`
      SELECT TOP (@limit)
        id as id,
        organization_id as organizationId,
        document_id as documentId,
        job_type as jobType,
        status as status,
        attempts as attempts,
        max_attempts as maxAttempts,
        CONVERT(NVARCHAR(30), scheduled_at, 127) as scheduledAt,
        CASE WHEN started_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), started_at, 127) END as startedAt,
        CASE WHEN finished_at IS NULL THEN NULL ELSE CONVERT(NVARCHAR(30), finished_at, 127) END as finishedAt,
        last_error as lastError,
        payload_json as payloadJson,
        result_json as resultJson,
        CONVERT(NVARCHAR(30), created_at, 127) as createdAt,
        CONVERT(NVARCHAR(30), updated_at, 127) as updatedAt
      FROM dbo.document_jobs
      WHERE organization_id = @orgId
      ORDER BY created_at DESC, id DESC;
    `);
  return (result.recordset as any) ?? [];
}

export async function requeueFailedJob(args: {
  organizationId: number;
  jobId: number;
}): Promise<{ ok: boolean; documentId: number | null }> {
  await ensureDocumentTables();

  const result = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("jobId", sql.BigInt, BigInt(args.jobId))
    .query<{ documentId: number }>(`
      UPDATE dbo.document_jobs
      SET status = 'QUEUED',
          scheduled_at = SYSUTCDATETIME(),
          started_at = NULL,
          finished_at = NULL,
          last_error = NULL,
          result_json = NULL,
          updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.document_id as documentId
      WHERE organization_id = @orgId
        AND id = @jobId
        AND status = 'FAILED'
        AND attempts < max_attempts;
    `);

  const docId = Number((result.recordset?.[0] as any)?.documentId);
  if (!Number.isFinite(docId) || docId <= 0) {
    return { ok: false, documentId: null };
  }
  return { ok: true, documentId: docId };
}

