/**
 * Testes de Contrato - CreatePdcaCycle DTO
 * 
 * Valida o schema Zod para criação de ciclos PDCA,
 * incluindo validações de código, datas e vínculos BSC.
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.2 - Ciclos PDCA
 */

import { describe, it, expect } from 'vitest';
import { CreatePdcaCycleInputSchema } from '@/modules/strategic/application/dtos/CreatePdcaCycleDTO';

describe('CreatePdcaCycle Contract', () => {
  // Fixtures
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-12d3-a456-426614174001';

  const validInput = {
    code: 'PDCA-2026-001',
    title: 'Melhoria do Processo de Faturamento',
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept minimal valid input', () => {
      const result = CreatePdcaCycleInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept complete input with all fields', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        description: 'Ciclo para reduzir tempo de faturamento em 30%',
        objectiveId: validUUID,
        kpiId: validUUID2,
        ownerId: validUUID,
        ownerName: 'João Silva',
        startDate: new Date('2026-01-01'),
        targetDate: new Date('2026-03-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept dates on same day', () => {
      const today = new Date();
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: today,
        targetDate: today,
      });
      expect(result.success).toBe(true);
    });

    it('should accept objective without KPI', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        objectiveId: validUUID,
        // kpiId not provided
      });
      expect(result.success).toBe(true);
    });

    it('should accept code with only numbers', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        code: '2026-001',
      });
      expect(result.success).toBe(true);
    });

    it('should accept code with only uppercase letters', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        code: 'PDCACYCLE',
      });
      expect(result.success).toBe(true);
    });

    it('should accept future dates', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: new Date('2027-01-01'),
        targetDate: new Date('2027-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings to Date objects', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: '2026-01-01',
        targetDate: '2026-03-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.targetDate).toBeInstanceOf(Date);
      }
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - CÓDIGO
  // =========================================================================

  describe('Validação de Código', () => {
    it('should reject empty code', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: '' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: 'pdca-001' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with spaces', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: 'PDCA 001' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with special characters', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: 'PDCA_001' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with dots', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: 'PDCA.001' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject code longer than 20 chars', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        code: 'PDCA-2026-001-VERY-LONG' 
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - TÍTULO
  // =========================================================================

  describe('Validação de Título', () => {
    it('should reject empty title', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        title: '' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 255 chars', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({ 
        ...validInput, 
        title: 'A'.repeat(256) 
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing title', () => {
      const { title, ...inputWithoutTitle } = validInput;
      const result = CreatePdcaCycleInputSchema.safeParse(inputWithoutTitle);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - DATAS
  // =========================================================================

  describe('Validação de Datas', () => {
    it('should reject targetDate before startDate', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: new Date('2026-03-01'),
        targetDate: new Date('2026-01-01'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('targetDate');
        expect(result.error.issues[0].message).toContain('posterior');
      }
    });

    it('should accept targetDate without startDate', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        targetDate: new Date('2026-03-01'),
        // startDate not provided
      });
      expect(result.success).toBe(true);
    });

    it('should accept startDate without targetDate', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: new Date('2026-01-01'),
        // targetDate not provided
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - VÍNCULOS BSC
  // =========================================================================

  describe('Validação de Vínculos BSC', () => {
    it('should reject KPI without objective', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        kpiId: validUUID2,
        // objectiveId not provided
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('kpiId');
        expect(result.error.issues[0].message).toContain('objetivo');
      }
    });

    it('should accept KPI with objective', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        objectiveId: validUUID,
        kpiId: validUUID2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for objectiveId', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        objectiveId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for kpiId', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        objectiveId: validUUID,
        kpiId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for ownerId', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        ownerId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - DESCRIÇÃO
  // =========================================================================

  describe('Validação de Descrição', () => {
    it('should reject description longer than 2000 chars', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        description: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept description at limit (2000 chars)', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        description: 'A'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty description', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        description: '',
      });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in title', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        title: 'Melhoria (30%) — Processo de Faturamento/Cobrança',
      });
      expect(result.success).toBe(true);
    });

    it('should handle emojis in description', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        description: '🔄 Ciclo de melhoria contínua 📈',
      });
      expect(result.success).toBe(true);
    });

    it('should handle minimum code length (1 char)', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        code: 'A',
      });
      expect(result.success).toBe(true);
    });

    it('should handle code at max length (20 chars)', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        code: 'PDCA-2026-001234567',
      });
      expect(result.success).toBe(true);
    });

    it('should handle ownerName without ownerId', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        ownerName: 'João Silva',
        // ownerId not provided
      });
      expect(result.success).toBe(true);
    });

    it('should handle ISO date strings', () => {
      const result = CreatePdcaCycleInputSchema.safeParse({
        ...validInput,
        startDate: '2026-01-01T00:00:00.000Z',
        targetDate: '2026-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
