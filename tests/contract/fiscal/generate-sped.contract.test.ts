/**
 * GenerateSped Contract Tests
 * Testes de contrato para validação Zod de geração SPED
 * 
 * ⚠️ CRÍTICO: SPED incorreto = multa R$ 5.000/mês (Art. 12 Lei 8.218/91)
 */
import { describe, it, expect } from 'vitest';
import { 
  GenerateSpedFiscalDtoSchema,
  GenerateSpedContributionsDtoSchema,
  GenerateSpedEcdDtoSchema,
} from '@/modules/fiscal/application/dtos/GenerateSpedDTO';

describe('GenerateSpedFiscal Contract', () => {
  const validInput = {
    referenceMonth: 1,
    referenceYear: 2026,
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with defaults', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.finalidade).toBe('ORIGINAL');
        expect(result.data.includeInventory).toBe(false);
      }
    });

    it('should accept all valid months (1-12)', () => {
      for (let month = 1; month <= 12; month++) {
        const result = GenerateSpedFiscalDtoSchema.safeParse({
          ...validInput,
          referenceMonth: month,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept RETIFICADORA finalidade', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        finalidade: 'RETIFICADORA',
      });
      expect(result.success).toBe(true);
    });

    it('should accept includeInventory true', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        includeInventory: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject month 0', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        referenceMonth: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject month 13', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        referenceMonth: 13,
      });
      expect(result.success).toBe(false);
    });

    it('should reject year before 2020', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        referenceYear: 2019,
      });
      expect(result.success).toBe(false);
    });

    it('should reject year after 2030', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        referenceYear: 2031,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid finalidade', () => {
      const result = GenerateSpedFiscalDtoSchema.safeParse({
        ...validInput,
        finalidade: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GenerateSpedContributions Contract', () => {
  const validInput = {
    referenceMonth: 6,
    referenceYear: 2026,
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with defaults', () => {
      const result = GenerateSpedContributionsDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.regime).toBe('LUCRO_REAL');
        expect(result.data.tipoEscrituracao).toBe('ORIGINAL');
      }
    });

    it('should accept LUCRO_PRESUMIDO regime', () => {
      const result = GenerateSpedContributionsDtoSchema.safeParse({
        ...validInput,
        regime: 'LUCRO_PRESUMIDO',
      });
      expect(result.success).toBe(true);
    });

    it('should accept RETIFICADORA tipo', () => {
      const result = GenerateSpedContributionsDtoSchema.safeParse({
        ...validInput,
        tipoEscrituracao: 'RETIFICADORA',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject invalid regime', () => {
      const result = GenerateSpedContributionsDtoSchema.safeParse({
        ...validInput,
        regime: 'SIMPLES',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GenerateSpedEcd Contract', () => {
  const validInput = {
    referenceYear: 2025,
  };

  describe('Valid Inputs', () => {
    it('should accept valid input with defaults', () => {
      const result = GenerateSpedEcdDtoSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipoEscrituracao).toBe('ORIGINAL');
        expect(result.data.situacaoEspecial).toBe('NORMAL');
      }
    });

    it('should accept all valid situacaoEspecial values', () => {
      const situacoes = ['NORMAL', 'EXTINCAO', 'CISAO', 'FUSAO', 'INCORPORACAO'] as const;
      
      for (const situacao of situacoes) {
        const result = GenerateSpedEcdDtoSchema.safeParse({
          ...validInput,
          situacaoEspecial: situacao,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject invalid situacaoEspecial', () => {
      const result = GenerateSpedEcdDtoSchema.safeParse({
        ...validInput,
        situacaoEspecial: 'FALENCIA',
      });
      expect(result.success).toBe(false);
    });
  });
});
