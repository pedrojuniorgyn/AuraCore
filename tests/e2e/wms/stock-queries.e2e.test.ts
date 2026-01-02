import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../../helpers/test-context';

describe('WMS Stock Queries API', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    // Setup test data via stock operations
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('GET /api/wms/stock', () => {
    it('should list stock items with pagination', async () => {
      const response = await ctx.api.get('/api/wms/stock?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by hasStock=true', async () => {
      const response = await ctx.api.get('/api/wms/stock?hasStock=true');

      expect(response.status).toBe(200);
      response.body.items.forEach((item: { quantity: number }) => {
        expect(item.quantity).toBeGreaterThan(0);
      });
    });

    it('should filter by hasStock=false', async () => {
      const response = await ctx.api.get('/api/wms/stock?hasStock=false');

      expect(response.status).toBe(200);
      response.body.items.forEach((item: { quantity: number }) => {
        expect(item.quantity).toBeLessThanOrEqual(0);
      });
    });

    it('should return 400 for invalid minQuantity', async () => {
      const response = await ctx.api.get('/api/wms/stock?minQuantity=abc');

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid hasStock', async () => {
      const response = await ctx.api.get('/api/wms/stock?hasStock=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid hasStock');
    });
  });

  describe('GET /api/wms/stock/:id', () => {
    it('should return 404 for non-existent stock item', async () => {
      const response = await ctx.api.get('/api/wms/stock/non-existent');

      expect(response.status).toBe(404);
    });
  });
});

