/**
 * CancelCteUseCase - Application Command
 *
 * Caso de uso para cancelamento de CTe (Conhecimento de Transporte Eletrônico).
 * Valida tipo de documento (CTE), verifica transição de status permitida
 * (AUTHORIZED ou DRAFT → CANCELLED), e persiste o cancelamento.
 *
 * Regras de negócio:
 * - Apenas documentos do tipo CTE podem ser cancelados por este use case
 * - Status AUTHORIZED e DRAFT permitem cancelamento
 * - Motivo obrigatório com mín. 15 caracteres (exigência SEFAZ)
 * - Multi-tenancy: organizationId + branchId obrigatórios
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see USE-CASE-001: Commands em application/use-cases
 * @see USE-CASE-011: @injectable() decorator
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type {
  ICancelCteUseCase,
  CancelCteInput,
  CancelCteOutput,
} from '../../domain/ports/input/ICancelCteUseCase';
import type { ExecutionContext } from '../../domain/ports/input/IAuthorizeFiscalDocument';

@injectable()
export class CancelCteUseCase implements ICancelCteUseCase {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private readonly repository: IFiscalDocumentRepository,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async execute(
    input: CancelCteInput,
    context: ExecutionContext
  ): Promise<Result<CancelCteOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input, context);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // 2. Buscar documento fiscal pelo ID
      const document = await this.repository.findById(
        input.cteId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(`CTe #${input.cteId} não encontrado`);
      }

      // 3. Validar que é do tipo CTE
      if (document.documentType !== 'CTE') {
        return Result.fail(
          `Documento #${input.cteId} não é um CTe. Tipo: ${document.documentType}`
        );
      }

      // 4. Validar transição de status (AUTHORIZED ou DRAFT → CANCELLED)
      if (document.status !== 'AUTHORIZED' && document.status !== 'DRAFT') {
        return Result.fail(
          `CTe #${input.cteId} não pode ser cancelado no status "${document.status}". Apenas CTe em status AUTHORIZED ou DRAFT podem ser cancelados.`
        );
      }

      // 5. Cancelar via domain (delega validações para a Entity)
      const cancelResult = document.cancel({
        reason: input.reason,
        protocolNumber: input.protocolNumber || '',
      });

      if (Result.isFail(cancelResult)) {
        return Result.fail(cancelResult.error);
      }

      // 6. Persistir
      await this.repository.save(document);

      this.logger.info(`CTe #${input.cteId} cancelado com sucesso`, {
        module: 'fiscal',
        useCase: 'CancelCte',
        cteId: input.cteId,
        reason: input.reason,
        userId: context.userId,
      });

      // 7. Retornar output
      return Result.ok({
        id: document.id,
        status: 'CANCELLED' as const,
        cancelledAt: new Date(),
        protocolNumber: input.protocolNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao cancelar CTe: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao cancelar CTe: ${errorMessage}`);
    }
  }

  private validateInput(input: CancelCteInput, context: ExecutionContext): Result<void, string> {
    if (!input.cteId || input.cteId.trim().length === 0) {
      return Result.fail('cteId é obrigatório');
    }
    if (!input.reason || input.reason.trim().length === 0) {
      return Result.fail('Motivo do cancelamento é obrigatório');
    }
    if (input.reason.trim().length < 15) {
      return Result.fail('Motivo do cancelamento deve ter pelo menos 15 caracteres');
    }
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
