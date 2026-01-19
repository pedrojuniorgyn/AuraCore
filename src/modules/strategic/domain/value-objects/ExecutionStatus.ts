/**
 * Value Object: ExecutionStatus
 * Status de execução para Follow-up 3G (Falconi)
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0022
 */
import { ValueObject, Result } from '@/shared/domain';

interface ExecutionStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  requiresFollowUp: boolean;
  requiresEscalation: boolean;
}

export class ExecutionStatus extends ValueObject<ExecutionStatusProps> {
  static readonly EXECUTED_OK = new ExecutionStatus({ 
    value: 'EXECUTED_OK', 
    label: 'Executado OK', 
    requiresFollowUp: false,
    requiresEscalation: false,
  });
  
  static readonly EXECUTED_PARTIAL = new ExecutionStatus({ 
    value: 'EXECUTED_PARTIAL', 
    label: 'Executado Parcialmente', 
    requiresFollowUp: true,
    requiresEscalation: false,
  });
  
  static readonly NOT_EXECUTED = new ExecutionStatus({ 
    value: 'NOT_EXECUTED', 
    label: 'Não Executado', 
    requiresFollowUp: true,
    requiresEscalation: false,
  });
  
  static readonly BLOCKED = new ExecutionStatus({ 
    value: 'BLOCKED', 
    label: 'Bloqueado', 
    requiresFollowUp: true,
    requiresEscalation: true,
  });

  private constructor(props: ExecutionStatusProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get requiresFollowUp(): boolean { return this.props.requiresFollowUp; }
  get requiresEscalation(): boolean { return this.props.requiresEscalation; }

  /**
   * Verifica se a execução foi bem-sucedida
   */
  get isSuccess(): boolean {
    return this.value === 'EXECUTED_OK';
  }

  /**
   * Verifica se requer reproposição
   */
  get requiresReproposition(): boolean {
    return this.value === 'NOT_EXECUTED' || this.value === 'BLOCKED';
  }

  static fromValue(value: string): Result<ExecutionStatus, string> {
    const statuses: Record<string, ExecutionStatus> = {
      'EXECUTED_OK': ExecutionStatus.EXECUTED_OK,
      'EXECUTED_PARTIAL': ExecutionStatus.EXECUTED_PARTIAL,
      'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
      'BLOCKED': ExecutionStatus.BLOCKED,
    };

    const status = statuses[value.toUpperCase()];
    if (!status) {
      return Result.fail(`Status de execução inválido: ${value}`);
    }

    return Result.ok(status);
  }

  static all(): ExecutionStatus[] {
    return [
      ExecutionStatus.EXECUTED_OK,
      ExecutionStatus.EXECUTED_PARTIAL,
      ExecutionStatus.NOT_EXECUTED,
      ExecutionStatus.BLOCKED,
    ];
  }

  toString(): string {
    return this.label;
  }
}
