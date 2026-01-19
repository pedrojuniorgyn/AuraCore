/**
 * Use Case: UpdateKPIValueUseCase
 * Registra novo valor do KPI e verifica alertas
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import { KPICalculatorService } from '../../domain/services/KPICalculatorService';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface UpdateKPIValueInput {
  kpiId: string;
  value: number;
  periodDate?: Date;
}

export interface UpdateKPIValueOutput {
  kpiId: string;
  code: string;
  previousValue: number;
  newValue: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
  variance: number;
  variancePercent: number;
  alertTriggered: boolean;
}

export interface IUpdateKPIValueUseCase {
  execute(
    input: UpdateKPIValueInput,
    context: TenantContext
  ): Promise<Result<UpdateKPIValueOutput, string>>;
}

@injectable()
export class UpdateKPIValueUseCase implements IUpdateKPIValueUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository
  ) {}

  async execute(
    input: UpdateKPIValueInput,
    context: TenantContext
  ): Promise<Result<UpdateKPIValueOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Buscar KPI
    const kpi = await this.kpiRepository.findById(
      input.kpiId,
      context.organizationId,
      context.branchId
    );

    if (!kpi) {
      return Result.fail('KPI não encontrado');
    }

    // 3. Guardar valor anterior
    const previousValue = kpi.currentValue;

    // 4. Calcular variância
    const varianceResult = KPICalculatorService.calculateVariance(
      input.value,
      kpi.targetValue
    );

    if (Result.isFail(varianceResult)) {
      return Result.fail(varianceResult.error);
    }

    // 5. Atualizar valor (o status é recalculado internamente)
    const updateResult = kpi.updateValue(input.value);
    if (Result.isFail(updateResult)) {
      return Result.fail(updateResult.error);
    }

    // 6. Persistir KPI atualizado
    await this.kpiRepository.save(kpi);

    // 7. Verificar se precisa disparar alerta
    const alertTriggered = kpi.status === 'RED' || 
      (kpi.status === 'YELLOW' && Math.abs(varianceResult.value.percent) > kpi.alertThreshold);

    // TODO: Se alertTriggered, emitir Domain Event KPIAlertTriggeredEvent

    return Result.ok({
      kpiId: kpi.id,
      code: kpi.code,
      previousValue,
      newValue: input.value,
      status: kpi.status,
      variance: varianceResult.value.absolute,
      variancePercent: varianceResult.value.percent,
      alertTriggered,
    });
  }
}
