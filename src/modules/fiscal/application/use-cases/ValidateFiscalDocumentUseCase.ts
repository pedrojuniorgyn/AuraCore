import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IValidateFiscalDocument,
  ValidateFiscalDocumentInput,
  ValidateFiscalDocumentOutput,
  ValidationError,
  ExecutionContext,
} from '../../domain/ports/input';

/**
 * Use Case: Validate Fiscal Document
 * 
 * @see ARCH-010: Implementa IValidateFiscalDocument
 */
@injectable()
export class ValidateFiscalDocumentUseCase implements IValidateFiscalDocument {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: ValidateFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<ValidateFiscalDocumentOutput, string>> {
    try {
      const document = await this.repository.findById(
        input.documentId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.documentId).message);
      }

      // TODO: Implementar validações completas
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];

      // Validações básicas
      if (document.items.length === 0) {
        errors.push({
          field: 'items',
          code: 'EMPTY_ITEMS',
          message: 'Documento deve ter ao menos 1 item',
          severity: 'ERROR',
        });
      }

      if (!document.recipientCnpjCpf) {
        errors.push({
          field: 'recipientCnpjCpf',
          code: 'MISSING_RECIPIENT',
          message: 'Destinatário não informado',
          severity: 'ERROR',
        });
      }

      return Result.ok({
        documentId: document.id,
        isValid: errors.length === 0,
        errors,
        warnings,
        validatedAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to validate fiscal document: ${errorMessage}`);
    }
  }
}
