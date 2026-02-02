import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IControlItemRepository } from '../../domain/ports/output/IControlItemRepository';
import { ControlItem } from '../../domain/entities/ControlItem';
import type {
  ICreateControlItemUseCase,
  CreateControlItemInput,
  CreateControlItemOutput
} from '../../domain/ports/input/ICreateControlItemUseCase';

@injectable()
export class CreateControlItemUseCase implements ICreateControlItemUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ControlItemRepository)
    private readonly repository: IControlItemRepository
  ) {}

  async execute(
    input: CreateControlItemInput,
    organizationId: number,
    branchId: number,
    createdBy: string
  ): Promise<Result<CreateControlItemOutput, string>> {
    // 1. Verificar se código já existe
    const existing = await this.repository.findByCode(
      input.code,
      organizationId,
      branchId
    );

    if (existing) {
      return Result.fail(`Item de Controle com código ${input.code} já existe`);
    }

    // 2. Validar limites
    if (input.lowerLimit >= input.upperLimit) {
      return Result.fail('Limite inferior deve ser menor que limite superior');
    }

    if (input.targetValue < input.lowerLimit || input.targetValue > input.upperLimit) {
      return Result.fail('Valor alvo deve estar entre os limites');
    }

    // 3. Criar entity
    const controlItemResult = ControlItem.create({
      organizationId,
      branchId,
      code: input.code,
      name: input.name,
      processArea: input.processArea,
      responsibleUserId: input.responsibleUserId,
      measurementFrequency: input.measurementFrequency,
      targetValue: input.targetValue,
      upperLimit: input.upperLimit,
      lowerLimit: input.lowerLimit,
      unit: input.unit,
      kpiId: input.kpiId ?? undefined,
      description: input.description,
      createdBy,
    });

    if (Result.isFail(controlItemResult)) {
      return Result.fail(controlItemResult.error);
    }

    // 4. Salvar
    const saveResult = await this.repository.save(controlItemResult.value);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    return Result.ok({
      id: controlItemResult.value.id,
      code: controlItemResult.value.code,
    });
  }
}
