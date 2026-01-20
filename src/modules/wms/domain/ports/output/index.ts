/**
 * Output Ports - WMS Module
 *
 * Interfaces (Ports) para repositórios - implementados pela camada de infraestrutura.
 *
 * @module wms/domain/ports/output
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 * @see E7.26: Reorganização de Output Ports
 */

export type { IStockRepository } from './IStockRepository';
export type { ILocationRepository } from './ILocationRepository';
export type { IMovementRepository } from './IMovementRepository';
export type { IInventoryCountRepository } from './IInventoryCountRepository';
export type { 
  IWmsBillingGateway,
  PreInvoiceApprovalParams,
  IssueNfseParams,
} from './IWmsBillingGateway';
