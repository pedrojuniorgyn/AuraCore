import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

/**
 * Use Case: Submit Fiscal Document
 *
 * Submete um documento fiscal para emissão.
 * Transição de estado: DRAFT → PENDING
 */
@injectable()
export class SubmitFiscalDocumentUseCase implements IUseCaseWithContext<{ id: string }, { id: string; status: string }> {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: { id: string },
    context: ExecutionContext
  ): Promise<Result<{ id: string; status: string }, string>> {
    try {
      // Buscar documento
      const document = await this.repository.findById(input.id, context.organizationId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.id).message);
      }

      // Validar branch (admin pode acessar qualquer branch)
      if (!context.isAdmin && document.branchId !== context.branchId) {
        return Result.fail('You do not have permission to access this fiscal document');
      }

      // Submeter documento
      const submitResult = document.submit();
      if (Result.isFail(submitResult)) {
        return Result.fail(submitResult.error);
      }

      // Persistir
      await this.repository.save(document);

      return Result.ok({
        id: document.id,
        status: document.status,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to submit fiscal document: ${errorMessage}`);
    }
  }
}

