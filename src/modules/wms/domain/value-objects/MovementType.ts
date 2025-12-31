import { Result } from '@/shared/domain';

/**
 * MovementType: Tipo de movimentação de estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Tipos:
 * - ENTRY: Entrada (recebimento de mercadoria)
 * - EXIT: Saída (expedição/venda)
 * - TRANSFER: Transferência entre localizações
 * - ADJUSTMENT_PLUS: Ajuste positivo (ganho de inventário)
 * - ADJUSTMENT_MINUS: Ajuste negativo (perda de inventário)
 * - RESERVATION: Reserva para pedido
 * - PICKING: Separação de mercadoria
 * - RETURN: Devolução
 * 
 * Padrão: Value Object imutável com validação no create()
 */

export enum MovementTypeEnum {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT_PLUS = 'ADJUSTMENT_PLUS',
  ADJUSTMENT_MINUS = 'ADJUSTMENT_MINUS',
  RESERVATION = 'RESERVATION',
  PICKING = 'PICKING',
  RETURN = 'RETURN',
}

/**
 * Verifica se uma string é um tipo de movimentação válido
 */
export function isValidMovementType(type: string): type is MovementTypeEnum {
  return Object.values(MovementTypeEnum).includes(type as MovementTypeEnum);
}

/**
 * Descrições dos tipos de movimentação
 */
export const MOVEMENT_TYPE_DESCRIPTIONS: Record<MovementTypeEnum, string> = {
  [MovementTypeEnum.ENTRY]: 'Entrada (Recebimento)',
  [MovementTypeEnum.EXIT]: 'Saída (Expedição)',
  [MovementTypeEnum.TRANSFER]: 'Transferência entre localizações',
  [MovementTypeEnum.ADJUSTMENT_PLUS]: 'Ajuste positivo (Ganho)',
  [MovementTypeEnum.ADJUSTMENT_MINUS]: 'Ajuste negativo (Perda)',
  [MovementTypeEnum.RESERVATION]: 'Reserva para pedido',
  [MovementTypeEnum.PICKING]: 'Separação de mercadoria',
  [MovementTypeEnum.RETURN]: 'Devolução',
};

interface MovementTypeProps {
  value: MovementTypeEnum;
}

export class MovementType {
  private constructor(private readonly props: MovementTypeProps) {
    Object.freeze(this);
  }

  /**
   * Cria um novo MovementType validando o valor
   * 
   * @param value Tipo de movimentação
   * @returns Result<MovementType, string>
   */
  static create(value: MovementTypeEnum): Result<MovementType, string> {
    // Validação: tipo obrigatório
    if (!value) {
      return Result.fail('Movement type is required');
    }

    // Validação: tipo válido
    if (!isValidMovementType(value)) {
      return Result.fail(`Invalid movement type: ${value}`);
    }

    return Result.ok<MovementType>(new MovementType({ value }));
  }

  /**
   * Reconstitui MovementType sem validação (para carregar do banco)
   */
  static reconstitute(value: MovementTypeEnum): Result<MovementType, string> {
    // Validação de enum no reconstitute (ENFORCE-015)
    if (!isValidMovementType(value)) {
      return Result.fail(`Invalid movement type: ${value}`);
    }

    return Result.ok<MovementType>(new MovementType({ value }));
  }

  /**
   * Factory methods para tipos comuns
   */
  static entry(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.ENTRY);
  }

  static exit(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.EXIT);
  }

  static transfer(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.TRANSFER);
  }

  static adjustmentPlus(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.ADJUSTMENT_PLUS);
  }

  static adjustmentMinus(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.ADJUSTMENT_MINUS);
  }

  static reservation(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.RESERVATION);
  }

  static picking(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.PICKING);
  }

  static return(): Result<MovementType, string> {
    return this.create(MovementTypeEnum.RETURN);
  }

  /**
   * Valor do tipo de movimentação
   */
  get value(): MovementTypeEnum {
    return this.props.value;
  }

  /**
   * Descrição do tipo de movimentação
   */
  get description(): string {
    return MOVEMENT_TYPE_DESCRIPTIONS[this.props.value];
  }

  /**
   * Verifica se é uma entrada
   */
  isEntry(): boolean {
    return this.props.value === MovementTypeEnum.ENTRY;
  }

  /**
   * Verifica se é uma saída
   */
  isExit(): boolean {
    return this.props.value === MovementTypeEnum.EXIT;
  }

  /**
   * Verifica se é uma transferência
   */
  isTransfer(): boolean {
    return this.props.value === MovementTypeEnum.TRANSFER;
  }

  /**
   * Verifica se é um ajuste
   */
  isAdjustment(): boolean {
    return (
      this.props.value === MovementTypeEnum.ADJUSTMENT_PLUS ||
      this.props.value === MovementTypeEnum.ADJUSTMENT_MINUS
    );
  }

  /**
   * Verifica se é uma reserva
   */
  isReservation(): boolean {
    return this.props.value === MovementTypeEnum.RESERVATION;
  }

  /**
   * Verifica se é um picking
   */
  isPicking(): boolean {
    return this.props.value === MovementTypeEnum.PICKING;
  }

  /**
   * Verifica se é uma devolução
   */
  isReturn(): boolean {
    return this.props.value === MovementTypeEnum.RETURN;
  }

  /**
   * Verifica se o tipo requer localização de origem
   */
  requiresFromLocation(): boolean {
    return (
      this.props.value === MovementTypeEnum.EXIT ||
      this.props.value === MovementTypeEnum.TRANSFER ||
      this.props.value === MovementTypeEnum.PICKING
    );
  }

  /**
   * Verifica se o tipo requer localização de destino
   */
  requiresToLocation(): boolean {
    return (
      this.props.value === MovementTypeEnum.ENTRY ||
      this.props.value === MovementTypeEnum.TRANSFER ||
      this.props.value === MovementTypeEnum.RETURN
    );
  }

  /**
   * Verifica se o tipo impacta positivamente o estoque
   */
  increasesStock(): boolean {
    return (
      this.props.value === MovementTypeEnum.ENTRY ||
      this.props.value === MovementTypeEnum.ADJUSTMENT_PLUS ||
      this.props.value === MovementTypeEnum.RETURN
    );
  }

  /**
   * Verifica se o tipo impacta negativamente o estoque
   */
  decreasesStock(): boolean {
    return (
      this.props.value === MovementTypeEnum.EXIT ||
      this.props.value === MovementTypeEnum.ADJUSTMENT_MINUS ||
      this.props.value === MovementTypeEnum.PICKING
    );
  }

  /**
   * Igualdade baseada no valor
   */
  equals(other: MovementType): boolean {
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

