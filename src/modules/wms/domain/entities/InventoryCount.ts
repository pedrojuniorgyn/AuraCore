import { Result } from '@/shared/domain';
import { StockQuantity } from '../value-objects/StockQuantity';
import { InventoryStatus } from '../value-objects/InventoryStatus';

/**
 * InventoryCount: Contagem de inventário
 * 
 * E7.8 WMS - Semana 1
 * 
 * Representa uma contagem de inventário para um produto em uma localização.
 * 
 * Invariantes:
 * - difference = countedQuantity - systemQuantity (quando contado)
 * - Se difference != 0, status = DIVERGENT
 * - countedQuantity só existe se status = IN_PROGRESS, COMPLETED ou DIVERGENT
 * - countedBy obrigatório se countedQuantity definida
 * 
 * Padrão: Entity com identidade, validação e invariantes
 */

export interface InventoryCountProps {
  id: string;
  organizationId: number;
  branchId: number;
  locationId: string;
  productId: string;
  systemQuantity: StockQuantity;
  countedQuantity?: StockQuantity;
  status: InventoryStatus;
  countedBy?: string;
  countedAt?: Date;
  adjustmentMovementId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InventoryCount {
  private constructor(private props: InventoryCountProps) {}

  /**
   * Cria uma nova InventoryCount validando as propriedades e invariantes
   * 
   * @param props Propriedades da contagem
   * @returns Result<InventoryCount, string>
   */
  static create(props: InventoryCountProps): Result<InventoryCount, string> {
    // Validação: ID obrigatório
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Inventory count ID is required');
    }

    // Validação: organizationId obrigatório
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Valid organization ID is required');
    }

