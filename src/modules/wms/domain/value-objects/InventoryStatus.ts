import { Result } from '@/shared/domain';

/**
 * InventoryStatus: Status de contagem de inventário
 * 
 * E7.8 WMS - Semana 1
 * 
 * Status:
 * - PENDING: Aguardando contagem
 * - IN_PROGRESS: Contagem em andamento
 * - COMPLETED: Contagem finalizada (sem divergências)
 * - CANCELLED: Contagem cancelada
 * - DIVERGENT: Contagem finalizada com divergências
 * 
 * Padrão: Value Object imutável com validação no create()
 */

export enum InventoryStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DIVERGENT = 'DIVERGENT',
}

/**
 * Verifica se uma string é um status de inventário válido
 */
export function isValidInventoryStatus(status: string): status is InventoryStatusEnum {
  return Object.values(InventoryStatusEnum).includes(status as InventoryStatusEnum);
}

/**
 * Descrições dos status de inventário
 */
export const INVENTORY_STATUS_DESCRIPTIONS: Record<InventoryStatusEnum, string> = {
  [InventoryStatusEnum.PENDING]: 'Aguardando contagem',
  [InventoryStatusEnum.IN_PROGRESS]: 'Contagem em andamento',
  [InventoryStatusEnum.COMPLETED]: 'Contagem finalizada',
  [InventoryStatusEnum.CANCELLED]: 'Contagem cancelada',
  [InventoryStatusEnum.DIVERGENT]: 'Contagem com divergências',
};

interface InventoryStatusProps {
  value: InventoryStatusEnum;
}

export class InventoryStatus {
  private constructor(private readonly props: InventoryStatusProps) {
    Object.freeze(this);
  }

  /**
   * Cria um novo InventoryStatus validando o valor
   * 
   * @param value Status do inventário
   * @returns Result<InventoryStatus, string>
   */
  static create(value: InventoryStatusEnum): Result<InventoryStatus, string> {
    // Validação: status obrigatório
    if (!value) {
      return Result.fail('Inventory status is required');
    }

    // Validação: status válido
    if (!isValidInventoryStatus(value)) {
      return Result.fail(`Invalid inventory status: ${value}`);
    }

    return Result.ok<InventoryStatus>(new InventoryStatus({ value }));
  }

  /**
   * Reconstitui InventoryStatus sem validação (para carregar do banco)
   */
  static reconstitute(value: InventoryStatusEnum): Result<InventoryStatus, string> {
    // Validação de enum no reconstitute (ENFORCE-015)
    if (!isValidInventoryStatus(value)) {
      return Result.fail(`Invalid inventory status: ${value}`);
    }

    return Result.ok<InventoryStatus>(new InventoryStatus({ value }));
  }

  /**
   * Factory methods para status comuns
   */
  static pending(): Result<InventoryStatus, string> {
    return this.create(InventoryStatusEnum.PENDING);
  }

  static inProgress(): Result<InventoryStatus, string> {
    return this.create(InventoryStatusEnum.IN_PROGRESS);
  }

  static completed(): Result<InventoryStatus, string> {
    return this.create(InventoryStatusEnum.COMPLETED);
  }

  static cancelled(): Result<InventoryStatus, string> {
    return this.create(InventoryStatusEnum.CANCELLED);
  }

  static divergent(): Result<InventoryStatus, string> {
    return this.create(InventoryStatusEnum.DIVERGENT);
  }

  /**
   * Valor do status
   */
  get value(): InventoryStatusEnum {
    return this.props.value;
  }

  /**
   * Descrição do status
   */
  get description(): string {
    return INVENTORY_STATUS_DESCRIPTIONS[this.props.value];
  }

  /**
   * Verifica se está pendente
   */
  isPending(): boolean {
    return this.props.value === InventoryStatusEnum.PENDING;
  }

  /**
   * Verifica se está em andamento
   */
  isInProgress(): boolean {
    return this.props.value === InventoryStatusEnum.IN_PROGRESS;
  }

  /**
   * Verifica se foi completado
   */
  isCompleted(): boolean {
    return this.props.value === InventoryStatusEnum.COMPLETED;
  }

  /**
   * Verifica se foi cancelado
   */
  isCancelled(): boolean {
    return this.props.value === InventoryStatusEnum.CANCELLED;
  }

  /**
   * Verifica se tem divergências
   */
  isDivergent(): boolean {
    return this.props.value === InventoryStatusEnum.DIVERGENT;
  }

  /**
   * Verifica se está finalizado (completado ou divergente)
   */
  isFinalized(): boolean {
    return this.isCompleted() || this.isDivergent();
  }

  /**
   * Verifica se pode ser modificado
   * Só pode modificar se PENDING ou IN_PROGRESS
   */
  canBeModified(): boolean {
    return this.isPending() || this.isInProgress();
  }

  /**
   * Verifica se pode transicionar para outro status
   * 
   * @param newStatus Novo status
   * @returns true se a transição é válida
   */
  canTransitionTo(newStatus: InventoryStatus): boolean {
    const from = this.props.value;
    const to = newStatus.value;

    // Transições válidas
    const validTransitions: Record<InventoryStatusEnum, InventoryStatusEnum[]> = {
      [InventoryStatusEnum.PENDING]: [
        InventoryStatusEnum.IN_PROGRESS,
        InventoryStatusEnum.CANCELLED,
      ],
      [InventoryStatusEnum.IN_PROGRESS]: [
        InventoryStatusEnum.COMPLETED,
        InventoryStatusEnum.DIVERGENT,
        InventoryStatusEnum.CANCELLED,
      ],
      [InventoryStatusEnum.COMPLETED]: [],
      [InventoryStatusEnum.CANCELLED]: [],
      [InventoryStatusEnum.DIVERGENT]: [
        InventoryStatusEnum.COMPLETED, // após ajuste
      ],
    };

    return validTransitions[from].includes(to);
  }

  /**
   * Igualdade baseada no valor
   */
  equals(other: InventoryStatus): boolean {
    if (!other) return false;
    return this.props.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.props.value;
  }
}

