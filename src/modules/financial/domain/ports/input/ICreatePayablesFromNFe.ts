/**
 * ICreatePayablesFromNFe - Input Port (ARCH-010)
 * 
 * Gera contas a pagar automaticamente a partir de uma NFe importada.
 * Extrai parcelas de <cobr><dup> do XML e cria um AccountPayable por parcela.
 * 
 * Referência: PLANEJAMENTO_CONTAS_PAGAR_RECEBER.md
 */
import { Result } from '@/shared/domain';

export interface CreatePayablesFromNFeInput {
  /** ID do fiscal_documents (legacy) */
  fiscalDocumentId: number;
}

export interface CreatePayablesFromNFeOutput {
  /** IDs dos payables criados (UUID) */
  payableIds: string[];
  /** Total de parcelas extraídas */
  installmentCount: number;
  /** Valor total */
  totalAmount: number;
  /** Fornecedor */
  supplierName: string;
  /** Número do documento */
  documentNumber: string;
}

export interface ICreatePayablesFromNFe {
  execute(
    input: CreatePayablesFromNFeInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreatePayablesFromNFeOutput, string>>;
}
