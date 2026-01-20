// Domain exports
export * from './domain';

// Application exports
export { UploadDocumentCommand } from './application/commands/UploadDocumentCommand';
export { ProcessJobsCommand, type JobProcessor } from './application/commands/ProcessJobsCommand';
export { GetDocumentByIdQuery } from './application/queries/GetDocumentByIdQuery';

// Infrastructure exports
export { S3StorageProvider } from './infrastructure/storage/S3StorageProvider';
export { DrizzleDocumentRepository } from './infrastructure/persistence/repositories/DrizzleDocumentRepository';
export { DrizzleDocumentJobRepository } from './infrastructure/persistence/repositories/DrizzleDocumentJobRepository';
export { DocumentMapper } from './infrastructure/persistence/mappers/DocumentMapper';
export { DocumentJobMapper } from './infrastructure/persistence/mappers/DocumentJobMapper';

// Schemas
export {
  documentStoreTable,
  type DocumentStoreRow,
  type DocumentStoreInsert,
} from './infrastructure/persistence/schemas/document-store.schema';
export {
  documentJobsTable,
  type DocumentJobRow,
  type DocumentJobInsert,
} from './infrastructure/persistence/schemas/document-jobs.schema';

// DI
export { registerDocumentsModule, resolveDocumentsService, DOCUMENTS_TOKENS } from './infrastructure/di/DocumentsModule';
