/**
 * Contract Tests: Action Plan 5W2H
 * 
 * Testes de contrato para CreateActionPlan5W2HDTO e UpdateActionPlanDTO
 * 
 * @module tests/contract/strategic
 */
import { describe, it, expect } from 'vitest';
import {
  CreateActionPlan5W2HInputSchema,
  validateComplete5W2H,
  ActionPlanStatusSchema,
  ActionPlanPrioritySchema,
  PdcaCycleValueSchema,
} from '@/modules/strategic/application/dtos/CreateActionPlan5W2HDTO';
import {
  UpdateActionPlanInputSchema,
  CompleteActionPlanInputSchema,
} from '@/modules/strategic/application/dtos/UpdateActionPlanDTO';

describe('ActionPlan 5W2H Contract', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000';
  const validActionPlanId = '123e4567-e89b-12d3-a456-426614174001';
  
  const validInput = {
    code: 'AP-2026-001',
    what: 'Implementar sistema de gestão de frota',
    why: 'Reduzir custos operacionais em 20%',
    whereLocation: 'Matriz - São Paulo',
    whenStart: new Date('2026-01-01'),
    whenEnd: new Date('2026-06-30'),
    who: 'Equipe de TI',
    whoUserId: validUserId,
    how: '1. Avaliar fornecedores\n2. Implementar piloto\n3. Rollout',
  };

  // ==========================================================================
  // CreateActionPlan5W2H - VALID CASES
  // ==========================================================================
  describe('CreateActionPlan5W2H - Valid inputs', () => {
    it('should accept minimal valid input (all 5W2H fields)', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept complete input with all optional fields', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        goalId: '123e4567-e89b-12d3-a456-426614174002',
        howMuchAmount: 150000,
        howMuchCurrency: 'BRL',
        priority: 'HIGH',
        nextFollowUpDate: new Date('2026-02-15'),
      });
      expect(result.success).toBe(true);
    });

    it('should apply default priority MEDIUM', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('MEDIUM');
      }
    });

    it('should apply default currency BRL', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: 50000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.howMuchCurrency).toBe('BRL');
      }
    });

    it('should accept dates on same day', () => {
      const today = new Date();
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whenStart: today,
        whenEnd: today,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all priority levels', () => {
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
      for (const priority of priorities) {
        const result = CreateActionPlan5W2HInputSchema.safeParse({
          ...validInput,
          priority,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept USD currency', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: 10000,
        howMuchCurrency: 'USD',
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings to Date objects', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whenStart: '2026-01-01',
        whenEnd: '2026-06-30',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.whenStart).toBeInstanceOf(Date);
        expect(result.data.whenEnd).toBeInstanceOf(Date);
      }
    });

    it('should accept zero cost', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // CreateActionPlan5W2H - INVALID CASES - Code
  // ==========================================================================
  describe('CreateActionPlan5W2H - Invalid code', () => {
    it('should reject empty code', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        code: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        code: 'ap-2026-001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with spaces', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        code: 'AP 2026 001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code longer than 20 chars', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        code: 'AP-2026-001-VERY-LONG-CODE',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with special characters', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        code: 'AP@2026#001',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateActionPlan5W2H - INVALID CASES - 5W2H Fields
  // ==========================================================================
  describe('CreateActionPlan5W2H - Invalid 5W2H fields', () => {
    it('should reject empty WHAT', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        what: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty WHY', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        why: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty WHERE', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whereLocation: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty WHO', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        who: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty HOW', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        how: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid whoUserId (not UUID)', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whoUserId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing whenStart', () => {
      const { whenStart, ...inputWithoutStart } = validInput;
      const result = CreateActionPlan5W2HInputSchema.safeParse(inputWithoutStart);
      expect(result.success).toBe(false);
    });

    it('should reject missing whenEnd', () => {
      const { whenEnd, ...inputWithoutEnd } = validInput;
      const result = CreateActionPlan5W2HInputSchema.safeParse(inputWithoutEnd);
      expect(result.success).toBe(false);
    });

    it('should reject WHAT longer than 2000 chars', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        what: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject WHERE longer than 200 chars', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whereLocation: 'A'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject WHO longer than 100 chars', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        who: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateActionPlan5W2H - INVALID CASES - Dates
  // ==========================================================================
  describe('CreateActionPlan5W2H - Invalid dates', () => {
    it('should reject whenEnd before whenStart', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whenStart: new Date('2026-06-01'),
        whenEnd: new Date('2026-01-01'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('whenEnd');
      }
    });

    it('should reject invalid date format', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        whenStart: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateActionPlan5W2H - INVALID CASES - Cost
  // ==========================================================================
  describe('CreateActionPlan5W2H - Invalid cost', () => {
    it('should reject negative cost', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: -5000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency (too short)', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: 1000,
        howMuchCurrency: 'BR',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency (too long)', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        howMuchAmount: 1000,
        howMuchCurrency: 'BRLL',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateActionPlan5W2H - INVALID CASES - Priority
  // ==========================================================================
  describe('CreateActionPlan5W2H - Invalid priority', () => {
    it('should reject invalid priority', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse({
        ...validInput,
        priority: 'URGENT',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Value Schemas
  // ==========================================================================
  describe('Value Schemas', () => {
    it('should validate ActionPlanStatus', () => {
      const validStatuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'];
      for (const status of validStatuses) {
        expect(ActionPlanStatusSchema.safeParse(status).success).toBe(true);
      }
      expect(ActionPlanStatusSchema.safeParse('INVALID').success).toBe(false);
    });

    it('should validate ActionPlanPriority', () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      for (const priority of validPriorities) {
        expect(ActionPlanPrioritySchema.safeParse(priority).success).toBe(true);
      }
      expect(ActionPlanPrioritySchema.safeParse('URGENT').success).toBe(false);
    });

    it('should validate PdcaCycleValue', () => {
      const validCycles = ['PLAN', 'DO', 'CHECK', 'ACT'];
      for (const cycle of validCycles) {
        expect(PdcaCycleValueSchema.safeParse(cycle).success).toBe(true);
      }
      expect(PdcaCycleValueSchema.safeParse('STUDY').success).toBe(false);
    });
  });

  // ==========================================================================
  // Helper: validateComplete5W2H
  // ==========================================================================
  describe('Helper: validateComplete5W2H', () => {
    it('should return complete for valid input', () => {
      const result = CreateActionPlan5W2HInputSchema.safeParse(validInput);
      if (result.success) {
        const validation = validateComplete5W2H(result.data);
        expect(validation.isComplete).toBe(true);
        expect(validation.missingFields).toHaveLength(0);
      }
    });
  });

  // ==========================================================================
  // UpdateActionPlan - VALID CASES
  // ==========================================================================
  describe('UpdateActionPlan - Valid inputs', () => {
    it('should accept partial update (status only)', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        status: 'IN_PROGRESS',
      });
      expect(result.success).toBe(true);
    });

    it('should accept progress update', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        completionPercent: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should accept COMPLETED with 100% and evidence', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        status: 'COMPLETED',
        completionPercent: 100,
        evidenceUrls: ['https://drive.google.com/file/123'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept 5W2H field updates', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        what: 'Updated description',
        who: 'New responsible',
        priority: 'HIGH',
      });
      expect(result.success).toBe(true);
    });

    it('should accept PDCA cycle update', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        pdcaCycle: 'DO',
      });
      expect(result.success).toBe(true);
    });

    it('should accept nullable fields', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        howMuchAmount: null,
        nextFollowUpDate: null,
        repropositionReason: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple evidence URLs', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        evidenceUrls: [
          'https://drive.google.com/file/123',
          'https://confluence.company.com/page/456',
          'https://sharepoint.com/doc/789',
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // UpdateActionPlan - INVALID CASES
  // ==========================================================================
  describe('UpdateActionPlan - Invalid inputs', () => {
    it('should reject missing actionPlanId', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        status: 'IN_PROGRESS',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid actionPlanId', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: 'not-a-uuid',
        status: 'IN_PROGRESS',
      });
      expect(result.success).toBe(false);
    });

    it('should reject COMPLETED without evidence', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        status: 'COMPLETED',
        completionPercent: 100,
        // evidenceUrls missing
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('evidenceUrls');
      }
    });

    it('should reject COMPLETED with less than 100%', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        status: 'COMPLETED',
        completionPercent: 80,
        evidenceUrls: ['https://example.com/evidence'],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('completionPercent');
      }
    });

    it('should reject progress > 100%', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        completionPercent: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative progress', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        completionPercent: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid evidence URLs', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        evidenceUrls: ['not-a-url', 'also-not-a-url'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject whenEnd before whenStart', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        whenStart: new Date('2026-06-01'),
        whenEnd: new Date('2026-01-01'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        status: 'INVALID_STATUS',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = UpdateActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        priority: 'URGENT',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CompleteActionPlan
  // ==========================================================================
  describe('CompleteActionPlan', () => {
    it('should accept valid completion', () => {
      const result = CompleteActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        evidenceUrls: ['https://drive.google.com/file/123'],
        completionNotes: 'Implementação concluída com sucesso',
      });
      expect(result.success).toBe(true);
    });

    it('should reject without evidence', () => {
      const result = CompleteActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        evidenceUrls: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept without notes', () => {
      const result = CompleteActionPlanInputSchema.safeParse({
        actionPlanId: validActionPlanId,
        evidenceUrls: ['https://example.com/evidence.pdf'],
      });
      expect(result.success).toBe(true);
    });
  });
});
