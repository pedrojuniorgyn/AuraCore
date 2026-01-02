import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../../helpers/test-context';

describe('WMS Stock Operations API', () => {
  let ctx: TestContext;
  let locationId: string;
  let productId: string;
  let stockItemId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    // Create test location
    const locResponse = await ctx.api.post('/api/wms/locations', {
      code: 'WH-STOCK-TEST',
      name: 'Stock Test Warehouse',
      type: 'WAREHOUSE',
    });
    locationId = locResponse.body.id;
    productId = 'test-product-001';
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('POST /api/wms/stock/entry', () => {
    it('should register stock entry', async () => {
      const response = await ctx.api.post('/api/wms/stock/entry', {
        productId,
        locationId,
        quantity: 100,
        unit: 'UNIT',
        unitCost: 10.50,
        currency: 'BRL',
      });

      expect(response.status).toBe(201);
      expect(response.body.stockItemId).toBeDefined();
      expect(response.body.quantity).toBe(100);
      stockItemId = response.body.stockItemId;
    });

    it('should return 400 for negative quantity', async () => {
      const response = await ctx.api.post('/api/wms/stock/entry', {
        productId,
        locationId,
        quantity: -10,
        unit: 'UNIT',
        unitCost: 10.50,
        currency: 'BRL',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/wms/stock/exit', () => {
    it('should register stock exit', async () => {
      const response = await ctx.api.post('/api/wms/stock/exit', {
        stockItemId,
        quantity: 30,
        reason: 'SALE',
      });

      expect(response.status).toBe(200);
      expect(response.body.remainingQuantity).toBe(70);
    });

    it('should return 409 for insufficient stock', async () => {
      const response = await ctx.api.post('/api/wms/stock/exit', {
        stockItemId,
        quantity: 1000, // More than available
        reason: 'SALE',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Insufficient');
    });
  });

  describe('POST /api/wms/stock/transfer', () => {
    let destinationLocationId: string;

    beforeAll(async () => {
      const locResponse = await ctx.api.post('/api/wms/locations', {
        code: 'WH-DEST-TEST',
        name: 'Destination Warehouse',
        type: 'WAREHOUSE',
      });
      destinationLocationId = locResponse.body.id;
    });

    it('should transfer stock between locations', async () => {
      const response = await ctx.api.post('/api/wms/stock/transfer', {
        sourceStockItemId: stockItemId,
        destinationLocationId,
        quantity: 20,
      });

      expect(response.status).toBe(200);
      expect(response.body.sourceRemainingQuantity).toBe(50);
      expect(response.body.destinationStockItemId).toBeDefined();
    });
  });
});

