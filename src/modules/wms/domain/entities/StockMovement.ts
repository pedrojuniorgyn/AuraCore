import { Result, Money } from '@/shared/domain';
import { StockQuantity } from '../value-objects/StockQuantity';
import { MovementType } from '../value-objects/MovementType';

/**
 * StockMovement: Movimentação de estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Representa uma movimentação de estoque (entrada, saída, transferência, etc.).
 * 
 * Invariantes:
 * - ENTRY: toLocationId obrigatório, fromLocationId null
 * - EXIT: fromLocationId obrigatório, toLocationId null
 * - TRANSFER: ambos obrigatórios
 * - totalCost = quantity * unitCost
 * 
 * Padrão: Entity com identidade, validação e invariantes
 */

export type ReferenceType = 'FISCAL_DOC' | 'ORDER' | 'ADJUSTMENT' | 'INVENTORY';

/**
 * Verifica se uma string é um tipo de referência válido
 */
export function isValidReferenceType(type: string): type is ReferenceType {
  return ['FISCAL_DOC', 'ORDER', 'ADJUSTMENT', 'INVENTORY'].includes(type);
}

export interface StockMovementProps {
  id: string;
  organizationId: number;
  branchId: number;
  productId: string;
  fromLocationId?: string;
  toLocationId?: string;
  type: MovementType;
  quantity: StockQuantity;
  unitCost: Money;
  referenceType?: ReferenceType;
  referenceId?: string;
  reason?: string;
  executedBy: string;
  executedAt: Date;
  createdAt: Date;
}

export class StockMovement {
  private constructor(private props: StockMovementProps) {}

  /**
   * Cria uma nova StockMovement validando as propriedades e invariantes
   * 
   * @param props Propriedades da movimentação
   * @returns Result<StockMovement, string>
   */
  static create(props: StockMovementProps): Result<StockMovement, string> {
    // Validação: ID obrigatório
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Stock movement ID is required');
    }

