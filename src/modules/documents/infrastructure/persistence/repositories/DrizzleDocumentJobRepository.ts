/**
 * DrizzleDocumentJobRepository - Implementação do IDocumentJobRepository
 * 
 * Usa Drizzle ORM para persistência de DocumentJobs.
 * Implementa lock/claim pattern para processamento seguro.
 */
import { injectable } from 'tsyringe';
import { eq, and, or, lt, sql, desc, lte, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import type { DocumentJob } from '../../../domain/entities/DocumentJob';
import type {
  IDocumentJobRepository,
  DocumentJobFilter,
  DocumentJobListResult,
  ClaimJobResult,
} from '../../../domain/ports/output/IDocumentJobRepository';
import type { JobStatusType } from '../../../domain/value-objects/JobStatus';
import { documentJobsTable, type DocumentJobRow } from '../schemas/document-jobs.schema';
import { DocumentJobMapper } from '../mappers/DocumentJobMapper';

// Type helpers para contornar limitações de tipagem do Drizzle MSSQL
// HOTFIX S3: Mantendo QueryWithLimit para queries simples sem offset
type QueryWithLimit = { limit(n: number): Promise<DocumentJobRow[]> };

@injectable()
export class DrizzleDocumentJobRepository implements IDocumentJobRepository {
  async findById(
    id: string,
    organizationId: number,
  ): Promise<Result<DocumentJob | null, string>> {
    try {
      const query = db
        .select()
        .from(documentJobsTable)
        .where(
          and(
            eq(documentJobsTable.id, id),
            eq(documentJobsTable.organizationId, organizationId),
          ),
        );

      const rows = await (query as unknown as QueryWithLimit).limit(1);

      if (rows.length === 0) {
        return Result.ok(null);
      }

      const jobResult = DocumentJobMapper.toDomain(rows[0]);
      if (Result.isFail(jobResult)) {
        return Result.fail(jobResult.error);
      }

      return Result.ok(jobResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao buscar job: ${message}`);
    }
  }

  async findMany(filter: DocumentJobFilter): Promise<Result<DocumentJobListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(documentJobsTable.organizationId, filter.organizationId),
      ];

      if (filter.branchId) {
        conditions.push(eq(documentJobsTable.branchId, filter.branchId));
      }
      if (filter.status) {
        conditions.push(eq(documentJobsTable.status, filter.status));
      }
      if (filter.jobType) {
        conditions.push(eq(documentJobsTable.jobType, filter.jobType));
      }
      if (filter.documentId) {
        conditions.push(eq(documentJobsTable.documentId, filter.documentId));
      }

      // Count total
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentJobsTable)
        .where(and(...conditions));

      const total = countResult[0]?.count ?? 0;

      // Get items
      const query = db
        .select()
        .from(documentJobsTable)
        .where(and(...conditions))
        .orderBy(desc(documentJobsTable.createdAt));

      // CRÍTICO: .limit() DEVE vir ANTES de .offset() no Drizzle ORM (HOTFIX S3)
      // A ordem contrária causa: TypeError: .limit is not a function
      type QueryWithLimitOffset = { limit(n: number): { offset(n: number): Promise<typeof documentJobsTable.$inferSelect[]> } };
      const rows = await (query as unknown as QueryWithLimitOffset).limit(pageSize).offset(offset);

      // Map to domain
      const items: DocumentJob[] = [];
      for (const row of rows) {
        const jobResult = DocumentJobMapper.toDomain(row);
        if (Result.isOk(jobResult)) {
          items.push(jobResult.value);
        }
      }

      return Result.ok({
        items,
        total,
        page,
        pageSize,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao listar jobs: ${message}`);
    }
  }

  async findByDocumentId(
    documentId: string,
    organizationId: number,
  ): Promise<Result<DocumentJob[], string>> {
    try {
      const rows = await db
        .select()
        .from(documentJobsTable)
        .where(
          and(
            eq(documentJobsTable.documentId, documentId),
            eq(documentJobsTable.organizationId, organizationId),
          ),
        )
        .orderBy(desc(documentJobsTable.createdAt));

      const items: DocumentJob[] = [];
      for (const row of rows) {
        const jobResult = DocumentJobMapper.toDomain(row);
        if (Result.isOk(jobResult)) {
          items.push(jobResult.value);
        }
      }

      return Result.ok(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao buscar jobs por documento: ${message}`);
    }
  }

  async claimNextJob(lockTimeoutMs: number = 5 * 60 * 1000): Promise<Result<ClaimJobResult, string>> {
    try {
      const now = new Date();
      const lockExpired = new Date(now.getTime() - lockTimeoutMs);

      // Buscar jobs QUEUED ou com lock expirado
      // Usa transação para evitar race condition
      const result = await db.transaction(async (tx) => {
        // Buscar próximo job elegível
        const query = tx
          .select()
          .from(documentJobsTable)
          .where(
            and(
              or(
                eq(documentJobsTable.status, 'QUEUED'),
                and(
                  eq(documentJobsTable.status, 'RUNNING'),
                  lt(documentJobsTable.lockedAt, lockExpired),
                ),
              ),
              lte(documentJobsTable.scheduledAt, now),
              sql`${documentJobsTable.attempts} < ${documentJobsTable.maxAttempts}`,
            ),
          )
          .orderBy(documentJobsTable.scheduledAt, documentJobsTable.id);

        const jobs = await (query as unknown as QueryWithLimit).limit(1);

        if (jobs.length === 0) {
          return null;
        }

        const job = jobs[0];

        // Marcar como RUNNING com lock
        await tx
          .update(documentJobsTable)
          .set({
            status: 'RUNNING',
            lockedAt: now,
            startedAt: now,
            attempts: sql`${documentJobsTable.attempts} + 1`,
            updatedAt: now,
          })
          .where(eq(documentJobsTable.id, job.id));

        // Retornar job atualizado
        const updatedQuery = tx
          .select()
          .from(documentJobsTable)
          .where(eq(documentJobsTable.id, job.id));

        const updatedJobs = await (updatedQuery as unknown as QueryWithLimit).limit(1);

        return updatedJobs[0] ?? null;
      });

      if (!result) {
        return Result.ok({ job: null });
      }

      const jobResult = DocumentJobMapper.toDomain(result);
      if (Result.isFail(jobResult)) {
        return Result.fail(jobResult.error);
      }

      return Result.ok({ job: jobResult.value });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao claimar job: ${message}`);
    }
  }

  async save(job: DocumentJob): Promise<Result<void, string>> {
    try {
      const data = DocumentJobMapper.toPersistence(job);

      // Check if exists
      const query = db
        .select({ id: documentJobsTable.id })
        .from(documentJobsTable)
        .where(eq(documentJobsTable.id, job.id));

      const existing = await (query as unknown as QueryWithLimit).limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(documentJobsTable)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(documentJobsTable.id, job.id));
      } else {
        // Insert
        await db.insert(documentJobsTable).values(data);
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao salvar job: ${message}`);
    }
  }

  async countByStatus(
    organizationId: number,
    status: JobStatusType,
  ): Promise<Result<number, string>> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentJobsTable)
        .where(
          and(
            eq(documentJobsTable.organizationId, organizationId),
            eq(documentJobsTable.status, status),
          ),
        );

      return Result.ok(result[0]?.count ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao contar jobs: ${message}`);
    }
  }
}
