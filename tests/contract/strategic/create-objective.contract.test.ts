/**
 * Testes de Contrato - CreateStrategicGoal DTO
 * 
 * Valida o schema Zod para criação de objetivos estratégicos BSC,
 * incluindo validações de cascateamento e hierarquia.
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.1 - BSC Implementation
 */

import { describe, it, expect } from 'vitest';
import { CreateStrategicGoalInputSchema } from '@/modules/strategic/application/dtos/CreateStrategicGoalDTO';

describe('CreateStrategicGoal Contract', () => {
  // Fixtures
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '123e4567-e89b-12d3-a456-426614174001';

  const validInput = {
    perspectiveId: validUUID,
    code: 'OBJ-FIN-001',
    description: 'Aumentar receita líquida em 20% até o final do ano',
    cascadeLevel: 'CEO' as const,
    targetValue: 1000000,
    unit: 'R$',
    polarity: 'UP' as const,
    weight: 25,
    ownerUserId: validUUID,
    ownerBranchId: 1,
    startDate: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-12-31T23:59:59.000Z',
  };

  // =========================================================================
  // ✅ CASOS VÁLIDOS
  // =========================================================================

  describe('Casos Válidos', () => {
    it('should accept valid CEO level objective (no parent)', () => {
      const result = CreateStrategicGoalInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept DIRECTOR level objective with parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        parentGoalId: validUUID2,
        cascadeLevel: 'DIRECTOR',
      });
      expect(result.success).toBe(true);
    });

    it('should accept MANAGER level objective with parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        parentGoalId: validUUID2,
        cascadeLevel: 'MANAGER',
      });
      expect(result.success).toBe(true);
    });

    it('should accept TEAM level objective with parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        parentGoalId: validUUID2,
        cascadeLevel: 'TEAM',
      });
      expect(result.success).toBe(true);
    });

    it('should accept polarity DOWN', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        polarity: 'DOWN',
        description: 'Reduzir custos operacionais em 15%',
      });
      expect(result.success).toBe(true);
    });

    it('should accept baseline value', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        baselineValue: 800000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept weight at boundaries (0 and 100)', () => {
      const result0 = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        weight: 0,
      });
      expect(result0.success).toBe(true);

      const result100 = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        weight: 100,
      });
      expect(result100.success).toBe(true);
    });

    it('should accept zero target value', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        targetValue: 0,
        polarity: 'DOWN',
        description: 'Zerar reclamações de clientes',
      });
      expect(result.success).toBe(true);
    });

    it('should transform date strings to Date objects', () => {
      const result = CreateStrategicGoalInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.dueDate).toBeInstanceOf(Date);
      }
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - CASCATEAMENTO
  // =========================================================================

  describe('Cascateamento (Casos Inválidos)', () => {
    it('should reject non-CEO level without parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        cascadeLevel: 'DIRECTOR',
        // parentGoalId omitido
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('CEO');
      }
    });

    it('should reject MANAGER level without parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        cascadeLevel: 'MANAGER',
      });
      expect(result.success).toBe(false);
    });

    it('should reject TEAM level without parent', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        cascadeLevel: 'TEAM',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid cascade level', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        cascadeLevel: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - DATAS
  // =========================================================================

  describe('Validação de Datas', () => {
    it('should reject dueDate before startDate', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        startDate: '2026-12-01T00:00:00.000Z',
        dueDate: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues.map(i => i.message).join(' ');
        expect(message).toContain('posterior');
      }
    });

    it('should reject dueDate equal to startDate', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        startDate: '2026-06-01T00:00:00.000Z',
        dueDate: '2026-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        startDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ❌ CASOS INVÁLIDOS - ESTRUTURA
  // =========================================================================

  describe('Validação de Estrutura', () => {
    it('should reject code shorter than 3 chars', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        code: 'AB',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code longer than 20 chars', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        code: 'A'.repeat(21),
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase letters', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        code: 'obj-fin-001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with spaces', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        code: 'OBJ FIN 001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject description shorter than 10 chars', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        description: 'Curto',
      });
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 500 chars', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        description: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty unit', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        unit: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative target value', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        targetValue: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject weight below 0', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        weight: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject weight above 100', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        weight: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid perspectiveId format', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        perspectiveId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid ownerUserId format', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        ownerUserId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive ownerBranchId', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        ownerBranchId: 0,
      });
      expect(result.success).toBe(false);

      const resultNegative = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        ownerBranchId: -1,
      });
      expect(resultNegative.success).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle large target values', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        targetValue: 999999999999.99,
      });
      expect(result.success).toBe(true);
    });

    it('should handle decimal weights', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        weight: 33.33,
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in description', () => {
      const result = CreateStrategicGoalInputSchema.safeParse({
        ...validInput,
        description: 'Aumentar ROI em 20% (incluindo EBITDA/margem) — meta Q4',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid BSC perspectives', () => {
      const perspectives = ['FINANCIAL', 'CUSTOMER', 'INTERNAL', 'LEARNING'];
      for (const _perspective of perspectives) {
        const result = CreateStrategicGoalInputSchema.safeParse({
          ...validInput,
          // perspectiveId é UUID, não o nome da perspectiva
          perspectiveId: validUUID,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
