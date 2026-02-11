import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { StockQuantity, UnitOfMeasure } from '@/modules/wms/domain/value-objects/StockQuantity';
import type { ILocationRepository } from '@/modules/wms/domain/ports/output/ILocationRepository';
import type { IUpdateLocation } from '@/modules/wms/domain/ports/input';
import type { ExecutionContext } from '../dtos/ExecutionContext';
import type { UpdateLocationInput, UpdateLocationOutput } from '../dtos/UpdateLocationDTO';

/**
 * UpdateLocation Use Case - E7.8 WMS Semana 3
 * 
 * @implements IUpdateLocation - Input Port de domain/ports/input/
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */
@injectable()
export class UpdateLocation implements IUpdateLocation {
  constructor(
    @inject('LocationRepository')
    private locationRepository: ILocationRepository
  ) {}

  async execute(
    input: UpdateLocationInput,
    context: ExecutionContext
  ): Promise<Result<UpdateLocationOutput, string>> {
    // Bug Fix: Use !== undefined to distinguish "not provided" from "empty string"
    if (input.name === undefined && input.capacity === undefined && input.capacityUnit === undefined && input.isActive === undefined) {
      return Result.fail('At least one field must be provided for update');
    }

    const location = await this.locationRepository.findById(
      input.id,
      context.organizationId,
      context.branchId
    );

    if (!location) {
      return Result.fail('Location not found');
    }

    // Bug Fix: Use !== undefined to allow empty string (if business rules permit)
    if (input.name !== undefined) {
      // Validate that name is not empty (business rule)
      if (input.name.trim() === '') {
        return Result.fail('Name cannot be empty');
      }
      location.updateName(input.name);
    }

    if (input.capacity !== undefined) {
      const unit = input.capacityUnit ?? location.capacity?.unit;
      if (!unit) {
        return Result.fail('Capacity unit is required when setting capacity');
      }
      const capacityResult = StockQuantity.create(input.capacity, unit as UnitOfMeasure);
      if (!Result.isOk(capacityResult)) {
        return Result.fail(capacityResult.error);
      }
      const setResult = location.setCapacity(capacityResult.value);
      if (!Result.isOk(setResult)) {
        return Result.fail(setResult.error);
      }
    } else if (input.capacityUnit !== undefined) {
      if (!location.capacity) {
        return Result.fail('Cannot update capacity unit without capacity value');
      }
      const capacityResult = StockQuantity.create(location.capacity.value, input.capacityUnit as UnitOfMeasure);
      if (!Result.isOk(capacityResult)) {
        return Result.fail(capacityResult.error);
      }
      const setResult = location.setCapacity(capacityResult.value);
      if (!Result.isOk(setResult)) {
        return Result.fail(setResult.error);
      }
    }

    if (input.isActive !== undefined) {
      if (input.isActive) {
        location.activate();
      } else {
        location.deactivate();
      }
    }

    await this.locationRepository.save(location);

    return Result.ok<UpdateLocationOutput>({
      id: location.id,
      code: location.code.value,
      name: location.name,
      type: location.type,
      capacity: location.capacity?.value ?? null,
      capacityUnit: location.capacity?.unit ?? null,
      isActive: location.isActive,
      updatedAt: location.updatedAt
    });
  }
}
