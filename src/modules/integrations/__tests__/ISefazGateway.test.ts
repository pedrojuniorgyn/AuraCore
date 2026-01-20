/**
 * ISefazGateway Tests
 * E7.9 Integrações - Semana 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSefazGateway } from '../infrastructure/adapters/sefaz/MockSefazGateway';
import { Result } from '@/shared/domain';

describe('ISefazGateway (Mock)', () => {
  let gateway: MockSefazGateway;

  beforeEach(() => {
    gateway = new MockSefazGateway();
    gateway.resetFailure();
  });

  describe('authorizeCte', () => {
    it('should authorize CTe successfully', async () => {
      const result = await gateway.authorizeCte({
        cteXml: '<CTe>...</CTe>',
        environment: 'homologation',
        uf: 'SP',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.protocolNumber).toContain('MOCK');
      expect(result.value.cteKey).toBeDefined();
      expect(result.value.authorizationDate).toBeDefined();
    });

    it('should return rejection when configured to fail', async () => {
      gateway.setFailure('539', 'Duplicidade de CTe');

      const result = await gateway.authorizeCte({
        cteXml: '<CTe>...</CTe>',
        environment: 'homologation',
        uf: 'SP',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.rejectionCode).toBe('539');
      expect(result.value.rejectionMessage).toBe('Duplicidade de CTe');
    });
  });

  describe('cancelCte', () => {
    it('should cancel CTe successfully', async () => {
      const result = await gateway.cancelCte({
        cteKey: '35240100000000000000570010000000011000000019',
        protocolNumber: '123456789',
        justification: 'Erro de digitação',
        environment: 'homologation',
      });

      expect(Result.isOk(result)).toBe(true);
    });

    it('should fail when configured to fail', async () => {
      gateway.setFailure('999', 'SEFAZ unavailable');

      const result = await gateway.cancelCte({
        cteKey: '35240100000000000000570010000000011000000019',
        protocolNumber: '123456789',
        justification: 'Erro de digitação',
        environment: 'homologation',
      });

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toBe('SEFAZ unavailable');
    });
  });

  describe('queryCteStatus', () => {
    it('should return status for authorized CTe', async () => {
      const result = await gateway.queryCteStatus({
        cteKey: '35240100000000000000570010000000011000000019',
        environment: 'homologation',
      });

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;
      expect(result.value.status).toBe('AUTHORIZED');
    });
  });

  describe('queryDistribuicaoDFe', () => {
    it('should return list of NFes', async () => {
      const result = await gateway.queryDistribuicaoDFe({
        cnpj: '12345678000199',
        lastNsu: 100,
        environment: 'homologation',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBeInstanceOf(Array);
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].nfeKey).toBeDefined();
      expect(result.value[0].nsu).toBe(101);
    });

    it('should fail when configured to fail', async () => {
      gateway.setFailure('999', 'Connection timeout');

      const result = await gateway.queryDistribuicaoDFe({
        cnpj: '12345678000199',
        lastNsu: 100,
        environment: 'homologation',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('manifestNfe', () => {
    it('should manifest NFe successfully', async () => {
      const result = await gateway.manifestNfe({
        nfeKey: '35240100000000000000550010000000011000000019',
        eventType: 'CONFIRMACAO',
        environment: 'homologation',
      });

      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('authorizeMdfe', () => {
    it('should authorize MDFe successfully', async () => {
      const result = await gateway.authorizeMdfe(
        '<MDFe>...</MDFe>',
        'homologation'
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.protocolNumber).toContain('MOCK');
      expect(result.value.mdfeKey).toBeDefined();
    });

    it('should return rejection when configured to fail', async () => {
      gateway.setFailure('999', 'Invalid MDFe');

      const result = await gateway.authorizeMdfe(
        '<MDFe>...</MDFe>',
        'homologation'
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.rejectionCode).toBe('999');
    });
  });

  describe('closeMdfe', () => {
    it('should close MDFe successfully', async () => {
      const result = await gateway.closeMdfe(
        '35240100000000000000580010000000011000000019',
        'homologation'
      );

      expect(Result.isOk(result)).toBe(true);
    });
  });
});

