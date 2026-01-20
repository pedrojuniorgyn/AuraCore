/**
 * IUploadDocumentUseCase - Port de Input para upload de documentos
 */
import { Result } from '@/shared/domain';

export interface UploadDocumentInput {
  organizationId: number;
  branchId: number;
  docType: string;
  entityTable?: string;
  entityId?: number;
  fileName: string;
  mimeType: string;
  content: Buffer;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  /** Se true, cria job de processamento após upload */
  createProcessingJob?: boolean;
  /** Tipo do job se createProcessingJob=true */
  jobType?: string;
  /** Payload do job se createProcessingJob=true */
  jobPayload?: Record<string, unknown>;
}

export interface UploadDocumentOutput {
  documentId: string;
  storageUrl: string;
  jobId?: string;
}

export interface IUploadDocumentUseCase {
  execute(input: UploadDocumentInput): Promise<Result<UploadDocumentOutput, string>>;
}
