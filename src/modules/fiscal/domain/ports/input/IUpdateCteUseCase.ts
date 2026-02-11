/**
 * IUpdateCteUseCase - Input Port
 *
 * Interface do caso de uso para atualização de um CTe em status DRAFT.
 * Permite alterar campos editáveis antes da transmissão para SEFAZ.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see IFiscalDocumentRepository - Repository compartilhado
 * @see FiscalDocument.isEditable - Apenas DRAFT permite edição
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

// ============================================================================
// INPUT
// ============================================================================

export interface UpdateCteInput {
  /** ID do CTe a ser atualizado */
  cteId: string;
  /** Novo status (opcional) */
  status?: string;
  /** Nome do destinatário (opcional) */
  recipientName?: string;
  /** CNPJ/CPF do destinatário (opcional) */
  recipientCnpj?: string;
  /** Valor total do documento (opcional) */
  totalValue?: number;
  /** Itens do documento (opcional - substitui todos os itens) */
  items?: Array<{
    /** Descrição do item */
    description: string;
    /** Quantidade */
    quantity: number;
    /** Valor do item */
    value: number;
  }>;
}

// ============================================================================
// OUTPUT
// ============================================================================

export interface UpdateCteOutput {
  /** ID do CTe atualizado */
  id: string;
  /** Data da última atualização */
  updatedAt: Date;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para atualização de CTe.
 *
 * Regras:
 * - Somente CTes em status DRAFT podem ser atualizados
 * - Valida que o documento é do tipo CTE
 * - Aplica multi-tenancy (organizationId + branchId via ExecutionContext)
 */
export interface IUpdateCteUseCase {
  execute(input: UpdateCteInput, context: ExecutionContext): Promise<Result<UpdateCteOutput, string>>;
}
