import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TestContext } from '../../helpers/test-context';

describe('WMS Locations API', () => {
  let ctx: TestContext;
  let warehouseId: string;
  let aisleId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('POST /api/wms/locations', () => {
    it('should create a WAREHOUSE location', async () => {
      const response = await ctx.api.post('/api/wms/locations', {
        code: 'WH-TEST-001',
        name: 'Test Warehouse',
        type: 'WAREHOUSE',
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.code).toBe('WH-TEST-001');
      expect(response.body.type).toBe('WAREHOUSE');
      warehouseId = (response.body as { id: string }).id;
    });

    it('should create an AISLE with parentId', async () => {
      const response = await ctx.api.post('/api/wms/locations', {
        code: 'A-001',
        name: 'Aisle 1',
        type: 'AISLE',
        parentId: warehouseId,
        warehouseId: warehouseId,
      });

      expect(response.status).toBe(201);
      expect(response.body.parentId).toBe(warehouseId);
      aisleId = (response.body as { id: string }).id;
    });

    it('should return 400 for AISLE without parentId', async () => {
      const response = await ctx.api.post('/api/wms/locations', {
        code: 'A-002',
        name: 'Aisle 2',
        type: 'AISLE',
        warehouseId: warehouseId,
        // parentId missing
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Parent location is required');
    });

    it('should return 409 for duplicate code', async () => {
      const response = await ctx.api.post('/api/wms/locations', {
        code: 'WH-TEST-001', // duplicate
        name: 'Another Warehouse',
        type: 'WAREHOUSE',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/wms/locations', () => {
    it('should list locations with pagination', async () => {
      const response = await ctx.api.get('/api/wms/locations?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should filter by type', async () => {
      const response = await ctx.api.get('/api/wms/locations?type=WAREHOUSE');

      expect(response.status).toBe(200);
      (response.body as { items: Array<{ type: string }> }).items.forEach((item) => {
        expect(item.type).toBe('WAREHOUSE');
      });
    });

    it('should return 400 for invalid page', async () => {
      const response = await ctx.api.get('/api/wms/locations?page=abc');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid page');
    });

    it('should return 400 for invalid isActive', async () => {
      const response = await ctx.api.get('/api/wms/locations?isActive=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid isActive');
    });
  });

  describe('GET /api/wms/locations/:id', () => {
    it('should return location by id', async () => {
      const response = await ctx.api.get(`/api/wms/locations/${warehouseId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(warehouseId);
      expect(response.body.code).toBe('WH-TEST-001');
    });

    it('should return 404 for non-existent id', async () => {
      const response = await ctx.api.get('/api/wms/locations/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/wms/locations/:id', () => {
    it('should update location name', async () => {
      const response = await ctx.api.put(`/api/wms/locations/${warehouseId}`, {
        name: 'Updated Warehouse Name',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Warehouse Name');
    });

    it('should return 400 for empty name', async () => {
      const response = await ctx.api.put(`/api/wms/locations/${warehouseId}`, {
        name: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });
  });

  describe('DELETE /api/wms/locations/:id', () => {
    it('should soft delete location', async () => {
      const response = await ctx.api.delete(`/api/wms/locations/${aisleId}`);

      expect(response.status).toBe(200);

      // Verify not found after delete
      const getResponse = await ctx.api.get(`/api/wms/locations/${aisleId}`);
      expect(getResponse.status).toBe(404);
    });
  });
});

