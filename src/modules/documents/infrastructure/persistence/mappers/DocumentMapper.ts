/**
 * DocumentMapper - Mapeamento entre Domain e Persistence
 * 
 * Converte entre Document Entity e DocumentStoreRow
 */
import { Result } from '@/shared/domain';
import { Document } from '../../../domain/entities/Document';
import { StoragePath } from '../../../domain/value-objects/StoragePath';
import { DocumentStatus } from '../../../domain/value-objects/DocumentStatus';
import type { DocumentStoreRow, DocumentStoreInsert } from '../schemas/document-store.schema';

export class DocumentMapper {
  /**
   * DB → Domain (usa reconstitute, NUNCA create)
   */
  static toDomain(row: DocumentStoreRow): Result<Document, string> {
    // Parse StoragePath
    const storagePathResult = StoragePath.fromComponents(
      row.storageBucket || process.env.S3_BUCKET || 'default',
      row.storageKey,
    );
    if (Result.isFail(storagePathResult)) {
      return Result.fail(`Erro ao mapear StoragePath: ${storagePathResult.error}`);
    }

    // Parse DocumentStatus
    const statusResult = DocumentStatus.create(row.status);
    if (Result.isFail(statusResult)) {
      return Result.fail(`Erro ao mapear DocumentStatus: ${statusResult.error}`);
    }

    // Parse metadata
    let metadata: Record<string, unknown> | null = null;
    if (row.metadataJson) {
      try {
        metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    }

    return Document.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      docType: row.docType,
      entityTable: row.entityTable ?? null,
      entityId: row.entityId ?? null,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      sha256: row.sha256 ?? null,
      storagePath: storagePathResult.value,
      status: statusResult.value,
      metadata,
      lastError: row.lastError ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    });
  }

  /**
   * Domain → DB
   */
  static toPersistence(entity: Document): DocumentStoreInsert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
      docType: entity.docType,
      entityTable: entity.entityTable,
      entityId: entity.entityId,
      fileName: entity.fileName,
      mimeType: entity.mimeType,
      fileSize: entity.fileSize,
      sha256: entity.sha256,
      storageProvider: entity.storagePath.provider,
      storageBucket: entity.storagePath.bucket,
      storageKey: entity.storagePath.key,
      storageUrl: entity.storagePath.value,
      status: entity.status.value,
      lastError: entity.lastError,
      metadataJson: entity.metadata ? JSON.stringify(entity.metadata) : null,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }
}
