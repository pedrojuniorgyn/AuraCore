/**
 * Value Object: WorkflowStatus
 * Status de workflow de aprovação de estratégias
 *
 * @module strategic/domain/value-objects
 * @see ADR-0021
 */
import { ValueObject, Result } from '@/shared/domain';

interface WorkflowStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  color: string;
  isTerminal: boolean;
}

export class WorkflowStatus extends ValueObject<WorkflowStatusProps> {
  static readonly DRAFT = new WorkflowStatus({
    value: 'DRAFT',
    label: 'Rascunho',
    color: 'gray',
    isTerminal: false,
  });

  static readonly PENDING_APPROVAL = new WorkflowStatus({
    value: 'PENDING_APPROVAL',
    label: 'Aguardando Aprovação',
    color: 'yellow',
    isTerminal: false,
  });

  static readonly APPROVED = new WorkflowStatus({
    value: 'APPROVED',
    label: 'Aprovado',
    color: 'green',
    isTerminal: true,
  });

  static readonly REJECTED = new WorkflowStatus({
    value: 'REJECTED',
    label: 'Rejeitado',
    color: 'red',
    isTerminal: true,
  });

  static readonly CHANGES_REQUESTED = new WorkflowStatus({
    value: 'CHANGES_REQUESTED',
    label: 'Alterações Solicitadas',
    color: 'orange',
    isTerminal: false,
  });

  private constructor(props: WorkflowStatusProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get color(): string { return this.props.color; }
  get isTerminal(): boolean { return this.props.isTerminal; }

  /**
   * Verifica se pode transicionar para o status alvo
   *
   * Máquina de estados:
   * - DRAFT → PENDING_APPROVAL
   * - PENDING_APPROVAL → APPROVED | REJECTED | CHANGES_REQUESTED
   * - CHANGES_REQUESTED → PENDING_APPROVAL
   * - APPROVED/REJECTED são estados terminais (não podem transicionar)
   */
  canTransitionTo(target: WorkflowStatus): boolean {
    // Status terminal não pode transicionar
    if (this.isTerminal) return false;

    // Transições válidas
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['PENDING_APPROVAL'],
      'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'],
      'CHANGES_REQUESTED': ['PENDING_APPROVAL'],
    };

    return validTransitions[this.value]?.includes(target.value) ?? false;
  }

  static fromValue(value: string): Result<WorkflowStatus, string> {
    const statuses: Record<string, WorkflowStatus> = {
      'DRAFT': WorkflowStatus.DRAFT,
      'PENDING_APPROVAL': WorkflowStatus.PENDING_APPROVAL,
      'APPROVED': WorkflowStatus.APPROVED,
      'REJECTED': WorkflowStatus.REJECTED,
      'CHANGES_REQUESTED': WorkflowStatus.CHANGES_REQUESTED,
    };

    const status = statuses[value.toUpperCase()];
    if (!status) {
      return Result.fail(`Status de workflow inválido: ${value}`);
    }

    return Result.ok(status);
  }

  static all(): WorkflowStatus[] {
    return [
      WorkflowStatus.DRAFT,
      WorkflowStatus.PENDING_APPROVAL,
      WorkflowStatus.APPROVED,
      WorkflowStatus.REJECTED,
      WorkflowStatus.CHANGES_REQUESTED,
    ];
  }

  toString(): string {
    return this.label;
  }
}
