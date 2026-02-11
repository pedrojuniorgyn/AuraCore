import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IGetFiscalDocumentById,
  GetFiscalDocumentByIdInput,
  FiscalDocumentDto,
  ExecutionContext,
} from '../../../domain/ports/input';

/**
 * Use Case: Get Fiscal Document By ID
 * 
 * @see ARCH-010: Implementa IGetFiscalDocumentById
 */
@injectable()
export class GetFiscalDocumentByIdUseCase implements IGetFiscalDocumentById {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: GetFiscalDocumentByIdInput,
    context: ExecutionContext
  ): Promise<Result<FiscalDocumentDto, string>> {
    try {
      const document = await this.repository.findById(
        input.documentId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.documentId).message);
      }

      return Result.ok({
        id: document.id,
        documentType: document.documentType,
        series: document.series,
        number: document.number,
        status: document.status,
        fiscalKey: document.fiscalKey?.value,
        issueDate: document.issueDate,
        totalValue: document.totalDocument.amount,
        recipient: {
          document: document.recipientCnpjCpf ?? '',
          name: document.recipientName ?? '',
        },
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to get fiscal document: ${errorMessage}`);
    }
  }
}
