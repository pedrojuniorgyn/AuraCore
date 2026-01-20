/**
 * IGetDocumentByIdUseCase - Port de Input para buscar documento por ID
 */
import { Result } from '@/shared/domain';

export interface GetDocumentByIdInput {
  documentId: string;
  organizationId: number;
  branchId: number;
}

export interface GetDocumentByIdOutput {
  id: string;
  docType: string;
  entityTable: string | null;
  entityId: number | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  status: string;
  metadata: Record<string, unknown> | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetDocumentByIdUseCase {
  execute(input: GetDocumentByIdInput): Promise<Result<GetDocumentByIdOutput | null, string>>;
}
