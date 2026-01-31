import { describe, it, expect } from 'vitest';
import { TimeIntelligence } from '@/shared/infrastructure/time/TimeIntelligence';

describe('TimeIntelligence', () => {
  describe('getRange()', () => {
    it('should return YTD range starting from Jan 1', () => {
      const refDate = new Date('2026-06-15');
      const range = TimeIntelligence.getRange('YTD', refDate);

      expect(range.start.getMonth()).toBe(0); // Janeiro
      expect(range.start.getDate()).toBe(1);
      expect(range.end).toEqual(refDate);
      expect(range.label).toContain('2026');
    });

    it('should return MTD range starting from first of month', () => {
      const refDate = new Date('2026-06-15');
      const range = TimeIntelligence.getRange('MTD', refDate);

      expect(range.start.getMonth()).toBe(5); // Junho
      expect(range.start.getDate()).toBe(1);
    });

    it('should return QTD range starting from quarter start', () => {
      const refDate = new Date('2026-05-15'); // Q2
      const range = TimeIntelligence.getRange('QTD', refDate);

      expect(range.start.getMonth()).toBe(3); // Abril (início Q2)
      expect(range.label).toContain('Q2');
    });
  });

  describe('calculateVariance()', () => {
    it('should calculate positive variance as UP', () => {
      const result = TimeIntelligence.calculateVariance(110, 100);

      expect(result.absolute).toBe(10);
      expect(result.percentage).toBe(10);
      expect(result.trend).toBe('UP');
    });

    it('should calculate negative variance as DOWN', () => {
      const result = TimeIntelligence.calculateVariance(90, 100);

      expect(result.absolute).toBe(-10);
      expect(result.percentage).toBe(-10);
      expect(result.trend).toBe('DOWN');
    });

    it('should calculate zero variance as STABLE', () => {
      const result = TimeIntelligence.calculateVariance(100, 100);

      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.trend).toBe('STABLE');
    });

    it('should handle zero previous value', () => {
      const result = TimeIntelligence.calculateVariance(100, 0);

      expect(result.percentage).toBe(0); // Evita divisão por zero
    });
  });

  describe('getComparison()', () => {
    it('should return YoY comparison with previous year', () => {
      const refDate = new Date('2026-06-15');
      const comparison = TimeIntelligence.getComparison('MTD', 'YoY', refDate);

      expect(comparison.current.start.getFullYear()).toBe(2026);
      expect(comparison.previous.start.getFullYear()).toBe(2025);
    });

    it('should return MoM comparison with previous month', () => {
      const refDate = new Date('2026-06-15');
      const comparison = TimeIntelligence.getComparison('MTD', 'MoM', refDate);

      expect(comparison.current.start.getMonth()).toBe(5); // Junho
      expect(comparison.previous.start.getMonth()).toBe(4); // Maio
    });
  });
});
