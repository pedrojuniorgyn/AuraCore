import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { ISefazService } from '../../domain/ports/output/ISefazService';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  ITransmitToSefaz,
  TransmitToSefazInput,
  TransmitToSefazOutput,
  ExecutionContext,
} from '../../domain/ports/input';

/**
 * Use Case: Transmit Document to SEFAZ
 * 
 * @see ARCH-010: Implementa ITransmitToSefaz
 */
@injectable()
export class TransmitToSefazUseCase implements ITransmitToSefaz {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository,
    @inject(TOKENS.SefazService) private sefazService: ISefazService
  ) {}

  async execute(
    input: TransmitToSefazInput,
    context: ExecutionContext
  ): Promise<Result<TransmitToSefazOutput, string>> {
    try {
      const document = await this.repository.findById(
        input.documentId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.documentId).message);
      }

      // TODO: Implementar transmissão SEFAZ completa
      // Por enquanto, retorna stub

      return Result.ok({
        documentId: document.id,
        transmissionId: globalThis.crypto.randomUUID(),
        status: 'SENT',
        sefazResponse: {
          code: '100',
          message: 'Autorizado o uso da NF-e',
          processedAt: new Date(),
        },
        transmittedAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to transmit to SEFAZ: ${errorMessage}`);
    }
  }
}
