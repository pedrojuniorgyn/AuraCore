/**
 * ManifestNfeUseCase - Application Command
 *
 * Caso de uso para Manifestação do Destinatário de NFe.
 * Permite registrar ciência, confirmação, desconhecimento ou
 * operação não realizada para NFe recebidas.
 *
 * Regras de negócio:
 * - Chave fiscal obrigatória (44 dígitos)
 * - Tipo de manifestação deve ser válido
 * - DESCONHECIMENTO e NAO_REALIZADA exigem justificativa (mín. 15 caracteres)
 * - Documento deve existir e ser do tipo NFE
 * - Em produção, comunicará com SEFAZ via ISefazGateway
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see USE-CASE-001: Commands em application/use-cases
 * @see NT 2012/002: Manifestação do Destinatário NFe
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IFiscalDocumentRepository } from '../../../domain/ports/output/IFiscalDocumentRepository';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type {
  IManifestNfeUseCase,
  ManifestNfeInput,
  ManifestNfeOutput,
} from '../../../domain/ports/input/IManifestNfeUseCase';
import type { ExecutionContext } from '../../../domain/ports/input/IAuthorizeFiscalDocument';

/** Tipos válidos de manifestação */
const VALID_MANIFEST_TYPES = ['CIENCIA', 'CONFIRMACAO', 'DESCONHECIMENTO', 'NAO_REALIZADA'] as const;

/** Tipos que exigem justificativa */
const TYPES_REQUIRING_REASON = ['DESCONHECIMENTO', 'NAO_REALIZADA'] as const;

@injectable()
export class ManifestNfeUseCase implements IManifestNfeUseCase {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private readonly repository: IFiscalDocumentRepository,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async execute(
    input: ManifestNfeInput,
    context: ExecutionContext
  ): Promise<Result<ManifestNfeOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input, context);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // 2. Buscar documento por chave fiscal
      const document = await this.repository.findByFiscalKey(
        input.fiscalKey,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(
          `NFe com chave fiscal "${input.fiscalKey}" não encontrada para esta organização/filial`
        );
      }

      // 3. Validar que é do tipo NFE
      if (document.documentType !== 'NFE') {
        return Result.fail(
          `Documento com chave "${input.fiscalKey}" não é uma NFe. Tipo: ${document.documentType}. Manifestação é aplicável apenas a NFe.`
        );
      }

      // 4. TODO: Em produção, chamar SEFAZ para registrar manifestação
      //    const sefazResult = await this.sefazGateway.manifestNfe({
      //      fiscalKey: input.fiscalKey,
      //      manifestType: input.manifestType,
      //      reason: input.reason,
      //    });
      //    if (Result.isFail(sefazResult)) {
      //      return Result.fail(`Erro SEFAZ: ${sefazResult.error}`);
      //    }

      this.logger.info(`Manifestação NFe registrada: ${input.manifestType}`, {
        module: 'fiscal',
        useCase: 'ManifestNfe',
        fiscalKey: input.fiscalKey,
        manifestType: input.manifestType,
        documentId: document.id,
        userId: context.userId,
      });

      // 5. Retornar resultado
      return Result.ok({
        documentId: document.id,
        fiscalKey: input.fiscalKey,
        manifestType: input.manifestType,
        status: document.status,
        processedAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao manifestar NFe: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao manifestar NFe: ${errorMessage}`);
    }
  }

  private validateInput(input: ManifestNfeInput, context: ExecutionContext): Result<void, string> {
    // Validar chave fiscal
    if (!input.fiscalKey || input.fiscalKey.trim().length === 0) {
      return Result.fail('Chave fiscal é obrigatória');
    }

    const trimmedKey = input.fiscalKey.trim();
    if (trimmedKey.length !== 44) {
      return Result.fail(`Chave fiscal deve ter 44 dígitos. Recebido: ${trimmedKey.length} dígitos`);
    }

    if (!/^\d{44}$/.test(trimmedKey)) {
      return Result.fail('Chave fiscal deve conter apenas dígitos numéricos');
    }

    // Validar tipo de manifestação
    if (!VALID_MANIFEST_TYPES.includes(input.manifestType)) {
      return Result.fail(
        `Tipo de manifestação inválido: "${input.manifestType}". Tipos válidos: ${VALID_MANIFEST_TYPES.join(', ')}`
      );
    }

    // Validar justificativa para DESCONHECIMENTO e NAO_REALIZADA
    if (
      (TYPES_REQUIRING_REASON as readonly string[]).includes(input.manifestType)
    ) {
      if (!input.reason || input.reason.trim().length === 0) {
        return Result.fail(
          `Justificativa é obrigatória para manifestação do tipo "${input.manifestType}"`
        );
      }
      if (input.reason.trim().length < 15) {
        return Result.fail(
          'Justificativa deve ter pelo menos 15 caracteres'
        );
      }
    }

    // Validar context
    if (!context.organizationId || context.organizationId <= 0) {
      return Result.fail('organizationId inválido');
    }
    if (!context.branchId || context.branchId <= 0) {
      return Result.fail('branchId inválido');
    }
    if (!context.userId?.trim()) {
      return Result.fail('userId é obrigatório');
    }

    return Result.ok(undefined);
  }
}
