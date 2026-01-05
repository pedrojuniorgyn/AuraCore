import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestServer, teardownTestServer, testClient } from '../../../helpers/test-client';
import crypto from 'crypto';

/**
 * E2E Test: Fluxo de auditoria de transição tributária
 * 
 * E7.11 Semana 2: Habilitado com testClient real (supertest + Next.js)
 */
describe('E2E: Tax Transition Audit', () => {
  beforeAll(async () => {
    await setupTestServer();
  });

  afterAll(async () => {
    await teardownTestServer();
  });

  const headers = {
    'x-organization-id': '1',
    'x-branch-id': '1',
  };

  describe('POST /api/fiscal/tax-reform/audit', () => {
    it('should create audit record for tax calculation', async () => {
      const payload = {
        fiscalDocumentId: crypto.randomUUID(),
        operationDate: '2030-01-15T10:00:00Z',
        operationType: 'SALE',
        totalValue: 10000.00,
        currentSystemTax: 1800.00,
        newSystemTax: 2650.00,
        difference: 850.00,
        items: [
          {
            itemId: crypto.randomUUID(),
            description: 'Produto Teste',
            baseValue: 10000.00,
            currentIcms: 1200.00,
            currentPis: 165.00,
            currentCofins: 760.00,
            newIbs: 1770.00,
            newCbs: 880.00,
          },
        ],
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/audit')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data!).toBeDefined();
      expect(response.body.data!.auditId).toBeDefined();
    });

    it('should validate required fields', async () => {
      const payload = {
        fiscalDocumentId: crypto.randomUUID(),
        operationDate: '2030-01-15T10:00:00Z',
        // operationType missing
        totalValue: 10000.00,
        currentSystemTax: 1800.00,
        newSystemTax: 2650.00,
        items: [],
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/audit')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should calculate difference automatically', async () => {
      const payload = {
        fiscalDocumentId: crypto.randomUUID(),
        operationDate: '2030-01-15T10:00:00Z',
        operationType: 'SALE',
        totalValue: 10000.00,
        currentSystemTax: 1800.00,
        newSystemTax: 2650.00,
        items: [],
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/audit')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(201);
      
      const data = response.body.data!;
      const expectedDifference = 2650.00 - 1800.00;
      expect(Math.abs((data.difference || 0) - expectedDifference)).toBeLessThan(0.01);
    });

    it('should handle multiple items in audit', async () => {
      const payload = {
        fiscalDocumentId: crypto.randomUUID(),
        operationDate: '2030-01-15T10:00:00Z',
        operationType: 'SALE',
        totalValue: 15000.00,
        currentSystemTax: 2700.00,
        newSystemTax: 3975.00,
        items: [
          {
            itemId: crypto.randomUUID(),
            description: 'Produto 1',
            baseValue: 5000.00,
            currentIcms: 600.00,
            currentPis: 82.50,
            currentCofins: 380.00,
            newIbs: 885.00,
            newCbs: 440.00,
          },
          {
            itemId: crypto.randomUUID(),
            description: 'Produto 2',
            baseValue: 10000.00,
            currentIcms: 1200.00,
            currentPis: 165.00,
            currentCofins: 760.00,
            newIbs: 1770.00,
            newCbs: 880.00,
          },
        ],
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/audit')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data!.items).toHaveLength(2);
    });
  });
});

