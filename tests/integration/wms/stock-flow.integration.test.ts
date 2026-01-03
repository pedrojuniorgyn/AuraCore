// @ts-nocheck
/**
 * Integration Tests - WMS Stock Flow (Entry -> Exit -> Transfer)
 * E7.8 WMS Semana 4
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { RegisterStockEntry } from '@/modules/wms/application/use-cases/RegisterStockEntry';
import { RegisterStockExit } from '@/modules/wms/application/use-cases/RegisterStockExit';
import { TransferStock } from '@/modules/wms/application/use-cases/TransferStock';
import { GetStockItemById } from '@/modules/wms/application/use-cases/queries/GetStockItemById';
import type { IntegrationTestContext } from '../../helpers/integration-db';
import {
  createIntegrationContext,
  disconnectTestDb,
} from '../../helpers/integration-db';
import { Result } from '@/shared/domain';

/** SKIP: Requer SQL Server de teste - TODO E7.11 */
describe.skip('WMS Stock Flow - Integration Tests', () => {
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

  describe('Complete Stock Lifecycle', () => {
    it('should register entry, exit, and transfer', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const exitUseCase = container.resolve(RegisterStockExit);
      const transferUseCase = container.resolve(TransferStock);
      const getUseCase = container.resolve(GetStockItemById);

      // 1. Registrar entrada de 100 unidades
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

      // 2. Saída de 30 unidades
      const exitResult = await exitUseCase.execute(
        {
          stockItemId,
          quantity: { value: 30, unit: 'UNIT' },
          reason: 'SALE',
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(exitResult)).toBe(true);

      // Verificar quantidade após saída
      const getAfterExit = await getUseCase.execute(
        { id: stockItemId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(getAfterExit)).toBe(true);
      
      if (Result.isOk(getAfterExit)) {
        expect(getAfterExit.value.quantity).toBe(70);
      }

      // 3. Transferir 20 unidades para warehouse principal
      const transferResult = await transferUseCase.execute(
        {
          sourceStockItemId: stockItemId,
          destinationLocationId: ctx.testData.warehouseId,
          quantity: { value: 20, unit: 'UNIT' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(transferResult)).toBe(true);

      // Verificar quantidade final na origem
      const getAfterTransfer = await getUseCase.execute(
        { id: stockItemId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(getAfterTransfer)).toBe(true);
      
      if (Result.isOk(getAfterTransfer)) {
        expect(getAfterTransfer.value.quantity).toBe(50);
      }
    });

    it('should prevent exit with insufficient stock', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const exitUseCase = container.resolve(RegisterStockExit);

      // Registrar apenas 10 unidades
      const entryResult = await entryUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
          quantity: { value: 10, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(entryResult)).toBe(true);
      
      let stockItemId: string = '';
      if (Result.isOk(entryResult)) {
        stockItemId = entryResult.value.stockItemId;
      }

      // Tentar saída de 50 unidades (mais do que há)
      const exitResult = await exitUseCase.execute(
        {
          stockItemId,
          quantity: { value: 50, unit: 'UNIT' },
          reason: 'SALE',
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isErr(exitResult)).toBe(true);
      
      if (Result.isErr(exitResult)) {
        expect(exitResult.error).toContain('Insufficient');
      }
    });
  });
});

