/**
 * GetDocumentByIdQuery - Use Case para buscar documento por ID
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IGetDocumentByIdUseCase,
  GetDocumentByIdInput,
  GetDocumentByIdOutput,
} from '../../domain/ports/input/IGetDocumentByIdUseCase';
import type { IDocumentRepository } from '../../domain/ports/output/IDocumentRepository';

@injectable()
export class GetDocumentByIdQuery implements IGetDocumentByIdUseCase {
  constructor(
    @inject('IDocumentRepository') private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(input: GetDocumentByIdInput): Promise<Result<GetDocumentByIdOutput | null, string>> {
    // Validar input
    if (!input.documentId?.trim()) {
      return Result.fail('documentId é obrigatório');
    }
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId é obrigatório');
    }

    // Buscar documento
    const result = await this.documentRepository.findById(
      input.documentId,
      input.organizationId,
      input.branchId,
    );

    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    if (!result.value) {
      return Result.ok(null);
    }

    const document = result.value;

    // Mapear para output
    const output: GetDocumentByIdOutput = {
      id: document.id,
      docType: document.docType,
      entityTable: document.entityTable,
      entityId: document.entityId,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      storagePath: document.storagePath.value,
      status: document.status.value,
      metadata: document.metadata,
      lastError: document.lastError,
      createdBy: document.createdBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    return Result.ok(output);
  }
}
