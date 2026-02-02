import { describe, it, expect } from 'vitest';
import { WorkflowStatus } from '@/modules/strategic/domain/value-objects/WorkflowStatus';
import { Result } from '@/shared/domain';

describe('WorkflowStatus', () => {
  describe('State Machine - Valid Transitions', () => {
    it('DRAFT can transition to PENDING_APPROVAL', () => {
      const canTransition = WorkflowStatus.DRAFT.canTransitionTo(
        WorkflowStatus.PENDING_APPROVAL
      );
      expect(canTransition).toBe(true);
    });

    it('PENDING_APPROVAL can transition to APPROVED', () => {
      expect(
        WorkflowStatus.PENDING_APPROVAL.canTransitionTo(WorkflowStatus.APPROVED)
      ).toBe(true);
    });

    it('PENDING_APPROVAL can transition to REJECTED', () => {
      expect(
        WorkflowStatus.PENDING_APPROVAL.canTransitionTo(WorkflowStatus.REJECTED)
      ).toBe(true);
    });

    it('PENDING_APPROVAL can transition to CHANGES_REQUESTED', () => {
      expect(
        WorkflowStatus.PENDING_APPROVAL.canTransitionTo(WorkflowStatus.CHANGES_REQUESTED)
      ).toBe(true);
    });

    it('CHANGES_REQUESTED can transition to PENDING_APPROVAL', () => {
      expect(
        WorkflowStatus.CHANGES_REQUESTED.canTransitionTo(WorkflowStatus.PENDING_APPROVAL)
      ).toBe(true);
    });
  });

  describe('State Machine - Invalid Transitions (Terminal States)', () => {
    it('APPROVED cannot transition (terminal)', () => {
      expect(
        WorkflowStatus.APPROVED.canTransitionTo(WorkflowStatus.DRAFT)
      ).toBe(false);
      expect(
        WorkflowStatus.APPROVED.canTransitionTo(WorkflowStatus.PENDING_APPROVAL)
      ).toBe(false);
    });

    it('REJECTED cannot transition (terminal)', () => {
      expect(
        WorkflowStatus.REJECTED.canTransitionTo(WorkflowStatus.DRAFT)
      ).toBe(false);
      expect(
        WorkflowStatus.REJECTED.canTransitionTo(WorkflowStatus.APPROVED)
      ).toBe(false);
    });

    it('DRAFT cannot transition to APPROVED (skip PENDING_APPROVAL)', () => {
      expect(
        WorkflowStatus.DRAFT.canTransitionTo(WorkflowStatus.APPROVED)
      ).toBe(false);
    });
  });

  describe('fromValue - Factory', () => {
    it('should create DRAFT from string', () => {
      const result = WorkflowStatus.fromValue('DRAFT');
      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(WorkflowStatus.DRAFT);
    });

    it('should create PENDING_APPROVAL from string', () => {
      const result = WorkflowStatus.fromValue('PENDING_APPROVAL');
      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(WorkflowStatus.PENDING_APPROVAL);
    });

    it('should fail for invalid status', () => {
      const result = WorkflowStatus.fromValue('INVALID_STATUS');
      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toContain('inválido');
    });

    it('should be case-insensitive', () => {
      const result = WorkflowStatus.fromValue('draft');
      expect(Result.isOk(result)).toBe(true);
      expect(result.value).toBe(WorkflowStatus.DRAFT);
    });
  });

  describe('Properties', () => {
    it('should have correct isTerminal flags', () => {
      expect(WorkflowStatus.DRAFT.isTerminal).toBe(false);
      expect(WorkflowStatus.PENDING_APPROVAL.isTerminal).toBe(false);
      expect(WorkflowStatus.CHANGES_REQUESTED.isTerminal).toBe(false);
      expect(WorkflowStatus.APPROVED.isTerminal).toBe(true);
      expect(WorkflowStatus.REJECTED.isTerminal).toBe(true);
    });

    it('should have correct colors', () => {
      expect(WorkflowStatus.DRAFT.color).toBe('gray');
      expect(WorkflowStatus.PENDING_APPROVAL.color).toBe('yellow');
      expect(WorkflowStatus.APPROVED.color).toBe('green');
      expect(WorkflowStatus.REJECTED.color).toBe('red');
      expect(WorkflowStatus.CHANGES_REQUESTED.color).toBe('orange');
    });
  });
});
