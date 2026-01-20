/**
 * Document Store Schema - Drizzle ORM
 * 
 * Tabela para armazenar metadados de documentos.
 * Os arquivos ficam em storage externo (S3/MinIO).
 */
import { int, nvarchar, bigint, datetime2, index, uniqueIndex, mssqlTable } from 'drizzle-orm/mssql-core';

export const documentStoreTable = mssqlTable(
  'document_store',
  {
    id: nvarchar('id', { length: 36 }).primaryKey(),
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),
    
    // Tipo e associação
    docType: nvarchar('doc_type', { length: 64 }).notNull(),
    entityTable: nvarchar('entity_table', { length: 128 }),
    entityId: int('entity_id'),
    
    // Arquivo
    fileName: nvarchar('file_name', { length: 255 }).notNull(),
    mimeType: nvarchar('mime_type', { length: 100 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    sha256: nvarchar('sha256', { length: 64 }),
    
    // Storage
    storageProvider: nvarchar('storage_provider', { length: 20 }).notNull().default('S3'),
    storageBucket: nvarchar('storage_bucket', { length: 255 }),
    storageKey: nvarchar('storage_key', { length: 1024 }).notNull(),
    storageUrl: nvarchar('storage_url', { length: 1024 }),
    
    // Status
    status: nvarchar('status', { length: 20 }).notNull().default('UPLOADED'),
    lastError: nvarchar('last_error', { length: 4000 }),
    
    // Metadata
    metadataJson: nvarchar('metadata_json', { length: 4000 }),
    
    // Auditoria
    createdBy: nvarchar('created_by', { length: 255 }),
    createdAt: datetime2('created_at').notNull().default(new Date()),
    updatedAt: datetime2('updated_at').notNull().default(new Date()),
    deletedAt: datetime2('deleted_at'),
  },
  (table) => ([
    // Índice composto multi-tenancy
    index('idx_document_store_tenant').on(table.organizationId, table.branchId),
    // Índice por data de criação
    index('idx_document_store_created_at').on(table.organizationId, table.createdAt),
    // Índice único por storage key
    uniqueIndex('ux_document_store_storage_key').on(table.organizationId, table.storageKey),
    // Índice por entidade associada
    index('idx_document_store_entity').on(table.entityTable, table.entityId),
    // Índice por status
    index('idx_document_store_status').on(table.organizationId, table.status),
  ]),
);

export type DocumentStoreRow = typeof documentStoreTable.$inferSelect;
export type DocumentStoreInsert = typeof documentStoreTable.$inferInsert;
