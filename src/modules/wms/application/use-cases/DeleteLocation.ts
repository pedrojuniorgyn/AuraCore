import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { ILocationRepository } from '@/modules/wms/domain/ports/ILocationRepository';
import type { IStockRepository } from '@/modules/wms/domain/ports/IStockRepository';
import type { IDeleteLocation, DeleteLocationInput, DeleteLocationOutput } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../dtos/ExecutionContext';
import type { Location } from '@/modules/wms/domain/entities/Location';

/**
 * DeleteLocation Use Case - E7.8 WMS Semana 3
 * 
 * @implements IDeleteLocation - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class DeleteLocation implements IDeleteLocation {
  constructor(
    @inject('LocationRepository')
    private locationRepository: ILocationRepository,
    @inject('StockRepository')
    private stockRepository: IStockRepository
  ) {}

  async execute(
    input: DeleteLocationInput,
    context: ExecutionContext
  ): Promise<Result<DeleteLocationOutput, string>> {
    const location = await this.locationRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!location) {
      return Result.fail('Location not found');
    }

    const stockItems = await this.stockRepository.findByLocation(
      input.id,
      context.organizationId,
      context.branchId
    );

    const hasStock = stockItems.some(item => item.quantity.value > 0);
    if (hasStock) {
      return Result.fail('Cannot delete location with active stock');
    }

    const children = await this.locationRepository.findChildren(
      input.id,
      context.organizationId,
      context.branchId
    );

    const hasActiveChildren = children.some((child: Location) => child.isActive);
    if (hasActiveChildren) {
      return Result.fail('Cannot delete location with active children');
    }

    await this.locationRepository.delete(
      input.id,
      context.organizationId,
      context.branchId
    );

    return Result.ok<DeleteLocationOutput>({
      id: input.id,
      deleted: true,
      deletedAt: new Date().toISOString()
    });
  }
}
