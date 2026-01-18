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
      // Buscar documento (usar input.id conforme interface)
      const document = await this.repository.findById(input.id, context.organizationId, context.branchId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.id).message);
      }

      // Admin pode buscar qualquer branch, mas repository já filtrou por branchId do context
      // Se admin precisa acessar outra branch, precisa mudar o context.branchId antes

      // Submeter documento
      const submitResult = document.submit();
      if (Result.isFail(submitResult)) {
        return Result.fail(submitResult.error);
      }

      // Persistir
      await this.repository.save(document);

      // Retornar conforme interface { id, status }
      return Result.ok({
        id: document.id,
        status: document.status === 'PROCESSING' ? 'PROCESSING' : 'SUBMITTED',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to submit fiscal document: ${errorMessage}`);
    }
  }
}

