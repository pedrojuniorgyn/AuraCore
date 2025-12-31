import { Result } from '@/shared/domain';
import { describe, it, expect } from 'vitest';
import { StockItem } from '@/modules/wms/domain/entities/StockItem';
import { StockQuantity, UnitOfMeasure } from '@/modules/wms/domain/value-objects/StockQuantity';
import { Money } from '@/shared/domain';

describe('StockItem', () => {
  const createValidStockItem = () => {
    const quantity = StockQuantity.create(100, UnitOfMeasure.UNIT).value;
    const reservedQuantity = StockQuantity.create(20, UnitOfMeasure.UNIT).value;
    const unitCost = Money.create(10.50, 'BRL').value;

    return StockItem.create({
      id: 'stock-001',
      organizationId: 1,
      branchId: 1,
      productId: 'prod-001',
      locationId: 'loc-001',
      quantity,
      reservedQuantity,
      unitCost,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('create()', () => {
    it('should create valid stock item', () => {
      const result = createValidStockItem();
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.id).toBe('stock-001');
    });

    it('should calculate available quantity correctly', () => {
      const stockItem = createValidStockItem().value;
      
      expect(stockItem.availableQuantity.value).toBe(80); // 100 - 20
    });

    it('should calculate total cost correctly', () => {
      const stockItem = createValidStockItem().value;
      
      expect(stockItem.totalCost.amount).toBe(1050); // 100 * 10.50
    });

    it('should fail for negative quantity', () => {
      const negativeQty = StockQuantity.create(-10, UnitOfMeasure.UNIT, true).value;
      const reserved = StockQuantity.create(0, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;

      const result = StockItem.create({
        id: 'stock-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        locationId: 'loc-001',
        quantity: negativeQty,
        reservedQuantity: reserved,
        unitCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot be negative');
    });

    it('should fail when reserved > quantity', () => {
      const quantity = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
      const reservedQuantity = StockQuantity.create(80, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;

      const result = StockItem.create({
        id: 'stock-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        locationId: 'loc-001',
        quantity,
        reservedQuantity,
        unitCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('cannot exceed total quantity');
    });

    it('should fail for different units', () => {
      const quantity = StockQuantity.create(100, UnitOfMeasure.UNIT).value;
      const reservedQuantity = StockQuantity.create(20, UnitOfMeasure.KILOGRAM).value;
      const unitCost = Money.create(10, 'BRL').value;

      const result = StockItem.create({
        id: 'stock-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        locationId: 'loc-001',
        quantity,
        reservedQuantity,
        unitCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('same unit');
    });
  });

  describe('addQuantity()', () => {
    it('should add quantity successfully', () => {
      const stockItem = createValidStockItem().value;
      const toAdd = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
      
      const result = stockItem.addQuantity(toAdd);
      
      expect(Result.isOk(result)).toBe(true);
      expect(stockItem.quantity.value).toBe(150);
    });

    it('should fail for negative quantity', () => {
      const stockItem = createValidStockItem().value;
      const toAdd = StockQuantity.create(-10, UnitOfMeasure.UNIT, true).value;
      
      const result = stockItem.addQuantity(toAdd);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('must be positive');
    });
  });

  describe('removeQuantity()', () => {
    it('should remove quantity successfully', () => {
      const stockItem = createValidStockItem().value;
      const toRemove = StockQuantity.create(30, UnitOfMeasure.UNIT).value;
      
      const result = stockItem.removeQuantity(toRemove);
      
      expect(Result.isOk(result)).toBe(true);
      expect(stockItem.quantity.value).toBe(70);
    });

    it('should fail when removing more than available', () => {
      const stockItem = createValidStockItem().value;
      const toRemove = StockQuantity.create(90, UnitOfMeasure.UNIT).value; // Only 80 available (100 - 20 reserved)
      
      const result = stockItem.removeQuantity(toRemove);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Insufficient available');
    });
  });

  describe('reserve()', () => {
    it('should reserve quantity successfully', () => {
      const stockItem = createValidStockItem().value;
      const toReserve = StockQuantity.create(30, UnitOfMeasure.UNIT).value;
      
      const result = stockItem.reserve(toReserve);
      
      expect(Result.isOk(result)).toBe(true);
      expect(stockItem.reservedQuantity.value).toBe(50); // 20 + 30
      expect(stockItem.availableQuantity.value).toBe(50); // 100 - 50
    });

    it('should fail when reserving more than available', () => {
      const stockItem = createValidStockItem().value;
      const toReserve = StockQuantity.create(90, UnitOfMeasure.UNIT).value; // Only 80 available
      
      const result = stockItem.reserve(toReserve);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Insufficient available');
    });
  });

  describe('release()', () => {
    it('should release reserved quantity successfully', () => {
      const stockItem = createValidStockItem().value;
      const toRelease = StockQuantity.create(10, UnitOfMeasure.UNIT).value;
      
      const result = stockItem.release(toRelease);
      
      expect(Result.isOk(result)).toBe(true);
      expect(stockItem.reservedQuantity.value).toBe(10); // 20 - 10
      expect(stockItem.availableQuantity.value).toBe(90); // 100 - 10
    });

    it('should fail when releasing more than reserved', () => {
      const stockItem = createValidStockItem().value;
      const toRelease = StockQuantity.create(30, UnitOfMeasure.UNIT).value; // Only 20 reserved
      
      const result = stockItem.release(toRelease);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('more than reserved');
    });
  });

  describe('expiration', () => {
    it('should detect expired product', () => {
      const quantity = StockQuantity.create(100, UnitOfMeasure.UNIT).value;
      const reserved = StockQuantity.create(0, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;
      const pastDate = new Date('2020-01-01');

      const stockItem = StockItem.create({
        id: 'stock-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        locationId: 'loc-001',
        quantity,
        reservedQuantity: reserved,
        expirationDate: pastDate,
        unitCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isFail(stockItem)).toBe(true);
      expect(stockItem.error).toContain('expired');
    });

    it('should detect near expiration', () => {
      const quantity = StockQuantity.create(100, UnitOfMeasure.UNIT).value;
      const reserved = StockQuantity.create(0, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;
      
      // Data daqui a 15 dias
      const nearExpirationDate = new Date();
      nearExpirationDate.setDate(nearExpirationDate.getDate() + 15);

      const result = StockItem.reconstitute({
        id: 'stock-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        locationId: 'loc-001',
        quantity,
        reservedQuantity: reserved,
        expirationDate: nearExpirationDate,
        unitCost,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.isNearExpiration(30)).toBe(true); // Dentro de 30 dias
      expect(result.value.isNearExpiration(10)).toBe(false); // Não dentro de 10 dias
    });
  });
});

