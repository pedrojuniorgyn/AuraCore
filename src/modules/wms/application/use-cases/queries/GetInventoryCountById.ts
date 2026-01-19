import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IInventoryCountRepository } from '@/modules/wms/domain/ports/IInventoryCountRepository';
import type { IGetInventoryCountById, GetInventoryCountByIdInput, GetInventoryCountByIdOutput } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

/**
 * GetInventoryCountById Query - E7.8 WMS Semana 2
 * 
 * @implements IGetInventoryCountById - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetInventoryCountById implements IGetInventoryCountById {
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
