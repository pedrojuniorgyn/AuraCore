/**
 * VehicleStatus - Value Object para status de veículo
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_STATUSES = ['AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE'] as const;
export type VehicleStatusType = typeof VALID_STATUSES[number];

interface VehicleStatusProps extends Record<string, unknown> {
  value: VehicleStatusType;
}

export class VehicleStatus extends ValueObject<VehicleStatusProps> {
  private constructor(props: VehicleStatusProps) {
    super(props);
  }

  get value(): VehicleStatusType { return this.props.value; }

  get isAvailable(): boolean { return this.props.value === 'AVAILABLE'; }
  get isInTransit(): boolean { return this.props.value === 'IN_TRANSIT'; }
  get isMaintenance(): boolean { return this.props.value === 'MAINTENANCE'; }
  get isInactive(): boolean { return this.props.value === 'INACTIVE'; }
  get canBeAllocated(): boolean { return this.isAvailable; }

  static create(status: string): Result<VehicleStatus, string> {
    const trimmed = status.trim().toUpperCase() as VehicleStatusType;
    
    if (!VALID_STATUSES.includes(trimmed)) {
      return Result.fail(`VehicleStatus inválido: ${status}. Valores válidos: ${VALID_STATUSES.join(', ')}`);
    }

    return Result.ok(new VehicleStatus({ value: trimmed }));
  }

  static available(): VehicleStatus {
    return new VehicleStatus({ value: 'AVAILABLE' });
  }

  static inTransit(): VehicleStatus {
    return new VehicleStatus({ value: 'IN_TRANSIT' });
  }

  static maintenance(): VehicleStatus {
    return new VehicleStatus({ value: 'MAINTENANCE' });
  }

  static inactive(): VehicleStatus {
    return new VehicleStatus({ value: 'INACTIVE' });
  }

  toString(): string {
    return this.props.value;
  }
}
