import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { ISefazService } from '../../domain/ports/output/ISefazService';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  ICancelFiscalDocument,
  CancelFiscalDocumentInput,
  CancelFiscalDocumentOutput,
} from '../../domain/ports/input';

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
 * 
 * @see ARCH-010: Implementa ICancelFiscalDocument
 */
@injectable()
export class CancelFiscalDocumentUseCase implements ICancelFiscalDocument {
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
      const document = await this.repository.findById(input.documentId, context.organizationId, context.branchId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.documentId).message);
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
        documentId: document.id,
        status: 'CANCELLED' as const,
        cancelledAt: new Date(),
        protocolNumber: sefazResult.value.protocolNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to cancel fiscal document: ${errorMessage}`);
    }
  }
}

