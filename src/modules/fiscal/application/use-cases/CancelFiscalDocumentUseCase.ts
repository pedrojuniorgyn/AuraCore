import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { ISefazService } from '../../domain/ports/output/ISefazService';
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
 * 
 * Integrações:
 * - SEFAZ: Solicita cancelamento do documento
 */
@injectable()
export class CancelFiscalDocumentUseCase implements IUseCaseWithContext<CancelFiscalDocumentInput, CancelFiscalDocumentOutput> {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository,
    @inject(TOKENS.SefazService) private sefazService: ISefazService
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

      // Validar que documento tem chave fiscal
      if (!document.fiscalKey) {
        return Result.fail('Documento não possui chave fiscal. Não é possível cancelar.');
      }

      // Solicitar cancelamento na SEFAZ
      const sefazResult = await this.sefazService.cancel(
        document.fiscalKey.value,
        input.reason
      );
      if (Result.isFail(sefazResult)) {
        return Result.fail(`SEFAZ cancellation failed: ${sefazResult.error}`);
      }

      // Verificar se SEFAZ cancelou
      if (!sefazResult.value.cancelled) {
        return Result.fail(
          `SEFAZ rejected cancellation: ${sefazResult.value.statusCode} - ${sefazResult.value.statusMessage}`
        );
      }

      // Cancelar documento no domain
      const cancelResult = document.cancel({
        reason: input.reason,
        protocolNumber: sefazResult.value.protocolNumber,
      });
      if (Result.isFail(cancelResult)) {
        return Result.fail(cancelResult.error);
      }

      // Persistir documento cancelado
      await this.repository.save(document);

      return Result.ok({
        id: document.id,
        status: document.status,
        cancelReason: input.reason,
        cancelProtocolNumber: sefazResult.value.protocolNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to cancel fiscal document: ${errorMessage}`);
    }
  }
}

