/**
 * DrizzleDocumentRepository - Implementação do IDocumentRepository
 * 
 * Usa Drizzle ORM para persistência de Documents
 */
import { injectable } from 'tsyringe';
import { eq, and, isNull, sql, desc, gte, lte, SQL } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import type { Document } from '../../../domain/entities/Document';
import type {
  IDocumentRepository,
  DocumentFilter,
  DocumentListResult,
} from '../../../domain/ports/output/IDocumentRepository';
import { documentStoreTable, type DocumentStoreRow } from '../schemas/document-store.schema';
import { DocumentMapper } from '../mappers/DocumentMapper';

// Type helper para contornar limitações de tipagem do Drizzle MSSQL
type QueryWithLimit = { limit: (n: number) => Promise<DocumentStoreRow[]> };
type QueryWithOffset = { offset: (n: number) => QueryWithLimit };

@injectable()
export class DrizzleDocumentRepository implements IDocumentRepository {
  async findById(
    id: string,
    organizationId: number,
    branchId: number,
  ): Promise<Result<Document | null, string>> {
    try {
      const query = db
        .select()
        .from(documentStoreTable)
        .where(
          and(
            eq(documentStoreTable.id, id),
            eq(documentStoreTable.organizationId, organizationId),
            eq(documentStoreTable.branchId, branchId),
            isNull(documentStoreTable.deletedAt),
          ),
        );

      const rows = await (query as unknown as QueryWithLimit).limit(1);

      if (rows.length === 0) {
        return Result.ok(null);
      }

      const documentResult = DocumentMapper.toDomain(rows[0]);
      if (Result.isFail(documentResult)) {
        return Result.fail(documentResult.error);
      }

      return Result.ok(documentResult.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao buscar documento: ${message}`);
    }
  }

  async findMany(filter: DocumentFilter): Promise<Result<DocumentListResult, string>> {
    try {
      const page = filter.page ?? 1;
      const pageSize = Math.min(filter.pageSize ?? 20, 100);
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: SQL[] = [
        eq(documentStoreTable.organizationId, filter.organizationId),
        eq(documentStoreTable.branchId, filter.branchId),
        isNull(documentStoreTable.deletedAt),
      ];

      if (filter.status) {
        conditions.push(eq(documentStoreTable.status, filter.status));
      }
      if (filter.docType) {
        conditions.push(eq(documentStoreTable.docType, filter.docType));
      }
      if (filter.entityTable) {
        conditions.push(eq(documentStoreTable.entityTable, filter.entityTable));
      }
      if (filter.entityId) {
        conditions.push(eq(documentStoreTable.entityId, filter.entityId));
      }
      if (filter.createdAfter) {
        conditions.push(gte(documentStoreTable.createdAt, filter.createdAfter));
      }
      if (filter.createdBefore) {
        conditions.push(lte(documentStoreTable.createdAt, filter.createdBefore));
      }

      // Count total
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentStoreTable)
        .where(and(...conditions));

      const total = countResult[0]?.count ?? 0;

      // Get items
      const query = db
        .select()
        .from(documentStoreTable)
        .where(and(...conditions))
        .orderBy(desc(documentStoreTable.createdAt));

      const queryWithOffset = (query as unknown as QueryWithOffset).offset(offset);
      const rows = await queryWithOffset.limit(pageSize);

      // Map to domain
      const items: Document[] = [];
      for (const row of rows) {
        const documentResult = DocumentMapper.toDomain(row);
        if (Result.isOk(documentResult)) {
          items.push(documentResult.value);
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
      return Result.fail(`Erro ao listar documentos: ${message}`);
    }
  }

  async findByEntity(
    entityTable: string,
    entityId: number,
    organizationId: number,
    branchId: number,
  ): Promise<Result<Document[], string>> {
    try {
      const rows = await db
        .select()
        .from(documentStoreTable)
        .where(
          and(
            eq(documentStoreTable.entityTable, entityTable),
            eq(documentStoreTable.entityId, entityId),
            eq(documentStoreTable.organizationId, organizationId),
            eq(documentStoreTable.branchId, branchId),
            isNull(documentStoreTable.deletedAt),
          ),
        )
        .orderBy(desc(documentStoreTable.createdAt));

      const items: Document[] = [];
      for (const row of rows) {
        const documentResult = DocumentMapper.toDomain(row);
        if (Result.isOk(documentResult)) {
          items.push(documentResult.value);
        }
      }

      return Result.ok(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao buscar documentos por entidade: ${message}`);
    }
  }

  async save(document: Document): Promise<Result<void, string>> {
    try {
      const data = DocumentMapper.toPersistence(document);

      // Check if exists
      const query = db
        .select({ id: documentStoreTable.id })
        .from(documentStoreTable)
        .where(eq(documentStoreTable.id, document.id));

      const existing = await (query as unknown as QueryWithLimit).limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(documentStoreTable)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(documentStoreTable.id, document.id));
      } else {
        // Insert
        await db.insert(documentStoreTable).values(data);
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao salvar documento: ${message}`);
    }
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number,
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(documentStoreTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documentStoreTable.id, id),
            eq(documentStoreTable.organizationId, organizationId),
            eq(documentStoreTable.branchId, branchId),
          ),
        );

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao deletar documento: ${message}`);
    }
  }
}
