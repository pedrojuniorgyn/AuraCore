/**
 * Integration Tests - WMS Locations
 * E7.8 WMS Semana 4
 * 
 * Testa fluxos completos com banco de dados real
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { CreateLocation } from '@/modules/wms/application/commands/CreateLocation';
import { UpdateLocation } from '@/modules/wms/application/commands/UpdateLocation';
import { DeleteLocation } from '@/modules/wms/application/commands/DeleteLocation';
import { GetLocationById } from '@/modules/wms/application/queries/GetLocationById';
import { ListLocations } from '@/modules/wms/application/queries/ListLocations';
import type { IntegrationTestContext } from '../../helpers/integration-db';
import {
  createIntegrationContext,
  disconnectTestDb,
} from '../../helpers/integration-db';
import { Result } from '@/shared/domain';

/**
 * E7.11 Semana 2: Testes de integração habilitados
 * 
 * Requer SQL Server de teste rodando:
 * npm run test:integration:docker
 */
describe.skipIf(!process.env.DB_TEST_HOST)('WMS Locations - Integration Tests', () => {
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

  describe('Create Location Flow', () => {
    it('should create a warehouse location', async () => {
      const createUseCase = container.resolve(CreateLocation);

      const input = {
        code: 'WH-INT-001',
        name: 'Integration Test Warehouse',
        type: 'WAREHOUSE' as const,
        capacity: { value: 5000, unit: 'UNIT' as const },
      };

      const result = await createUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);
      
      if (Result.isOk(result)) {
        const location = result.value;
        expect(location.id).toBeDefined();
        expect(location.code).toBe('WH-INT-001');
        expect(location.name).toBe('Integration Test Warehouse');
        expect(location.type).toBe('WAREHOUSE');
        expect(location.isActive).toBe(true);
      }
    });

    it('should create an aisle within warehouse', async () => {
      const createUseCase = container.resolve(CreateLocation);

      const input = {
        code: 'A-INT-001',
        name: 'Integration Test Aisle',
        type: 'AISLE' as const,
        parentId: ctx.testData.warehouseId,
        warehouseId: ctx.testData.warehouseId,
        capacity: { value: 1000, unit: 'UNIT' as const },
      };

      const result = await createUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);
      
      if (Result.isOk(result)) {
        const location = result.value;
        expect(location.parentId).toBe(ctx.testData.warehouseId);
        expect(location.type).toBe('AISLE');
      }
    });

    it('should reject aisle without parent', async () => {
      const createUseCase = container.resolve(CreateLocation);

      const input = {
        code: 'A-INVALID',
        name: 'Invalid Aisle',
        type: 'AISLE' as const,
        warehouseId: ctx.testData.warehouseId,
        capacity: { value: 1000, unit: 'UNIT' as const },
      };

      const result = await createUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isFail(result)).toBe(true);
      
      if (Result.isFail(result)) {
        expect(result.error).toContain('Parent location is required');
      }
    });

    it('should reject duplicate code', async () => {
      const createUseCase = container.resolve(CreateLocation);

      const input1 = {
        code: 'WH-DUP',
        name: 'First Warehouse',
        type: 'WAREHOUSE' as const,
        capacity: { value: 1000, unit: 'UNIT' as const },
      };

      // Primeira criação: deve passar
      const result1 = await createUseCase.execute(input1, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result1)).toBe(true);

      // Segunda criação com mesmo código: deve falhar
      const input2 = {
        code: 'WH-DUP',
        name: 'Second Warehouse',
        type: 'WAREHOUSE' as const,
        capacity: { value: 2000, unit: 'UNIT' as const },
      };

      const result2 = await createUseCase.execute(input2, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isFail(result2)).toBe(true);
      
      if (Result.isFail(result2)) {
        expect(result2.error).toContain('already exists');
      }
    });
  });

  describe('Update Location Flow', () => {
    it('should update location name', async () => {
      const updateUseCase = container.resolve(UpdateLocation);
      const getUseCase = container.resolve(GetLocationById);

      const input = {
        id: ctx.testData.locationId,
        name: 'Updated Aisle Name',
      };

      const result = await updateUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);

      // Verificar que foi atualizado no banco
      const getResult = await getUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(getResult)).toBe(true);
      
      if (Result.isOk(getResult)) {
        expect(getResult.value.name).toBe('Updated Aisle Name');
      }
    });

    it('should update location capacity', async () => {
      const updateUseCase = container.resolve(UpdateLocation);
      const getUseCase = container.resolve(GetLocationById);

      const input = {
        id: ctx.testData.locationId,
        capacity: { value: 2000, unit: 'UNIT' as const },
      };

      const result = await updateUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);

      // Verificar que foi atualizado
      const getResult = await getUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(getResult)).toBe(true);
      
      if (Result.isOk(getResult)) {
        expect(getResult.value.capacity).toBe(2000);
      }
    });

    it('should reject empty name', async () => {
      const updateUseCase = container.resolve(UpdateLocation);

      const input = {
        id: ctx.testData.locationId,
        name: '',
      };

      const result = await updateUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isFail(result)).toBe(true);
      
      if (Result.isFail(result)) {
        expect(result.error).toContain('cannot be empty');
      }
    });
  });

  describe('Delete Location Flow', () => {
    it('should soft delete location', async () => {
      const deleteUseCase = container.resolve(DeleteLocation);
      const getUseCase = container.resolve(GetLocationById);

      // Deletar
      const deleteResult = await deleteUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isOk(deleteResult)).toBe(true);

      // Verificar que não é mais encontrado
      const getResult = await getUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 1, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isFail(getResult)).toBe(true);
      
      if (Result.isFail(getResult)) {
        expect(getResult.error).toContain('not found');
      }
    });
  });

  describe('List Locations Flow', () => {
    it('should list locations with pagination', async () => {
      const listUseCase = container.resolve(ListLocations);

      const input = {
        page: 1,
        limit: 10,
      };

      const result = await listUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);
      
      if (Result.isOk(result)) {
        expect(result.value.items).toBeInstanceOf(Array);
        expect(result.value.total).toBeGreaterThan(0);
        expect(result.value.page).toBe(1);
        expect(result.value.limit).toBe(10);
      }
    });

    it('should filter by type', async () => {
      const listUseCase = container.resolve(ListLocations);

      const input = {
        page: 1,
        limit: 10,
        type: 'WAREHOUSE' as const,
      };

      const result = await listUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);
      
      if (Result.isOk(result)) {
        // Todos os items devem ser WAREHOUSE
        result.value.items.forEach((item) => {
          expect(item.type).toBe('WAREHOUSE');
        });
      }
    });

    it('should filter by warehouseId', async () => {
      const listUseCase = container.resolve(ListLocations);

      const input = {
        page: 1,
        limit: 10,
        warehouseId: ctx.testData.warehouseId,
      };

      const result = await listUseCase.execute(input, {
        organizationId: 1,
        branchId: 1,
        userId: 'test-user',
      });

      expect(Result.isOk(result)).toBe(true);
      
      if (Result.isOk(result)) {
        // Todos os items devem pertencer ao warehouse
        result.value.items.forEach((item) => {
          expect(item.warehouseId).toBe(ctx.testData.warehouseId);
        });
      }
    });
  });

  describe('Multi-tenancy', () => {
    it('should not find location from different organization', async () => {
      const getUseCase = container.resolve(GetLocationById);

      // Tentar buscar com organizationId diferente
      const result = await getUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 999, branchId: 1, userId: 'test-user' }
      );

      expect(Result.isFail(result)).toBe(true);
      
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should not find location from different branch', async () => {
      const getUseCase = container.resolve(GetLocationById);

      // Tentar buscar com branchId diferente
      const result = await getUseCase.execute(
        { id: ctx.testData.locationId },
        { organizationId: 1, branchId: 999, userId: 'test-user' }
      );

      expect(Result.isFail(result)).toBe(true);
      
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });
  });
});

