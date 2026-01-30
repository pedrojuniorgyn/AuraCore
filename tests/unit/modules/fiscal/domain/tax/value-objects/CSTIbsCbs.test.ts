import { describe, it, expect } from 'vitest';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('CSTIbsCbs', () => {
  describe('create', () => {
    it('should create valid CST 00 (tributação normal)', () => {
      const result = CSTIbsCbs.create('00');

      expect(Result.isOk(result)).toBe(true);
      const cst = result.value as CSTIbsCbs;
      expect(cst.code).toBe('00');
      expect(cst.isTributadoNormal).toBe(true);
    });

    it('should create valid CST 40 (isenção)', () => {
      const result = CSTIbsCbs.create('40');

      expect(Result.isOk(result)).toBe(true);
      const cst = result.value as CSTIbsCbs;
      expect(cst.code).toBe('40');
      expect(cst.isIsento).toBe(true);
      expect(cst.naoGeraCreditoNormal).toBe(true);
    });

    it('should create all valid CST codes', () => {
      const validCodes = ['00', '10', '20', '30', '40', '41', '50', '60', '70', '90'];

      for (const code of validCodes) {
        const result = CSTIbsCbs.create(code);
        expect(Result.isOk(result)).toBe(true);
        expect((result.value as CSTIbsCbs).code).toBe(code);
      }
    });

    it('should fail with invalid CST code', () => {
      const result = CSTIbsCbs.create('99');

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Invalid CST IBS/CBS');
    });

    it('should fail with wrong length', () => {
      const result1 = CSTIbsCbs.create('0');
      const result2 = CSTIbsCbs.create('000');

      expect(Result.isFail(result1)).toBe(true);
      expect(result1.error).toContain('must have 2 digits');

      expect(Result.isFail(result2)).toBe(true);
      expect(result2.error).toContain('must have 2 digits');
    });
  });

  describe('boolean checks', () => {
    it('should correctly identify suspensão (10)', () => {
      const cst = CSTIbsCbs.create('10').value as CSTIbsCbs;
      expect(cst.hasSuspensao).toBe(true);
    });

    it('should correctly identify monofásico (20)', () => {
      const cst = CSTIbsCbs.create('20').value as CSTIbsCbs;
      expect(cst.isMonofasico).toBe(true);
    });

    it('should correctly identify diferimento (30)', () => {
      const cst = CSTIbsCbs.create('30').value as CSTIbsCbs;
      expect(cst.hasDiferimento).toBe(true);
    });

    it('should correctly identify não incidência (41)', () => {
      const cst = CSTIbsCbs.create('41').value as CSTIbsCbs;
      expect(cst.hasNaoIncidencia).toBe(true);
      expect(cst.naoGeraCreditoNormal).toBe(true);
    });

    it('should correctly identify imunidade (50)', () => {
      const cst = CSTIbsCbs.create('50').value as CSTIbsCbs;
      expect(cst.hasImunidade).toBe(true);
      expect(cst.naoGeraCreditoNormal).toBe(true);
    });

    it('should correctly identify redução BC (60)', () => {
      const cst = CSTIbsCbs.create('60').value as CSTIbsCbs;
      expect(cst.hasReducaoBC).toBe(true);
    });

    it('should correctly identify crédito presumido (70)', () => {
      const cst = CSTIbsCbs.create('70').value as CSTIbsCbs;
      expect(cst.hasCreditoPresumido).toBe(true);
    });

    it('should correctly identify outros (90)', () => {
      const cst = CSTIbsCbs.create('90').value as CSTIbsCbs;
      expect(cst.isOutros).toBe(true);
    });
  });

  describe('description', () => {
    it('should return correct descriptions', () => {
      const cst00 = CSTIbsCbs.create('00').value as CSTIbsCbs;
      const cst40 = CSTIbsCbs.create('40').value as CSTIbsCbs;
      const cst90 = CSTIbsCbs.create('90').value as CSTIbsCbs;

      expect(cst00.description).toBe('Tributação normal');
      expect(cst40.description).toBe('Isenção');
      expect(cst90.description).toBe('Outros');
    });
  });

  describe('static factories', () => {
    it('should create tributação normal via static method', () => {
      const cst = expectOk(CSTIbsCbs.tributacaoNormal());
      expect(cst.code).toBe('00');
    });

    it('should create isenção via static method', () => {
      const cst = expectOk(CSTIbsCbs.isencao());
      expect(cst.code).toBe('40');
    });
  });

  describe('equals', () => {
    it('should return true for same CST code', () => {
      const cst1 = CSTIbsCbs.create('00').value as CSTIbsCbs;
      const cst2 = CSTIbsCbs.create('00').value as CSTIbsCbs;

      expect(cst1.equals(cst2)).toBe(true);
    });

    it('should return false for different CST codes', () => {
      const cst1 = CSTIbsCbs.create('00').value as CSTIbsCbs;
      const cst2 = CSTIbsCbs.create('40').value as CSTIbsCbs;

      expect(cst1.equals(cst2)).toBe(false);
    });
  });
});

