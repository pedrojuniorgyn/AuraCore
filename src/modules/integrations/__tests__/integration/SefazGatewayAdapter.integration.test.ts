import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SefazGatewayAdapter } from '../../infrastructure/adapters/sefaz/SefazGatewayAdapter';
import type { ISefazClient } from '../../domain/ports/output/ISefazClient';
import { Result } from '@/shared/domain';

// Mock do ISefazClient
const mockSefazClient: ISefazClient = {
  sendCteForAuthorization: vi.fn().mockResolvedValue({
    success: true,
    protocolNumber: 'MOCK-PROTOCOL-123',
    authorizationDate: new Date('2024-12-31T10:00:00Z'),
    cteKey: '35240100000000000000570010000000011000000019',
  }),
  sendMdfeForAuthorization: vi.fn().mockResolvedValue({
    success: true,
    protocolNumber: 'MOCK-MDFE-123',
    authorizationDate: new Date('2024-12-31T10:00:00Z'),
    mdfeKey: '35240100000000000000580010000000011000000010',
  }),
  checkServiceStatus: vi.fn().mockResolvedValue({
    online: true,
    message: 'Service online',
    responseTime: 100,
  }),
  getDefaultCertificateConfig: vi.fn().mockReturnValue({
    pfxPath: '/path/to/cert.pfx',
    password: 'password',
    organization: 'Test Org',
  }),
};

describe('SefazGatewayAdapter Integration', () => {
  let adapter: SefazGatewayAdapter;

  beforeEach(() => {
    // Injetar mock do ISefazClient via construtor
    adapter = new SefazGatewayAdapter(mockSefazClient);
    vi.clearAllMocks();
  });

  describe('authorizeCte', () => {
    it('should return mock response in development mode', async () => {
      // GIVEN
      const request = {
        cteXml: '<CTe><infCte>...</infCte></CTe>',
        environment: 'homologation' as const,
        uf: 'SP',
      };

      // WHEN
      const result = await adapter.authorizeCte(request);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.success).toBe(true);
      expect(result.value.protocolNumber).toBeDefined();
      expect(result.value.cteKey).toBeDefined();
    });

    it.skip('should handle malformed XML gracefully', async () => {
      // SKIP: Mock is always returning success regardless of input
      // This test is documenting expected behavior but the mock doesn't enforce it
      // TODO: Enhance mock to validate XML structure
      const request = {
        cteXml: 'not-xml-content',
        environment: 'homologation' as const,
        uf: 'SP',
      };
      const result = await adapter.authorizeCte(request);
      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('cancelCte', () => {
    it('should return descriptive error for unimplemented method', async () => {
      // GIVEN
      const request = {
        cteKey: '35240100000000000000570010000000011000000019',
        protocolNumber: '123456789',
        justification: 'Cancelamento de teste',
        environment: 'homologation' as const,
      };

      // WHEN
      const result = await adapter.cancelCte(request);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('SEFAZ_CANCEL_NOT_IMPLEMENTED');
      expect(result.error).toContain('sendCancellationEvent');
    });
  });

  describe('queryCteStatus', () => {
    it('should return descriptive error for unimplemented method', async () => {
      // GIVEN
      const cteKey = '35240100000000000000570010000000011000000019';
      const environment = 'homologation';

      // WHEN
      const result = await adapter.queryCteStatus(cteKey, environment);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('SEFAZ_QUERY_NOT_IMPLEMENTED');
    });
  });

  describe('queryDistribuicaoDFe', () => {
    it('should return descriptive error for unimplemented method', async () => {
      // GIVEN
      const request = {
        cnpj: '00000000000000',
        lastNsu: 0,
        environment: 'homologation' as const,
      };

      // WHEN
      const result = await adapter.queryDistribuicaoDFe(request);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('SEFAZ_DFE_NOT_IMPLEMENTED');
    });
  });
});

