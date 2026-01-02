import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../../helpers/test-context';

describe('WMS Movements API', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('GET /api/wms/movements', () => {
    it('should list movements with pagination', async () => {
      const response = await ctx.api.get('/api/wms/movements?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by type', async () => {
      const response = await ctx.api.get('/api/wms/movements?type=ENTRY');

      expect(response.status).toBe(200);
      response.body.items.forEach((item: { type: string }) => {
        expect(item.type).toBe('ENTRY');
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await ctx.api.get(
        `/api/wms/movements?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      expect(response.status).toBe(200);
    });

    it('should ignore invalid date and return results', async () => {
      const response = await ctx.api.get('/api/wms/movements?startDate=invalid-date');

      // Bug 6 fix: Invalid dates are silently ignored (parseDateParam returns undefined)
      // This matches the behavior of the date-params helper
      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/wms/movements/:id', () => {
    it('should return 404 for non-existent movement', async () => {
      const response = await ctx.api.get('/api/wms/movements/non-existent');

      expect(response.status).toBe(404);
    });
  });
});

