import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/IStockRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

export interface GetStockItemByIdInput {
  id: string;
}

export interface GetStockItemByIdOutput {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unit: string;
  reservedQuantity: number;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class GetStockItemById {
  constructor(
    @inject('StockRepository')
    private stockRepository: IStockRepository
  ) {}

  async execute(
    input: GetStockItemByIdInput,
    context: ExecutionContext
  ): Promise<Result<GetStockItemByIdOutput, string>> {
    const stockItem = await this.stockRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!stockItem) {
      return Result.fail('Stock item not found');
    }

    return Result.ok<GetStockItemByIdOutput>({
      id: stockItem.id,
      productId: stockItem.productId,
      locationId: stockItem.locationId,
      quantity: stockItem.quantity.value,
      unit: stockItem.quantity.unit,
      reservedQuantity: stockItem.reservedQuantity.value,
      availableQuantity: stockItem.availableQuantity.value,
      lotNumber: stockItem.lotNumber ?? null,
      expirationDate: stockItem.expirationDate ?? null,
      isExpired: stockItem.isExpired(),
      unitCost: stockItem.unitCost.amount,
      currency: stockItem.unitCost.currency,
      createdAt: stockItem.createdAt,
      updatedAt: stockItem.updatedAt
    });
  }
}
