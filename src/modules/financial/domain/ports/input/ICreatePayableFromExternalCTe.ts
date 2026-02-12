/**
 * ICreatePayableFromExternalCTe - Input Port (ARCH-010)
 * 
 * Gera conta a pagar automaticamente a partir de um CTe externo (redespacho).
 * Quando CTe com cte_origin=EXTERNAL e tpServ=REDESPACHO é importado,
 * cria AccountPayable automaticamente com o valor do frete.
 * 
 * Referência: PLANEJAMENTO_CONTAS_PAGAR_RECEBER.md
 */
import { Result } from '@/shared/domain';

export interface CreatePayableFromExternalCTeInput {
  /** ID do CTe (DDD UUID) */
  cteId: string;
}

export interface CreatePayableFromExternalCTeOutput {
  /** ID do payable criado (UUID) */
  payableId: string;
  /** Valor do frete */
  freightAmount: number;
  /** Transportadora */
  carrierName: string;
  /** Número do CTe */
  cteNumber: string;
}

export interface ICreatePayableFromExternalCTe {
  execute(
    input: CreatePayableFromExternalCTeInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreatePayableFromExternalCTeOutput, string>>;
}
