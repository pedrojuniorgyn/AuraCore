import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IMovementRepository } from '@/modules/wms/domain/ports/IMovementRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

export interface GetMovementByIdInput {
  id: string;
}

export interface GetMovementByIdOutput {
  id: string;
  productId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  currency: string;
  totalCost: number;
  reason: string | null;
  executedBy: string;
  executedAt: Date;
  createdAt: Date;
}

@injectable()
export class GetMovementById {
  constructor(
    @inject('MovementRepository')
    private movementRepository: IMovementRepository
  ) {}

  async execute(
    input: GetMovementByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetMovementByIdOutput, string>> {
    const movement = await this.movementRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!movement) {
      return Result.fail('Movement not found');
    }

    return Result.ok<GetMovementByIdOutput>({
      id: movement.id,
      productId: movement.productId,
      fromLocationId: movement.fromLocationId ?? null,
      toLocationId: movement.toLocationId ?? null,
      type: movement.type.value,
      quantity: movement.quantity.value,
      unit: movement.quantity.unit,
      unitCost: movement.unitCost.amount,
      currency: movement.unitCost.currency,
      totalCost: movement.totalCost.amount,
      reason: movement.reason ?? null,
      executedBy: movement.executedBy,
      executedAt: movement.executedAt,
      createdAt: movement.createdAt
    });
  }
}
