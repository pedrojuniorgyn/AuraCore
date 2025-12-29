import { describe, it, expect } from 'vitest';
import { CST } from '@/modules/fiscal/domain/tax/value-objects/CST';
import { Result } from '@/shared/domain';

describe('CST', () => {
  describe('create', () => {
    it('should create valid CST 000 (tributado normal)', () => {
      const result = CST.create('000');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.code).toBe('000');
        expect(result.value.origem).toBe('0');
        expect(result.value.tributacao).toBe('00');
        expect(result.value.isTributado).toBe(true);
      }
    });

    it('should create valid CST 010 (tributado com ST)', () => {
      const result = CST.create('010');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.hasSubstituicao).toBe(true);
      }
    });

    it('should create valid CST 040 (isento)', () => {
      const result = CST.create('040');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isento).toBe(true);
      }
    });

    it('should create valid CST 051 (diferido)', () => {
      const result = CST.create('051');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.isDiferido).toBe(true);
      }
    });

    it('should create valid CST 020 (com redução)', () => {
      const result = CST.create('020');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.hasReducao).toBe(true);
      }
    });

    it('should fail with invalid origin', () => {
      const result = CST.create('900');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with invalid taxation code', () => {
      const result = CST.create('099');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with wrong length', () => {
      const result = CST.create('00');

      expect(Result.isFail(result)).toBe(true);
    });

    it('should have correct descriptions', () => {
      const result = CST.create('000');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.descricaoOrigem).toContain('Nacional');
        expect(result.value.descricaoTributacao).toContain('Tributada integralmente');
      }
    });
  });

  describe('equals', () => {
    it('should be equal for same CST', () => {
      const cst1 = CST.create('000').value;
      const cst2 = CST.create('000').value;

      if (cst1 && cst2) {
        expect(cst1.equals(cst2)).toBe(true);
      }
    });

    it('should not be equal for different CST', () => {
      const cst1 = CST.create('000').value;
      const cst2 = CST.create('010').value;

      if (cst1 && cst2) {
        expect(cst1.equals(cst2)).toBe(false);
      }
    });
  });
});

