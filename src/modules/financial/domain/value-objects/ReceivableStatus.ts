/**
 * ReceivableStatus - Value Object para status de conta a receber
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['OPEN', 'PROCESSING', 'PARTIAL', 'RECEIVED', 'CANCELLED', 'OVERDUE'] as const;
export type ReceivableStatusType = typeof VALID_STATUSES[number];

interface ReceivableStatusProps extends Record<string, unknown> {
  value: ReceivableStatusType;
}

export class ReceivableStatus extends ValueObject<ReceivableStatusProps> {
  private constructor(props: ReceivableStatusProps) {
    super(props);
  }

  get value(): ReceivableStatusType { return this.props.value; }

  get isOpen(): boolean { return this.props.value === 'OPEN'; }
  get isProcessing(): boolean { return this.props.value === 'PROCESSING'; }
  get isPartial(): boolean { return this.props.value === 'PARTIAL'; }
  get isReceived(): boolean { return this.props.value === 'RECEIVED'; }
  get isCancelled(): boolean { return this.props.value === 'CANCELLED'; }
  get isOverdue(): boolean { return this.props.value === 'OVERDUE'; }
  get isTerminal(): boolean { return this.isReceived || this.isCancelled; }
  get canReceivePayment(): boolean { return this.isOpen || this.isPartial || this.isOverdue; }

  static create(status: string): Result<ReceivableStatus, string> {
    const normalized = status.trim().toUpperCase() as ReceivableStatusType;
    
    if (!VALID_STATUSES.includes(normalized)) {
      return Result.fail(`ReceivableStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new ReceivableStatus({ value: normalized }));
  }

  static open(): ReceivableStatus {
    return new ReceivableStatus({ value: 'OPEN' });
  }

  static processing(): ReceivableStatus {
    return new ReceivableStatus({ value: 'PROCESSING' });
  }

  static partial(): ReceivableStatus {
    return new ReceivableStatus({ value: 'PARTIAL' });
  }

  static received(): ReceivableStatus {
    return new ReceivableStatus({ value: 'RECEIVED' });
  }

  static cancelled(): ReceivableStatus {
    return new ReceivableStatus({ value: 'CANCELLED' });
  }

  static overdue(): ReceivableStatus {
    return new ReceivableStatus({ value: 'OVERDUE' });
  }

  canTransitionTo(target: ReceivableStatusType): boolean {
    const transitions: Record<ReceivableStatusType, ReceivableStatusType[]> = {
      'OPEN': ['PROCESSING', 'PARTIAL', 'RECEIVED', 'CANCELLED', 'OVERDUE'],
      'PROCESSING': ['OPEN', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
      'PARTIAL': ['PROCESSING', 'RECEIVED', 'CANCELLED', 'OVERDUE'],
      'RECEIVED': [],
      'CANCELLED': [],
      'OVERDUE': ['PROCESSING', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
    };

    return transitions[this.props.value].includes(target);
  }

  toString(): string {
    return this.props.value;
  }
}
