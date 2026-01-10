import { Location } from '../../../domain/entities/Location';
import { LocationCode } from '../../../domain/value-objects/LocationCode';
import { StockQuantity, UnitOfMeasure } from '../../../domain/value-objects/StockQuantity';
import { Result } from '@/shared/domain';
import type { WmsLocationPersistence } from '../schemas/LocationSchema';

/**
 * LocationMapper - E7.8 WMS Semana 2
 * 
 * Converte Location entre Domain e Persistence
 * Segue INFRA-006: reconstitute() ao invés de create()
 */

export class LocationMapper {
  static toDomain(persistence: WmsLocationPersistence): Result<Location, string> {
    // Reconstituir LocationCode
    const codeResult = LocationCode.reconstitute(persistence.code);
    if (!Result.isOk(codeResult)) {
      return Result.fail(codeResult.error);
    }

    // Reconstituir capacity se existir
    let capacity: StockQuantity | undefined;
    if (persistence.capacity !== null && persistence.capacityUnit !== null) {
      const capacityResult = StockQuantity.reconstitute(
        parseFloat(persistence.capacity),
        persistence.capacityUnit as UnitOfMeasure
      );
      if (!Result.isOk(capacityResult)) {
        return Result.fail(capacityResult.error);
      }
      capacity = capacityResult.value;
    }

    // Usar reconstitute para preservar timestamps
    const locationResult = Location.reconstitute({
      id: persistence.id,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
      warehouseId: persistence.warehouseId,
      code: codeResult.value,
      name: persistence.name,
      type: persistence.type as 'WAREHOUSE' | 'AISLE' | 'SHELF' | 'POSITION',
      parentId: persistence.parentId ?? undefined,
      capacity,
      isActive: Boolean(persistence.isActive),
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt
    });

    if (!Result.isOk(locationResult)) {
      return Result.fail(locationResult.error);
    }

    return Result.ok(locationResult.value);
  }

  static toPersistence(location: Location): WmsLocationPersistence {
    return {
      id: location.id,
      organizationId: location.organizationId,
      branchId: location.branchId,
      warehouseId: location.warehouseId,
      code: location.code.value,
      name: location.name,
      type: location.type,
      parentId: location.parentId ?? null,
      capacity: location.capacity ? String(location.capacity.value) : null,
      capacityUnit: location.capacity?.unit ?? null,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      deletedAt: null
    };
  }
}

