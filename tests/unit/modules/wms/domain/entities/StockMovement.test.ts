import { Result } from '@/shared/domain';
import { describe, it, expect } from 'vitest';
import { StockMovement } from '@/modules/wms/domain/entities/StockMovement';
import { StockQuantity, UnitOfMeasure } from '@/modules/wms/domain/value-objects/StockQuantity';
import { MovementType } from '@/modules/wms/domain/value-objects/MovementType';
import { Money } from '@/shared/domain';

describe('StockMovement', () => {
  const createValidMovement = (type: MovementType, fromId?: string, toId?: string) => {
    const quantity = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
    const unitCost = Money.create(10, 'BRL').value;

    return StockMovement.create({
      id: 'mov-001',
      organizationId: 1,
      branchId: 1,
      productId: 'prod-001',
      fromLocationId: fromId,
      toLocationId: toId,
      type,
      quantity,
      unitCost,
      executedBy: 'user-001',
      executedAt: new Date(),
      createdAt: new Date(),
    });
  };

  describe('create() - ENTRY', () => {
    it('should create valid entry movement', () => {
      const type = MovementType.entry().value;
      const result = createValidMovement(type, undefined, 'loc-001');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.type.isEntry()).toBe(true);
    });

    it('should fail entry without toLocationId', () => {
      const type = MovementType.entry().value;
      const result = createValidMovement(type);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('requires toLocationId');
    });

    it('should fail entry with fromLocationId', () => {
      const type = MovementType.entry().value;
      const result = createValidMovement(type, 'loc-001', 'loc-002');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('should not have fromLocationId');
    });
  });

  describe('create() - EXIT', () => {
    it('should create valid exit movement', () => {
      const type = MovementType.exit().value;
      const result = createValidMovement(type, 'loc-001');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.type.isExit()).toBe(true);
    });

    it('should fail exit without fromLocationId', () => {
      const type = MovementType.exit().value;
      const result = createValidMovement(type);
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('requires fromLocationId');
    });

    it('should fail exit with toLocationId', () => {
      const type = MovementType.exit().value;
      const result = createValidMovement(type, 'loc-001', 'loc-002');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('should not have toLocationId');
    });
  });

  describe('create() - TRANSFER', () => {
    it('should create valid transfer movement', () => {
      const type = MovementType.transfer().value;
      const result = createValidMovement(type, 'loc-001', 'loc-002');
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.type.isTransfer()).toBe(true);
    });

    it('should fail transfer without fromLocationId', () => {
      const type = MovementType.transfer().value;
      const result = createValidMovement(type, undefined, 'loc-002');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('requires both');
    });

    it('should fail transfer without toLocationId', () => {
      const type = MovementType.transfer().value;
      const result = createValidMovement(type, 'loc-001');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('requires both');
    });

    it('should fail transfer with same from and to', () => {
      const type = MovementType.transfer().value;
      const result = createValidMovement(type, 'loc-001', 'loc-001');
      
      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('must be different');
    });
  });

  describe('totalCost', () => {
    it('should calculate total cost correctly', () => {
      const type = MovementType.entry().value;
      const movement = createValidMovement(type, undefined, 'loc-001').value;
      
      expect(movement.getTotalCost().value.amount).toBe(500); // 50 * 10
    });
  });

  describe('reference', () => {
    it('should accept reference data', () => {
      const type = MovementType.entry().value;
      const quantity = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;

      const result = StockMovement.create({
        id: 'mov-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        toLocationId: 'loc-001',
        type,
        quantity,
        unitCost,
        referenceType: 'FISCAL_DOC',
        referenceId: 'doc-001',
        executedBy: 'user-001',
        executedAt: new Date(),
        createdAt: new Date(),
      });
      
      expect(Result.isOk(result)).toBe(true);
      expect(result.value.hasReference()).toBe(true);
      expect(result.value.isFiscalDocEntry()).toBe(true);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute movement', () => {
      const type = MovementType.entry().value;
      const quantity = StockQuantity.create(50, UnitOfMeasure.UNIT).value;
      const unitCost = Money.create(10, 'BRL').value;

      const result = StockMovement.reconstitute({
        id: 'mov-001',
        organizationId: 1,
        branchId: 1,
        productId: 'prod-001',
        toLocationId: 'loc-001',
        type,
        quantity,
        unitCost,
        executedBy: 'user-001',
        executedAt: new Date(),
        createdAt: new Date(),
      });
      
      expect(Result.isOk(result)).toBe(true);
    });
  });
});

