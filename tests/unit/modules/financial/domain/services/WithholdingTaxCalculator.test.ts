/**
 * Tests: WithholdingTaxCalculator
 * Domain Service para cálculo de retenções na fonte
 *
 * Base Legal testada:
 * - IRRF 1.5%: Art. 724 RIR/2018
 * - PIS 0.65%: Art. 30 Lei 10.833/03
 * - COFINS 3.0%: Art. 30 Lei 10.833/03
 * - CSLL 1.0%: Art. 30 Lei 10.833/03
 * - ISS 2-5%: LC 116/03
 * - INSS 11%: Art. 31 Lei 8.212/91
 *
 * @module financial/domain/services
 */
import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import {
  WithholdingTaxCalculator,
  type WithholdingTaxInput,
} from '@/modules/financial/domain/services/WithholdingTaxCalculator';

// ============================================================================
// FIXTURES
// ============================================================================

function createInput(overrides: Partial<WithholdingTaxInput> = {}): WithholdingTaxInput {
  return {
    grossAmount: 10000.00,
    serviceType: 'FREIGHT',
    isLegalEntity: true,
    isSimplesNacional: false,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('WithholdingTaxCalculator', () => {
  describe('calculate()', () => {
    it('deve rejeitar valor bruto negativo', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: -100 }));
      expect(Result.isFail(result)).toBe(true);
    });

    it('deve rejeitar valor bruto zero', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: 0 }));
      expect(Result.isFail(result)).toBe(true);
    });

    // ========== IRRF ==========

    it('IRRF: deve reter 1.5% para PJ com valor > R$ 10', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: 10000.00 }));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.irrf).toBe(150.00); // 10000 * 1.5%
      }
    });

    it('IRRF: NÃO deve reter quando valor < R$ 10,00 (Art. 724 §6)', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: 500.00 }));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // 500 * 1.5% = 7.50, que é < R$ 10 mínimo
        expect(result.value.irrf).toBe(0);
        const irrfDetail = result.value.details.find(d => d.tax === 'IRRF');
        expect(irrfDetail?.applied).toBe(false);
      }
    });

    it('IRRF: NÃO deve reter para PF', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 10000.00, isLegalEntity: false })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.irrf).toBe(0);
      }
    });

    // ========== PIS/COFINS/CSLL ==========

    it('PIS/COFINS/CSLL: deve reter 4.65% total para PJ > R$ 5.000', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: 10000.00 }));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.pis).toBe(65.00);    // 10000 * 0.65%
        expect(result.value.cofins).toBe(300.00); // 10000 * 3.0%
        expect(result.value.csll).toBe(100.00);   // 10000 * 1.0%
      }
    });

    it('PIS/COFINS/CSLL: NÃO deve reter para Simples Nacional', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 10000.00, isSimplesNacional: true })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.pis).toBe(0);
        expect(result.value.cofins).toBe(0);
        expect(result.value.csll).toBe(0);
        const pisDetail = result.value.details.find(d => d.tax === 'PIS');
        expect(pisDetail?.reason).toContain('Simples Nacional');
      }
    });

    it('PIS/COFINS/CSLL: NÃO deve reter quando grossAmount <= R$ 5.000', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ grossAmount: 4999.99 }));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.pis).toBe(0);
        expect(result.value.cofins).toBe(0);
        expect(result.value.csll).toBe(0);
      }
    });

    it('PIS/COFINS/CSLL: NÃO deve reter para PF', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 10000.00, isLegalEntity: false })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.pis).toBe(0);
        expect(result.value.cofins).toBe(0);
        expect(result.value.csll).toBe(0);
      }
    });

    // ========== ISS ==========

    it('ISS: deve reter quando retainIss=true com alíquota', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 10000.00, retainIss: true, issRate: 5 })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.iss).toBe(500.00); // 10000 * 5%
      }
    });

    it('ISS: NÃO deve reter quando retainIss=false', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ retainIss: false, issRate: 5 })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.iss).toBe(0);
      }
    });

    it('ISS: deve usar alíquota de 2% corretamente', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 8000.00, retainIss: true, issRate: 2 })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.iss).toBe(160.00); // 8000 * 2%
      }
    });

    // ========== INSS ==========

    it('INSS: deve reter 11% quando retainInss=true para PJ', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 5000.00, retainInss: true })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.inss).toBe(550.00); // 5000 * 11%
      }
    });

    it('INSS: NÃO deve reter quando retainInss=false', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({ retainInss: false }));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.inss).toBe(0);
      }
    });

    it('INSS: deve aplicar teto de retenção', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 100000.00, retainInss: true })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // 100000 * 11% = 11000, mas teto é 908.86
        expect(result.value.inss).toBe(908.86);
      }
    });

    it('INSS: deve usar alíquota cooperativa (15%)', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 5000.00, retainInss: true, inssRate: 0.15 })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.inss).toBe(750.00); // 5000 * 15%
      }
    });

    // ========== NET AMOUNT ==========

    it('netAmount = grossAmount - totalWithholding', () => {
      const result = WithholdingTaxCalculator.calculate(
        createInput({ grossAmount: 10000.00 })
      );
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const expected = 10000 - result.value.totalWithholding;
        expect(result.value.netAmount).toBeCloseTo(expected, 2);
      }
    });

    it('deve calcular cenário completo (todos os impostos)', () => {
      const result = WithholdingTaxCalculator.calculate(createInput({
        grossAmount: 20000.00,
        serviceType: 'FREIGHT',
        isLegalEntity: true,
        isSimplesNacional: false,
        retainIss: true,
        issRate: 5,
        retainInss: true,
      }));

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.irrf).toBe(300.00);   // 20000 * 1.5%
        expect(result.value.pis).toBe(130.00);     // 20000 * 0.65%
        expect(result.value.cofins).toBe(600.00);  // 20000 * 3.0%
        expect(result.value.csll).toBe(200.00);    // 20000 * 1.0%
        expect(result.value.iss).toBe(1000.00);    // 20000 * 5%
        expect(result.value.inss).toBe(908.86);    // teto

        const totalExpected = 300 + 130 + 600 + 200 + 1000 + 908.86;
        expect(result.value.totalWithholding).toBeCloseTo(totalExpected, 2);
        expect(result.value.netAmount).toBeCloseTo(20000 - totalExpected, 2);
      }
    });

    // ========== DETAILS ==========

    it('deve incluir detalhes de todos os impostos', () => {
      const result = WithholdingTaxCalculator.calculate(createInput());
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.details).toHaveLength(6); // IRRF, PIS, COFINS, CSLL, ISS, INSS
        const taxNames = result.value.details.map(d => d.tax);
        expect(taxNames).toContain('IRRF');
        expect(taxNames).toContain('PIS');
        expect(taxNames).toContain('COFINS');
        expect(taxNames).toContain('CSLL');
        expect(taxNames).toContain('ISS');
        expect(taxNames).toContain('INSS');
      }
    });

    it('deve incluir base legal em todos os detalhes', () => {
      const result = WithholdingTaxCalculator.calculate(createInput());
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        for (const detail of result.value.details) {
          expect(detail.legalBasis).toBeTruthy();
        }
      }
    });
  });
});
