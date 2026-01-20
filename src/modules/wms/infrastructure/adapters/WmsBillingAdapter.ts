/**
 * WmsBillingAdapter
 *
 * Implementa IWmsBillingGateway usando o serviço legado.
 * Wrapper temporário até migração completa da lógica para Domain Service.
 *
 * @module wms/infrastructure/adapters
 * @see E9 Fase 2: Wrapper do @/services/wms-billing-engine
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IWmsBillingGateway,
  PreInvoiceApprovalParams,
  IssueNfseParams,
} from '../../domain/ports/output/IWmsBillingGateway';

// TODO (E10): Migrar lógica para Domain Service
import { WMSBillingEngine } from '@/services/wms-billing-engine';

@injectable()
export class WmsBillingAdapter implements IWmsBillingGateway {
  
  async sendForApproval(params: PreInvoiceApprovalParams): Promise<Result<void, string>> {
    try {
      await WMSBillingEngine.sendForApproval(params.preInvoiceId);
      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao enviar para aprovação: ${message}`);
    }
  }

  async issueNfse(params: IssueNfseParams): Promise<Result<void, string>> {
    try {
      await WMSBillingEngine.issueNFSe(params.preInvoiceId, params.invoiceNumber);
      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao emitir NFS-e: ${message}`);
    }
  }
}
