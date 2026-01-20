/**
 * Document Domain Errors
 */
import { DomainError } from '@/shared/domain';

export class DocumentNotFoundError extends DomainError {
  readonly code = 'DOCUMENT_NOT_FOUND';
  constructor(documentId: string) {
    super(`Documento não encontrado: ${documentId}`);
  }
}

export class DocumentUploadError extends DomainError {
  readonly code = 'DOCUMENT_UPLOAD_ERROR';
  constructor(message: string) {
    super(`Erro ao fazer upload do documento: ${message}`);
  }
}

export class DocumentDownloadError extends DomainError {
  readonly code = 'DOCUMENT_DOWNLOAD_ERROR';
  constructor(message: string) {
    super(`Erro ao baixar documento: ${message}`);
  }
}

export class JobNotFoundError extends DomainError {
  readonly code = 'JOB_NOT_FOUND';
  constructor(jobId: string) {
    super(`Job não encontrado: ${jobId}`);
  }
}

export class JobProcessingError extends DomainError {
  readonly code = 'JOB_PROCESSING_ERROR';
  constructor(jobId: string, message: string) {
    super(`Erro ao processar job ${jobId}: ${message}`);
  }
}

export class StorageNotConfiguredError extends DomainError {
  readonly code = 'STORAGE_NOT_CONFIGURED';
  constructor() {
    super('Storage S3 não está configurado. Verifique as variáveis de ambiente.');
  }
}
