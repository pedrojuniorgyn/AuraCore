/**
 * Integration Tests - WMS Inventory Count
 * E7.8 WMS Semana 4
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { RegisterStockEntry } from '@/modules/wms/application/use-cases/RegisterStockEntry';
import { StartInventoryCount } from '@/modules/wms/application/use-cases/StartInventoryCount';
import { CompleteInventoryCount } from '@/modules/wms/application/use-cases/CompleteInventoryCount';
import { GetInventoryCountById } from '@/modules/wms/application/use-cases/queries/GetInventoryCountById';
import type { IntegrationTestContext } from '../../helpers/integration-db';
import {
  createIntegrationContext,
  disconnectTestDb,
} from '../../helpers/integration-db';
import { Result } from '@/shared/domain';

/**
 * SKIP: Testes de integração requerem SQL Server de teste rodando
 * 
 * Para executar:
 * 1. docker-compose -f docker-compose.test.yml up -d
 * 2. npm test -- tests/integration/wms/inventory-count.integration.test.ts
 * 
 * TODO E7.11: Configurar CI/CD com banco de teste
 */
describe.skip('WMS Inventory Count - Integration Tests', () => {
  // NOTE: Type errors expected - these tests use Value Objects but interfaces expect primitives
  // Will be fixed when implementing real SQL Server integration (E7.11)
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

  describe('Complete Inventory Count Flow', () => {
    it('should start and complete inventory count with adjustment', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const startUseCase = container.resolve(StartInventoryCount);
      const completeUseCase = container.resolve(CompleteInventoryCount);
      const getUseCase = container.resolve(GetInventoryCountById);

      // 1. Registrar estoque inicial (100 unidades)
      await entryUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
          quantity: { value: 100, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      // 2. Iniciar contagem
      const startResult = await startUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(startResult)).toBe(true);
      
      let inventoryCountId: string = '';
      if (Result.isOk(startResult)) {
        inventoryCountId = startResult.value.id;
        expect(startResult.value.status).toBe('PENDING');
        expect(startResult.value.systemQuantity).toBe(100);
      }

      // 3. Completar contagem (contado 95 unidades - 5 a menos)
      const completeResult = await completeUseCase.execute(
        {
          inventoryCountId,
          countedQuantity: { value: 95, unit: 'UNIT' },
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(completeResult)).toBe(true);
      
      if (Result.isOk(completeResult)) {
        expect(completeResult.value.status).toBe('COMPLETED');
        expect(completeResult.value.difference).toBe(-5); // 5 a menos
        expect(completeResult.value.adjustmentMovementId).toBeDefined();
      }

      // 4. Verificar contagem completa
      const getResult = await getUseCase.execute(
        { id: inventoryCountId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(getResult)).toBe(true);
      
      if (Result.isOk(getResult)) {
        expect(getResult.value.status).toBe('COMPLETED');
        expect(getResult.value.countedBy).toBe('test-user');
      }
    });

    it('should prevent duplicate inventory count for same product/location', async () => {
      const startUseCase = container.resolve(StartInventoryCount);

      // Primeira contagem
      const result1 = await startUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(result1)).toBe(true);

      // Segunda contagem para mesmo produto/local
      const result2 = await startUseCase.execute(
        {
          productId: ctx.testData.productId,
          locationId: ctx.testData.locationId,
        },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isFail(result2)).toBe(true);
      
      if (Result.isFail(result2)) {
        expect(result2.error).toContain('already in progress');
      }
    });
  });
});