    // Validação: branchId obrigatório
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Valid branch ID is required');
    }

    // Validação: locationId obrigatório
    if (!props.locationId || props.locationId.trim().length === 0) {
      return Result.fail('Location ID is required');
    }

    // Validação: productId obrigatório
    if (!props.productId || props.productId.trim().length === 0) {
      return Result.fail('Product ID is required');
    }

    // Validação: systemQuantity obrigatório
    if (!props.systemQuantity) {
      return Result.fail('System quantity is required');
    }

    // Validação: status obrigatório
    if (!props.status) {
      return Result.fail('Status is required');
    }

    // Timestamps padrão
    const now = new Date();
    const count = new InventoryCount({
      ...props,
      countedBy: props.countedBy?.trim(),
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    });

    // Validar invariantes
    const invariantsResult = count.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(invariantsResult.error);
    }

    return Result.ok<InventoryCount>(count);
  }

  /**
   * Reconstitui InventoryCount sem validação (para carregar do banco)
   * 
   * @param props Propriedades da contagem
   * @returns Result<InventoryCount, string>
   */
  static reconstitute(props: InventoryCountProps): Result<InventoryCount, string> {
    const count = new InventoryCount(props);
    
    // Validar invariantes mesmo no reconstitute (dados corrompidos no banco)
    const invariantsResult = count.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(`Corrupted count data: ${invariantsResult.error}`);
    }

    return Result.ok<InventoryCount>(count);
  }

  /**
   * Valida invariantes da contagem
   */
  private validateInvariants(): Result<void, string> {
    // Invariante: countedQuantity requer countedBy
    if (this.props.countedQuantity && !this.props.countedBy) {
      return Result.fail('Counted quantity requires countedBy');
    }

    // Invariante: countedBy requer countedQuantity
    if (this.props.countedBy && !this.props.countedQuantity) {
      return Result.fail('CountedBy requires counted quantity');
    }

    // Invariante: status COMPLETED/DIVERGENT requer countedQuantity
    if ((this.props.status.isCompleted() || this.props.status.isDivergent()) && !this.props.countedQuantity) {
      return Result.fail('Finalized status requires counted quantity');
    }

    // Invariante: unidades devem ser iguais (se countedQuantity definida)
    if (this.props.countedQuantity && this.props.systemQuantity.unit !== this.props.countedQuantity.unit) {
      return Result.fail('System and counted quantities must have the same unit');
    }

    // Invariante: status DIVERGENT requer divergência
    if (this.props.status.isDivergent()) {
      const diff = this.calculateDifference();
      if (!Result.isOk(diff)) {
        return Result.fail(diff.error);
      }
      if (diff.value.isZero()) {
        return Result.fail('DIVERGENT status requires non-zero difference');
      }
    }

    // Invariante: status COMPLETED não pode ter divergência
    if (this.props.status.isCompleted() && this.props.countedQuantity) {
      const diff = this.calculateDifference();
      if (!Result.isOk(diff)) {
        return Result.fail(diff.error);
      }
      if (!diff.value.isZero()) {
        return Result.fail('COMPLETED status requires zero difference');
      }
    }

    return Result.ok(undefined);
  }

  /**
   * ID da contagem
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
   * ID da localização
   */
  get locationId(): string {
    return this.props.locationId;
  }

  /**
   * ID do produto
   */
  get productId(): string {
    return this.props.productId;
  }

  /**
   * Quantidade no sistema
   */
  get systemQuantity(): StockQuantity {
    return this.props.systemQuantity;
  }

  /**
   * Quantidade contada
   */
  get countedQuantity(): StockQuantity | undefined {
    return this.props.countedQuantity;
  }

  /**
   * Diferença (calculated)
   * difference = countedQuantity - systemQuantity
   */
  get difference(): StockQuantity | undefined {
    if (!this.props.countedQuantity) return undefined;
    
    const result = this.calculateDifference();
    if (!Result.isOk(result)) {
      throw new Error(`Failed to calculate difference: ${result.error}`);
    }
    return result.value;
  }

  /**
   * Status da contagem
   */
  get status(): InventoryStatus {
    return this.props.status;
  }

  /**
   * Contado por (usuário)
   */
  get countedBy(): string | undefined {
    return this.props.countedBy;
  }

  /**
   * Data da contagem
   */
  get countedAt(): Date | undefined {
    return this.props.countedAt;
  }

  /**
   * ID da movimentação de ajuste (quando aplicado)
   */
  get adjustmentMovementId(): string | undefined {
    return this.props.adjustmentMovementId;
  }

  /**
   * Data de criação
   */
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Data de atualização
   */
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Calcula a diferença entre contado e sistema
   */
  private calculateDifference(): Result<StockQuantity, string> {
    if (!this.props.countedQuantity) {
      return Result.fail('Cannot calculate difference without counted quantity');
    }
    return this.props.countedQuantity.subtract(this.props.systemQuantity);
  }

  /**
   * Verifica se foi contado
   */
  isCounted(): boolean {
    return !!this.props.countedQuantity;
  }

  /**
   * Verifica se há divergência
   */
  hasDivergence(): boolean {
    if (!this.props.countedQuantity) return false;
    const diff = this.calculateDifference();
    if (!Result.isOk(diff)) return false;
    return !diff.value.isZero();
  }

  /**
   * Verifica se foi ajustado
   */
  isAdjusted(): boolean {
    return !!this.props.adjustmentMovementId;
  }

  /**
   * Inicia a contagem
   * 
   * @returns Result<void, string>
   */
  startCount(): Result<void, string> {
    if (!this.props.status.isPending()) {
      return Result.fail('Count can only be started from PENDING status');
    }

    const newStatusResult = InventoryStatus.inProgress();
    if (!Result.isOk(newStatusResult)) {
      return Result.fail(newStatusResult.error);
    }

    this.props.status = newStatusResult.value;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Registra a contagem
   * 
   * @param quantity Quantidade contada
   * @param countedBy Usuário que contou
   * @returns Result<void, string>
   */
  recordCount(quantity: StockQuantity, countedBy: string): Result<void, string> {
    if (!this.props.status.canBeModified()) {
      return Result.fail('Cannot record count for finalized inventory');
    }

    if (!countedBy || countedBy.trim().length === 0) {
      return Result.fail('CountedBy is required');
    }

    // Verificar unidade
    if (quantity.unit !== this.props.systemQuantity.unit) {
      return Result.fail('Counted quantity must have the same unit as system quantity');
    }

    this.props.countedQuantity = quantity;
    this.props.countedBy = countedBy.trim();
    this.props.countedAt = new Date();

    // Determinar status baseado na diferença
    const diff = this.calculateDifference();
    if (!Result.isOk(diff)) {
      return Result.fail(diff.error);
    }

    if (diff.value.isZero()) {
      const statusResult = InventoryStatus.completed();
      if (!Result.isOk(statusResult)) {
        return Result.fail(statusResult.error);
      }
      this.props.status = statusResult.value;
    } else {
      const statusResult = InventoryStatus.divergent();
      if (!Result.isOk(statusResult)) {
        return Result.fail(statusResult.error);
      }
      this.props.status = statusResult.value;
    }

    this.props.updatedAt = new Date();
    return this.validateInvariants();
  }

  /**
   * Cancela a contagem
   * 
   * @returns Result<void, string>
   */
  cancel(): Result<void, string> {
    if (this.props.status.isFinalized()) {
      return Result.fail('Cannot cancel finalized inventory');
    }

    const statusResult = InventoryStatus.cancelled();
    if (!Result.isOk(statusResult)) {
      return Result.fail(statusResult.error);
    }

    this.props.status = statusResult.value;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Registra o ajuste aplicado
   * 
   * @param movementId ID da movimentação de ajuste
   * @returns Result<void, string>
   */
  recordAdjustment(movementId: string): Result<void, string> {
    if (!this.props.status.isDivergent()) {
      return Result.fail('Can only record adjustment for DIVERGENT status');
    }

    if (!movementId || movementId.trim().length === 0) {
      return Result.fail('Adjustment movement ID is required');
    }

    this.props.adjustmentMovementId = movementId.trim();
    
    const statusResult = InventoryStatus.completed();
    if (!Result.isOk(statusResult)) {
      return Result.fail(statusResult.error);
    }

    this.props.status = statusResult.value;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Igualdade baseada no ID
   */
  equals(other: InventoryCount): boolean {
    if (!other) return false;
    return this.props.id === other.id;
  }
}

