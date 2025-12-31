import { Location } from '../entities/Location';
import { LocationCode } from '../value-objects/LocationCode';

/**
 * ILocationRepository: Port para repositório de localizações
 * 
 * E7.8 WMS - Semana 1
 * 
 * Padrão: Repository Pattern com multi-tenancy obrigatório
 */

export interface ILocationRepository {
  /**
   * Busca localização por ID
   * 
   * @param id ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Location | null
   */
  findById(id: string, organizationId: number, branchId: number): Promise<Location | null>;

  /**
   * Busca localização por código dentro de um armazém
   * 
   * @param code Código da localização
   * @param warehouseId ID do armazém
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Location | null
   */
  findByCode(
    code: LocationCode,
    warehouseId: string,
    organizationId: number,
    branchId: number
  ): Promise<Location | null>;

  /**
   * Busca todas as localizações de um armazém
   * 
   * @param warehouseId ID do armazém
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Location[]
   */
  findByWarehouse(warehouseId: string, organizationId: number, branchId: number): Promise<Location[]>;

  /**
   * Busca localizações filhas de uma localização pai
   * 
   * @param parentId ID da localização pai
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Location[]
   */
  findChildren(parentId: string, organizationId: number, branchId: number): Promise<Location[]>;

  /**
   * Busca localizações ativas de um armazém
   * 
   * @param warehouseId ID do armazém
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns Location[]
   */
  findActiveByWarehouse(warehouseId: string, organizationId: number, branchId: number): Promise<Location[]>;

  /**
   * Verifica se uma localização existe
   * 
   * @param id ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns boolean
   */
  exists(id: string, organizationId: number, branchId: number): Promise<boolean>;

  /**
   * Salva uma localização (insert ou update)
   * 
   * @param location Localização a salvar
   * @returns void
   */
  save(location: Location): Promise<void>;

  /**
   * Deleta uma localização (soft delete)
   * 
   * @param id ID da localização
   * @param organizationId ID da organização
   * @param branchId ID da filial
   * @returns void
   */
  delete(id: string, organizationId: number, branchId: number): Promise<void>;
}

