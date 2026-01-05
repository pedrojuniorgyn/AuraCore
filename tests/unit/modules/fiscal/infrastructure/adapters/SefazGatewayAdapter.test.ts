/**
 * SEFAZ GATEWAY ADAPTER - UNIT TESTS
 * 
 * Testes unitários para SefazGatewayAdapter
 * Épico: E7.13 - Services → DDD Migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result } from '@/shared/domain';
import { SefazGatewayAdapter } from '@/modules/fiscal/infrastructure/adapters/sefaz/SefazGatewayAdapter';
import type { SefazConfig } from '@/modules/fiscal/infrastructure/adapters/sefaz/SefazGatewayAdapter';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';

describe('SefazGatewayAdapter', () => {
  let adapter: SefazGatewayAdapter;
  let config: SefazConfig;

  beforeEach(() => {
    // Configuração padrão para testes
    config = {
      environment: 'homologation',
      uf: 'SP',
    };

    adapter = new SefazGatewayAdapter(config);

    // Garantir que estamos em modo mock
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('transmit', () => {
    it('should successfully transmit document in mock mode', async () => {
      // Arrange
      // Gerar chave fiscal válida
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2401',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      
      if (Result.isFail(fiscalKeyResult)) {
        throw new Error(`Failed to generate fiscal key: ${fiscalKeyResult.error}`);
      }

      // Criar documento mock com fiscalKey
      const document = {
        fiscalKey: fiscalKeyResult.value,
      } as FiscalDocument;

      // Act
      const result = await adapter.transmit(document);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.success).toBe(true);
      expect(result.value.protocolNumber).toContain('MOCK-');
      expect(result.value.fiscalKey).toBe(fiscalKeyResult.value.value);
      expect(result.value.transmittedAt).toBeInstanceOf(Date);
    });

    it('should fail when document has no fiscal key', async () => {
      // Arrange
      // Criar documento mock SEM fiscalKey
      const document = {
        fiscalKey: undefined,
      } as FiscalDocument;

      // Act
      const result = await adapter.transmit(document);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('Fiscal key is required');
    });
  });

  describe('authorize', () => {
    it('should successfully authorize document in mock mode', async () => {
      // Arrange
      const fiscalKey = '35240100000000000000570010000000011000000019';

      // Act
      const result = await adapter.authorize(fiscalKey);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.authorized).toBe(true);
      expect(result.value.protocolNumber).toContain('MOCK-AUTH-');
      expect(result.value.fiscalKey).toBe(fiscalKey);
      expect(result.value.statusCode).toBe('100');
      expect(result.value.authorizedAt).toBeInstanceOf(Date);
    });

    it('should fail with invalid fiscal key (wrong length)', async () => {
      // Arrange
      const invalidKey = '123456'; // Menos de 44 dígitos

      // Act
      const result = await adapter.authorize(invalidKey);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('Invalid fiscal key');
    });

    it('should fail with empty fiscal key', async () => {
      // Act
      const result = await adapter.authorize('');

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('Invalid fiscal key');
    });
  });

  describe('cancel', () => {
    it('should successfully cancel document in mock mode', async () => {
      // Arrange
      const fiscalKey = '35240100000000000000570010000000011000000019';
      const reason = 'Cancelamento de teste com mais de 15 caracteres';

      // Act
      const result = await adapter.cancel(fiscalKey, reason);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.cancelled).toBe(true);
      expect(result.value.protocolNumber).toContain('MOCK-CANCEL-');
      expect(result.value.fiscalKey).toBe(fiscalKey);
      expect(result.value.statusCode).toBe('135');
      expect(result.value.cancelledAt).toBeInstanceOf(Date);
    });

    it('should fail with reason shorter than 15 characters', async () => {
      // Arrange
      const fiscalKey = '35240100000000000000570010000000011000000019';
      const shortReason = 'Curto'; // Menos de 15 caracteres

      // Act
      const result = await adapter.cancel(fiscalKey, shortReason);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('at least 15 characters');
    });

    it('should fail with invalid fiscal key', async () => {
      // Arrange
      const invalidKey = '12345';
      const reason = 'Motivo válido com mais de 15 caracteres';

      // Act
      const result = await adapter.cancel(invalidKey, reason);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('Invalid fiscal key');
    });
  });

  describe('queryStatus', () => {
    it('should successfully query status in mock mode', async () => {
      // Arrange
      const fiscalKey = '35240100000000000000570010000000011000000019';

      // Act
      const result = await adapter.queryStatus(fiscalKey);

      // Assert
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.fiscalKey).toBe(fiscalKey);
      expect(result.value.status).toBe('AUTHORIZED');
      expect(result.value.statusCode).toBe('100');
      expect(result.value.queriedAt).toBeInstanceOf(Date);
    });

    it('should fail with invalid fiscal key', async () => {
      // Arrange
      const invalidKey = 'invalid';

      // Act
      const result = await adapter.queryStatus(invalidKey);

      // Assert
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('Invalid fiscal key');
    });
  });
});

