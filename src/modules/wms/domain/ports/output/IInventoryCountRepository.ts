import type { InventoryCount } from '../../entities/InventoryCount';

/**
 * IInventoryCountRepository - Port para persistência de contagens de inventário
 *
 * E7.8 WMS Semana 2
 * E7.26 - Movido para domain/ports/output/
 *
 * Padrão: Repository Pattern com multi-tenancy obrigatório
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 * @see REPO-005: TODA query filtra organizationId + branchId
 * @see REPO-006: Soft delete: filtrar deletedAt IS NULL
 */
export interface IInventoryCountRepository {
  findById(id: string, organizationId: number, branchId: number): Promise<InventoryCount | null>;

  findByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount | null>;

  /**
   * Bug 13 Fix: Encontrar contagem pendente para produto/localização específicos
   * Usado para evitar duplicação em requisições concorrentes
   */
  findPendingByProductAndLocation(
    productId: string,
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount | null>;

  findPendingByLocation(
    locationId: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount[]>;

  findByStatus(
    status: string,
    organizationId: number,
    branchId: number
  ): Promise<InventoryCount[]>;

  save(inventoryCount: InventoryCount): Promise<void>;

  delete(id: string, organizationId: number, branchId: number): Promise<void>;
}
