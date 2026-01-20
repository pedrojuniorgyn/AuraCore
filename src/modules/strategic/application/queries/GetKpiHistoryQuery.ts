/**
 * Use Case: GetKpiHistoryQuery
 * Busca KPI com estatísticas calculadas
 * 
 * @module strategic/application/queries
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface GetKpiHistoryInput {
  kpiId: string;
}

export interface KpiHistoryPointDTO {
  value: number;
  measuredAt: Date;
}

export interface KpiHistoryOutput {
  kpi: {
    id: string;
    code: string;
    name: string;
    unit: string;
    targetValue: number;
    currentValue: number;
    status: string;
    polarity: string;
    thresholdYellow: number | null;
    thresholdRed: number | null;
  };
  statistics: {
    deviation: number;
    deviationPercent: number;
    trend: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  };
}

export interface IGetKpiHistoryUseCase {
  execute(
    input: GetKpiHistoryInput,
    context: TenantContext
  ): Promise<Result<KpiHistoryOutput, string>>;
}

@injectable()
export class GetKpiHistoryQuery implements IGetKpiHistoryUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository
  ) {}

  async execute(
    input: GetKpiHistoryInput,
    context: TenantContext
  ): Promise<Result<KpiHistoryOutput, string>> {
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

    // 3. Calcular estatísticas
    const deviation = kpi.currentValue - kpi.targetValue;
    const deviationPercent = kpi.targetValue !== 0 
      ? (deviation / kpi.targetValue) * 100 
      : 0;

    // Determinar tendência baseada no status
    let trend: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' = 'ON_TRACK';
    if (kpi.status === 'RED') {
      trend = 'OFF_TRACK';
    } else if (kpi.status === 'YELLOW') {
      trend = 'AT_RISK';
    }

    return Result.ok({
      kpi: {
        id: kpi.id,
        code: kpi.code,
        name: kpi.name,
        unit: kpi.unit,
        targetValue: kpi.targetValue,
        currentValue: kpi.currentValue,
        status: kpi.status,
        polarity: kpi.polarity,
        thresholdYellow: kpi.alertThreshold,
        thresholdRed: kpi.criticalThreshold,
      },
      statistics: {
        deviation: Math.round(deviation * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 100) / 100,
        trend,
      },
    });
  }
}
