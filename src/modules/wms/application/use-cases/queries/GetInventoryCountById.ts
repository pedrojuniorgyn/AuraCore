import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IInventoryCountRepository } from '@/modules/wms/domain/ports/IInventoryCountRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

export interface GetInventoryCountByIdInput {
  id: string;
}

export interface GetInventoryCountByIdOutput {
  id: string;
  productId: string;
  locationId: string;
  systemQuantity: number;
  systemUnit: string;
  countedQuantity: number | null;
  countedUnit: string | null;
  difference: number | null;
  status: string;
  adjustmentMovementId: string | null;
  countedBy: string | null;
  countedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class GetInventoryCountById {
  constructor(
    @inject('InventoryCountRepository')
    private inventoryCountRepository: IInventoryCountRepository
  ) {}

  async execute(
    input: GetInventoryCountByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetInventoryCountByIdOutput, string>> {
    const count = await this.inventoryCountRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!count) {
      return Result.fail('Inventory count not found');
    }

    return Result.ok<GetInventoryCountByIdOutput>({
      id: count.id,
      productId: count.productId,
      locationId: count.locationId,
      systemQuantity: count.systemQuantity.value,
      systemUnit: count.systemQuantity.unit,
      countedQuantity: count.countedQuantity?.value ?? null,
      countedUnit: count.countedQuantity?.unit ?? null,
      difference: count.difference?.value ?? null,
      status: count.status.value,
      adjustmentMovementId: count.adjustmentMovementId ?? null,
      countedBy: count.countedBy ?? null,
      countedAt: count.countedAt ?? null,
      createdAt: count.createdAt,
      updatedAt: count.updatedAt
    });
  }
}
