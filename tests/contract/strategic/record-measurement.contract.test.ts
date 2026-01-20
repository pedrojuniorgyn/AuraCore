/**
 * Testes de Contrato - RecordMeasurement DTO
 * 
 * Valida o schema Zod para registro de medições de KPI,
 * incluindo validações de data e tipo de origem.
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.1 - BSC Implementation
 */

import { describe, it, expect } from 'vitest';
import { RecordMeasurementInputSchema } from '@/modules/strategic/application/dtos/RecordMeasurementDTO';

describe('RecordMeasurement Contract', () => {
  // Fixtures
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  const validInput = {
    kpiId: validUUID,
    value: 950000,
    periodDate: '2026-01-15T00:00:00.000Z',
    sourceType: 'MANUAL' as const,
    notes: 'Valor apurado do fechamento mensal',
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept valid measurement with all fields', () => {
      const result = RecordMeasurementInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept measurement without periodDate (uses current)', () => {
      const { periodDate, ...inputWithoutPeriod } = validInput;
      const result = RecordMeasurementInputSchema.safeParse(inputWithoutPeriod);
      expect(result.success).toBe(true);
    });

    it('should accept measurement without notes', () => {
      const { notes, ...inputWithoutNotes } = validInput;
      const result = RecordMeasurementInputSchema.safeParse(inputWithoutNotes);
      expect(result.success).toBe(true);
    });

    it('should accept all valid source types', () => {
      const sourceTypes = ['MANUAL', 'AUTO', 'IMPORT'];
      for (const sourceType of sourceTypes) {
        const result = RecordMeasurementInputSchema.safeParse({
          ...validInput,
          sourceType,
        });
        expect(result.success, `SourceType ${sourceType} should be valid`).toBe(true);
      }
    });

    it('should apply default sourceType as MANUAL', () => {
      const { sourceType, ...inputWithoutSource } = validInput;
      const result = RecordMeasurementInputSchema.safeParse(inputWithoutSource);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceType).toBe('MANUAL');
      }
    });

    it('should accept zero value', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept negative value', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: -1000,
        notes: 'Prejuízo no período',
      });
      expect(result.success).toBe(true);
    });

    it('should transform periodDate string to Date', () => {
      const result = RecordMeasurementInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.periodDate).toBeInstanceOf(Date);
      }
    });

    it('should accept periodDate in the past', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        periodDate: '2020-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept measurement with today as periodDate', () => {
      const today = new Date().toISOString();
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        periodDate: today,
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - DATAS
  // =========================================================================

  describe('Validação de Datas', () => {
    it('should reject periodDate in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        periodDate: futureDate.toISOString(),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('futura');
      }
    });

    it('should reject invalid periodDate format', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        periodDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should reject periodDate as timestamp number', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        periodDate: Date.now(),
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - ESTRUTURA
  // =========================================================================

  describe('Validação de Estrutura', () => {
    it('should reject missing kpiId', () => {
      const { kpiId, ...inputWithoutKpiId } = validInput;
      const result = RecordMeasurementInputSchema.safeParse(inputWithoutKpiId);
      expect(result.success).toBe(false);
    });

    it('should reject invalid kpiId format', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        kpiId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing value', () => {
      const { value, ...inputWithoutValue } = validInput;
      const result = RecordMeasurementInputSchema.safeParse(inputWithoutValue);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric value', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: 'one thousand',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sourceType', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        sourceType: 'EXTERNAL',
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes longer than 500 chars', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        notes: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle very large values', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: 999999999999.9999,
      });
      expect(result.success).toBe(true);
    });

    it('should handle very small values', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: 0.0001,
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in notes', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        notes: 'Valor ajustado: R$ 950.000,00 (+ 15% MoM) — aprovado por @gerente',
      });
      expect(result.success).toBe(true);
    });

    it('should handle empty notes (different from omitted)', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        notes: '',
      });
      expect(result.success).toBe(true);
    });

    it('should handle minimum required fields only', () => {
      const minimal = {
        kpiId: validUUID,
        value: 100,
      };
      const result = RecordMeasurementInputSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should handle AUTO source type for automated measurements', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        kpiId: validUUID,
        value: 850000,
        sourceType: 'AUTO',
        notes: 'Calculado automaticamente pelo sistema',
      });
      expect(result.success).toBe(true);
    });

    it('should handle IMPORT source type for external data', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        kpiId: validUUID,
        value: 920000,
        sourceType: 'IMPORT',
        notes: 'Importado do ERP legado via API',
      });
      expect(result.success).toBe(true);
    });

    it('should handle scientific notation values', () => {
      const result = RecordMeasurementInputSchema.safeParse({
        ...validInput,
        value: 1.5e6, // 1,500,000
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe(1500000);
      }
    });
  });
});
