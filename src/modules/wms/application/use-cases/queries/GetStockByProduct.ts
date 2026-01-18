import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/IStockRepository';
import type { ILocationRepository } from '@/modules/wms/domain/ports/ILocationRepository';
import type { 
  IGetStockByProduct, 
  GetStockByProductInput, 
  GetStockByProductOutput, 
  StockByLocationItem 
} from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../../dtos/ExecutionContext';
import type { StockItem } from '@/modules/wms/domain/entities/StockItem';

/**
 * GetStockByProduct Query - E7.8 WMS Semana 2
 * 
 * @implements IGetStockByProduct - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetStockByProduct implements IGetStockByProduct {
  constructor(
    @inject('StockRepository')
    private stockRepository: IStockRepository,
    @inject('LocationRepository')
    private locationRepository: ILocationRepository
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

    // Buscar todas as locations de uma vez (otimização)
    const locationIds = [...new Set(stockItems.map((item: StockItem) => item.locationId))];
    const locationsMap = new Map<string, { code: string; name: string }>();

    for (const locationId of locationIds) {
      const location = await this.locationRepository.findById(
        locationId,
        context.organizationId,
        context.branchId
      );
      
      if (location) {
        locationsMap.set(locationId, {
          code: location.code.value,
          name: location.name
        });
      }
    }

    // Mapear stock items com totalizadores e location data
    let totalQuantity = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    const locations: StockByLocationItem[] = stockItems.map((item: StockItem) => {
      totalQuantity += item.quantity.value;
      totalReserved += item.reservedQuantity.value;
      totalAvailable += item.availableQuantity.value;

      const locationData = locationsMap.get(item.locationId);

      return {
        locationId: item.locationId,
        locationCode: locationData?.code ?? 'UNKNOWN',
        locationName: locationData?.name ?? 'Unknown Location',
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
