/**
 * BtgDdaAdapter - Infrastructure Adapter for DDA operations
 *
 * Implements IBtgDdaGateway by delegating to the legacy BtgDdaService.
 * This is a transitional adapter (Anti-Corruption Layer) that wraps the
 * legacy service until its logic can be fully migrated to Domain Services.
 *
 * @see IBtgDdaGateway
 * @see ARCH-011: Implements interface from domain/ports/output/
 * @see INFRA-010: ACL for external integrations
 * @since E10 - Legacy service wrapping
 */

import { injectable } from '@/shared/infrastructure/di/container';
import type {
  IBtgDdaGateway,
  DdaBoleto,
} from '../../../domain/ports/output/IBtgDdaGateway';

// Import legacy service
import { BtgDdaService } from '@/services/banking/btg-dda-service';

@injectable()
export class BtgDdaAdapter implements IBtgDdaGateway {
  /**
   * Fetches DDA boletos from BTG via legacy service
   */
  async fetchDdaBoletos(
    organizationId: number,
    bankAccountId: number,
  ): Promise<DdaBoleto[]> {
    const service = new BtgDdaService(organizationId, bankAccountId);
    return service.fetchDdaBoletos();
  }

  /**
   * Synchronizes DDA inbox via legacy service
   */
  async syncDdaInbox(
    organizationId: number,
    bankAccountId: number,
  ): Promise<number> {
    const service = new BtgDdaService(organizationId, bankAccountId);
    return service.syncDdaInbox();
  }

  /**
   * Links DDA to payable via legacy service
   */
  async linkDdaToPayable(
    ddaId: number,
    payableId: number,
    organizationId: number,
  ): Promise<void> {
    // Legacy service requires bankAccountId in constructor.
    // For linking, the actual bankAccountId doesn't affect the operation
    // since it only updates DDA and payable records by their IDs.
    const service = new BtgDdaService(organizationId, 0);
    await service.linkDdaToPayable(ddaId, payableId);
  }

  /**
   * Creates payable from DDA via legacy service
   */
  async createPayableFromDda(
    ddaId: number,
    organizationId: number,
    bankAccountId: number,
  ): Promise<number> {
    const service = new BtgDdaService(organizationId, bankAccountId);
    return service.createPayableFromDda(ddaId);
  }
}
