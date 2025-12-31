import { describe, it, expect } from 'vitest';
import { XmlFormatter } from '@/modules/fiscal/infrastructure/xml/utils/XmlFormatter';
import { Money } from '@/shared/domain';
import { Result } from '@/shared/domain';

describe('XmlFormatter', () => {
  describe('formatDecimal()', () => {
    it('should format decimal with 2 decimals by default', () => {
      expect(XmlFormatter.formatDecimal(1000.5)).toBe('1000.50');
    });

    it('should format decimal with specified decimals', () => {
      expect(XmlFormatter.formatDecimal(0.1234, 4)).toBe('0.1234');
    });

    it('should format zero', () => {
      expect(XmlFormatter.formatDecimal(0)).toBe('0.00');
    });

    it('should use dot as decimal separator', () => {
      const result = XmlFormatter.formatDecimal(1000.5);
      expect(result).toContain('.');
      expect(result).not.toContain(',');
    });
  });

  describe('formatPercentage()', () => {
    it('should format percentage with 4 decimals by default', () => {
      expect(XmlFormatter.formatPercentage(10.5)).toBe('10.5000');
    });

    it('should format percentage with specified decimals', () => {
      expect(XmlFormatter.formatPercentage(0.1, 2)).toBe('0.10');
    });
  });

  describe('formatDate()', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2030-01-15T10:30:00Z');
      expect(XmlFormatter.formatDate(date)).toBe('2030-01-15');
    });

    it('should handle single digit month and day', () => {
      const date = new Date('2030-03-05T00:00:00Z');
      expect(XmlFormatter.formatDate(date)).toBe('2030-03-05');
    });
  });

  describe('formatDateTime()', () => {
    it('should format datetime as ISO 8601', () => {
      const date = new Date('2030-01-15T10:30:00.000Z');
      const result = XmlFormatter.formatDateTime(date);
      expect(result).toBe('2030-01-15T10:30:00.000Z');
    });
  });

  describe('formatCurrency()', () => {
    it('should format Money with 2 decimals', () => {
      const moneyResult = Money.create(1000.5, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (Result.isOk(moneyResult)) {
        expect(XmlFormatter.formatCurrency(moneyResult.value)).toBe('1000.50');
      }
    });

    it('should format zero Money', () => {
      const moneyResult = Money.create(0, 'BRL');
      expect(Result.isOk(moneyResult)).toBe(true);
      if (Result.isOk(moneyResult)) {
        expect(XmlFormatter.formatCurrency(moneyResult.value)).toBe('0.00');
      }
    });
  });

  describe('formatCnpjCpf()', () => {
    it('should remove CNPJ mask', () => {
      expect(XmlFormatter.formatCnpjCpf('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('should remove CPF mask', () => {
      expect(XmlFormatter.formatCnpjCpf('123.456.789-00')).toBe('12345678900');
    });

    it('should handle already unmasked value', () => {
      expect(XmlFormatter.formatCnpjCpf('12345678000190')).toBe('12345678000190');
    });
  });

  describe('formatCep()', () => {
    it('should remove CEP mask', () => {
      expect(XmlFormatter.formatCep('01310-100')).toBe('01310100');
    });

    it('should handle already unmasked CEP', () => {
      expect(XmlFormatter.formatCep('01310100')).toBe('01310100');
    });
  });

  describe('formatPhone()', () => {
    it('should remove phone mask', () => {
      expect(XmlFormatter.formatPhone('(11) 98765-4321')).toBe('11987654321');
    });

    it('should handle already unmasked phone', () => {
      expect(XmlFormatter.formatPhone('11987654321')).toBe('11987654321');
    });
  });

  describe('removeAccents()', () => {
    it('should remove accents from string', () => {
      expect(XmlFormatter.removeAccents('São Paulo')).toBe('Sao Paulo');
    });

    it('should handle string without accents', () => {
      expect(XmlFormatter.removeAccents('Normal Text')).toBe('Normal Text');
    });

    it('should remove multiple types of accents', () => {
      expect(XmlFormatter.removeAccents('José Ávila Ñoño')).toBe('Jose Avila Nono');
    });
  });
});

