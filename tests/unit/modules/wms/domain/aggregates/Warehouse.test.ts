import { Result } from '@/shared/domain';
import { describe, it, expect } from 'vitest';
import { Warehouse } from '@/modules/wms/domain/aggregates/Warehouse';
import { Location } from '@/modules/wms/domain/entities/Location';
import { LocationCode } from '@/modules/wms/domain/value-objects/LocationCode';
import { StockQuantity, UnitOfMeasure } from '@/modules/wms/domain/value-objects/StockQuantity';

describe('Warehouse', () => {
  const createValidWarehouse = () => {
    return Warehouse.create({
      id: 'wh-001',
      organizationId: 1,
      branchId: 1,
      code: 'ARM01',
      name: 'Armazém Principal',
      isActive: true,
      locations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const createValidLocation = (id: string, code: string, type: 'WAREHOUSE' | 'AISLE' | 'SHELF' | 'POSITION', parentId?: string) => {
    const locationCode = LocationCode.create(code).value;
    
    return Location.create({
      id,
      organizationId: 1,
      branchId: 1,
      warehouseId: 'wh-001',
      code: locationCode,
      name: `Location ${code}`,
      type,
      parentId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).value;
  };

  describe('create()', () => {
    it('should create valid warehouse', () => {
      const result = createValidWarehouse();
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toBe('wh-001');
    });

    it('should normalize code to uppercase', () => {
      const result = Warehouse.create({
        id: 'wh-001',
        organizationId: 1,
        branchId: 1,
        code: 'arm01',
        name: 'Armazém Principal',
        isActive: true,
        locations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.code).toBe('ARM01');
    });

    it('should fail for empty code', () => {
      const result = Warehouse.create({
        id: 'wh-001',
        organizationId: 1,
        branchId: 1,
        code: '',
        name: 'Armazém Principal',
        isActive: true,
        locations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('required');
    });
  });

  describe('addLocation()', () => {
    it('should add location successfully', () => {
      const warehouse = createValidWarehouse().value;
      const location = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      
      const result = warehouse.addLocation(location);
      
      expect(Result.isOk(result)).toBe(true);
      expect(warehouse.locations.length).toBe(1);
    });

    it('should fail when adding location with different warehouseId', () => {
      const warehouse = createValidWarehouse().value;
      const code = LocationCode.create('ARM01').value;
      
      // Criar location com warehouseId diferente
      const locationResult = Location.create({
        id: 'loc-001',
        organizationId: 1,
        branchId: 1,
        warehouseId: 'wh-002', // warehouseId diferente!
        code,
        name: 'Location Test',
        type: 'WAREHOUSE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isOk(locationResult)).toBe(true);
      const result = warehouse.addLocation(locationResult.value);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('warehouse');
    });

    it('should fail when adding duplicate location id', () => {
      const warehouse = createValidWarehouse().value;
      const location1 = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      const location2 = createValidLocation('loc-001', 'ARM01-A', 'AISLE', 'loc-001');
      
      warehouse.addLocation(location1);
      const result = warehouse.addLocation(location2);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('already exists');
    });

    it('should fail when adding duplicate location code', () => {
      const warehouse = createValidWarehouse().value;
      const location1 = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      const location2 = createValidLocation('loc-002', 'ARM01', 'WAREHOUSE');
      
      warehouse.addLocation(location1);
      const result = warehouse.addLocation(location2);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('code');
      expect(result.error).toContain('already exists');
    });

    it('should fail when adding second WAREHOUSE type', () => {
      const warehouse = createValidWarehouse().value;
      const location1 = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      const location2 = createValidLocation('loc-002', 'ARM02', 'WAREHOUSE');
      
      warehouse.addLocation(location1);
      const result = warehouse.addLocation(location2);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('WAREHOUSE-type');
    });

    it('should fail when parentId does not exist', () => {
      const warehouse = createValidWarehouse().value;
      const location = createValidLocation('loc-002', 'ARM01-A', 'AISLE', 'non-existent');
      
      const result = warehouse.addLocation(location);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('removeLocation()', () => {
    it('should remove location successfully', () => {
      const warehouse = createValidWarehouse().value;
      const location = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      
      warehouse.addLocation(location);
      const result = warehouse.removeLocation('loc-001');
      
      expect(Result.isOk(result)).toBe(true);
      expect(warehouse.locations.length).toBe(0);
    });

    it('should fail when removing location with children', () => {
      const warehouse = createValidWarehouse().value;
      const parent = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      const child = createValidLocation('loc-002', 'ARM01-A', 'AISLE', 'loc-001');
      
      warehouse.addLocation(parent);
      warehouse.addLocation(child);
      
      const result = warehouse.removeLocation('loc-001');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('with children');
    });

    it('should fail when location not found', () => {
      const warehouse = createValidWarehouse().value;
      
      const result = warehouse.removeLocation('non-existent');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('findLocation()', () => {
    it('should find location by code', () => {
      const warehouse = createValidWarehouse().value;
      const location = createValidLocation('loc-001', 'ARM01', 'WAREHOUSE');
      const code = LocationCode.create('ARM01').value;
      
      warehouse.addLocation(location);
      const found = warehouse.findLocation(code);
      
      expect(found).not.toBeNull();
      expect(found!.id).toBe('loc-001');
    });

    it('should return null when location not found', () => {
      const warehouse = createValidWarehouse().value;
      const code = LocationCode.create('ARM99').value;
      
      const found = warehouse.findLocation(code);
      
      expect(found).toBeNull();
    });
  });

  describe('calculateUsedCapacity()', () => {
    it('should calculate used capacity from locations', () => {
      const warehouse = createValidWarehouse().value;
      const capacity1 = StockQuantity.create(100, UnitOfMeasure.UNIT).value;
      const capacity2 = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
      
      const location1 = Location.create({
        id: 'loc-001',
        organizationId: 1,
        branchId: 1,
        warehouseId: 'wh-001',
        code: LocationCode.create('ARM01').value,
        name: 'Location 1',
        type: 'WAREHOUSE',
        capacity: capacity1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).value;
      
      const location2 = Location.create({
        id: 'loc-002',
        organizationId: 1,
        branchId: 1,
        warehouseId: 'wh-001',
        code: LocationCode.create('ARM01-A').value,
        name: 'Location 2',
        type: 'AISLE',
        parentId: 'loc-001',
        capacity: capacity2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).value;
      
      warehouse.addLocation(location1);
      warehouse.addLocation(location2);
      
      const usedCapacity = warehouse.calculateUsedCapacity();
      
      expect(usedCapacity).not.toBeUndefined();
      expect(usedCapacity!.value).toBe(150);
    });
  });
});

