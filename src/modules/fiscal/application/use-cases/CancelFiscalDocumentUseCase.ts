import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

export interface CancelFiscalDocumentInput {
  id: string;
  reason: string;
  protocolNumber: string;
}

export interface CancelFiscalDocumentOutput {
  id: string;
  status: string;
  cancelReason: string;
  cancelProtocolNumber: string;
}

/**
 * Use Case: Cancel Fiscal Document
 *
 * Cancela um documento fiscal autorizado.
 * Transição de estado: AUTHORIZED → CANCELLED
 *
 * Restrições:
 * - Apenas documentos AUTHORIZED podem ser cancelados
 * - Deve estar dentro do prazo de 24h (regra SEFAZ)
 */
@injectable()
export class CancelFiscalDocumentUseCase implements IUseCaseWithContext<CancelFiscalDocumentInput, CancelFiscalDocumentOutput> {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: CancelFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<CancelFiscalDocumentOutput, string>> {
    try {
      // Buscar documento (BUG 2 FIX: passar branchId)
      const document = await this.repository.findById(input.id, context.organizationId, context.branchId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.id).message);
      }

      // Admin pode buscar qualquer branch, mas repository já filtrou por branchId do context
      // Se admin precisa acessar outra branch, precisa mudar o context.branchId antes

      // Cancelar documento
      const cancelResult = document.cancel({
        reason: input.reason,
        protocolNumber: input.protocolNumber,
      });
      if (Result.isFail(cancelResult)) {
        return Result.fail(cancelResult.error);
      }

      // Persistir
      await this.repository.save(document);

      return Result.ok({
        id: document.id,
        status: document.status,
        cancelReason: input.reason,
        cancelProtocolNumber: input.protocolNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to cancel fiscal document: ${errorMessage}`);
    }
  }
}