    // Validação: organizationId obrigatório
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Valid organization ID is required');
    }

    // Validação: branchId obrigatório
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Valid branch ID is required');
    }

    // Validação: productId obrigatório
    if (!props.productId || props.productId.trim().length === 0) {
      return Result.fail('Product ID is required');
    }

    // Validação: type obrigatório
    if (!props.type) {
      return Result.fail('Movement type is required');
    }

    // Validação: quantity obrigatório
    if (!props.quantity) {
      return Result.fail('Quantity is required');
    }

    // Validação: quantity positiva
    if (!props.quantity.isPositive()) {
      return Result.fail('Quantity must be positive');
    }

    // Validação: unitCost obrigatório
    if (!props.unitCost) {
      return Result.fail('Unit cost is required');
    }

    // Validação: executedBy obrigatório
    if (!props.executedBy || props.executedBy.trim().length === 0) {
      return Result.fail('Executed by is required');
    }

    // Validação: referenceType válido (se fornecido)
    if (props.referenceType && !isValidReferenceType(props.referenceType)) {
      return Result.fail(`Invalid reference type: ${props.referenceType}`);
    }

    // Timestamps padrão
    const now = new Date();
    const movement = new StockMovement({
      ...props,
      reason: props.reason?.trim(),
      executedAt: props.executedAt || now,
      createdAt: props.createdAt || now,
    });

    // Validar invariantes
    const invariantsResult = movement.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(invariantsResult.error);
    }

    return Result.ok<StockMovement>(movement);
  }

  /**
   * Reconstitui StockMovement sem validação (para carregar do banco)
   * 
   * @param props Propriedades da movimentação
   * @returns Result<StockMovement, string>
   */
  static reconstitute(props: StockMovementProps): Result<StockMovement, string> {
    // Validação de enum no reconstitute (ENFORCE-015)
    if (props.referenceType && !isValidReferenceType(props.referenceType)) {
      return Result.fail(`Invalid reference type: ${props.referenceType}`);
    }

    const movement = new StockMovement(props);
    
    // Validar invariantes mesmo no reconstitute (dados corrompidos no banco)
    const invariantsResult = movement.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(`Corrupted movement data: ${invariantsResult.error}`);
    }

    return Result.ok<StockMovement>(movement);
  }

  /**
   * Valida invariantes da movimentação
   */
  private validateInvariants(): Result<void, string> {
    // Invariante: ENTRY requer toLocationId
    if (this.props.type.isEntry() && !this.props.toLocationId) {
      return Result.fail('ENTRY movement requires toLocationId');
    }

    // Invariante: ENTRY não deve ter fromLocationId
    if (this.props.type.isEntry() && this.props.fromLocationId) {
      return Result.fail('ENTRY movement should not have fromLocationId');
    }

    // Invariante: EXIT requer fromLocationId
    if (this.props.type.isExit() && !this.props.fromLocationId) {
      return Result.fail('EXIT movement requires fromLocationId');
    }

    // Invariante: EXIT não deve ter toLocationId
    if (this.props.type.isExit() && this.props.toLocationId) {
      return Result.fail('EXIT movement should not have toLocationId');
    }

    // Invariante: TRANSFER requer ambos
    if (this.props.type.isTransfer()) {
      if (!this.props.fromLocationId || !this.props.toLocationId) {
        return Result.fail('TRANSFER movement requires both fromLocationId and toLocationId');
      }
      if (this.props.fromLocationId === this.props.toLocationId) {
        return Result.fail('TRANSFER from and to locations must be different');
      }
    }

    // Invariante: PICKING requer fromLocationId
    if (this.props.type.isPicking() && !this.props.fromLocationId) {
      return Result.fail('PICKING movement requires fromLocationId');
    }

    // Invariante: RETURN requer toLocationId
    if (this.props.type.isReturn() && !this.props.toLocationId) {
      return Result.fail('RETURN movement requires toLocationId');
    }

    return Result.ok(undefined);
  }

  /**
   * ID da movimentação
   */
  get id(): string {
    return this.props.id;
  }

  /**
   * ID da organização
   */
  get organizationId(): number {
    return this.props.organizationId;
  }

  /**
   * ID da filial
   */
  get branchId(): number {
    return this.props.branchId;
  }

  /**
   * ID do produto
   */
  get productId(): string {
    return this.props.productId;
  }

  /**
   * ID da localização de origem
   */
  get fromLocationId(): string | undefined {
    return this.props.fromLocationId;
  }

  /**
   * ID da localização de destino
   */
  get toLocationId(): string | undefined {
    return this.props.toLocationId;
  }

  /**
   * Tipo da movimentação
   */
  get type(): MovementType {
    return this.props.type;
  }

  /**
   * Quantidade movimentada
   */
  get quantity(): StockQuantity {
    return this.props.quantity;
  }

  /**
   * Custo unitário
   */
  get unitCost(): Money {
    return this.props.unitCost;
  }

  /**
   * Custo total (calculated)
   * totalCost = unitCost * quantity
   */
  get totalCost(): Money {
    const result = this.props.unitCost.multiply(this.props.quantity.value);
    if (!Result.isOk(result)) {
      throw new Error(`Failed to calculate total cost: ${result.error}`);
    }
    return result.value;
  }

  /**
   * Tipo de referência
   */
  get referenceType(): ReferenceType | undefined {
    return this.props.referenceType;
  }

  /**
   * ID da referência
   */
  get referenceId(): string | undefined {
    return this.props.referenceId;
  }

  /**
   * Motivo da movimentação
   */
  get reason(): string | undefined {
    return this.props.reason;
  }

  /**
   * Executado por (usuário)
   */
  get executedBy(): string {
    return this.props.executedBy;
  }

  /**
   * Data de execução
   */
  get executedAt(): Date {
    return this.props.executedAt;
  }

  /**
   * Data de criação
   */
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Verifica se a movimentação tem referência
   */
  hasReference(): boolean {
    return !!this.props.referenceType && !!this.props.referenceId;
  }

  /**
   * Verifica se a movimentação é de entrada de documento fiscal
   */
  isFiscalDocEntry(): boolean {
    return this.props.referenceType === 'FISCAL_DOC' && this.props.type.isEntry();
  }

  /**
   * Verifica se a movimentação é de saída de pedido
   */
  isOrderExit(): boolean {
    return this.props.referenceType === 'ORDER' && this.props.type.isExit();
  }

  /**
   * Igualdade baseada no ID
   */
  equals(other: StockMovement): boolean {
    if (!other) return false;
    return this.props.id === other.id;
  }
}

