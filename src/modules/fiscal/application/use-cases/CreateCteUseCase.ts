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

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ICreateCteUseCase,
  CreateCteInput,
  CreateCteOutput,
} from '../../domain/ports/input/ICreateCteUseCase';

// Legacy services (TODO E8 Fase 4: Migrate to Domain Services)
// buildCteXml fetches data from DB and generates XML
// validatePickupOrderInsurance validates insurance data
import { buildCteXml } from '@/services/fiscal/cte-builder';
import { validatePickupOrderInsurance } from '@/services/validators/insurance-validator';

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
  async execute(input: CreateCteInput): Promise<Result<CreateCteOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      console.log(`📝 [CreateCteUseCase] Criando CTe para ordem #${input.pickupOrderId}...`);

      // 2. Validar averbação de seguro (obrigatório por lei)
      // O validador busca a ordem do banco e valida os campos de seguro
      await validatePickupOrderInsurance(input.pickupOrderId);

      // 3. Gerar XML do CTe (legacy - busca dados do DB e persiste)
      const xml = await buildCteXml({
        pickupOrderId: input.pickupOrderId,
        organizationId: input.organizationId,
      });

      console.log(`✅ [CreateCteUseCase] XML gerado com sucesso (${xml.length} bytes)`);

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
      console.error(`❌ [CreateCteUseCase] Erro: ${errorMessage}`);
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
