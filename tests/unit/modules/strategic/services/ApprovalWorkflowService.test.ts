import { describe, it, expect } from 'vitest';
import { ApprovalWorkflowService } from '@/modules/strategic/domain/services/ApprovalWorkflowService';
import { Strategy } from '@/modules/strategic/domain/entities/Strategy';
import { WorkflowStatus } from '@/modules/strategic/domain/value-objects/WorkflowStatus';
import { Result } from '@/shared/domain';

describe('ApprovalWorkflowService', () => {
  describe('submitForApproval', () => {
    it('should submit strategy and create history entry', () => {
      const strategy = createMockStrategy({ workflowStatus: WorkflowStatus.DRAFT });

      const result = ApprovalWorkflowService.submitForApproval(strategy, 123);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.strategy.workflowStatus.value).toBe('PENDING_APPROVAL');
      expect(result.value.historyEntry.action).toBe('SUBMITTED');
      expect(result.value.historyEntry.actorUserId).toBe(123);
    });

    it('should fail if strategy not in DRAFT status', () => {
      const strategy = createMockStrategy({ workflowStatus: WorkflowStatus.APPROVED });

      const result = ApprovalWorkflowService.submitForApproval(strategy, 123);

      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toContain('Não é possível submeter');
    });

    it('should include comments in history', () => {
      const strategy = createMockStrategy({ workflowStatus: WorkflowStatus.DRAFT });

      const result = ApprovalWorkflowService.submitForApproval(
        strategy,
        123,
        'Ready for review'
      );

      expect(result.value.historyEntry.comments).toBe('Ready for review');
    });
  });

  describe('approve', () => {
    it('should approve strategy and create history', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
        submittedByUserId: 100,
      });

      const result = ApprovalWorkflowService.approve(strategy, 200);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.strategy.workflowStatus.value).toBe('APPROVED');
      expect(result.value.historyEntry.action).toBe('APPROVED');
    });

    it('should prevent self-approval', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
        submittedByUserId: 123,
      });

      const result = ApprovalWorkflowService.approve(strategy, 123); // Mesmo user

      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toContain('não pode aprovar estratégia que ele mesmo submeteu');
    });

    it('should fail if not in PENDING_APPROVAL', () => {
      const strategy = createMockStrategy({ workflowStatus: WorkflowStatus.DRAFT });

      const result = ApprovalWorkflowService.approve(strategy, 200);

      expect(Result.isOk(result)).toBe(false);
    });
  });

  describe('reject', () => {
    it('should reject strategy with reason', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
        submittedByUserId: 100,
      });

      const result = ApprovalWorkflowService.reject(
        strategy,
        200,
        'Targets unrealistic',
        'Please revise Q2 numbers'
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.strategy.workflowStatus.value).toBe('REJECTED');
      expect(result.value.strategy.rejectionReason).toBe('Targets unrealistic');
    });

    it('should require rejection reason', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
      });

      const result = ApprovalWorkflowService.reject(strategy, 200, ''); // Vazio

      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toContain('Motivo da rejeição é obrigatório');
    });

    it('should use reason as comments if no separate comments', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
      });

      const result = ApprovalWorkflowService.reject(
        strategy,
        200,
        'Reason here'
      );

      expect(result.value.historyEntry.comments).toBe('Reason here');
    });
  });

  describe('requestChanges', () => {
    it('should request changes with reason', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
      });

      const result = ApprovalWorkflowService.requestChanges(
        strategy,
        200,
        'Needs more detail on OKRs'
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.strategy.workflowStatus.value).toBe('CHANGES_REQUESTED');
    });

    it('should require reason for changes', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
      });

      const result = ApprovalWorkflowService.requestChanges(strategy, 200, '');

      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toContain('obrigatório');
    });
  });

  describe('canUserPerformAction', () => {
    it('should allow SUBMITTED action for DRAFT strategy', () => {
      const strategy = createMockStrategy({ workflowStatus: WorkflowStatus.DRAFT });

      const result = ApprovalWorkflowService.canUserPerformAction(
        strategy,
        123,
        'SUBMITTED'
      );

      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should prevent approval by submitter', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
        submittedByUserId: 123,
      });

      const result = ApprovalWorkflowService.canUserPerformAction(
        strategy,
        123,
        'APPROVED'
      );

      expect(result.value).toBe(false);
    });

    it('should allow approval by different user', () => {
      const strategy = createMockStrategy({
        workflowStatus: WorkflowStatus.PENDING_APPROVAL,
        submittedByUserId: 100,
      });

      const result = ApprovalWorkflowService.canUserPerformAction(
        strategy,
        200,
        'APPROVED'
      );

      expect(result.value).toBe(true);
    });
  });
});

// Helper
function createMockStrategy(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  const strategyResult = Strategy.create({
    organizationId: 1,
    branchId: 1,
    name: 'Test Strategy',
    startDate: now,
    endDate: new Date(now.getFullYear() + 1, 11, 31),
    createdBy: 'test',
    ...overrides,
  });

  if (!Result.isOk(strategyResult)) {
    throw new Error('Failed to create mock strategy');
  }

  return strategyResult.value;
}
