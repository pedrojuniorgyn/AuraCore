/**
 * IGetCteByIdUseCase - Input Port
 *
 * Interface do caso de uso para consulta de um CTe por ID.
 * Retorna dados detalhados incluindo itens do documento.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see IGetFiscalDocumentById - Port genérico de consulta por ID
 * @see IFiscalDocumentRepository - Repository compartilhado
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

// ============================================================================
// INPUT
// ============================================================================

export interface GetCteByIdInput {
  /** ID do CTe */
  cteId: string;
}

// ============================================================================
// OUTPUT DTOs
// ============================================================================

export interface CteDetailDto {
  /** ID do CTe */
  id: string;
  /** Série do CTe */
  series: string;
  /** Número do CTe */
  number: string;
  /** Status atual */
  status: string;
  /** Chave fiscal (44 dígitos) */
  fiscalKey?: string;
  /** Data de emissão */
  issueDate: Date;
  /** Valor total do documento */
  totalValue: number;
  /** CNPJ do remetente */
  senderCnpj?: string;
  /** Nome do remetente */
  senderName?: string;
  /** CNPJ/CPF do destinatário */
  recipientCnpj?: string;
  /** Nome do destinatário */
  recipientName?: string;
  /** Cidade de origem */
  originCity?: string;
  /** Cidade de destino */
  destinationCity?: string;
  /** Itens do documento */
  items: Array<{
    /** Descrição do item */
    description: string;
    /** Quantidade */
    quantity: number;
    /** Valor do item */
    value: number;
  }>;
  /** Data de criação */
  createdAt: Date;
  /** Data de atualização */
  updatedAt: Date;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para consulta de CTe por ID.
 *
 * Valida que o documento é do tipo CTE e pertence ao tenant
 * (organizationId + branchId via ExecutionContext).
 */
export interface IGetCteByIdUseCase {
  execute(input: GetCteByIdInput, context: ExecutionContext): Promise<Result<CteDetailDto, string>>;
}
