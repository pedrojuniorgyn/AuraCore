import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';
import type { IControlItemRepository } from '../../domain/ports/output/IControlItemRepository';
import type {
  IUpdateControlItemValueUseCase,
  UpdateControlItemValueInput,
  UpdateControlItemValueOutput
} from '../../domain/ports/input/IUpdateControlItemValueUseCase';

@injectable()
export class UpdateControlItemValueUseCase implements IUpdateControlItemValueUseCase {
  constructor(
    @inject(STRATEGIC_TOKENS.ControlItemRepository)
    private readonly repository: IControlItemRepository
  ) {}

  async execute(
    input: UpdateControlItemValueInput,
    organizationId: number,
    branchId: number,
    updatedBy: string
  ): Promise<Result<UpdateControlItemValueOutput, string>> {
    // 1. Buscar Control Item
    const controlItem = await this.repository.findById(
      input.controlItemId,
      organizationId,
      branchId
    );

    if (!controlItem) {
      return Result.fail('Item de Controle não encontrado');
    }

    // 2. Guardar valor anterior
    const previousValue = controlItem.currentValue;

    // 3. Atualizar valor
    const updateResult = controlItem.updateValue(input.value, input.measuredAt);
    if (Result.isFail(updateResult)) {
      return Result.fail(updateResult.error);
    }

    // 4. Calcular status
    const isWithinLimits = controlItem.isWithinLimits();
    const isOnTarget = controlItem.isOnTarget();

    let status: 'NORMAL' | 'WARNING' | 'OUT_OF_RANGE';
    if (!isWithinLimits) {
      status = 'OUT_OF_RANGE';
    } else if (!isOnTarget) {
      status = 'WARNING';
    } else {
      status = 'NORMAL';
    }

    // 5. Salvar
    const saveResult = await this.repository.save(controlItem);
    if (Result.isFail(saveResult)) {
      return Result.fail(saveResult.error);
    }

    return Result.ok({
      id: controlItem.id,
      previousValue,
      newValue: input.value,
      status,
      isWithinLimits,
      isOnTarget,
    });
  }
}
