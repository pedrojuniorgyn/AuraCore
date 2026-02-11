/**
 * CreateCteUseCase - Application Command
 *
 * Caso de uso para criação/geração de CTe a partir de uma Ordem de Coleta.
 * Orquestra validações e geração de XML.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type {
  ICreateCteUseCase,
  CreateCteInput,
  CreateCteOutput,
} from '../../../domain/ports/input/ICreateCteUseCase';
import type { ICteBuilderService } from '../../../domain/ports/output/ICteBuilderService';
import type { IInsuranceValidatorService } from '../../../domain/ports/output/IInsuranceValidatorService';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para criação de CTe.
 *
 * Fluxo atual:
 * 1. Validar input
 * 2. Validar averbação de seguro (obrigatório)
 * 3. Gerar XML do CTe (legacy - busca dados do DB)
 *
 * Nota: O CTe é persistido pelo buildCteXml internamente.
 * Este Use Case encapsula a lógica para permitir DI.
 *
 * Regras:
 * - Ordem de coleta deve existir
 * - Averbação de seguro é obrigatória (Lei 11.442/07)
 *
 * TODO (E8 Fase 4): Refatorar para:
 *   - IPickupOrderRepository para buscar ordem
 *   - InsuranceValidationService (Domain Service)
 *   - CteBuilderService.build() (Domain Service)
 *   - ICteRepository para persistir separadamente
 */
@injectable()
export class CreateCteUseCase implements ICreateCteUseCase {
  constructor(
    @inject(TOKENS.CteBuilderService) private readonly cteBuilder: ICteBuilderService,
    @inject(TOKENS.InsuranceValidatorService) private readonly insuranceValidator: IInsuranceValidatorService,
    @inject(TOKENS.Logger) private readonly logger: ILogger
  ) {}

  async execute(input: CreateCteInput): Promise<Result<CreateCteOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      this.logger.info(`Criando CTe para ordem #${input.pickupOrderId}`, { module: 'fiscal', useCase: 'CreateCte', pickupOrderId: input.pickupOrderId });

      // 2. Validar averbação de seguro (obrigatório por Lei 11.442/07)
      const insuranceResult = await this.insuranceValidator.validatePickupOrderInsurance(input.pickupOrderId);
      if (Result.isFail(insuranceResult)) {
        return Result.fail(insuranceResult.error);
      }

      // 3. Gerar XML do CTe
      const xmlResult = await this.cteBuilder.buildCteXml({
        pickupOrderId: input.pickupOrderId,
        organizationId: input.organizationId,
      });
      if (Result.isFail(xmlResult)) {
        return Result.fail(xmlResult.error);
      }
      const xml = xmlResult.value;

      this.logger.info(`XML gerado com sucesso (${xml.length} bytes)`, { module: 'fiscal', useCase: 'CreateCte' });

      // 4. Retornar resultado
      // Nota: O buildCteXml persiste o CTe internamente, então não temos acesso
      // direto ao ID aqui. Isso será corrigido quando migrarmos para DDD completo.
      return Result.ok({
        cteId: 0, // TODO: buildCteXml deveria retornar o ID
        cteNumber: 'PENDING', // Será preenchido após autorização
        cteSeries: '1',
        status: 'DRAFT',
        createdAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao criar CTe: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao criar CTe: ${errorMessage}`);
    }
  }

  private validateInput(input: CreateCteInput): Result<void, string> {
    if (!input.pickupOrderId || input.pickupOrderId <= 0) {
      return Result.fail('pickupOrderId inválido');
    }
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId inválido');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId inválido');
    }
    if (!input.userId?.trim()) {
      return Result.fail('userId obrigatório');
    }
    return Result.ok(undefined);
  }
}
