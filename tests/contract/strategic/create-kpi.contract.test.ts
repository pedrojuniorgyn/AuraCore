/**
 * Testes de Contrato - CreateKPI DTO
 * 
 * Valida o schema Zod para criação de KPIs (Key Performance Indicators),
 * incluindo validações de thresholds e cálculo automático.
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.1 - BSC Implementation
 */

import { describe, it, expect } from 'vitest';
import { CreateKPIInputSchema } from '@/modules/strategic/application/dtos/CreateKPIDTO';

describe('CreateKPI Contract', () => {
  // Fixtures
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-12d3-a456-426614174001';

  const validInput = {
    code: 'KPI-FIN-001',
    name: 'Receita Líquida Mensal',
    description: 'Total de receita líquida apurada no mês',
    unit: 'R$',
    polarity: 'UP' as const,
    frequency: 'MONTHLY' as const,
    targetValue: 1000000,
    baselineValue: 800000,
    alertThreshold: 10,
    criticalThreshold: 20,
    ownerUserId: validUUID,
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept valid KPI without goalId', () => {
      const result = CreateKPIInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid KPI with goalId', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        goalId: validUUID2,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid frequencies', () => {
      const frequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
      for (const frequency of frequencies) {
        const result = CreateKPIInputSchema.safeParse({
          ...validInput,
          frequency,
        });
        expect(result.success, `Frequency ${frequency} should be valid`).toBe(true);
      }
    });

    it('should accept polarity DOWN', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        polarity: 'DOWN',
        name: 'Custo por Unidade',
        description: 'Custo médio por unidade produzida',
      });
      expect(result.success).toBe(true);
    });

    it('should accept KPI with auto calculation', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        autoCalculate: true,
        sourceModule: 'FINANCIAL',
        sourceQuery: '{"type": "sum", "table": "revenue"}',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid source modules', () => {
      const modules = ['FINANCIAL', 'TMS', 'WMS', 'FISCAL', 'HR'];
      for (const sourceModule of modules) {
        const result = CreateKPIInputSchema.safeParse({
          ...validInput,
          autoCalculate: true,
          sourceModule,
        });
        expect(result.success, `Module ${sourceModule} should be valid`).toBe(true);
      }
    });

    it('should accept KPI without description', () => {
      const { description, ...inputWithoutDesc } = validInput;
      const result = CreateKPIInputSchema.safeParse(inputWithoutDesc);
      expect(result.success).toBe(true);
    });

    it('should accept thresholds at equal values', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        alertThreshold: 15,
        criticalThreshold: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should apply default values correctly', () => {
      const minimal = {
        code: 'KPI-MIN-001',
        name: 'KPI Mínimo',
        unit: '%',
        targetValue: 100,
        ownerUserId: validUUID,
      };
      const result = CreateKPIInputSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.polarity).toBe('UP');
        expect(result.data.frequency).toBe('MONTHLY');
        expect(result.data.alertThreshold).toBe(10);
        expect(result.data.criticalThreshold).toBe(20);
        expect(result.data.autoCalculate).toBe(false);
      }
    });

    it('should accept negative target value for DOWN polarity', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        polarity: 'DOWN',
        targetValue: -50,
        name: 'Variação de Estoque',
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - AUTO CALCULATE
  // =========================================================================

  describe('Auto Calculate (Casos Inválidos)', () => {
    it('should reject autoCalculate without sourceModule', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        autoCalculate: true,
        // sourceModule omitido
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('sourceModule');
      }
    });

    it('should reject invalid sourceModule', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        autoCalculate: true,
        sourceModule: 'INVALID_MODULE',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - THRESHOLDS
  // =========================================================================

  describe('Threshold Validation', () => {
    it('should reject criticalThreshold less than alertThreshold', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        alertThreshold: 20,
        criticalThreshold: 10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('criticalThreshold');
      }
    });

    it('should reject negative alertThreshold', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        alertThreshold: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject alertThreshold above 100', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        alertThreshold: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject criticalThreshold above 100', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        criticalThreshold: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - ESTRUTURA
  // =========================================================================

  describe('Validação de Estrutura', () => {
    it('should reject code shorter than 3 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        code: 'KP',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code longer than 30 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        code: 'A'.repeat(31),
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        code: 'kpi-fin-001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 5 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        name: 'Rec',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 200 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        name: 'x'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 1000 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        description: 'x'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty unit', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        unit: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject unit longer than 20 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        unit: 'x'.repeat(21),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing targetValue', () => {
      const { targetValue, ...inputWithoutTarget } = validInput;
      const result = CreateKPIInputSchema.safeParse(inputWithoutTarget);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ownerUserId format', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        ownerUserId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid goalId format', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        goalId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid frequency', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        frequency: 'BIWEEKLY',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid polarity', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        polarity: 'NEUTRAL',
      });
      expect(result.success).toBe(false);
    });

    it('should reject sourceQuery longer than 2000 chars', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        autoCalculate: true,
        sourceModule: 'FINANCIAL',
        sourceQuery: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle very large target values', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        targetValue: 999999999999.9999,
      });
      expect(result.success).toBe(true);
    });

    it('should handle zero target value', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        targetValue: 0,
        polarity: 'DOWN',
        name: 'Taxa de Erros',
      });
      expect(result.success).toBe(true);
    });

    it('should handle decimal baseline value', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        baselineValue: 123456.7890,
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in name and description', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        name: 'ROI (Return on Investment) — 2026',
        description: 'Retorno sobre investimento: (Ganho - Custo) / Custo × 100%',
      });
      expect(result.success).toBe(true);
    });

    it('should handle thresholds at boundaries (0 and 100)', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        alertThreshold: 0,
        criticalThreshold: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should handle JSON in sourceQuery', () => {
      const result = CreateKPIInputSchema.safeParse({
        ...validInput,
        autoCalculate: true,
        sourceModule: 'FINANCIAL',
        sourceQuery: JSON.stringify({
          type: 'aggregate',
          table: 'transactions',
          field: 'amount',
          operation: 'SUM',
          filters: { status: 'COMPLETED' },
        }),
      });
      expect(result.success).toBe(true);
    });
  });
});
