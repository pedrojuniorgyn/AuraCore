import { Result, Money } from '@/shared/domain';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * StockItem: Item em estoque
 * 
 * E7.8 WMS - Semana 1
 * 
 * Representa um item em estoque em uma localização específica.
 * 
 * Invariantes:
 * - availableQuantity = quantity - reservedQuantity
 * - availableQuantity >= 0
 * - reservedQuantity >= 0
 * - quantity >= reservedQuantity
 * 
 * Padrão: Entity com identidade, validação e invariantes
 */

export interface StockItemProps {
  id: string;
  organizationId: number;
  branchId: number;
  productId: string;
  locationId: string;
  quantity: StockQuantity;
  reservedQuantity: StockQuantity;
  lotNumber?: string;
  expirationDate?: Date;
  unitCost: Money;
  createdAt: Date;
  updatedAt: Date;
}

export class StockItem {
  private constructor(private props: StockItemProps) {}

  /**
   * Cria um novo StockItem validando as propriedades e invariantes
   * 
   * @param props Propriedades do item de estoque
   * @returns Result<StockItem, string>
   */
  static create(props: StockItemProps): Result<StockItem, string> {
    // Validação: ID obrigatório
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Stock item ID is required');
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

    // Validação: locationId obrigatório
    if (!props.locationId || props.locationId.trim().length === 0) {
      return Result.fail('Location ID is required');
    }

    // Validação: quantity obrigatório
    if (!props.quantity) {
      return Result.fail('Quantity is required');
    }

    // Validação: reservedQuantity obrigatório
    if (!props.reservedQuantity) {
      return Result.fail('Reserved quantity is required');
    }

    // Validação: unitCost obrigatório
    if (!props.unitCost) {
      return Result.fail('Unit cost is required');
    }

    // Validação: quantity e reservedQuantity devem ter a mesma unidade
    if (props.quantity.unit !== props.reservedQuantity.unit) {
      return Result.fail('Quantity and reserved quantity must have the same unit');
    }

    // Validação: não permitir criar item com data de expiração no passado
    if (props.expirationDate && props.expirationDate < new Date()) {
      return Result.fail('Cannot create stock item with past expiration date');
    }

    // Timestamps padrão
    const now = new Date();
    const stockItem = new StockItem({
      ...props,
      lotNumber: props.lotNumber?.trim(),
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    });

    // Validar invariantes (exceto expiração, já validada acima)
    const invariantsResult = stockItem.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(invariantsResult.error);
    }

