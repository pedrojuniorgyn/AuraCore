/**
 * Testes: KPIStatusCalculator
 * Valida cálculo de status com novos thresholds (100%/80%)
 * 
 * @module strategic/domain/services/__tests__
 */
import { describe, it, expect } from 'vitest';
import { KPIStatusCalculator } from '../KPIStatusCalculator';

describe('KPIStatusCalculator', () => {
  describe('calculateStatus - progresso baseado em %', () => {
    it('deve retornar ON_TRACK quando progress >= 100%', () => {
      expect(KPIStatusCalculator.calculateStatus(100)).toBe('ON_TRACK');
      expect(KPIStatusCalculator.calculateStatus(105)).toBe('ON_TRACK');
      expect(KPIStatusCalculator.calculateStatus(150)).toBe('ON_TRACK');
    });

    it('deve retornar AT_RISK quando progress entre 80-99%', () => {
      expect(KPIStatusCalculator.calculateStatus(80)).toBe('AT_RISK');
      expect(KPIStatusCalculator.calculateStatus(85)).toBe('AT_RISK');
      expect(KPIStatusCalculator.calculateStatus(90)).toBe('AT_RISK');
      expect(KPIStatusCalculator.calculateStatus(95)).toBe('AT_RISK');
      expect(KPIStatusCalculator.calculateStatus(99)).toBe('AT_RISK');
    });

    it('deve retornar CRITICAL quando progress < 80%', () => {
      expect(KPIStatusCalculator.calculateStatus(79)).toBe('CRITICAL');
      expect(KPIStatusCalculator.calculateStatus(70)).toBe('CRITICAL');
      expect(KPIStatusCalculator.calculateStatus(50)).toBe('CRITICAL');
      expect(KPIStatusCalculator.calculateStatus(0)).toBe('CRITICAL');
    });

    it('deve retornar NO_DATA quando progress é null ou undefined', () => {
      expect(KPIStatusCalculator.calculateStatus(null)).toBe('NO_DATA');
      expect(KPIStatusCalculator.calculateStatus(undefined)).toBe('NO_DATA');
    });
  });

  describe('calculateStatusWithDirection - UP (maior é melhor)', () => {
    it('deve retornar ON_TRACK quando atual >= target', () => {
      // 100/100 = 100%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 100,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('ON_TRACK');

      // 110/100 = 110%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 110,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('ON_TRACK');
    });

    it('deve retornar AT_RISK quando atual entre 80-99% do target', () => {
      // 85/100 = 85%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 85,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('AT_RISK');

      // 95/100 = 95%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 95,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('AT_RISK');

      // 80/100 = 80%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 80,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('AT_RISK');
    });

    it('deve retornar CRITICAL quando atual < 80% do target', () => {
      // 70/100 = 70%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 70,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('CRITICAL');

      // 50/100 = 50%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: 50,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('CRITICAL');
    });
  });

  describe('calculateStatusWithDirection - DOWN (menor é melhor)', () => {
    it('deve retornar ON_TRACK quando atual <= target', () => {
      // target/actual = 5/5 = 100%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 5,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('ON_TRACK');

      // target/actual = 5/4 = 125%
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 4,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('ON_TRACK');
    });

    it('deve retornar AT_RISK quando atual entre 101-120% do target', () => {
      // target/actual = 5/6 = 83.33% (atual está 20% acima do target)
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 6,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('AT_RISK');

      // target/actual = 5/5.5 = 90.9% (atual está 10% acima do target)
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 5.5,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('AT_RISK');
    });

    it('deve retornar CRITICAL quando atual > 120% do target', () => {
      // target/actual = 5/7 = 71.4% (atual está 40% acima do target)
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 7,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('CRITICAL');

      // target/actual = 5/10 = 50% (atual está 100% acima do target)
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 10,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('CRITICAL');
    });

    it('deve retornar ON_TRACK quando atual = 0 (melhor que meta)', () => {
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 5,
          actual: 0,
          direction: 'LOWER_IS_BETTER',
        })
      ).toBe('ON_TRACK');
    });
  });

  describe('edge cases', () => {
    it('deve retornar NO_DATA quando target é 0', () => {
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 0,
          actual: 10,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('NO_DATA');
    });

    it('deve retornar NO_DATA quando target ou actual é null', () => {
      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: null,
          actual: 10,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('NO_DATA');

      expect(
        KPIStatusCalculator.calculateStatusWithDirection({
          target: 100,
          actual: null,
          direction: 'HIGHER_IS_BETTER',
        })
      ).toBe('NO_DATA');
    });
  });

  describe('getStatusColor', () => {
    it('deve retornar cores corretas', () => {
      expect(KPIStatusCalculator.getStatusColor('ON_TRACK')).toBe('green');
      expect(KPIStatusCalculator.getStatusColor('AT_RISK')).toBe('yellow');
      expect(KPIStatusCalculator.getStatusColor('CRITICAL')).toBe('red');
      expect(KPIStatusCalculator.getStatusColor('NO_DATA')).toBe('gray');
    });
  });

  describe('getStatusLabel', () => {
    it('deve retornar labels em português', () => {
      expect(KPIStatusCalculator.getStatusLabel('ON_TRACK')).toBe('No caminho');
      expect(KPIStatusCalculator.getStatusLabel('AT_RISK')).toBe('Em risco');
      expect(KPIStatusCalculator.getStatusLabel('CRITICAL')).toBe('Crítico');
      expect(KPIStatusCalculator.getStatusLabel('NO_DATA')).toBe('Sem dados');
    });
  });

  describe('getStatusIcon', () => {
    it('deve retornar emojis corretos', () => {
      expect(KPIStatusCalculator.getStatusIcon('ON_TRACK')).toBe('✅');
      expect(KPIStatusCalculator.getStatusIcon('AT_RISK')).toBe('⚠️');
      expect(KPIStatusCalculator.getStatusIcon('CRITICAL')).toBe('🚨');
      expect(KPIStatusCalculator.getStatusIcon('NO_DATA')).toBe('➖');
    });
  });

  describe('getStatusDescription', () => {
    it('deve retornar descrições corretas com novos thresholds', () => {
      expect(KPIStatusCalculator.getStatusDescription('ON_TRACK')).toContain('≥100%');
      expect(KPIStatusCalculator.getStatusDescription('AT_RISK')).toContain('80-99%');
      expect(KPIStatusCalculator.getStatusDescription('CRITICAL')).toContain('<80%');
    });
  });
});
