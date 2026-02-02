/**
 * Domain Service: ApprovalWorkflowService
 * Orquestra o workflow de aprovação de estratégias (100% stateless)
 *
 * Referência: Evans (2003) - Domain Services são stateless
 *
 * @module strategic/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */
import { Result } from '@/shared/domain';
import { Strategy } from '../entities/Strategy';
import { ApprovalHistory, ApprovalAction } from '../entities/ApprovalHistory';
import { WorkflowStatus } from '../value-objects/WorkflowStatus';

export interface WorkflowTransitionResult {
  strategy: Strategy;
  historyEntry: ApprovalHistory;
}

export class ApprovalWorkflowService {
  private constructor() {} // Impede instanciação (DOMAIN-SVC-002)

  /**
   * Submete estratégia para aprovação
   * DRAFT → PENDING_APPROVAL
   */
  static submitForApproval(
    strategy: Strategy,
    userId: number,
    comments?: string
  ): Result<WorkflowTransitionResult, string> {
    // Validar que usuário pode submeter (não pode aprovar própria submissão)
    if (strategy.createdBy === userId.toString()) {
      // Esta é apenas uma validação de exemplo - pode ser removida ou ajustada conforme regra de negócio
      // return Result.fail('Usuário não pode submeter própria estratégia para aprovação');
    }

    // Executar transição na entidade
    const submitResult = strategy.submitForApproval(userId);
    if (!Result.isOk(submitResult)) {
      return Result.fail(submitResult.error);
    }

    // Criar entrada de histórico
    const historyResult = ApprovalHistory.create({
      organizationId: strategy.organizationId,
      branchId: strategy.branchId,
      strategyId: strategy.id,
      action: 'SUBMITTED',
      fromStatus: WorkflowStatus.DRAFT.value,
      toStatus: WorkflowStatus.PENDING_APPROVAL.value,
      actorUserId: userId,
      comments,
      createdBy: userId.toString(),
    });

    if (!Result.isOk(historyResult)) {
      return Result.fail(historyResult.error);
    }

    return Result.ok({
      strategy,
      historyEntry: historyResult.value,
    });
  }

  /**
   * Aprova estratégia
   * PENDING_APPROVAL → APPROVED
   */
  static approve(
    strategy: Strategy,
    userId: number,
    comments?: string
  ): Result<WorkflowTransitionResult, string> {
    // Validar que aprovador não é o mesmo que submeteu
    if (strategy.submittedByUserId === userId) {
      return Result.fail('Usuário não pode aprovar estratégia que ele mesmo submeteu');
    }

    const previousStatus = strategy.workflowStatus.value;

    // Executar transição na entidade
    const approveResult = strategy.approve(userId);
    if (!Result.isOk(approveResult)) {
      return Result.fail(approveResult.error);
    }

    // Criar entrada de histórico
    const historyResult = ApprovalHistory.create({
      organizationId: strategy.organizationId,
      branchId: strategy.branchId,
      strategyId: strategy.id,
      action: 'APPROVED',
      fromStatus: previousStatus,
      toStatus: WorkflowStatus.APPROVED.value,
      actorUserId: userId,
      comments,
      createdBy: userId.toString(),
    });

    if (!Result.isOk(historyResult)) {
      return Result.fail(historyResult.error);
    }

    return Result.ok({
      strategy,
      historyEntry: historyResult.value,
    });
  }

  /**
   * Rejeita estratégia
   * PENDING_APPROVAL → REJECTED
   */
  static reject(
    strategy: Strategy,
    userId: number,
    reason: string,
    comments?: string
  ): Result<WorkflowTransitionResult, string> {
    if (!reason?.trim()) {
      return Result.fail('Motivo da rejeição é obrigatório');
    }

    const previousStatus = strategy.workflowStatus.value;

    // Executar transição na entidade
    const rejectResult = strategy.reject(userId, reason);
    if (!Result.isOk(rejectResult)) {
      return Result.fail(rejectResult.error);
    }

    // Criar entrada de histórico
    const historyResult = ApprovalHistory.create({
      organizationId: strategy.organizationId,
      branchId: strategy.branchId,
      strategyId: strategy.id,
      action: 'REJECTED',
      fromStatus: previousStatus,
      toStatus: WorkflowStatus.REJECTED.value,
      actorUserId: userId,
      comments: comments || reason,
      createdBy: userId.toString(),
    });

    if (!Result.isOk(historyResult)) {
      return Result.fail(historyResult.error);
    }

    return Result.ok({
      strategy,
      historyEntry: historyResult.value,
    });
  }

  /**
   * Solicita alterações na estratégia
   * PENDING_APPROVAL → CHANGES_REQUESTED
   */
  static requestChanges(
    strategy: Strategy,
    userId: number,
    reason: string,
    comments?: string
  ): Result<WorkflowTransitionResult, string> {
    if (!reason?.trim()) {
      return Result.fail('Motivo para solicitação de alterações é obrigatório');
    }

    const previousStatus = strategy.workflowStatus.value;

    // Executar transição na entidade
    const requestResult = strategy.requestChanges(userId, reason);
    if (!Result.isOk(requestResult)) {
      return Result.fail(requestResult.error);
    }

    // Criar entrada de histórico
    const historyResult = ApprovalHistory.create({
      organizationId: strategy.organizationId,
      branchId: strategy.branchId,
      strategyId: strategy.id,
      action: 'CHANGES_REQUESTED',
      fromStatus: previousStatus,
      toStatus: WorkflowStatus.CHANGES_REQUESTED.value,
      actorUserId: userId,
      comments: comments || reason,
      createdBy: userId.toString(),
    });

    if (!Result.isOk(historyResult)) {
      return Result.fail(historyResult.error);
    }

    return Result.ok({
      strategy,
      historyEntry: historyResult.value,
    });
  }

  /**
   * Valida se usuário pode executar ação de workflow
   */
  static canUserPerformAction(
    strategy: Strategy,
    userId: number,
    action: ApprovalAction
  ): Result<boolean, string> {
    switch (action) {
      case 'SUBMITTED':
        // Qualquer usuário pode submeter (exceto se já foi submetida)
        return Result.ok(strategy.workflowStatus.value === 'DRAFT');

      case 'APPROVED':
      case 'REJECTED':
      case 'CHANGES_REQUESTED':
        // Não pode aprovar/rejeitar própria submissão
        if (strategy.submittedByUserId === userId) {
          return Result.ok(false);
        }
        return Result.ok(strategy.workflowStatus.value === 'PENDING_APPROVAL');

      case 'DELEGATED':
        // Lógica de delegação pode ser implementada futuramente
        return Result.ok(true);

      default:
        return Result.fail(`Ação desconhecida: ${action}`);
    }
  }
}
