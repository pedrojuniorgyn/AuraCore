/**
 * TripStatus - Value Object para status de viagem
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['DRAFT', 'ALLOCATED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatusType = typeof VALID_STATUSES[number];

interface TripStatusProps extends Record<string, unknown> {
  value: TripStatusType;
}

export class TripStatus extends ValueObject<TripStatusProps> {
  private constructor(props: TripStatusProps) {
    super(props);
  }

  get value(): TripStatusType { return this.props.value; }

  get isDraft(): boolean { return this.props.value === 'DRAFT'; }
  get isAllocated(): boolean { return this.props.value === 'ALLOCATED'; }
  get isInTransit(): boolean { return this.props.value === 'IN_TRANSIT'; }
  get isCompleted(): boolean { return this.props.value === 'COMPLETED'; }
  get isCancelled(): boolean { return this.props.value === 'CANCELLED'; }
  get isTerminal(): boolean { return this.isCompleted || this.isCancelled; }

  static create(status: string): Result<TripStatus, string> {
    const trimmed = status.trim().toUpperCase() as TripStatusType;
    
    if (!VALID_STATUSES.includes(trimmed)) {
      return Result.fail(`TripStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new TripStatus({ value: trimmed }));
  }

  static draft(): TripStatus {
    return new TripStatus({ value: 'DRAFT' });
  }

  static allocated(): TripStatus {
    return new TripStatus({ value: 'ALLOCATED' });
  }

  static inTransit(): TripStatus {
    return new TripStatus({ value: 'IN_TRANSIT' });
  }

  static completed(): TripStatus {
    return new TripStatus({ value: 'COMPLETED' });
  }

  static cancelled(): TripStatus {
    return new TripStatus({ value: 'CANCELLED' });
  }

  /**
   * Verifica se pode transicionar para outro status
   */
  canTransitionTo(target: TripStatusType): boolean {
    const transitions: Record<TripStatusType, TripStatusType[]> = {
      'DRAFT': ['ALLOCATED', 'CANCELLED'],
      'ALLOCATED': ['IN_TRANSIT', 'CANCELLED', 'DRAFT'],
      'IN_TRANSIT': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': [],
    };

    return transitions[this.props.value].includes(target);
  }

  toString(): string {
    return this.props.value;
  }
}
