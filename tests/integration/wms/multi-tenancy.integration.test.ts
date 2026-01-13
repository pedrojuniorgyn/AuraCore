/**
 * Integration Tests - WMS Multi-Tenancy Isolation
 * E7.8 WMS Semana 4
 * 
 * Garante que organizações/branches não acessam dados de outros tenants
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { CreateLocation } from '@/modules/wms/application/use-cases/CreateLocation';
import { RegisterStockEntry } from '@/modules/wms/application/use-cases/RegisterStockEntry';
import { GetLocationById } from '@/modules/wms/application/use-cases/queries/GetLocationById';
import { GetStockItemById } from '@/modules/wms/application/use-cases/queries/GetStockItemById';
import { ListLocations } from '@/modules/wms/application/use-cases/queries/ListLocations';
import { ListStockItems } from '@/modules/wms/application/use-cases/queries/ListStockItems';
import type { IntegrationTestContext } from '../../helpers/integration-db';
import {
  createIntegrationContext,
  disconnectTestDb,
} from '../../helpers/integration-db';
import { Result } from '@/shared/domain';

/**
 * E7.11 Semana 2: Testes de integração habilitados
 * Requer: npm run test:integration:docker
 */
describe.skipIf(!process.env.DB_TEST_HOST)('WMS Multi-Tenancy - Integration Tests', () => {
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

  describe('Organization Isolation', () => {
    it('should not access location from different organization', async () => {
      const createUseCase = container.resolve(CreateLocation);
      const getUseCase = container.resolve(GetLocationById);

      // Criar location na org 1
      const createResult = await createUseCase.execute(
        {
          code: 'WH-ORG1',
          name: 'Org 1 Warehouse',
          type: 'WAREHOUSE',
          capacity: { value: 1000, unit: 'UNIT' },
        },
        { organizationId: 1, branchId: 1, userId: 'user-org1' }
      );

      expect(Result.isOk(createResult)).toBe(true);
      
      let locationId: string = '';
      if (Result.isOk(createResult)) {
        locationId = createResult.value.id;
      }

      // Tentar acessar da org 2
      const getResult = await getUseCase.execute(
        { id: locationId },
        { organizationId: 2, branchId: 1, userId: 'user-org2' }
      );

      expect(Result.isFail(getResult)).toBe(true);
      
      if (Result.isFail(getResult)) {
        expect(getResult.error).toContain('not found');
      }
    });

    it('should not list locations from other organizations', async () => {
      const createUseCase = container.resolve(CreateLocation);
      const listUseCase = container.resolve(ListLocations);

      // Criar location na org 1
      await createUseCase.execute(
        {
          code: 'WH-ORG1-LIST',
          name: 'Org 1 Warehouse',
          type: 'WAREHOUSE',
          capacity: { value: 1000, unit: 'UNIT' },
        },
        { organizationId: 1, branchId: 1, userId: 'user-org1' }
      );

      // Criar location na org 2
      await createUseCase.execute(
        {
          code: 'WH-ORG2-LIST',
          name: 'Org 2 Warehouse',
          type: 'WAREHOUSE',
          capacity: { value: 1000, unit: 'UNIT' },
        },
        { organizationId: 2, branchId: 1, userId: 'user-org2' }
      );

      // Listar da org 1
      const listOrg1 = await listUseCase.execute(
        { page: 1, limit: 10 },
        { organizationId: 1, branchId: 1, userId: 'user-org1' }
      );

      expect(Result.isOk(listOrg1)).toBe(true);
      
      if (Result.isOk(listOrg1)) {
        // Não deve ver locations da org 2
        const hasOrg2Location = listOrg1.value.items.some(
          (loc) => loc.code === 'WH-ORG2-LIST'
        );
        expect(hasOrg2Location).toBe(false);
      }
    });
  });

  describe('Branch Isolation', () => {
    it('should not access stock from different branch', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const getUseCase = container.resolve(GetStockItemById);

      // Criar stock no branch 1
      const entryResult = await entryUseCase.execute(
        {
          productId: 'prod-branch1',
          locationId: ctx.testData.locationId,
          quantity: { value: 100, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'user-branch1' }
      );

      expect(Result.isOk(entryResult)).toBe(true);
      
      let stockItemId: string = '';
      if (Result.isOk(entryResult)) {
        stockItemId = entryResult.value.stockItemId;
      }

      // Tentar acessar do branch 2
      const getResult = await getUseCase.execute(
        { id: stockItemId },
        { organizationId: 1, branchId: 2, userId: 'user-branch2' }
      );

      expect(Result.isFail(getResult)).toBe(true);
      
      if (Result.isFail(getResult)) {
        expect(getResult.error).toContain('not found');
      }
    });

    it('should not list stock from other branches', async () => {
      const entryUseCase = container.resolve(RegisterStockEntry);
      const listUseCase = container.resolve(ListStockItems);

      // Criar stock no branch 1
      await entryUseCase.execute(
        {
          productId: 'prod-branch1-list',
          locationId: ctx.testData.locationId,
          quantity: { value: 100, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 1, userId: 'user-branch1' }
      );

      // Criar stock no branch 2
      await entryUseCase.execute(
        {
          productId: 'prod-branch2-list',
          locationId: ctx.testData.locationId,
          quantity: { value: 100, unit: 'UNIT' },
          unitCost: { amount: 10, currency: 'BRL' },
        },
        { organizationId: 1, branchId: 2, userId: 'user-branch2' }
      );

      // Listar do branch 1
      const listBranch1 = await listUseCase.execute(
        { page: 1, limit: 10 },
        { organizationId: 1, branchId: 1, userId: 'user-branch1' }
      );

      expect(Result.isOk(listBranch1)).toBe(true);
      
      if (Result.isOk(listBranch1)) {
        // Não deve ver stock do branch 2
        const hasBranch2Stock = listBranch1.value.items.some(
          (stock) => stock.productId === 'prod-branch2-list'
        );
        expect(hasBranch2Stock).toBe(false);
      }
    });
  });
});

