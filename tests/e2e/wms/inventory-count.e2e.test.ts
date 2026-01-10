import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../../helpers/test-context';

describe('WMS Inventory Count API', () => {
  let ctx: TestContext;
  let locationId: string;
  let productId: string;
  let inventoryCountId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    // Setup test location and stock
    const locResponse = await ctx.api.post('/api/wms/locations', {
      code: 'WH-INV-TEST',
      name: 'Inventory Test Warehouse',
      type: 'WAREHOUSE',
    });
    locationId = (locResponse.body as { id: string }).id;
    productId = 'test-product-inv-001';

    // Create initial stock
    await ctx.api.post('/api/wms/stock/entry', {
      productId,
      locationId,
      quantity: 100,
      unit: 'UNIT',
      unitCost: 5.00,
      currency: 'BRL',
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('POST /api/wms/inventory', () => {
    it('should start inventory count', async () => {
      const response = await ctx.api.post('/api/wms/inventory', {
        productId,
        locationId,
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('PENDING');
      expect(response.body.expectedQuantity).toBe(100);
      inventoryCountId = (response.body as { id: string }).id;
    });

    it('should return 409 for duplicate inventory count', async () => {
      const response = await ctx.api.post('/api/wms/inventory', {
        productId,
        locationId,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already in progress');
    });
  });

  describe('GET /api/wms/inventory', () => {
    it('should list inventory counts', async () => {
      const response = await ctx.api.get('/api/wms/inventory?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/wms/inventory/:id', () => {
    it('should return inventory count by id', async () => {
      const response = await ctx.api.get(`/api/wms/inventory/${inventoryCountId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(inventoryCountId);
      expect(response.body.countedBy).toBeDefined(); // Bug 5 fix verified
    });
  });

  describe('POST /api/wms/inventory/complete', () => {
    it('should complete inventory count', async () => {
      const response = await ctx.api.post('/api/wms/inventory/complete', {
        inventoryCountId,
        countedQuantity: 95, // 5 units difference
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.difference).toBe(-5);
    });
  });
});

