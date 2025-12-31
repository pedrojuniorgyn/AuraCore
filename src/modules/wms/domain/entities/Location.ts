import { Result } from '@/shared/domain';
import { LocationCode } from '../value-objects/LocationCode';
import { StockQuantity } from '../value-objects/StockQuantity';

/**
 * Location: Localização no armazém
 * 
 * E7.8 WMS - Semana 1
 * 
 * Representa uma localização física no armazém:
 * - WAREHOUSE: Armazém completo
 * - AISLE: Corredor
 * - SHELF: Prateleira
 * - POSITION: Posição específica
 * 
 * Hierarquia: Warehouse > Aisle > Shelf > Position
 * 
 * Padrão: Entity com identidade, validação e invariantes
 */

export type LocationType = 'WAREHOUSE' | 'AISLE' | 'SHELF' | 'POSITION';

/**
 * Verifica se uma string é um tipo de localização válido
 */
export function isValidLocationType(type: string): type is LocationType {
  return ['WAREHOUSE', 'AISLE', 'SHELF', 'POSITION'].includes(type);
}

export interface LocationProps {
  id: string;
  organizationId: number;
  branchId: number;
  warehouseId: string;
  code: LocationCode;
  name: string;
  type: LocationType;
  parentId?: string;
  capacity?: StockQuantity;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Location {
  private constructor(private props: LocationProps) {}

  /**
   * Cria uma nova Location validando as propriedades
   * 
   * @param props Propriedades da localização
   * @returns Result<Location, string>
   */
  static create(props: LocationProps): Result<Location, string> {
    // Validação: ID obrigatório
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail('Location ID is required');
    }

    // Validação: organizationId obrigatório
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Valid organization ID is required');
    }

    // Validação: branchId obrigatório
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Valid branch ID is required');
    }

    // Validação: warehouseId obrigatório
    if (!props.warehouseId || props.warehouseId.trim().length === 0) {
      return Result.fail('Warehouse ID is required');
    }

    // Validação: code obrigatório
    if (!props.code) {
      return Result.fail('Location code is required');
    }

    // Validação: name obrigatório
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Location name is required');
    }

    // Validação: type obrigatório
    if (!props.type || !isValidLocationType(props.type)) {
      return Result.fail(`Invalid location type: ${props.type}`);
    }

    // Validação: WAREHOUSE não pode ter parentId
    if (props.type === 'WAREHOUSE' && props.parentId) {
      return Result.fail('WAREHOUSE type cannot have a parent');
    }

    // Validação: Outros tipos devem ter parentId
    if (props.type !== 'WAREHOUSE' && !props.parentId) {
      return Result.fail(`Location type ${props.type} must have a parent`);
    }

    // Timestamps padrão
    const now = new Date();
    const location = new Location({
      ...props,
      name: props.name.trim(),
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    });

    return Result.ok<Location>(location);
  }

  /**
   * Reconstitui Location sem validação (para carregar do banco)
   * 
   * @param props Propriedades da localização
   * @returns Result<Location, string>
   */
  static reconstitute(props: LocationProps): Result<Location, string> {
    // Validação de enum no reconstitute (ENFORCE-015)
    if (!isValidLocationType(props.type)) {
      return Result.fail(`Invalid location type: ${props.type}`);
    }

    return Result.ok<Location>(new Location(props));
  }

  /**
   * ID da localização
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
   * ID do armazém
   */
  get warehouseId(): string {
    return this.props.warehouseId;
  }

  /**
   * Código da localização
   */
  get code(): LocationCode {
    return this.props.code;
  }

  /**
   * Nome da localização
   */
  get name(): string {
    return this.props.name;
  }

  /**
   * Tipo da localização
   */
  get type(): LocationType {
    return this.props.type;
  }

  /**
   * ID da localização pai
   */
  get parentId(): string | undefined {
    return this.props.parentId;
  }

  /**
   * Capacidade da localização
   */
  get capacity(): StockQuantity | undefined {
    return this.props.capacity;
  }

  /**
   * Se a localização está ativa
   */
  get isActive(): boolean {
    return this.props.isActive;
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
   * Verifica se é um armazém
   */
  isWarehouse(): boolean {
    return this.props.type === 'WAREHOUSE';
  }

  /**
   * Verifica se é um corredor
   */
  isAisle(): boolean {
    return this.props.type === 'AISLE';
  }

  /**
   * Verifica se é uma prateleira
   */
  isShelf(): boolean {
    return this.props.type === 'SHELF';
  }

  /**
   * Verifica se é uma posição
   */
  isPosition(): boolean {
    return this.props.type === 'POSITION';
  }

  /**
   * Verifica se tem capacidade definida
   */
  hasCapacity(): boolean {
    return this.props.capacity !== undefined;
  }

  /**
   * Atualiza o nome da localização
   * 
   * @param name Novo nome
   * @returns Result<void, string>
   */
  updateName(name: string): Result<void, string> {
    if (!name || name.trim().length === 0) {
      return Result.fail('Location name cannot be empty');
    }

    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Define a capacidade da localização
   * 
   * @param capacity Nova capacidade
   * @returns Result<void, string>
   */
  setCapacity(capacity: StockQuantity): Result<void, string> {
    if (!capacity.isPositive()) {
      return Result.fail('Capacity must be positive');
    }

    this.props.capacity = capacity;
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /**
   * Ativa a localização
   */
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Desativa a localização
   */
  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Igualdade baseada no ID
   */
  equals(other: Location): boolean {
    if (!other) return false;
    return this.props.id === other.id;
  }
}