    return Result.ok<StockItem>(stockItem);
  }

  /**
   * Reconstitui StockItem a partir de dados persistidos
   * 
   * NÃO valida expiração - produtos podem estar legitimamente expirados no banco.
   * Valida apenas integridade estrutural dos dados.
   * 
   * @param props Propriedades do item de estoque
   * @returns Result<StockItem, string>
   */
  static reconstitute(props: StockItemProps): Result<StockItem, string> {
    // Validações básicas de integridade (não de negócio)
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Corrupted stock item data: missing ID');
    }

    if (!props.productId || props.productId.trim().length === 0) {
      return Result.fail('Corrupted stock item data: missing product ID');
    }

    if (!props.locationId || props.locationId.trim().length === 0) {
      return Result.fail('Corrupted stock item data: missing location ID');
    }

    const stockItem = new StockItem(props);
    
    // Validar invariantes estruturais (quantidade >= reservado, etc)
    // NÃO validar expiração - item pode estar expirado legitimamente
    const invariantsResult = stockItem.validateStructuralInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(`Corrupted stock item data: ${invariantsResult.error}`);
    }

    return Result.ok<StockItem>(stockItem);
  }

  /**
   * Valida invariantes estruturais (usado em reconstitute)
   * NÃO valida regras de negócio como expiração
   */
  private validateStructuralInvariants(): Result<void, string> {
    // Invariante: quantity >= 0
    if (this.props.quantity.isNegative()) {
      return Result.fail('Quantity cannot be negative');
    }

    // Invariante: reservedQuantity >= 0
    if (this.props.reservedQuantity.isNegative()) {
      return Result.fail('Reserved quantity cannot be negative');
    }

    // Invariante: quantity >= reservedQuantity
    if (this.props.reservedQuantity.isGreaterThan(this.props.quantity)) {
      return Result.fail('Reserved quantity cannot exceed total quantity');
    }

    // Invariante: unidades devem ser iguais
    if (this.props.quantity.unit !== this.props.reservedQuantity.unit) {
      return Result.fail('Quantity and reserved quantity must have the same unit');
    }

    return Result.ok(undefined);
  }

  /**
   * Valida invariantes completos (usado em create e operações de negócio)
   * Inclui validação de expiração
   */
  private validateInvariants(): Result<void, string> {
    // Validar invariantes estruturais
    const structuralResult = this.validateStructuralInvariants();
    if (!Result.isOk(structuralResult)) {
      return structuralResult;
    }

    // Validação de negócio: não permitir criar item já expirado
    // (mas reconstitute não chama este método, então items expirados podem ser carregados)
    if (this.props.expirationDate && this.props.expirationDate < new Date()) {
      return Result.fail('Product is expired');
    }

    return Result.ok(undefined);
  }

  /**
   * ID do item de estoque
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
   * ID da localização
   */
  get locationId(): string {
    return this.props.locationId;
  }

  /**
   * Quantidade total
   */
  get quantity(): StockQuantity {
    return this.props.quantity;
  }

  /**
   * Quantidade reservada
   */
  get reservedQuantity(): StockQuantity {
    return this.props.reservedQuantity;
  }

  /**
   * Quantidade disponível (calculated)
   * availableQuantity = quantity - reservedQuantity
   */
  get availableQuantity(): StockQuantity {
    const result = this.props.quantity.subtract(this.props.reservedQuantity);
    if (!Result.isOk(result)) {
      throw new Error(`Failed to calculate available quantity: ${result.error}`);
    }
    return result.value;
  }

  /**
   * Número do lote
   */
  get lotNumber(): string | undefined {
    return this.props.lotNumber;
  }

  /**
   * Data de validade
   */
  get expirationDate(): Date | undefined {
    return this.props.expirationDate;
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
   * Verifica se o produto está expirado
   */
  isExpired(): boolean {
    if (!this.props.expirationDate) return false;
    return this.props.expirationDate < new Date();
  }

  /**
   * Verifica se o produto está próximo do vencimento (30 dias)
   */
  isNearExpiration(days: number = 30): boolean {
    if (!this.props.expirationDate) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return this.props.expirationDate <= threshold;
  }

  /**
   * Verifica se há quantidade disponível
   */
  hasAvailableQuantity(): boolean {
    return this.availableQuantity.isPositive();
  }

  /**
   * Adiciona quantidade ao estoque
   * 
   * @param quantity Quantidade a adicionar
   * @returns Result<void, string>
   */
  addQuantity(quantity: StockQuantity): Result<void, string> {
    if (!quantity.isPositive()) {
      return Result.fail('Quantity to add must be positive');
    }

    const newQuantityResult = this.props.quantity.add(quantity);
    if (!Result.isOk(newQuantityResult)) {
      return Result.fail(newQuantityResult.error);
    }

    this.props.quantity = newQuantityResult.value;
    this.props.updatedAt = new Date();

    return this.validateInvariants();
  }

  /**
   * Remove quantidade do estoque
   * 
   * @param quantity Quantidade a remover
   * @returns Result<void, string>
   */
  removeQuantity(quantity: StockQuantity): Result<void, string> {
    if (!quantity.isPositive()) {
      return Result.fail('Quantity to remove must be positive');
    }

    // Verificar se há quantidade disponível suficiente
    if (quantity.isGreaterThan(this.availableQuantity)) {
      return Result.fail('Insufficient available quantity');
    }

    const newQuantityResult = this.props.quantity.subtract(quantity);
    if (!Result.isOk(newQuantityResult)) {
      return Result.fail(newQuantityResult.error);
    }

    this.props.quantity = newQuantityResult.value;
    this.props.updatedAt = new Date();

    return this.validateInvariants();
  }

  /**
   * Reserva quantidade do estoque
   * 
   * @param quantity Quantidade a reservar
   * @returns Result<void, string>
   */
  reserve(quantity: StockQuantity): Result<void, string> {
    if (!quantity.isPositive()) {
      return Result.fail('Quantity to reserve must be positive');
    }

    // Verificar se há quantidade disponível suficiente
    if (quantity.isGreaterThan(this.availableQuantity)) {
      return Result.fail('Insufficient available quantity to reserve');
    }

    const newReservedResult = this.props.reservedQuantity.add(quantity);
    if (!Result.isOk(newReservedResult)) {
      return Result.fail(newReservedResult.error);
    }

    this.props.reservedQuantity = newReservedResult.value;
    this.props.updatedAt = new Date();

    return this.validateInvariants();
  }

  /**
   * Libera quantidade reservada
   * 
   * @param quantity Quantidade a liberar
   * @returns Result<void, string>
   */
  release(quantity: StockQuantity): Result<void, string> {
    if (!quantity.isPositive()) {
      return Result.fail('Quantity to release must be positive');
    }

    // Verificar se há quantidade reservada suficiente
    if (quantity.isGreaterThan(this.props.reservedQuantity)) {
      return Result.fail('Cannot release more than reserved quantity');
    }

    const newReservedResult = this.props.reservedQuantity.subtract(quantity);
    if (!Result.isOk(newReservedResult)) {
      return Result.fail(newReservedResult.error);
    }

    this.props.reservedQuantity = newReservedResult.value;
    this.props.updatedAt = new Date();

    return this.validateInvariants();
  }

  /**
   * Atualiza o custo unitário
   * 
   * @param unitCost Novo custo unitário
   * @returns Result<void, string>
   */
  updateUnitCost(unitCost: Money): Result<void, string> {
    if (unitCost.isNegative()) {
      return Result.fail('Unit cost cannot be negative');
    }

    this.props.unitCost = unitCost;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Igualdade baseada no ID
   */
  equals(other: StockItem): boolean {
    if (!other) return false;
    return this.props.id === other.id;
  }
}

