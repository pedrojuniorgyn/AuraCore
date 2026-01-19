/**
 * Value Object: PDCACycle
 * Ciclo PDCA (Plan-Do-Check-Act) de Deming
 * 
 * @module strategic/domain/value-objects
 * @see ADR-0020
 */
import { ValueObject, Result } from '@/shared/domain';

interface PDCACycleProps extends Record<string, unknown> {
  value: string;
  label: string;
  order: number;
  description: string;
}

export class PDCACycle extends ValueObject<PDCACycleProps> {
  static readonly PLAN = new PDCACycle({ 
    value: 'PLAN', 
    label: 'Planejar', 
    order: 1,
    description: 'Definir metas e métodos para atingir os objetivos',
  });
  
  static readonly DO = new PDCACycle({ 
    value: 'DO', 
    label: 'Executar', 
    order: 2,
    description: 'Executar as tarefas conforme planejado e coletar dados',
  });
  
  static readonly CHECK = new PDCACycle({ 
    value: 'CHECK', 
    label: 'Verificar', 
    order: 3,
    description: 'Comparar resultados com as metas estabelecidas',
  });
  
  static readonly ACT = new PDCACycle({ 
    value: 'ACT', 
    label: 'Agir', 
    order: 4,
    description: 'Padronizar o que funcionou ou corrigir o que falhou',
  });

  private constructor(props: PDCACycleProps) {
    super(props);
    Object.freeze(this);
  }

  get value(): string { return this.props.value; }
  get label(): string { return this.props.label; }
  get order(): number { return this.props.order; }
  get description(): string { return this.props.description; }

  /**
   * Retorna a próxima fase do ciclo
   */
  next(): PDCACycle {
    const phases = [PDCACycle.PLAN, PDCACycle.DO, PDCACycle.CHECK, PDCACycle.ACT];
    const currentIndex = phases.findIndex(p => p.equals(this));
    // O ciclo volta ao PLAN após ACT
    return phases[(currentIndex + 1) % phases.length];
  }

  /**
   * Verifica se pode avançar para a fase alvo
   */
  canAdvanceTo(target: PDCACycle): boolean {
    // Só pode avançar para a próxima fase
    return target.equals(this.next());
  }

  /**
   * Verifica se é a fase inicial
   */
  get isInitial(): boolean {
    return this.value === 'PLAN';
  }

  /**
   * Verifica se é a fase final (antes de reiniciar)
   */
  get isFinal(): boolean {
    return this.value === 'ACT';
  }

  static fromValue(value: string): Result<PDCACycle, string> {
    const phases: Record<string, PDCACycle> = {
      'PLAN': PDCACycle.PLAN,
      'DO': PDCACycle.DO,
      'CHECK': PDCACycle.CHECK,
      'ACT': PDCACycle.ACT,
    };

    const phase = phases[value.toUpperCase()];
    if (!phase) {
      return Result.fail(`Fase PDCA inválida: ${value}`);
    }

    return Result.ok(phase);
  }

  static all(): PDCACycle[] {
    return [
      PDCACycle.PLAN,
      PDCACycle.DO,
      PDCACycle.CHECK,
      PDCACycle.ACT,
    ];
  }

  toString(): string {
    return `${this.label} (${this.value})`;
  }
}
