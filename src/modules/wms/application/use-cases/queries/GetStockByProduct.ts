import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/IStockRepository';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { StockItem } from '@/modules/wms/domain/entities/StockItem';

export interface GetStockByProductInput {
  productId: string;
}

export interface StockByLocationItem {
  locationId: string;
  locationCode: string;
  locationName: string;
  quantity: number;
  unit: string;
  reservedQuantity: number;
  availableQuantity: number;
  lotNumber: string | null;
  expirationDate: Date | null;
  isExpired: boolean;
  unitCost: number;
  currency: string;
}

export interface GetStockByProductOutput {
  productId: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  locations: StockByLocationItem[];
}

@injectable()
export class GetStockByProduct {
  constructor(
    @inject('StockRepository')
    private stockRepository: IStockRepository
  ) {}

  async execute(
    input: GetStockByProductInput,
    context: ExecutionContext
  ): Promise<Result<GetStockByProductOutput, string>> {
    const stockItems = await this.stockRepository.findByProduct(
      input.productId,
      context.organizationId,
      context.branchId
    );

    if (stockItems.length === 0) {
      return Result.fail('No stock found for this product');
    }

    let totalQuantity = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    const locations: StockByLocationItem[] = stockItems.map((item: StockItem) => {
      totalQuantity += item.quantity.value;
      totalReserved += item.reservedQuantity.value;
      totalAvailable += item.availableQuantity.value;

      return {
        locationId: item.locationId,
        locationCode: '',
        locationName: '',
        quantity: item.quantity.value,
        unit: item.quantity.unit,
        reservedQuantity: item.reservedQuantity.value,
        availableQuantity: item.availableQuantity.value,
        lotNumber: item.lotNumber ?? null,
        expirationDate: item.expirationDate ?? null,
        isExpired: item.isExpired(),
        unitCost: item.unitCost.amount,
        currency: item.unitCost.currency
      };
    });

    return Result.ok<GetStockByProductOutput>({
      productId: input.productId,
      totalQuantity,
      totalReserved,
      totalAvailable,
      locations
    });
  }
}
