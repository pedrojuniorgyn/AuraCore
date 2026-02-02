/**
 * Testes unitários: KPICalculatorService.calculateStatus()
 * Valida o cálculo correto de status do KPI baseado em ratio
 *
 * @module tests/unit/strategic/services
 */
import { describe, it, expect } from 'vitest';
import { KPICalculatorService } from '@/modules/strategic/domain/services/KPICalculatorService';
import { Result } from '@/shared/domain';

describe('KPICalculatorService.calculateStatus()', () => {
  describe('Polarity UP (HIGHER_IS_BETTER) - maior é melhor', () => {
    it('1) target=100 actual=120 → GREEN (meta superada)', () => {
      const result = KPICalculatorService.calculateStatus(120, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });

    it('2) target=100 actual=95 → YELLOW (95% da meta, dentro do warning)', () => {
      const result = KPICalculatorService.calculateStatus(95, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('YELLOW');
      }
    });

    it('3) target=100 actual=50 → RED (50% da meta, crítico)', () => {
      const result = KPICalculatorService.calculateStatus(50, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('RED');
      }
    });

    it('target=100 actual=100 → GREEN (exatamente na meta)', () => {
      const result = KPICalculatorService.calculateStatus(100, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });

    it('target=100 actual=90 → YELLOW (limite exato do warning)', () => {
      const result = KPICalculatorService.calculateStatus(90, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('YELLOW');
      }
    });

    it('target=100 actual=89 → RED (abaixo do warning)', () => {
      const result = KPICalculatorService.calculateStatus(89, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('RED');
      }
    });
  });

  describe('Polarity DOWN (LOWER_IS_BETTER) - menor é melhor', () => {
    it('4) target=10 actual=8 → GREEN (abaixo da meta é bom)', () => {
      const result = KPICalculatorService.calculateStatus(8, 10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });

    it('5) target=10 actual=11 → YELLOW (ligeiramente acima, 90.9% ratio)', () => {
      const result = KPICalculatorService.calculateStatus(11, 10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('YELLOW');
      }
    });

    it('6) target=10 actual=20 → RED (dobro da meta, crítico)', () => {
      const result = KPICalculatorService.calculateStatus(20, 10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('RED');
      }
    });

    it('target=10 actual=10 → GREEN (exatamente na meta)', () => {
      const result = KPICalculatorService.calculateStatus(10, 10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });

    it('target=10 actual=0 → GREEN (zero é ótimo para "menor é melhor")', () => {
      const result = KPICalculatorService.calculateStatus(0, 10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });
  });

  describe('Casos especiais e validações', () => {
    it('7) actual=null → Result.fail (valor atual não disponível)', () => {
      const result = KPICalculatorService.calculateStatus(null, 100, 'UP', 0.9);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Valor atual não disponível');
      }
    });

    it('8) target=null → Result.fail (meta não definida)', () => {
      const result = KPICalculatorService.calculateStatus(50, null, 'UP', 0.9);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Meta inválida');
      }
    });

    it('target=0 → Result.fail (meta zero é inválida)', () => {
      const result = KPICalculatorService.calculateStatus(50, 0, 'UP', 0.9);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Meta inválida');
      }
    });

    it('warningRatio personalizado (0.8 = 80%)', () => {
      // target=100, actual=85, warningRatio=0.8
      // ratio = 85/100 = 0.85, que é >= 0.8 → YELLOW
      const result = KPICalculatorService.calculateStatus(85, 100, 'UP', 0.8);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('YELLOW');
      }
    });

    it('warningRatio personalizado (0.8 = 80%) - abaixo do limite', () => {
      // target=100, actual=75, warningRatio=0.8
      // ratio = 75/100 = 0.75, que é < 0.8 → RED
      const result = KPICalculatorService.calculateStatus(75, 100, 'UP', 0.8);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('RED');
      }
    });
  });

  describe('Valores negativos e edge cases', () => {
    it('UP: valores negativos - actual=-10, target=10 → RED', () => {
      const result = KPICalculatorService.calculateStatus(-10, 10, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('RED');
      }
    });

    it('DOWN: valores negativos - actual=-5, target=-10 → GREEN (menor negativo é melhor)', () => {
      // Ratio = -10 / -5 = 2.0 → GREEN
      const result = KPICalculatorService.calculateStatus(-5, -10, 'DOWN', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('GREEN');
      }
    });

    it('UP: valores decimais precisos - actual=94.5, target=100 → YELLOW', () => {
      // Ratio = 94.5/100 = 0.945 → YELLOW
      const result = KPICalculatorService.calculateStatus(94.5, 100, 'UP', 0.9);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('YELLOW');
      }
    });
  });
});
