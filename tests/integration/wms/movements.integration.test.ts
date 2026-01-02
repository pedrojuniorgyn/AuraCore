/**
 * Integration Tests - WMS Movements (Query & Tracking)
 * E7.8 WMS Semana 4
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { RegisterStockEntry } from '@/modules/wms/application/use-cases/RegisterStockEntry';
import { RegisterStockExit } from '@/modules/wms/application/use-cases/RegisterStockExit';
import { ListMovements } from '@/modules/wms/application/use-cases/queries/ListMovements';
import { GetMovementById } from '@/modules/wms/application/use-cases/queries/GetMovementById';
import type { IntegrationTestContext } from '@/tests/helpers/integration-db';
import {
  createIntegrationContext,
  disconnectTestDb,
} from '@/tests/helpers/integration-db';
import { Result } from '@/shared/domain';

describe('WMS Movements - Integration Tests', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await createIntegrationContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await ctx.cleanup();
    const newData = await createIntegrationContext();
    ctx.testData = newData.testData;
  });

  describe('Movement Tracking', () => {
    it('should track all movements (entry + exit)', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const exitUseCase = container.resolve(RegisterStockExit);
      const listUseCase = container.resolve(ListMovements);

      // 1. Registrar entrada
      const entryResult = await entryUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
          quantity: { value: 100, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(entryResult)).toBe(true);
      
      let stockItemId: string = '';
      if (Result.isOk(entryResult)) {
        stockItemId = entryResult.value.stockItemId;
      }

      // 2. Registrar saída
      await exitUseCase.execute(
        {
          stockItemId,
          quantity: { value: 30, unit: 'UNIT' },
          reason: 'SALE',
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      // 3. Listar movimentos
      const listResult = await listUseCase.execute(
        {
          page: 1,
          limit: 10,
          productId: ctx.testData.productId,
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(listResult)).toBe(true);
      
      if (Result.isOk(listResult)) {
        expect(listResult.value.items.length).toBeGreaterThanOrEqual(2); // Entry + Exit
        
        const entryMovement = listResult.value.items.find((m) => m.type === 'ENTRY');
        const exitMovement = listResult.value.items.find((m) => m.type === 'EXIT');
        
        expect(entryMovement).toBeDefined();
        expect(exitMovement).toBeDefined();
      }
    });

    it('should filter movements by type', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const listUseCase = container.resolve(ListMovements);

      // Registrar entrada
      await entryUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
          quantity: { value: 50, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      // Listar apenas ENTRYs
      const listResult = await listUseCase.execute(
        {
          page: 1,
          limit: 10,
          type: 'ENTRY',
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(listResult)).toBe(true);
      
      if (Result.isOk(listResult)) {
        listResult.value.items.forEach((movement) => {
          expect(movement.type).toBe('ENTRY');
        });
      }
    });

    it('should filter movements by location', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const listUseCase = container.resolve(ListMovements);

      // Registrar entrada em location específico
      await entryUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
          quantity: { value: 50, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      // Listar por locationId
      const listResult = await listUseCase.execute(
        {
          page: 1,
          limit: 10,
          locationId: ctx.testData.locationId,
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(listResult)).toBe(true);
      
      if (Result.isOk(listResult)) {
        listResult.value.items.forEach((movement) => {
          const hasLocation = 
            movement.fromLocationId === ctx.testData.locationId ||
            movement.toLocationId === ctx.testData.locationId;
          expect(hasLocation).toBe(true);
        });
      }
    });
  });
});

