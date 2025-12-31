import { Result } from '@/shared/domain';
import { Location, LocationType } from '../entities/Location';
import { LocationCode } from '../value-objects/LocationCode';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * Warehouse: Aggregate Root para armazém
 * 
 * E7.8 WMS - Semana 1
 * 
 * Gerencia:
 * - Hierarquia de localizações
 * - Capacidade total e utilizada
 * - Regras de armazenamento
 * 
 * Padrão: Aggregate Root com consistência de negócio
 */

export interface WarehouseProps {
  id: string;
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  address?: string; // Endereço em formato texto (por enquanto)
  totalCapacity?: StockQuantity;
  isActive: boolean;
  locations: Location[];
  createdAt: Date;
  updatedAt: Date;
}

export class Warehouse {
  private constructor(private props: WarehouseProps) {}

  /**
   * Cria um novo Warehouse validando as propriedades
   * 
   * @param props Propriedades do armazém
   * @returns Result<Warehouse, string>
   */
  static create(props: WarehouseProps): Result<Warehouse, string> {
    // Validação: ID obrigatório
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Warehouse ID is required');
    }

    // Validação: organizationId obrigatório
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Valid organization ID is required');
    }

    // Validação: branchId obrigatório
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Valid branch ID is required');
    }

    // Validação: code obrigatório
    if (!props.code || props.code.trim().length === 0) {
      return Result.fail('Warehouse code is required');
    }

    // Validação: name obrigatório
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Warehouse name is required');
    }

    // Validação: locations deve ser array
    if (!Array.isArray(props.locations)) {
      return Result.fail('Locations must be an array');
    }

    // Timestamps padrão
    const now = new Date();
    const warehouse = new Warehouse({
      ...props,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      locations: props.locations || [],
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    });

    // Validar invariantes
    const invariantsResult = warehouse.validateInvariants();
    if (!Result.isOk(invariantsResult)) {
      return Result.fail(invariantsResult.error);
    }

    return Result.ok<Warehouse>(warehouse);
  }

  /**
   * Reconstitui Warehouse sem validação (para carregar do banco)
   * 
   * @param props Propriedades do armazém
   * @returns Result<Warehouse, string>
   */
  static reconstitute(props: WarehouseProps): Result<Warehouse, string> {
    return Result.ok<Warehouse>(new Warehouse(props));
  }

  /**
   * Valida invariantes do armazém
   */
  private validateInvariants(): Result<void, string> {
    // Invariante: locations devem pertencer a este warehouse
    for (const location of this.props.locations) {
      if (location.warehouseId !== this.props.id) {
        return Result.fail(`Location ${location.id} does not belong to warehouse ${this.props.id}`);
      }
      if (location.organizationId !== this.props.organizationId) {
        return Result.fail(`Location ${location.id} has different organizationId`);
      }
      if (location.branchId !== this.props.branchId) {
        return Result.fail(`Location ${location.id} has different branchId`);
      }
    }

    // Invariante: deve haver apenas uma localização WAREHOUSE
    const warehouseLocations = this.props.locations.filter(l => l.type === 'WAREHOUSE');
    if (warehouseLocations.length > 1) {
      return Result.fail('Warehouse can have only one WAREHOUSE-type location');
    }

    // Invariante: parentId deve referenciar localização existente
    for (const location of this.props.locations) {
      if (location.parentId) {
        const parentExists = this.props.locations.some(l => l.id === location.parentId);
        if (!parentExists) {
          return Result.fail(`Location ${location.id} references non-existent parent ${location.parentId}`);
        }
      }
    }

    return Result.ok(undefined);
  }

  /**
   * ID do armazém
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
   * Código do armazém
   */
  get code(): string {
    return this.props.code;
  }

  /**
   * Nome do armazém
   */
  get name(): string {
    return this.props.name;
  }

  /**
   * Endereço do armazém
   */
  get address(): string | undefined {
    return this.props.address;
  }

  /**
   * Capacidade total
   */
  get totalCapacity(): StockQuantity | undefined {
    return this.props.totalCapacity;
  }

  /**
   * Capacidade utilizada (calculated)
   */
  get usedCapacity(): StockQuantity | undefined {
    return this.calculateUsedCapacity();
  }

  /**
   * Se o armazém está ativo
   */
  get isActive(): boolean {
    return this.props.isActive;
  }

  /**
   * Localizações do armazém
   */
  get locations(): Location[] {
    return [...this.props.locations];
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
   * Calcula a capacidade utilizada (soma de todas as localizações)
   * 
   * @returns StockQuantity | undefined
   */
  calculateUsedCapacity(): StockQuantity | undefined {
    const locationsWithCapacity = this.props.locations.filter(l => l.capacity);
    
    if (locationsWithCapacity.length === 0) return undefined;

    // Assumir que todas têm a mesma unidade (primeira localização)
    const firstUnit = locationsWithCapacity[0].capacity!.unit;
    
    let total = 0;
    for (const location of locationsWithCapacity) {
      if (location.capacity!.unit !== firstUnit) {
        // Unidades diferentes - não pode somar
        return undefined;
      }
      total += location.capacity!.value;
    }

    const result = StockQuantity.create(total, firstUnit);
    return Result.isOk(result) ? result.value : undefined;
  }

  /**
   * Adiciona uma nova localização ao armazém
   * 
   * @param location Localização a adicionar
   * @returns Result<void, string>
   */
  addLocation(location: Location): Result<void, string> {
    // Validar que pertence a este warehouse
    if (location.warehouseId !== this.props.id) {
      return Result.fail('Location must belong to this warehouse');
    }

    if (location.organizationId !== this.props.organizationId) {
      return Result.fail('Location must have same organizationId');
    }

    if (location.branchId !== this.props.branchId) {
      return Result.fail('Location must have same branchId');
    }

    // Validar que não existe
    if (this.props.locations.some(l => l.id === location.id)) {
      return Result.fail('Location already exists in warehouse');
    }

    // Validar que código não duplicado
    if (this.props.locations.some(l => l.code.equals(location.code))) {
      return Result.fail(`Location code ${location.code.value} already exists`);
    }

    // Validar tipo WAREHOUSE (só pode haver um)
    if (location.type === 'WAREHOUSE' && this.hasWarehouseLocation()) {
      return Result.fail('Warehouse already has a WAREHOUSE-type location');
    }

    // Validar parentId (se definido, deve existir)
    if (location.parentId && !this.props.locations.some(l => l.id === location.parentId)) {
      return Result.fail(`Parent location ${location.parentId} does not exist`);
    }

    this.props.locations.push(location);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Remove uma localização do armazém
   * 
   * @param locationId ID da localização
   * @returns Result<void, string>
   */
  removeLocation(locationId: string): Result<void, string> {
    const location = this.props.locations.find(l => l.id === locationId);
    
    if (!location) {
      return Result.fail('Location not found');
    }

    // Validar que não tem filhos
    const hasChildren = this.props.locations.some(l => l.parentId === locationId);
    if (hasChildren) {
      return Result.fail('Cannot remove location with children');
    }

    this.props.locations = this.props.locations.filter(l => l.id !== locationId);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Busca uma localização por código
   * 
   * @param code Código da localização
   * @returns Location | null
   */
  findLocation(code: LocationCode): Location | null {
    return this.props.locations.find(l => l.code.equals(code)) || null;
  }

  /**
   * Busca uma localização por ID
   * 
   * @param id ID da localização
   * @returns Location | null
   */
  findLocationById(id: string): Location | null {
    return this.props.locations.find(l => l.id === id) || null;
  }

  /**
   * Retorna todas as localizações de um tipo
   * 
   * @param type Tipo de localização
   * @returns Location[]
   */
  getLocationsByType(type: LocationType): Location[] {
    return this.props.locations.filter(l => l.type === type);
  }

  /**
   * Retorna localizações filhas de uma localização
   * 
   * @param parentId ID da localização pai
   * @returns Location[]
   */
  getChildLocations(parentId: string): Location[] {
    return this.props.locations.filter(l => l.parentId === parentId);
  }

  /**
   * Retorna localizações ativas
   * 
   * @returns Location[]
   */
  getActiveLocations(): Location[] {
    return this.props.locations.filter(l => l.isActive);
  }

  /**
   * Verifica se tem localização WAREHOUSE
   */
  hasWarehouseLocation(): boolean {
    return this.props.locations.some(l => l.type === 'WAREHOUSE');
  }

  /**
   * Verifica se tem capacidade definida
   */
  hasTotalCapacity(): boolean {
    return this.props.totalCapacity !== undefined;
  }

  /**
   * Atualiza o nome do armazém
   * 
   * @param name Novo nome
   * @returns Result<void, string>
   */
  updateName(name: string): Result<void, string> {
    if (!name || name.trim().length === 0) {
      return Result.fail('Warehouse name cannot be empty');
    }

    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Atualiza o endereço do armazém
   * 
   * @param address Novo endereço
   * @returns Result<void, string>
   */
  updateAddress(address: string): Result<void, string> {
    this.props.address = address;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Define a capacidade total do armazém
   * 
   * @param capacity Nova capacidade
   * @returns Result<void, string>
   */
  setTotalCapacity(capacity: StockQuantity): Result<void, string> {
    if (!capacity.isPositive()) {
      return Result.fail('Total capacity must be positive');
    }

    this.props.totalCapacity = capacity;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Ativa o armazém
   */
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Desativa o armazém
   */
  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Igualdade baseada no ID
   */
  equals(other: Warehouse): boolean {
    if (!other) return false;
    return this.props.id === other.id;
  }
}

