/**
 * Contract Tests: Follow-up 3G
 * 
 * Testes de contrato para CreateFollowUp3GDTO
 * 
 * 3G: GEMBA (現場) / GENBUTSU (現物) / GENJITSU (現実)
 * 
 * @module tests/contract/strategic
 */
import { describe, it, expect } from 'vitest';
import {
  CreateFollowUp3GInputSchema,
  validate3GComplete,
  ExecutionStatusSchema,
  ProblemSeveritySchema,
} from '@/modules/strategic/application/dtos/CreateFollowUp3GDTO';

describe('FollowUp 3G Contract', () => {
  const validActionPlanId = '123e4567-e89b-12d3-a456-426614174000';
  const validUserId = '123e4567-e89b-12d3-a456-426614174001';

  const validInput = {
    actionPlanId: validActionPlanId,
    followUpDate: new Date(),
    gembaLocal: 'Armazém Central - Setor A3',
    gembutsuObservation: 'Processo de separação com gargalo na conferência',
    genjitsuData: 'Tempo médio: 15min (meta: 8min). 3 colaboradores no setor.',
    executionStatus: 'EXECUTED_OK' as const,
    executionPercent: 85,
    verifiedBy: validUserId,
  };

  // ==========================================================================
  // CreateFollowUp3G - VALID CASES
  // ==========================================================================
  describe('CreateFollowUp3G - Valid inputs', () => {
    it('should accept minimal valid input', () => {
      const result = CreateFollowUp3GInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept complete input with all optional fields', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        problemsObserved: 'Layout inadequado para fluxo',
        problemSeverity: 'MEDIUM',
        requiresNewPlan: false,
        evidenceUrls: [
          'https://storage.company.com/photo1.jpg',
          'https://storage.company.com/photo2.jpg',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept EXECUTED_OK with 80% progress', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_OK',
        executionPercent: 80,
      });
      expect(result.success).toBe(true);
    });

    it('should accept EXECUTED_OK with 100% progress', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_OK',
        executionPercent: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should accept EXECUTED_PARTIAL with 50% progress', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_PARTIAL',
        executionPercent: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should accept NOT_EXECUTED with 0% and problems', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 0,
        problemsObserved: 'Falta de recursos para execução',
        problemSeverity: 'HIGH',
      });
      expect(result.success).toBe(true);
    });

    it('should accept BLOCKED with problems', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'BLOCKED',
        executionPercent: 30,
        problemsObserved: 'Aguardando aprovação do budget',
        problemSeverity: 'CRITICAL',
      });
      expect(result.success).toBe(true);
    });

    it('should accept requiresNewPlan with description', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 0,
        problemsObserved: 'Escopo maior que o previsto',
        problemSeverity: 'HIGH',
        requiresNewPlan: true,
        newPlanDescription: 'Dividir em 3 fases menores',
        newPlanAssignedTo: validUserId,
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date string to Date', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        followUpDate: '2026-01-20',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.followUpDate).toBeInstanceOf(Date);
      }
    });

    it('should accept multiple evidence URLs', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        evidenceUrls: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/report.pdf',
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - 3G Fields
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid 3G fields', () => {
    it('should reject empty GEMBA (local)', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        gembaLocal: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty GENBUTSU (observation)', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        gembutsuObservation: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty GENJITSU (data)', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        genjitsuData: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject GEMBA longer than 500 chars', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        gembaLocal: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject GENBUTSU longer than 5000 chars', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        gembutsuObservation: 'A'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject GENJITSU longer than 5000 chars', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        genjitsuData: 'A'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - Execution Status Rules
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid execution status rules', () => {
    it('should reject EXECUTED_OK with less than 80%', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_OK',
        executionPercent: 70,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('executionPercent');
      }
    });

    it('should reject EXECUTED_PARTIAL with 0%', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_PARTIAL',
        executionPercent: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject EXECUTED_PARTIAL with 100%', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'EXECUTED_PARTIAL',
        executionPercent: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject NOT_EXECUTED with more than 0%', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 10,
        problemsObserved: 'Some problem',
        problemSeverity: 'LOW',
      });
      expect(result.success).toBe(false);
    });

    it('should reject NOT_EXECUTED without problems', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 0,
        // problemsObserved missing
      });
      expect(result.success).toBe(false);
    });

    it('should reject NOT_EXECUTED without severity', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 0,
        problemsObserved: 'Some problem',
        // problemSeverity missing
      });
      expect(result.success).toBe(false);
    });

    it('should reject BLOCKED without problems', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'BLOCKED',
        executionPercent: 20,
        // problemsObserved missing
      });
      expect(result.success).toBe(false);
    });

    it('should reject BLOCKED without severity', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'BLOCKED',
        executionPercent: 20,
        problemsObserved: 'Blocked reason',
        // problemSeverity missing
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - Reproposition
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid reproposition', () => {
    it('should reject requiresNewPlan without description', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionStatus: 'NOT_EXECUTED',
        executionPercent: 0,
        problemsObserved: 'Problem',
        problemSeverity: 'HIGH',
        requiresNewPlan: true,
        // newPlanDescription missing
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('newPlanDescription');
      }
    });

    it('should reject invalid newPlanAssignedTo UUID', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        requiresNewPlan: true,
        newPlanDescription: 'New plan',
        newPlanAssignedTo: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - IDs
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid IDs', () => {
    it('should reject invalid actionPlanId', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        actionPlanId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid verifiedBy', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        verifiedBy: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing actionPlanId', () => {
      const { actionPlanId, ...inputWithoutId } = validInput;
      const result = CreateFollowUp3GInputSchema.safeParse(inputWithoutId);
      expect(result.success).toBe(false);
    });

    it('should reject missing verifiedBy', () => {
      const { verifiedBy, ...inputWithoutVerifier } = validInput;
      const result = CreateFollowUp3GInputSchema.safeParse(inputWithoutVerifier);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - Progress
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid progress', () => {
    it('should reject progress > 100%', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionPercent: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative progress', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        executionPercent: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // CreateFollowUp3G - INVALID CASES - Evidence
  // ==========================================================================
  describe('CreateFollowUp3G - Invalid evidence', () => {
    it('should reject invalid evidence URLs', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        evidenceUrls: ['not-a-url', 'also-not-a-url'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject mixed valid/invalid URLs', () => {
      const result = CreateFollowUp3GInputSchema.safeParse({
        ...validInput,
        evidenceUrls: ['https://valid.com/photo.jpg', 'not-a-url'],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Value Schemas
  // ==========================================================================
  describe('Value Schemas', () => {
    it('should validate ExecutionStatus', () => {
      const validStatuses = ['EXECUTED_OK', 'EXECUTED_PARTIAL', 'NOT_EXECUTED', 'BLOCKED'];
      for (const status of validStatuses) {
        expect(ExecutionStatusSchema.safeParse(status).success).toBe(true);
      }
      expect(ExecutionStatusSchema.safeParse('INVALID').success).toBe(false);
    });

    it('should validate ProblemSeverity', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      for (const severity of validSeverities) {
        expect(ProblemSeveritySchema.safeParse(severity).success).toBe(true);
      }
      expect(ProblemSeveritySchema.safeParse('URGENT').success).toBe(false);
    });
  });

  // ==========================================================================
  // Helper: validate3GComplete
  // ==========================================================================
  describe('Helper: validate3GComplete', () => {
    it('should return complete for valid input', () => {
      const result = CreateFollowUp3GInputSchema.safeParse(validInput);
      if (result.success) {
        const validation = validate3GComplete(result.data);
        expect(validation.isComplete).toBe(true);
        expect(validation.missingFields).toHaveLength(0);
      }
    });
  });
});
