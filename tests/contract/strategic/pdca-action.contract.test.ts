/**
 * Testes de Contrato - PdcaAction DTOs
 * 
 * Valida os schemas Zod para adicionar e atualizar ações PDCA,
 * incluindo validações de status, progresso e bloqueios.
 * 
 * @module tests/contract/strategic
 * @see ONDA 10.2 - Ciclos PDCA
 */

import { describe, it, expect } from 'vitest';
import { AddPdcaActionInputSchema } from '@/modules/strategic/application/dtos/AddPdcaActionDTO';
import { UpdatePdcaActionInputSchema } from '@/modules/strategic/application/dtos/UpdatePdcaActionDTO';

describe('PdcaAction Contract', () => {
  // Fixtures
  const validCycleId = '123e4567-e89b-12d3-a456-426614174000';
  const validActionId = '123e4567-e89b-12d3-a456-426614174001';
  const validAssigneeId = '123e4567-e89b-12d3-a456-426614174002';
  const validBlockerId = '123e4567-e89b-12d3-a456-426614174003';

  // =========================================================================
  // ADD PDCA ACTION
  // =========================================================================

  describe('AddPdcaAction', () => {
    const validAddInput = {
      cycleId: validCycleId,
      phase: 'PLAN' as const,
      title: 'Mapear processo atual',
    };

    describe('Casos Válidos', () => {
      it('should accept minimal valid input', () => {
        const result = AddPdcaActionInputSchema.safeParse(validAddInput);
        expect(result.success).toBe(true);
      });

      it('should accept complete input with all fields', () => {
        const result = AddPdcaActionInputSchema.safeParse({
          ...validAddInput,
          description: 'Documentar fluxo atual do processo de faturamento',
          expectedResult: 'Fluxograma completo do processo com tempos de cada etapa',
          assigneeId: validAssigneeId,
          assigneeName: 'Maria Santos',
          priority: 'HIGH',
          dueDate: new Date('2026-01-15'),
          sequenceOrder: 1,
        });
        expect(result.success).toBe(true);
      });

      it('should apply default priority MEDIUM', () => {
        const result = AddPdcaActionInputSchema.safeParse(validAddInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe('MEDIUM');
        }
      });

      it('should accept all valid phases', () => {
        const phases = ['PLAN', 'DO', 'CHECK', 'ACT'] as const;
        for (const phase of phases) {
          const result = AddPdcaActionInputSchema.safeParse({
            ...validAddInput,
            phase,
          });
          expect(result.success, `Phase ${phase} should be valid`).toBe(true);
        }
      });

      it('should accept all valid priorities', () => {
        const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
        for (const priority of priorities) {
          const result = AddPdcaActionInputSchema.safeParse({
            ...validAddInput,
            priority,
          });
          expect(result.success, `Priority ${priority} should be valid`).toBe(true);
        }
      });

      it('should accept sequenceOrder 0', () => {
        const result = AddPdcaActionInputSchema.safeParse({
          ...validAddInput,
          sequenceOrder: 0,
        });
        expect(result.success).toBe(true);
      });

      it('should coerce date string for dueDate', () => {
        const result = AddPdcaActionInputSchema.safeParse({
          ...validAddInput,
          dueDate: '2026-01-15T00:00:00.000Z',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.dueDate).toBeInstanceOf(Date);
        }
      });
    });

    describe('Casos Inválidos', () => {
      it('should reject empty title', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          title: '' 
        });
        expect(result.success).toBe(false);
      });

      it('should reject title longer than 255 chars', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          title: 'A'.repeat(256) 
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid phase', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          phase: 'INVALID' 
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid priority', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          priority: 'URGENT' 
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid cycleId', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          cycleId: 'not-a-uuid' 
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid assigneeId', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          assigneeId: 'not-a-uuid' 
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative sequenceOrder', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          sequenceOrder: -1 
        });
        expect(result.success).toBe(false);
      });

      it('should reject decimal sequenceOrder', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          sequenceOrder: 1.5 
        });
        expect(result.success).toBe(false);
      });

      it('should reject description longer than 2000 chars', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          description: 'A'.repeat(2001) 
        });
        expect(result.success).toBe(false);
      });

      it('should reject expectedResult longer than 2000 chars', () => {
        const result = AddPdcaActionInputSchema.safeParse({ 
          ...validAddInput, 
          expectedResult: 'A'.repeat(2001) 
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // =========================================================================
  // UPDATE PDCA ACTION
  // =========================================================================

  describe('UpdatePdcaAction', () => {
    describe('Casos Válidos', () => {
      it('should accept status update only', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'IN_PROGRESS',
        });
        expect(result.success).toBe(true);
      });

      it('should accept progress update only', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          completionPercent: 50,
        });
        expect(result.success).toBe(true);
      });

      it('should accept completion with 100%', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'COMPLETED',
          completionPercent: 100,
          actualResult: 'Fluxograma criado e validado pela equipe',
        });
        expect(result.success).toBe(true);
      });

      it('should accept COMPLETED without explicit completionPercent', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'COMPLETED',
          // completionPercent not provided
        });
        expect(result.success).toBe(true);
      });

      it('should accept BLOCKED with blockedBy', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          blockedBy: validBlockerId,
        });
        expect(result.success).toBe(true);
      });

      it('should accept BLOCKED with blockReason', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          blockReason: 'Aguardando aprovação do gerente',
        });
        expect(result.success).toBe(true);
      });

      it('should accept BLOCKED with both blockedBy and blockReason', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          blockedBy: validBlockerId,
          blockReason: 'Dependência anterior não concluída',
        });
        expect(result.success).toBe(true);
      });

      it('should accept all valid statuses', () => {
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'] as const;
        for (const status of statuses) {
          const input: Record<string, unknown> = {
            actionId: validActionId,
            status,
          };
          
          // Add required fields for specific statuses
          if (status === 'BLOCKED') {
            input.blockReason = 'Test block';
          }
          if (status === 'COMPLETED') {
            input.completionPercent = 100;
          }
          
          const result = UpdatePdcaActionInputSchema.safeParse(input);
          expect(result.success, `Status ${status} should be valid`).toBe(true);
        }
      });

      it('should accept evidence links as valid URLs', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          evidenceLinks: [
            'https://drive.google.com/file/123',
            'https://sharepoint.com/doc/456',
            'https://github.com/org/repo/issues/789',
          ],
        });
        expect(result.success).toBe(true);
      });

      it('should accept empty evidence links array', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          evidenceLinks: [],
        });
        expect(result.success).toBe(true);
      });

      it('should accept nullable fields', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          assigneeId: null,
          assigneeName: null,
          dueDate: null,
          blockedBy: null,
          blockReason: null,
        });
        expect(result.success).toBe(true);
      });

      it('should accept progress at boundaries (0 and 100)', () => {
        const result0 = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          completionPercent: 0,
        });
        expect(result0.success).toBe(true);

        const result100 = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          completionPercent: 100,
        });
        expect(result100.success).toBe(true);
      });
    });

    describe('Casos Inválidos', () => {
      it('should reject COMPLETED with less than 100%', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'COMPLETED',
          completionPercent: 80,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('completionPercent');
          expect(result.error.issues[0].message).toContain('100%');
        }
      });

      it('should reject COMPLETED with 0%', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'COMPLETED',
          completionPercent: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should reject BLOCKED without reason or dependency', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          // no blockedBy or blockReason
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('blockReason');
        }
      });

      it('should reject completion > 100%', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          completionPercent: 150,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative completion', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          completionPercent: -10,
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid evidence links', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          evidenceLinks: ['not-a-url', 'also-not-a-url'],
        });
        expect(result.success).toBe(false);
      });

      it('should reject mixed valid/invalid evidence links', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          evidenceLinks: [
            'https://valid-url.com',
            'not-a-url',
          ],
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid actionId', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: 'not-a-uuid',
          status: 'IN_PROGRESS',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing actionId', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          status: 'IN_PROGRESS',
        });
        expect(result.success).toBe(false);
      });

      it('should reject empty title', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          title: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid status', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'INVALID_STATUS',
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid priority', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          priority: 'URGENT',
        });
        expect(result.success).toBe(false);
      });

      it('should reject blockReason longer than 500 chars', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          blockReason: 'A'.repeat(501),
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid blockedBy format', () => {
        const result = UpdatePdcaActionInputSchema.safeParse({
          actionId: validActionId,
          status: 'BLOCKED',
          blockedBy: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle decimal completionPercent', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
        completionPercent: 33.33,
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in actualResult', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
        actualResult: 'Resultado: 85% de melhoria (antes: 10min → depois: 1.5min)',
      });
      expect(result.success).toBe(true);
    });

    it('should handle multiline evidenceNotes', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
        evidenceNotes: `Evidências coletadas:
1. Screenshot do dashboard
2. Relatório PDF exportado
3. Aprovação por email do gestor`,
      });
      expect(result.success).toBe(true);
    });

    it('should accept actionId only (no updates)', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
      });
      expect(result.success).toBe(true);
    });

    it('should handle IN_PROGRESS with partial completion', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
        status: 'IN_PROGRESS',
        completionPercent: 75,
      });
      expect(result.success).toBe(true);
    });

    it('should handle CANCELLED status without restrictions', () => {
      const result = UpdatePdcaActionInputSchema.safeParse({
        actionId: validActionId,
        status: 'CANCELLED',
        completionPercent: 30, // Can be cancelled at any progress
      });
      expect(result.success).toBe(true);
    });
  });
});
