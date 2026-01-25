import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IStockRepository } from '@/modules/wms/domain/ports/output/IStockRepository';
import type { IGetStockItemById, GetStockItemByIdInput, GetStockItemByIdOutput } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../../dtos/ExecutionContext';

/**
 * GetStockItemById Query - E7.8 WMS Semana 2
 * 
 * @implements IGetStockItemById - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class GetStockItemById implements IGetStockItemById {
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

    // ✅ S1.3-APP: getAvailableQuantity() retorna Result<StockQuantity, string>
    const availableResult = stockItem.getAvailableQuantity();
    if (Result.isFail(availableResult)) {
      return Result.fail(`Erro ao obter quantidade disponível: ${availableResult.error}`);
    }
    
    return Result.ok<GetStockItemByIdOutput>({
      id: stockItem.id,
      productId: stockItem.productId,
      locationId: stockItem.locationId,
      quantity: stockItem.quantity.value,
      unit: stockItem.quantity.unit,
      reservedQuantity: stockItem.reservedQuantity.value,
      availableQuantity: availableResult.value.value,
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
