import { describe, it, expect } from 'vitest';
import { TransitionTaxEngine } from '@/modules/fiscal/domain/tax/engines/TransitionTaxEngine';
import { Money, Result } from '@/shared/domain';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

describe('TransitionTaxEngine', () => {
  const engine = new TransitionTaxEngine();

  describe('getTransitionRates', () => {
    it('deve retornar alíquotas corretas para 2026', () => {
      const rates = engine.getTransitionRates(2026);

      expect(rates.year).toBe(2026);
      expect(rates.currentMultiplier).toBe(1.0);
      expect(rates.ibsRate).toBe(0.1);
      expect(rates.cbsRate).toBe(0.9);
    });

    it('deve retornar alíquotas corretas para 2027', () => {
      const rates = engine.getTransitionRates(2027);

      expect(rates.year).toBe(2027);
      expect(rates.currentMultiplier).toBe(0.0); // PIS/COFINS extintos
      expect(rates.ibsRate).toBe(0.1);
      expect(rates.cbsRate).toBe(8.8);
    });

    it('deve retornar alíquotas corretas para 2029', () => {
      const rates = engine.getTransitionRates(2029);

      expect(rates.year).toBe(2029);
      expect(rates.currentMultiplier).toBe(0.9); // ICMS/ISS 90%
      expect(rates.ibsRate).toBe(1.77); // IBS 10%
      expect(rates.cbsRate).toBe(8.8);
    });

    it('deve retornar alíquotas corretas para 2030', () => {
      const rates = engine.getTransitionRates(2030);

      expect(rates.year).toBe(2030);
      expect(rates.currentMultiplier).toBe(0.8); // ICMS/ISS 80%
      expect(rates.ibsRate).toBe(3.54); // IBS 20%
    });

    it('deve retornar alíquotas corretas para 2031', () => {
      const rates = engine.getTransitionRates(2031);

      expect(rates.year).toBe(2031);
      expect(rates.currentMultiplier).toBe(0.6); // ICMS/ISS 60%
      expect(rates.ibsRate).toBe(7.08); // IBS 40%
    });

    it('deve retornar alíquotas corretas para 2032', () => {
      const rates = engine.getTransitionRates(2032);

      expect(rates.year).toBe(2032);
      expect(rates.currentMultiplier).toBe(0.4); // ICMS/ISS 40%
      expect(rates.ibsRate).toBe(10.62); // IBS 60%
    });

    it('deve retornar alíquotas corretas para 2033', () => {
      const rates = engine.getTransitionRates(2033);

      expect(rates.year).toBe(2033);
      expect(rates.currentMultiplier).toBe(0.0); // ICMS/ISS extintos
      expect(rates.ibsRate).toBe(17.7); // IBS 100%
      expect(rates.cbsRate).toBe(8.8);
    });

    it('deve retornar default (2026) para ano não mapeado', () => {
      const rates = engine.getTransitionRates(2025);

      expect(rates.year).toBe(2026);
      expect(rates.currentMultiplier).toBe(1.0);
    });
  });

  describe('static methods', () => {
    it('deve identificar período de transição corretamente', () => {
      expect(TransitionTaxEngine.isTransitionPeriod(2025)).toBe(false);
      expect(TransitionTaxEngine.isTransitionPeriod(2026)).toBe(true);
      expect(TransitionTaxEngine.isTransitionPeriod(2030)).toBe(true);
      expect(TransitionTaxEngine.isTransitionPeriod(2032)).toBe(true);
      expect(TransitionTaxEngine.isTransitionPeriod(2033)).toBe(false);
    });

    it('deve identificar aplicabilidade de PIS/COFINS corretamente', () => {
      expect(TransitionTaxEngine.isPISCOFINSApplicable(2025)).toBe(true);
      expect(TransitionTaxEngine.isPISCOFINSApplicable(2026)).toBe(true);
      expect(TransitionTaxEngine.isPISCOFINSApplicable(2027)).toBe(false);
      expect(TransitionTaxEngine.isPISCOFINSApplicable(2030)).toBe(false);
    });

    it('deve identificar aplicabilidade de CBS corretamente', () => {
      expect(TransitionTaxEngine.isCBSApplicable(2025)).toBe(false);
      expect(TransitionTaxEngine.isCBSApplicable(2026)).toBe(true);
      expect(TransitionTaxEngine.isCBSApplicable(2030)).toBe(true);
      expect(TransitionTaxEngine.isCBSApplicable(2035)).toBe(true);
    });

    it('deve identificar aplicabilidade de IBS corretamente', () => {
      expect(TransitionTaxEngine.isIBSApplicable(2025)).toBe(false);
      expect(TransitionTaxEngine.isIBSApplicable(2026)).toBe(true);
      expect(TransitionTaxEngine.isIBSApplicable(2030)).toBe(true);
      expect(TransitionTaxEngine.isIBSApplicable(2035)).toBe(true);
    });
  });
});

