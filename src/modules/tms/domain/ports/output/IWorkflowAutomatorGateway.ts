/**
 * Gateway para automação de workflow TMS
 * Encapsula criação de ordens de coleta a partir de cotações aprovadas
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica interna para Domain Services
 */

import { Result } from '@/shared/domain';

export interface PickupOrderCreatedResult {
  id: number;
  orderNumber: string;
}

export interface CreatePickupOrderParams {
  quoteId: number;
  createdBy: string;
  organizationId: number;
  branchId: number;
}

export interface IWorkflowAutomatorGateway {
  /**
   * Cria ordem de coleta a partir de cotação aprovada
   */
  createPickupOrderFromQuote(
    params: CreatePickupOrderParams
  ): Promise<Result<PickupOrderCreatedResult, string>>;
}
