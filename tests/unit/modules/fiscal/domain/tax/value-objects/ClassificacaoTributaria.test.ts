import { describe, it, expect } from 'vitest';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { Result } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../../helpers/resultHelper';

describe('ClassificacaoTributaria', () => {
  describe('create', () => {
    it('should create valid cClassTrib in range 10000-19999 (tributação integral)', () => {
      const result = ClassificacaoTributaria.create('10100');

      expect(Result.isOk(result)).toBe(true);
      const classif = result.value as ClassificacaoTributaria;
      expect(classif.code).toBe('10100');
      expect(classif.isTributacaoIntegral).toBe(true);
      expect(classif.firstDigit).toBe(1);
    });

    it('should create valid cClassTrib for each range', () => {
      const testCases = [
        { code: '10100', firstDigit: 1, method: 'isTributacaoIntegral' },
        { code: '20100', firstDigit: 2, method: 'hasAliquotaReduzida' },
        { code: '30100', firstDigit: 3, method: 'isIsento' },
        { code: '40100', firstDigit: 4, method: 'hasImunidade' },
        { code: '50100', firstDigit: 5, method: 'hasDiferimento' },
        { code: '60100', firstDigit: 6, method: 'hasSuspensao' },
        { code: '70100', firstDigit: 7, method: 'isRegimeEspecifico' },
        { code: '80100', firstDigit: 8, method: 'hasCreditoPresumido' },
        { code: '90100', firstDigit: 9, method: 'isOutros' },
      ];

      for (const testCase of testCases) {
        const result = ClassificacaoTributaria.create(testCase.code);
        expect(Result.isOk(result)).toBe(true);
        const classif = result.value as ClassificacaoTributaria;
        expect(classif.firstDigit).toBe(testCase.firstDigit);
        expect((classif as unknown as Record<string, boolean>)[testCase.method]).toBe(true);
      }
    });

    it('should fail with code below 10000', () => {
      const result = ClassificacaoTributaria.create('09999');

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('must be between 10000 and 99999');
    });

    it('should fail with code above 99999', () => {
      const result = ClassificacaoTributaria.create('100000');

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('must have 5 digits');
    });

    it('should fail with wrong length', () => {
      const result1 = ClassificacaoTributaria.create('1010');
      const result2 = ClassificacaoTributaria.create('101000');

      expect(Result.isFail(result1)).toBe(true);
      expect(result1.error).toContain('must have 5 digits');

      expect(Result.isFail(result2)).toBe(true);
      expect(result2.error).toContain('must have 5 digits');
    });

    it('should fail with non-numeric code', () => {
      const result = ClassificacaoTributaria.create('ABC12');

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('must have 5 digits'); // After replace, it's empty
    });
  });

  describe('range description', () => {
    it('should return correct range descriptions', () => {
      const testCases = [
        { code: '10100', desc: 'Tributação integral' },
        { code: '20100', desc: 'Alíquota reduzida' },
        { code: '30100', desc: 'Isenção' },
        { code: '40100', desc: 'Imunidade' },
        { code: '50100', desc: 'Diferimento' },
        { code: '60100', desc: 'Suspensão' },
        { code: '70100', desc: 'Regimes específicos' },
        { code: '80100', desc: 'Crédito presumido' },
        { code: '90100', desc: 'Outros' },
      ];

      for (const testCase of testCases) {
        const classif = ClassificacaoTributaria.create(testCase.code).value as ClassificacaoTributaria;
        expect(classif.rangeDescription).toBe(testCase.desc);
      }
    });
  });

  describe('static factories', () => {
    it('should create tributação integral via static method', () => {
      const classif = expectOk(ClassificacaoTributaria.tributacaoIntegral());
      expect(classif.code).toBe('10100');
      expect(classif.isTributacaoIntegral).toBe(true);
    });

    it('should create isenção via static method', () => {
      const classif = expectOk(ClassificacaoTributaria.isencao());
      expect(classif.code).toBe('30100');
      expect(classif.isIsento).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same code', () => {
      const classif1 = ClassificacaoTributaria.create('10100').value as ClassificacaoTributaria;
      const classif2 = ClassificacaoTributaria.create('10100').value as ClassificacaoTributaria;

      expect(classif1.equals(classif2)).toBe(true);
    });

    it('should return false for different codes', () => {
      const classif1 = ClassificacaoTributaria.create('10100').value as ClassificacaoTributaria;
      const classif2 = ClassificacaoTributaria.create('20100').value as ClassificacaoTributaria;

      expect(classif1.equals(classif2)).toBe(false);
    });
  });
});

