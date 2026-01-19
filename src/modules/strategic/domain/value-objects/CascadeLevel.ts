/**
 * Value Object: CascadeLevel
 * Níveis de cascateamento de metas: CEO → DIRECTOR → MANAGER → TEAM
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0021
 */
import { ValueObject, Result } from '@/shared/domain';

interface CascadeLevelProps extends Record<string, unknown> {
  value: string;
  label: string;
  order: number;
}

export class CascadeLevel extends ValueObject<CascadeLevelProps> {
  static readonly CEO = new CascadeLevel({ 
    value: 'CEO', 
    label: 'CEO / Alta Direção', 
    order: 1 
  });
  
  static readonly DIRECTOR = new CascadeLevel({ 
    value: 'DIRECTOR', 
    label: 'Diretor', 
    order: 2 
  });
  
  static readonly MANAGER = new CascadeLevel({ 
    value: 'MANAGER', 
    label: 'Gerente', 
    order: 3 
  });
  
  static readonly TEAM = new CascadeLevel({ 
    value: 'TEAM', 
    label: 'Equipe', 
    order: 4 
  });

  private constructor(props: CascadeLevelProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get order(): number { return this.props.order; }

  /**
   * Verifica se pode cascatear para o nível especificado
   * (filho deve ser exatamente 1 nível abaixo do pai)
   */
  canCascadeTo(childLevel: CascadeLevel): boolean {
    return childLevel.order === this.order + 1;
  }

  /**
   * Obtém o próximo nível na hierarquia
   */
  next(): CascadeLevel | null {
    const levels = [
      CascadeLevel.CEO,
      CascadeLevel.DIRECTOR,
      CascadeLevel.MANAGER,
      CascadeLevel.TEAM,
    ];
    const currentIndex = levels.findIndex(l => l.equals(this));
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  /**
   * Obtém o nível anterior na hierarquia
   */
  previous(): CascadeLevel | null {
    const levels = [
      CascadeLevel.CEO,
      CascadeLevel.DIRECTOR,
      CascadeLevel.MANAGER,
      CascadeLevel.TEAM,
    ];
    const currentIndex = levels.findIndex(l => l.equals(this));
    return currentIndex > 0 ? levels[currentIndex - 1] : null;
  }

  static fromValue(value: string): Result<CascadeLevel, string> {
    const levels: Record<string, CascadeLevel> = {
      'CEO': CascadeLevel.CEO,
      'DIRECTOR': CascadeLevel.DIRECTOR,
      'MANAGER': CascadeLevel.MANAGER,
      'TEAM': CascadeLevel.TEAM,
    };

    const level = levels[value.toUpperCase()];
    if (!level) {
      return Result.fail(`Nível de cascateamento inválido: ${value}`);
    }

    return Result.ok(level);
  }

  static all(): CascadeLevel[] {
    return [
      CascadeLevel.CEO,
      CascadeLevel.DIRECTOR,
      CascadeLevel.MANAGER,
      CascadeLevel.TEAM,
    ];
  }

  toString(): string {
    return this.label;
  }
}
