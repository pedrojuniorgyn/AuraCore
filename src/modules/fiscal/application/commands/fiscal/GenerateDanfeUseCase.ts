import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { IFiscalDocumentPdfGenerator } from '../../domain/ports/output/IFiscalDocumentPdfGenerator';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IGenerateDanfe,
  GenerateDanfeInput,
  GenerateDanfeOutput,
  ExecutionContext,
} from '../../domain/ports/input';

/**
 * Use Case: Generate DANFE (Documento Auxiliar de NFe)
 * 
 * @see ARCH-010: Implementa IGenerateDanfe
 */
@injectable()
export class GenerateDanfeUseCase implements IGenerateDanfe {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository,
    @inject(TOKENS.FiscalDocumentPdfGenerator) private pdfGenerator: IFiscalDocumentPdfGenerator
  ) {}

  async execute(
    input: GenerateDanfeInput,
    context: ExecutionContext
  ): Promise<Result<GenerateDanfeOutput, string>> {
    try {
      const document = await this.repository.findById(
        input.documentId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.documentId).message);
      }

      const format = input.format ?? 'PDF';

      // TODO: Implementar geração real de DANFE
      // Por enquanto, retorna stub

      const content = format === 'PDF' 
        ? Buffer.from('PDF STUB')
        : '<html><body>DANFE STUB</body></html>';

      const filename = `DANFE-${document.number}.${format.toLowerCase()}`;

      return Result.ok({
        documentId: document.id,
        format,
        content,
        filename,
        generatedAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to generate DANFE: ${errorMessage}`);
    }
  }
}
