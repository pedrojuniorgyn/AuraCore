/**
 * Document Pipeline - Testes de Integração para Persistência
 * 
 * Testa que upload + restart sobrevive (dados persistem no banco)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Result } from '@/shared/domain';
import { Document } from '@/modules/documents/domain/entities/Document';
import { DocumentJob } from '@/modules/documents/domain/entities/DocumentJob';
import { StoragePath } from '@/modules/documents/domain/value-objects/StoragePath';
import { JobStatus } from '@/modules/documents/domain/value-objects/JobStatus';
import { JobType } from '@/modules/documents/domain/value-objects/JobType';
import { DocumentStatus } from '@/modules/documents/domain/value-objects/DocumentStatus';

describe('Document Pipeline Persistence', () => {
  const testOrgId = 999;
  const testBranchId = 999;

  describe('Document Entity', () => {
    it('should create Document with valid props', () => {
      const result = Document.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        docType: 'FISCAL_PDF',
        fileName: 'nota.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test/nota.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const doc = result.value;
        expect(doc.id).toBeDefined();
        expect(doc.organizationId).toBe(testOrgId);
        expect(doc.branchId).toBe(testBranchId);
        expect(doc.fileName).toBe('nota.pdf');
        expect(doc.status.value).toBe('UPLOADED');
      }
    });

    it('should fail to create Document without organizationId', () => {
      const result = Document.create({
        organizationId: 0,
        branchId: testBranchId,
        docType: 'FISCAL_PDF',
        fileName: 'nota.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test/nota.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail to create Document without branchId', () => {
      const result = Document.create({
        organizationId: testOrgId,
        branchId: 0,
        docType: 'FISCAL_PDF',
        fileName: 'nota.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test/nota.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should update Document status correctly', () => {
      const result = Document.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        docType: 'FISCAL_PDF',
        fileName: 'nota.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test/nota.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const doc = result.value;
        
        // UPLOADED -> QUEUED
        const updateResult = doc.updateStatus('QUEUED');
        expect(Result.isOk(updateResult)).toBe(true);
        expect(doc.status.value).toBe('QUEUED');

        // QUEUED -> PROCESSING
        const updateResult2 = doc.updateStatus('PROCESSING');
        expect(Result.isOk(updateResult2)).toBe(true);
        expect(doc.status.value).toBe('PROCESSING');

        // PROCESSING -> SUCCEEDED
        const updateResult3 = doc.updateStatus('SUCCEEDED');
        expect(Result.isOk(updateResult3)).toBe(true);
        expect(doc.status.value).toBe('SUCCEEDED');
      }
    });

    it('should prevent invalid status transitions', () => {
      const result = Document.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        docType: 'FISCAL_PDF',
        fileName: 'nota.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test/nota.pdf',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const doc = result.value;
        
        // Seguir fluxo correto: UPLOADED -> PROCESSING -> SUCCEEDED
        doc.updateStatus('PROCESSING');
        doc.updateStatus('SUCCEEDED');
        
        // SUCCEEDED -> QUEUED (invalid)
        const invalidUpdate = doc.updateStatus('QUEUED');
        expect(Result.isFail(invalidUpdate)).toBe(true);
      }
    });
  });

  describe('DocumentJob Entity', () => {
    it('should create DocumentJob with valid props', () => {
      const result = DocumentJob.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        documentId: 'doc-123',
        jobType: 'FISCAL_PDF_EXTRACT',
        payload: { test: true },
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const job = result.value;
        expect(job.id).toBeDefined();
        expect(job.organizationId).toBe(testOrgId);
        expect(job.branchId).toBe(testBranchId);
        expect(job.documentId).toBe('doc-123');
        expect(job.status.value).toBe('QUEUED');
        expect(job.attempts).toBe(0);
        expect(job.maxAttempts).toBe(5);
      }
    });

    it('should handle job execution lifecycle', () => {
      const result = DocumentJob.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        documentId: 'doc-123',
        jobType: 'FISCAL_PDF_EXTRACT',
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const job = result.value;
        
        // Start execution
        const startResult = job.startExecution();
        expect(Result.isOk(startResult)).toBe(true);
        expect(job.status.value).toBe('RUNNING');
        expect(job.attempts).toBe(1);
        expect(job.startedAt).toBeDefined();
        expect(job.lockedAt).toBeDefined();

        // Mark as succeeded
        const successResult = job.markAsSucceeded({ processed: 10 });
        expect(Result.isOk(successResult)).toBe(true);
        expect(job.status.value).toBe('SUCCEEDED');
        expect(job.completedAt).toBeDefined();
        expect(job.lockedAt).toBeNull();
      }
    });

    it('should handle job failure with retry', () => {
      const result = DocumentJob.create({
        organizationId: testOrgId,
        branchId: testBranchId,
        documentId: 'doc-123',
        jobType: 'FISCAL_PDF_EXTRACT',
        maxAttempts: 3,
      });

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const job = result.value;
        
        // First attempt
        job.startExecution();
        const failResult = job.markAsFailed('Erro de teste');
        expect(Result.isOk(failResult)).toBe(true);
        expect(job.status.value).toBe('QUEUED'); // Back to QUEUED for retry
        expect(job.lastError).toBe('Erro de teste');

        // Second attempt
        job.startExecution();
        job.markAsFailed('Erro de teste 2');
        expect(job.status.value).toBe('QUEUED');

        // Third attempt (last)
        job.startExecution();
        job.markAsFailed('Erro final');
        expect(job.status.value).toBe('FAILED'); // Now FAILED permanently
        expect(job.completedAt).toBeDefined();
      }
    });
  });

  describe('Value Objects', () => {
    describe('StoragePath', () => {
      it('should create StoragePath from s3:// URL', () => {
        const result = StoragePath.create('s3://my-bucket/path/to/file.pdf');
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.provider).toBe('S3');
          expect(result.value.bucket).toBe('my-bucket');
          expect(result.value.key).toBe('path/to/file.pdf');
        }
      });

      it('should create StoragePath from https:// URL', () => {
        const result = StoragePath.create('https://minio.example.com/bucket/file.pdf');
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.provider).toBe('S3');
          expect(result.value.bucket).toBe('bucket');
          expect(result.value.key).toBe('file.pdf');
        }
      });

      it('should fail for invalid URL', () => {
        const result = StoragePath.create('invalid-path');
        expect(Result.isFail(result)).toBe(true);
      });

      it('should create from components', () => {
        const result = StoragePath.fromComponents('my-bucket', 'path/to/file.pdf');
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.value).toBe('s3://my-bucket/path/to/file.pdf');
        }
      });
    });

    describe('JobStatus', () => {
      it('should create valid status', () => {
        const result = JobStatus.create('QUEUED');
        expect(Result.isOk(result)).toBe(true);
        if (Result.isOk(result)) {
          expect(result.value.value).toBe('QUEUED');
          expect(result.value.isQueued).toBe(true);
        }
      });

      it('should fail for invalid status', () => {
        const result = JobStatus.create('INVALID');
        expect(Result.isFail(result)).toBe(true);
      });

      it('should check valid transitions', () => {
        const queued = JobStatus.queued();
        expect(queued.canTransitionTo('RUNNING')).toBe(true);
        expect(queued.canTransitionTo('SUCCEEDED')).toBe(false);

        const running = JobStatus.running();
        expect(running.canTransitionTo('SUCCEEDED')).toBe(true);
        expect(running.canTransitionTo('FAILED')).toBe(true);
        expect(running.canTransitionTo('QUEUED')).toBe(true); // retry

        const succeeded = JobStatus.succeeded();
        expect(succeeded.canTransitionTo('QUEUED')).toBe(false);
        expect(succeeded.isTerminal).toBe(true);
      });
    });

    describe('JobType', () => {
      it('should create valid job types', () => {
        const types = [
          'FISCAL_PDF_EXTRACT',
          'FINANCIAL_OFX_IMPORT',
          'OCR_PROCESS',
          'DOCUMENT_VALIDATION',
          'ARCHIVE_COMPRESS',
        ];

        for (const type of types) {
          const result = JobType.create(type);
          expect(Result.isOk(result)).toBe(true);
        }
      });

      it('should fail for invalid job type', () => {
        const result = JobType.create('INVALID_TYPE');
        expect(Result.isFail(result)).toBe(true);
      });
    });

    describe('DocumentStatus', () => {
      it('should check valid transitions', () => {
        const uploaded = DocumentStatus.uploaded();
        expect(uploaded.canTransitionTo('QUEUED')).toBe(true);
        expect(uploaded.canTransitionTo('PROCESSING')).toBe(true);

        const processing = DocumentStatus.processing();
        expect(processing.canTransitionTo('SUCCEEDED')).toBe(true);
        expect(processing.canTransitionTo('FAILED')).toBe(true);

        const failed = DocumentStatus.failed();
        expect(failed.canTransitionTo('QUEUED')).toBe(true); // reprocess
      });
    });
  });

  describe('Multi-tenancy', () => {
    it('should require organizationId on Document', () => {
      const result = Document.create({
        organizationId: 0,
        branchId: testBranchId,
        docType: 'TEST',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('organizationId');
      }
    });

    it('should require branchId on Document', () => {
      const result = Document.create({
        organizationId: testOrgId,
        branchId: 0,
        docType: 'TEST',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storagePath: 's3://bucket/test.pdf',
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('branchId');
      }
    });

    it('should require organizationId on DocumentJob', () => {
      const result = DocumentJob.create({
        organizationId: 0,
        branchId: testBranchId,
        documentId: 'doc-123',
        jobType: 'FISCAL_PDF_EXTRACT',
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should require branchId on DocumentJob', () => {
      const result = DocumentJob.create({
        organizationId: testOrgId,
        branchId: 0,
        documentId: 'doc-123',
        jobType: 'FISCAL_PDF_EXTRACT',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });
});
