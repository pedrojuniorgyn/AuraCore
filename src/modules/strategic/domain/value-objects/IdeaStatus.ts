/**
 * Value Object: IdeaStatus
 * Status de ideias no Banco de Ideias
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0020
 */
import { ValueObject, Result } from '@/shared/domain';

interface IdeaStatusProps extends Record<string, unknown> {
  value: string;
  label: string;
  isTerminal: boolean;
}

export class IdeaStatus extends ValueObject<IdeaStatusProps> {
  static readonly SUBMITTED = new IdeaStatus({ 
    value: 'SUBMITTED', 
    label: 'Submetida', 
    isTerminal: false,
  });
  
  static readonly UNDER_REVIEW = new IdeaStatus({ 
    value: 'UNDER_REVIEW', 
    label: 'Em Análise', 
    isTerminal: false,
  });
  
  static readonly APPROVED = new IdeaStatus({ 
    value: 'APPROVED', 
    label: 'Aprovada', 
    isTerminal: false,
  });
  
  static readonly REJECTED = new IdeaStatus({ 
    value: 'REJECTED', 
    label: 'Rejeitada', 
    isTerminal: true,
  });
  
  static readonly CONVERTED = new IdeaStatus({ 
    value: 'CONVERTED', 
    label: 'Convertida', 
    isTerminal: true,
  });
  
  static readonly ARCHIVED = new IdeaStatus({ 
    value: 'ARCHIVED', 
    label: 'Arquivada', 
    isTerminal: true,
  });

  private constructor(props: IdeaStatusProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get isTerminal(): boolean { return this.props.isTerminal; }

  canTransitionTo(target: IdeaStatus): boolean {
    if (this.isTerminal) return false;
    
    const validTransitions: Record<string, string[]> = {
      'SUBMITTED': ['UNDER_REVIEW', 'ARCHIVED'],
      'UNDER_REVIEW': ['APPROVED', 'REJECTED', 'ARCHIVED'],
      'APPROVED': ['CONVERTED', 'ARCHIVED'],
    };
    
    return validTransitions[this.value]?.includes(target.value) ?? false;
  }

  static fromValue(value: string): Result<IdeaStatus, string> {
    const statuses: Record<string, IdeaStatus> = {
      'SUBMITTED': IdeaStatus.SUBMITTED,
      'UNDER_REVIEW': IdeaStatus.UNDER_REVIEW,
      'APPROVED': IdeaStatus.APPROVED,
      'REJECTED': IdeaStatus.REJECTED,
      'CONVERTED': IdeaStatus.CONVERTED,
      'ARCHIVED': IdeaStatus.ARCHIVED,
    };

    const status = statuses[value.toUpperCase()];
    if (!status) {
      return Result.fail(`Status de ideia inválido: ${value}`);
    }

    return Result.ok(status);
  }

  static all(): IdeaStatus[] {
    return [
      IdeaStatus.SUBMITTED,
      IdeaStatus.UNDER_REVIEW,
      IdeaStatus.APPROVED,
      IdeaStatus.REJECTED,
      IdeaStatus.CONVERTED,
      IdeaStatus.ARCHIVED,
    ];
  }

  toString(): string {
    return this.label;
  }
}
