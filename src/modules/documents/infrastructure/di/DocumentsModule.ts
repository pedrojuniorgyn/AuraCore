/**
 * DocumentsModule - Dependency Injection Container
 * 
 * Registra todas as dependências do módulo Documents.
 */
import { container } from 'tsyringe';

// Repositories
import { DrizzleDocumentRepository } from '../persistence/repositories/DrizzleDocumentRepository';
import { DrizzleDocumentJobRepository } from '../persistence/repositories/DrizzleDocumentJobRepository';

// Storage
import { S3StorageProvider } from '../storage/S3StorageProvider';

// Use Cases
import { UploadDocumentCommand } from '../../application/commands/UploadDocumentCommand';
import { ProcessJobsCommand } from '../../application/commands/ProcessJobsCommand';
import { GetDocumentByIdQuery } from '../../application/queries/GetDocumentByIdQuery';

/**
 * Registra as dependências do módulo Documents no container
 */
export function registerDocumentsModule(): void {
  // Storage Provider
  container.registerSingleton('IStorageProvider', S3StorageProvider);

  // Repositories
  container.registerSingleton('IDocumentRepository', DrizzleDocumentRepository);
  container.registerSingleton('IDocumentJobRepository', DrizzleDocumentJobRepository);

  // Use Cases - Commands
  container.registerSingleton('IUploadDocumentUseCase', UploadDocumentCommand);
  container.registerSingleton('IProcessJobUseCase', ProcessJobsCommand);

  // Use Cases - Queries
  container.registerSingleton('IGetDocumentByIdUseCase', GetDocumentByIdQuery);
}

/**
 * Resolve uma dependência do container
 */
export function resolveDocumentsService<T>(token: string): T {
  return container.resolve<T>(token);
}

// Tokens para injeção
export const DOCUMENTS_TOKENS = {
  STORAGE_PROVIDER: 'IStorageProvider',
  DOCUMENT_REPOSITORY: 'IDocumentRepository',
  DOCUMENT_JOB_REPOSITORY: 'IDocumentJobRepository',
  UPLOAD_DOCUMENT_USE_CASE: 'IUploadDocumentUseCase',
  PROCESS_JOB_USE_CASE: 'IProcessJobUseCase',
  GET_DOCUMENT_BY_ID_USE_CASE: 'IGetDocumentByIdUseCase',
} as const;
