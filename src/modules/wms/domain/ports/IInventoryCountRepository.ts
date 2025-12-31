import type { InventoryCount } from '../entities/InventoryCount';

/**
 * IInventoryCountRepository - Port para persistência de contagens de inventário
 * E7.8 WMS Semana 2
 */
export interface IInventoryCountRepository {
  findById(id: string, organizationId: number, branchId: number): Promise<InventoryCount | null>;
  
  findByProductAndLocation(
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

