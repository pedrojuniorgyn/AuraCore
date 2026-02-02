/**
 * Entity: ApprovalHistory
 * Representa o histórico de ações de aprovação
 *
 * @module strategic/domain/entities
 * @see ADR-0020
 */
import { Entity, Result } from '@/shared/domain';

export type ApprovalAction =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'DELEGATED';

interface ApprovalHistoryProps {
  organizationId: number;
  branchId: number;
  strategyId: string;
  action: ApprovalAction;
  fromStatus: string;
  toStatus: string;
  actorUserId: number;
  comments: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface CreateApprovalHistoryProps {
  organizationId: number;
  branchId: number;
  strategyId: string;
  action: ApprovalAction;
  fromStatus: string;
  toStatus: string;
  actorUserId: number;
  comments?: string;
  createdBy?: string;
}

export class ApprovalHistory extends Entity<string> {
  private readonly props: ApprovalHistoryProps;

  private constructor(id: string, props: ApprovalHistoryProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get strategyId(): string { return this.props.strategyId; }
  get action(): ApprovalAction { return this.props.action; }
  get fromStatus(): string { return this.props.fromStatus; }
  get toStatus(): string { return this.props.toStatus; }
  get actorUserId(): number { return this.props.actorUserId; }
  get comments(): string | null { return this.props.comments; }
  get createdBy(): string { return this.props.createdBy; }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateApprovalHistoryProps): Result<ApprovalHistory, string> {
    // Validações
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.strategyId?.trim()) return Result.fail('strategyId é obrigatório');
    if (!props.action) return Result.fail('action é obrigatório');
    if (!props.fromStatus) return Result.fail('fromStatus é obrigatório');
    if (!props.toStatus) return Result.fail('toStatus é obrigatório');
    if (!props.actorUserId) return Result.fail('actorUserId é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const history = new ApprovalHistory(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      strategyId: props.strategyId,
      action: props.action,
      fromStatus: props.fromStatus,
      toStatus: props.toStatus,
      actorUserId: props.actorUserId,
      comments: props.comments?.trim() || null,
      createdBy: props.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(history);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: ApprovalHistoryProps & { id: string }): Result<ApprovalHistory, string> {
    return Result.ok(new ApprovalHistory(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      strategyId: props.strategyId,
      action: props.action,
      fromStatus: props.fromStatus,
      toStatus: props.toStatus,
      actorUserId: props.actorUserId,
      comments: props.comments,
      createdBy: props.createdBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }
}
