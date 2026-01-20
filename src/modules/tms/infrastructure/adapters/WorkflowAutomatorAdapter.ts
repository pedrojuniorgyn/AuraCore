/**
 * Adapter para workflow-automator legado
 * Wrapper que delega para serviço legado em @/services/tms/workflow-automator
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { 
  IWorkflowAutomatorGateway, 
  CreatePickupOrderParams,
  PickupOrderCreatedResult,
} from '../../domain/ports/output/IWorkflowAutomatorGateway';

// Import legado - será removido em E10
import { createPickupOrderFromQuote as legacyCreatePickupOrder } from '@/services/tms/workflow-automator';

@injectable()
export class WorkflowAutomatorAdapter implements IWorkflowAutomatorGateway {
  async createPickupOrderFromQuote(
    params: CreatePickupOrderParams
  ): Promise<Result<PickupOrderCreatedResult, string>> {
    try {
      const pickupOrder = await legacyCreatePickupOrder(
        params.quoteId,
        params.createdBy
      );

      return Result.ok({
        id: pickupOrder.id,
        orderNumber: pickupOrder.orderNumber,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao criar ordem de coleta: ${message}`);
    }
  }
}
