import { describe, it, expect, beforeEach } from 'vitest';
import { TaxEngineFactory, TaxEngineType } from '@/modules/fiscal/domain/tax/engines/TaxEngineFactory';
import { CurrentTaxEngine } from '@/modules/fiscal/domain/tax/engines/CurrentTaxEngine';
import { TransitionTaxEngine } from '@/modules/fiscal/domain/tax/engines/TransitionTaxEngine';
import { NewTaxEngine } from '@/modules/fiscal/domain/tax/engines/NewTaxEngine';
import { Result } from '@/shared/domain';

describe('TaxEngineFactory', () => {
  let factory: TaxEngineFactory;

  beforeEach(() => {
    TaxEngineFactory.clearCache();
    factory = new TaxEngineFactory();
  });

  describe('determineEngineType', () => {
    it('deve retornar CURRENT para datas até 2025', () => {
      const date2020 = new Date(2020, 0, 1);
      const date2025 = new Date(2025, 11, 31);

      expect(factory.determineEngineType(date2020)).toBe(TaxEngineType.CURRENT);
      expect(factory.determineEngineType(date2025)).toBe(TaxEngineType.CURRENT);
    });

    it('deve retornar TRANSITION para datas entre 2026 e 2032', () => {
      const date2026 = new Date(2026, 0, 1);
      const date2030 = new Date(2030, 5, 15);
      const date2032 = new Date(2032, 11, 31);

      expect(factory.determineEngineType(date2026)).toBe(TaxEngineType.TRANSITION);
      expect(factory.determineEngineType(date2030)).toBe(TaxEngineType.TRANSITION);
      expect(factory.determineEngineType(date2032)).toBe(TaxEngineType.TRANSITION);
    });

    it('deve retornar NEW para datas a partir de 2033', () => {
      const date2033 = new Date(2033, 0, 1);
      const date2040 = new Date(2040, 11, 31);

      expect(factory.determineEngineType(date2033)).toBe(TaxEngineType.NEW);
      expect(factory.determineEngineType(date2040)).toBe(TaxEngineType.NEW);
    });
  });

  describe('getEngine', () => {
    it('deve retornar CurrentTaxEngine para datas até 2025', () => {
      const date = new Date(2025, 0, 1);
      const engine = factory.getEngine(date);

      expect(engine).toBeInstanceOf(CurrentTaxEngine);
    });

    it('deve retornar TransitionTaxEngine para período de transição', () => {
      const date = new Date(2026, 0, 1);
      const engine = factory.getEngine(date);

      expect(engine).toBeInstanceOf(TransitionTaxEngine);
    });

    it('deve retornar NewTaxEngine para novo sistema', () => {
      const date = new Date(2033, 0, 1);
      const engine = factory.getEngine(date);

      expect(engine).toBeInstanceOf(NewTaxEngine);
    });

    it('deve retornar mesma instância para múltiplas chamadas (singleton)', () => {
      const date1 = new Date(2025, 0, 1);
      const date2 = new Date(2025, 11, 31);

      const engine1 = factory.getEngine(date1);
      const engine2 = factory.getEngine(date2);

      expect(engine1).toBe(engine2);
    });
  });

  describe('getEngineByType', () => {
    it('deve retornar CurrentTaxEngine quando solicitado', () => {
      const engine = factory.getEngineByType(TaxEngineType.CURRENT);
      expect(engine).toBeInstanceOf(CurrentTaxEngine);
    });

    it('deve retornar TransitionTaxEngine quando solicitado', () => {
      const engine = factory.getEngineByType(TaxEngineType.TRANSITION);
      expect(engine).toBeInstanceOf(TransitionTaxEngine);
    });

    it('deve retornar NewTaxEngine quando solicitado', () => {
      const engine = factory.getEngineByType(TaxEngineType.NEW);
      expect(engine).toBeInstanceOf(NewTaxEngine);
    });
  });

  describe('getPeriodInfo', () => {
    it('deve retornar informações corretas para sistema atual', () => {
      const date = new Date(2025, 0, 1);
      const info = factory.getPeriodInfo(date);

      expect(info.engineType).toBe(TaxEngineType.CURRENT);
      expect(info.year).toBe(2025);
      expect(info.description).toContain('Atual');
      expect(info.applicableTaxes).toContain('ICMS');
      expect(info.applicableTaxes).toContain('PIS');
      expect(info.applicableTaxes).toContain('COFINS');
    });

    it('deve retornar informações corretas para período de transição 2026', () => {
      const date = new Date(2026, 0, 1);
      const info = factory.getPeriodInfo(date);

      expect(info.engineType).toBe(TaxEngineType.TRANSITION);
      expect(info.year).toBe(2026);
      expect(info.description).toContain('Transição');
      expect(info.applicableTaxes).toContain('CBS (teste)');
      expect(info.applicableTaxes).toContain('IBS (teste)');
    });

    it('deve retornar informações corretas para período de transição 2027+', () => {
      const date = new Date(2027, 0, 1);
      const info = factory.getPeriodInfo(date);

      expect(info.engineType).toBe(TaxEngineType.TRANSITION);
      expect(info.applicableTaxes).toContain('CBS');
      expect(info.applicableTaxes).not.toContain('PIS');
      expect(info.applicableTaxes).not.toContain('COFINS');
    });

    it('deve retornar informações corretas para novo sistema', () => {
      const date = new Date(2033, 0, 1);
      const info = factory.getPeriodInfo(date);

      expect(info.engineType).toBe(TaxEngineType.NEW);
      expect(info.year).toBe(2033);
      expect(info.description).toContain('Novo');
      expect(info.applicableTaxes).toContain('IBS');
      expect(info.applicableTaxes).toContain('CBS');
      expect(info.applicableTaxes).toContain('IS');
    });
  });

  describe('isDateSupported', () => {
    it('deve aceitar datas entre 2020 e 2050', () => {
      const date2020 = new Date(2020, 0, 1);
      const date2050 = new Date(2050, 11, 31);

      expect(Result.isOk(TaxEngineFactory.isDateSupported(date2020))).toBe(true);
      expect(Result.isOk(TaxEngineFactory.isDateSupported(date2050))).toBe(true);
    });

    it('deve rejeitar datas antes de 2020', () => {
      const date = new Date(2019, 11, 31);
      const result = TaxEngineFactory.isDateSupported(date);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('2020');
      }
    });

    it('deve rejeitar datas depois de 2050', () => {
      const date = new Date(2051, 0, 1);
      const result = TaxEngineFactory.isDateSupported(date);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('2050');
      }
    });

    it('deve rejeitar datas inválidas', () => {
      const date = new Date('invalid');
      const result = TaxEngineFactory.isDateSupported(date);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid');
      }
    });
  });

  describe('getReformMilestones', () => {
    it('deve retornar todos os marcos da reforma tributária', () => {
      const milestones = TaxEngineFactory.getReformMilestones();

      expect(milestones.length).toBeGreaterThan(5);
      expect(milestones[0].date).toBe('2026-01-01');
      expect(milestones[milestones.length - 1].date).toBe('2033-01-01');
    });

    it('deve incluir descrições e mudanças em cada marco', () => {
      const milestones = TaxEngineFactory.getReformMilestones();

      milestones.forEach((milestone) => {
        expect(milestone.date).toBeDefined();
        expect(milestone.description).toBeDefined();
        expect(milestone.changes).toBeDefined();
        expect(milestone.changes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('clearCache', () => {
    it('deve limpar cache de engines', () => {
      const date = new Date(2025, 0, 1);
      const engine1 = factory.getEngine(date);

      TaxEngineFactory.clearCache();

      const engine2 = factory.getEngine(date);

      // Após limpar cache, nova instância é criada
      expect(engine1).not.toBe(engine2);
    });
  });
});

