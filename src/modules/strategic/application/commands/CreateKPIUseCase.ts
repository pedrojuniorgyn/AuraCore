/**
 * Use Case: CreateKPIUseCase
 * Cria um novo KPI vinculado a uma meta
 * 
 * @module strategic/application/commands
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { TenantContext } from '@/lib/auth/context';
import type { IKPIRepository } from '../../domain/ports/output/IKPIRepository';
import type { IStrategicGoalRepository } from '../../domain/ports/output/IStrategicGoalRepository';
import { KPI, type KPIPolarity, type KPIFrequency } from '../../domain/entities/KPI';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

export interface CreateKPIInput {
  goalId?: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  polarity?: KPIPolarity;
  frequency?: KPIFrequency;
  targetValue: number;
  baselineValue?: number;
  alertThreshold?: number;
  criticalThreshold?: number;
  autoCalculate?: boolean;
  sourceModule?: string;
  sourceQuery?: string;
  ownerUserId: string;
}

export interface CreateKPIOutput {
  id: string;
  code: string;
  name: string;
}

export interface ICreateKPIUseCase {
  execute(
    input: CreateKPIInput,
    context: TenantContext
  ): Promise<Result<CreateKPIOutput, string>>;
}

@injectable()
export class CreateKPIUseCase implements ICreateKPIUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.KPIRepository)
    private readonly kpiRepository: IKPIRepository,
    @inject(STRATEGIC_TOKENS.StrategicGoalRepository)
    private readonly goalRepository: IStrategicGoalRepository
  ) {}

  async execute(
    input: CreateKPIInput,
    context: TenantContext
  ): Promise<Result<CreateKPIOutput, string>> {
    // 1. Validar contexto
    if (!context.organizationId || !context.branchId) {
      return Result.fail('Contexto de organização/filial inválido');
    }

    // 2. Se goalId informado, validar que a meta existe
    if (input.goalId) {
      const goal = await this.goalRepository.findById(
        input.goalId,
        context.organizationId,
        context.branchId
      );

      if (!goal) {
        return Result.fail('Meta não encontrada');
      }
    }

    // 3. Verificar código duplicado
    const existing = await this.kpiRepository.findByCode(
      input.code,
      context.organizationId,
      context.branchId
    );

    if (existing) {
      return Result.fail(`KPI com código ${input.code} já existe`);
    }

    // 4. Criar KPI
    const kpiResult = KPI.create({
      organizationId: context.organizationId,
      branchId: context.branchId,
      goalId: input.goalId,
      code: input.code,
      name: input.name,
      description: input.description,
      unit: input.unit,
      polarity: input.polarity,
      frequency: input.frequency,
      targetValue: input.targetValue,
      baselineValue: input.baselineValue,
      alertThreshold: input.alertThreshold,
      criticalThreshold: input.criticalThreshold,
      autoCalculate: input.autoCalculate,
      sourceModule: input.sourceModule,
      sourceQuery: input.sourceQuery,
      ownerUserId: input.ownerUserId,
      createdBy: context.userId,
    });

    if (Result.isFail(kpiResult)) {
      return Result.fail(kpiResult.error);
    }

    // 5. Persistir
    await this.kpiRepository.save(kpiResult.value);

    return Result.ok({
      id: kpiResult.value.id,
      code: kpiResult.value.code,
      name: kpiResult.value.name,
    });
  }
}
