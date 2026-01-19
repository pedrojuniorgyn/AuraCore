/**
 * DriverStatus - Value Object para status de motorista
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['ACTIVE', 'VACATION', 'BLOCKED', 'INACTIVE'] as const;
export type DriverStatusType = typeof VALID_STATUSES[number];

interface DriverStatusProps extends Record<string, unknown> {
  value: DriverStatusType;
}

export class DriverStatus extends ValueObject<DriverStatusProps> {
  private constructor(props: DriverStatusProps) {
    super(props);
  }

  get value(): DriverStatusType { return this.props.value; }

  get isActive(): boolean { return this.props.value === 'ACTIVE'; }
  get isVacation(): boolean { return this.props.value === 'VACATION'; }
  get isBlocked(): boolean { return this.props.value === 'BLOCKED'; }
  get isInactive(): boolean { return this.props.value === 'INACTIVE'; }
  get canDrive(): boolean { return this.isActive; }

  static create(status: string): Result<DriverStatus, string> {
    const trimmed = status.trim().toUpperCase() as DriverStatusType;
    
    if (!VALID_STATUSES.includes(trimmed)) {
      return Result.fail(`DriverStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new DriverStatus({ value: trimmed }));
  }

  static active(): DriverStatus {
    return new DriverStatus({ value: 'ACTIVE' });
  }

  static vacation(): DriverStatus {
    return new DriverStatus({ value: 'VACATION' });
  }

  static blocked(): DriverStatus {
    return new DriverStatus({ value: 'BLOCKED' });
  }

  static inactive(): DriverStatus {
    return new DriverStatus({ value: 'INACTIVE' });
  }

  toString(): string {
    return this.props.value;
  }
}
