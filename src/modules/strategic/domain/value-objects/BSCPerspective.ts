/**
 * Value Object: BSCPerspective
 * As 4 perspectivas do Balanced Scorecard (Kaplan & Norton)
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0021
 */
import { ValueObject, Result } from '@/shared/domain';

interface BSCPerspectiveProps extends Record<string, unknown> {
  code: string;
  name: string;
  color: string;
  order: number;
}

export class BSCPerspective extends ValueObject<BSCPerspectiveProps> {
  // Instâncias pré-definidas (imutáveis)
  static readonly FINANCIAL = new BSCPerspective({ 
    code: 'FIN', 
    name: 'Financeira', 
    color: '#fbbf24', 
    order: 1 
  });
  
  static readonly CUSTOMER = new BSCPerspective({ 
    code: 'CLI', 
    name: 'Clientes', 
    color: '#3b82f6', 
    order: 2 
  });
  
  static readonly INTERNAL = new BSCPerspective({ 
    code: 'INT', 
    name: 'Processos Internos', 
    color: '#22c55e', 
    order: 3 
  });
  
  static readonly LEARNING = new BSCPerspective({ 
    code: 'LRN', 
    name: 'Aprendizado e Crescimento', 
    color: '#a855f7', 
    order: 4 
  });

  private constructor(props: BSCPerspectiveProps) {
    super(props);
    Object.freeze(this);
  }

  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get color(): string { return this.props.color; }
  get order(): number { return this.props.order; }

  /**
   * Cria uma perspectiva customizada
   */
  static create(
    code: string, 
    name: string, 
    color: string, 
    order: number
  ): Result<BSCPerspective, string> {
    if (!code?.trim()) return Result.fail('code é obrigatório');
    if (!name?.trim()) return Result.fail('name é obrigatório');
    if (!color?.trim()) return Result.fail('color é obrigatório');
    if (order < 1 || order > 4) return Result.fail('order deve ser entre 1 e 4');

    return Result.ok(new BSCPerspective({ 
      code: code.toUpperCase(), 
      name, 
      color, 
      order 
    }));
  }

  /**
   * Obtém perspectiva pelo código
   */
  static fromCode(code: string): Result<BSCPerspective, string> {
    const perspectives: Record<string, BSCPerspective> = {
      'FIN': BSCPerspective.FINANCIAL,
      'CLI': BSCPerspective.CUSTOMER,
      'INT': BSCPerspective.INTERNAL,
      'LRN': BSCPerspective.LEARNING,
    };

    const perspective = perspectives[code.toUpperCase()];
    if (!perspective) {
      return Result.fail(`Perspectiva não encontrada: ${code}`);
    }

    return Result.ok(perspective);
  }

  /**
   * Lista todas as perspectivas
   */
  static all(): BSCPerspective[] {
    return [
      BSCPerspective.FINANCIAL,
      BSCPerspective.CUSTOMER,
      BSCPerspective.INTERNAL,
      BSCPerspective.LEARNING,
    ];
  }

  toString(): string {
    return `${this.code} - ${this.name}`;
  }
}
