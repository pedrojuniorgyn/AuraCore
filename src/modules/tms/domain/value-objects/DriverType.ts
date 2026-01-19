/**
 * DriverType - Value Object para tipo de motorista
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_TYPES = ['OWN', 'THIRD_PARTY', 'AGGREGATE'] as const;
export type DriverTypeValue = typeof VALID_TYPES[number];

interface DriverTypeProps extends Record<string, unknown> {
  value: DriverTypeValue;
}

export class DriverType extends ValueObject<DriverTypeProps> {
  private constructor(props: DriverTypeProps) {
    super(props);
  }

  get value(): DriverTypeValue { return this.props.value; }

  get isOwn(): boolean { return this.props.value === 'OWN'; }
  get isThirdParty(): boolean { return this.props.value === 'THIRD_PARTY'; }
  get isAggregate(): boolean { return this.props.value === 'AGGREGATE'; }
  get requiresCiot(): boolean { return this.isThirdParty || this.isAggregate; }

  static create(type: string): Result<DriverType, string> {
    const trimmed = type.trim().toUpperCase() as DriverTypeValue;
    
    if (!VALID_TYPES.includes(trimmed)) {
      return Result.fail(`DriverType inválido: ${type}. Valores válidos: ${VALID_TYPES.join(', ')}`);
    }

    return Result.ok(new DriverType({ value: trimmed }));
  }

  static own(): DriverType {
    return new DriverType({ value: 'OWN' });
  }

  static thirdParty(): DriverType {
    return new DriverType({ value: 'THIRD_PARTY' });
  }

  static aggregate(): DriverType {
    return new DriverType({ value: 'AGGREGATE' });
  }

  toString(): string {
    return this.props.value;
  }
}
