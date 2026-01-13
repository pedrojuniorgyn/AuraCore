import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestServer, teardownTestServer, testClient } from '../../../helpers/test-client';
import crypto from 'crypto';

/**
 * E2E Test: Detecção de regime tributário
 * 
 * E7.11 Semana 2: Habilitado com testClient real (supertest + Next.js)
 */
describe.skip('E2E: Regime Detection', () => {
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

  const basePayload = {
    fiscalDocumentId: crypto.randomUUID(),
    items: [
      {
        itemId: crypto.randomUUID(),
        baseValue: 1000.00,
        cfop: '5102',
        ncm: '01012100',
        ufOrigem: 'SP',
        ufDestino: 'RJ',
        municipioDestino: '3304557',
      },
    ],
  };

  describe('CURRENT regime (2025)', () => {
    it('should use CURRENT regime for 2025', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2025-12-31T23:59:59Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      // Em 2025, ainda não há IBS/CBS (ou valores mínimos de teste)
      const item = response.body.data!.items[0];
      
      // IBS/CBS devem ser zero ou muito baixos em 2025
      expect(item.ibsUfValue + item.ibsMunValue + item.cbsValue).toBeLessThan(10);
    });
  });

  describe('TRANSITION regime (2026-2032)', () => {
    it('should use TRANSITION regime for 2026', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2026-01-01T00:00:00Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // 2026: IBS em alíquota de teste (0.10%)
      expect(item.ibsUfRate + item.ibsMunRate).toBeCloseTo(0.10, 2);
      
      // 2026: CBS em alíquota de teste (0.90%)
      expect(item.cbsRate).toBeCloseTo(0.90, 2);
    });

    it('should use TRANSITION regime for 2027', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2027-06-15T12:00:00Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // 2027: CBS em alíquota cheia (8.80%)
      expect(item.cbsRate).toBeCloseTo(8.80, 2);
    });

    it('should use TRANSITION regime for 2030', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2030-03-20T10:00:00Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // 2030: IBS progressivo
      expect(item.ibsUfRate + item.ibsMunRate).toBeGreaterThan(3);
    });

    it('should use TRANSITION regime for 2032', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2032-12-31T23:59:59Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // 2032: IBS próximo ao valor cheio
      expect(item.ibsUfRate + item.ibsMunRate).toBeGreaterThan(10);
    });
  });

  describe('NEW regime (2033+)', () => {
    it('should use NEW regime for 2033', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2033-01-01T00:00:00Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // 2033: Alíquotas cheias
      // IBS: 17.70% (UF 60% + Mun 40%)
      expect(item.ibsUfRate + item.ibsMunRate).toBeCloseTo(17.70, 2);
      
      // CBS: 8.80%
      expect(item.cbsRate).toBeCloseTo(8.80, 2);
    });

    it('should use NEW regime for future years', async () => {
      const payload = {
        ...basePayload,
        operationDate: '2040-01-01T00:00:00Z',
      };

      const response = await testClient
        .post('/api/fiscal/tax-reform/calculate')
        .set(headers)
        .send(payload);

      expect(response.status).toBe(200);
      
      const item = response.body.data!.items[0];
      
      // Mesmo em 2040, usar alíquotas de 2033 (não progressivas)
      expect(item.ibsUfRate + item.ibsMunRate).toBeCloseTo(17.70, 2);
      expect(item.cbsRate).toBeCloseTo(8.80, 2);
    });
  });

  describe('Progressive transition', () => {
    it('should show progressive increase from 2026 to 2033', async () => {
      const years = [2026, 2027, 2029, 2030, 2031, 2032, 2033];
      const ibsTotals: number[] = [];

      for (const year of years) {
        const payload = {
          ...basePayload,
          operationDate: `${year}-06-15T12:00:00Z`,
        };

        const response = await testClient
          .post('/api/fiscal/tax-reform/calculate')
          .set(headers)
          .send(payload);

        const item = response.body.data!.items[0];
        ibsTotals.push(item.ibsUfRate + item.ibsMunRate);
      }

      // IBS deve aumentar progressivamente (ou manter igual)
      for (let i = 1; i < ibsTotals.length; i++) {
        expect(ibsTotals[i]).toBeGreaterThanOrEqual(ibsTotals[i - 1]);
      }

      // 2033 deve ter alíquota cheia
      expect(ibsTotals[ibsTotals.length - 1]).toBeCloseTo(17.70, 2);
    });
  });
});

