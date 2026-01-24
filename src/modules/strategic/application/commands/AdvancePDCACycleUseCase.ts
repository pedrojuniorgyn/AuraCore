/**
 * Use Case: AdvancePDCACycleUseCase
 * Avança o ciclo PDCA do plano de ação
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IActionPlanRepository } from '../../domain/ports/output/IActionPlanRepository';
import type { IActionPlanFollowUpRepository } from '../../domain/ports/output/IActionPlanFollowUpRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface AdvancePDCACycleInput {
  actionPlanId: string;
  completionPercent?: number;
  notes?: string;
}

export interface AdvancePDCACycleOutput {
  actionPlanId: string;
  previousCycle: string;
  newCycle: string;
  completionPercent: number;
}

export interface IAdvancePDCACycleUseCase {
  execute(
    input: AdvancePDCACycleInput,
    context: TenantContext
  ): Promise<Result<AdvancePDCACycleOutput, string>>;
}

@injectable()
export class AdvancePDCACycleUseCase implements IAdvancePDCACycleUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ActionPlanRepository)
    private readonly actionPlanRepository: IActionPlanRepository,
    @inject(STRATEGIC_TOKENS.ActionPlanFollowUpRepository)
    private readonly followUpRepository: IActionPlanFollowUpRepository
  ) {}

  async execute(
    input: AdvancePDCACycleInput,
    context: TenantContext
  ): Promise<Result<AdvancePDCACycleOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar plano
    const actionPlan = await this.actionPlanRepository.findById(
      input.actionPlanId,
      context.organizationId,
      context.branchId
    );

    if (!actionPlan) {
      return Result.fail('Plano de ação não encontrado');
    }

    // 3. Guardar ciclo anterior
    const previousCycle = actionPlan.pdcaCycle.value;

    // 4. Validar transições PDCA
    // DO -> CHECK: Precisa de follow-up 3G registrado
    if (previousCycle === 'DO') {
      // Multi-tenancy: passar organizationId e branchId para validação
      const followUps = await this.followUpRepository.findByActionPlanId(
        input.actionPlanId,
        context.organizationId,
        context.branchId
      );
      if (followUps.length === 0) {
        return Result.fail(
          'Para avançar de DO para CHECK, é necessário registrar pelo menos um follow-up 3G'
        );
      }
    }

    // 5. Avançar ciclo
    const advanceResult = actionPlan.advancePDCA(input.notes);
    if (Result.isFail(advanceResult)) {
      return Result.fail(advanceResult.error);
    }

    // 6. Atualizar progresso se informado
    if (input.completionPercent !== undefined) {
      const progressResult = actionPlan.updateProgress(input.completionPercent);
      if (Result.isFail(progressResult)) {
        return Result.fail(progressResult.error);
      }
    }

    // 7. Persistir
    await this.actionPlanRepository.save(actionPlan);

    // 8. Retornar resultado
    return Result.ok({
      actionPlanId: actionPlan.id,
      previousCycle,
      newCycle: actionPlan.pdcaCycle.value,
      completionPercent: actionPlan.completionPercent,
    });
  }
}
