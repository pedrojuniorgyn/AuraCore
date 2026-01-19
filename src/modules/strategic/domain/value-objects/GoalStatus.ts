/**
 * Value Object: GoalStatus
 * Status de metas estratégicas
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0021
 */
import { ValueObject, Result } from '@/shared/domain';

interface GoalStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  color: string;
  isTerminal: boolean;
}

export class GoalStatus extends ValueObject<GoalStatusProps> {
  static readonly NOT_STARTED = new GoalStatus({ 
    value: 'NOT_STARTED', 
    label: 'Não Iniciada', 
    color: 'gray',
    isTerminal: false,
  });
  
  static readonly IN_PROGRESS = new GoalStatus({ 
    value: 'IN_PROGRESS', 
    label: 'Em Andamento', 
    color: 'blue',
    isTerminal: false,
  });
  
  static readonly ON_TRACK = new GoalStatus({ 
    value: 'ON_TRACK', 
    label: 'No Prazo', 
    color: 'green',
    isTerminal: false,
  });
  
  static readonly AT_RISK = new GoalStatus({ 
    value: 'AT_RISK', 
    label: 'Em Risco', 
    color: 'yellow',
    isTerminal: false,
  });
  
  static readonly DELAYED = new GoalStatus({ 
    value: 'DELAYED', 
    label: 'Atrasada', 
    color: 'red',
    isTerminal: false,
  });
  
  static readonly ACHIEVED = new GoalStatus({ 
    value: 'ACHIEVED', 
    label: 'Atingida', 
    color: 'emerald',
    isTerminal: true,
  });
  
  static readonly CANCELLED = new GoalStatus({ 
    value: 'CANCELLED', 
    label: 'Cancelada', 
    color: 'slate',
    isTerminal: true,
  });

  private constructor(props: GoalStatusProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get color(): string { return this.props.color; }
  get isTerminal(): boolean { return this.props.isTerminal; }

  /**
   * Verifica se pode transicionar para o status alvo
   */
  canTransitionTo(target: GoalStatus): boolean {
    // Status terminal não pode transicionar
    if (this.isTerminal) return false;
    
    // Transições válidas
    const validTransitions: Record<string, string[]> = {
      'NOT_STARTED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['ON_TRACK', 'AT_RISK', 'DELAYED', 'ACHIEVED', 'CANCELLED'],
      'ON_TRACK': ['IN_PROGRESS', 'AT_RISK', 'DELAYED', 'ACHIEVED', 'CANCELLED'],
      'AT_RISK': ['IN_PROGRESS', 'ON_TRACK', 'DELAYED', 'ACHIEVED', 'CANCELLED'],
      'DELAYED': ['IN_PROGRESS', 'ON_TRACK', 'AT_RISK', 'ACHIEVED', 'CANCELLED'],
    };
    
    return validTransitions[this.value]?.includes(target.value) ?? false;
  }

  static fromValue(value: string): Result<GoalStatus, string> {
    const statuses: Record<string, GoalStatus> = {
      'NOT_STARTED': GoalStatus.NOT_STARTED,
      'IN_PROGRESS': GoalStatus.IN_PROGRESS,
      'ON_TRACK': GoalStatus.ON_TRACK,
      'AT_RISK': GoalStatus.AT_RISK,
      'DELAYED': GoalStatus.DELAYED,
      'ACHIEVED': GoalStatus.ACHIEVED,
      'CANCELLED': GoalStatus.CANCELLED,
    };

    const status = statuses[value.toUpperCase()];
    if (!status) {
      return Result.fail(`Status de meta inválido: ${value}`);
    }

    return Result.ok(status);
  }

  static all(): GoalStatus[] {
    return [
      GoalStatus.NOT_STARTED,
      GoalStatus.IN_PROGRESS,
      GoalStatus.ON_TRACK,
      GoalStatus.AT_RISK,
      GoalStatus.DELAYED,
      GoalStatus.ACHIEVED,
      GoalStatus.CANCELLED,
    ];
  }

  toString(): string {
    return this.label;
  }
}
