/**
 * IListCtesUseCase - Input Port
 *
 * Interface do caso de uso para listagem paginada de CTes.
 * Define contrato entre Application e Domain layers.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see IListFiscalDocuments - Port genérico de listagem
 * @see IFiscalDocumentRepository - Repository compartilhado
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

// ============================================================================
// INPUT
// ============================================================================

export interface ListCtesInput {
  /** Número da página (default: 1) */
  page?: number;
  /** Tamanho da página (default: 20) */
  pageSize?: number;
  /** Filtrar por status */
  status?: string[];
  /** Data de emissão (de) */
  issueDateFrom?: Date;
  /** Data de emissão (até) */
  issueDateTo?: Date;
  /** Busca textual (número, chave, remetente, destinatário) */
  search?: string;
  /** Campo de ordenação */
  sortBy?: string;
  /** Ordem de classificação */
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// OUTPUT DTOs
// ============================================================================

export interface CteListItemDto {
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
  /** Nome do remetente */
  senderName?: string;
  /** Nome do destinatário */
  recipientName?: string;
  /** Cidade de origem */
  originCity?: string;
  /** Cidade de destino */
  destinationCity?: string;
  /** Data de criação */
  createdAt: Date;
}

export interface ListCtesOutput {
  /** Lista de CTes */
  items: CteListItemDto[];
  /** Total de registros */
  total: number;
  /** Página atual */
  page: number;
  /** Tamanho da página */
  pageSize: number;
  /** Total de páginas */
  totalPages: number;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para listagem paginada de CTes.
 *
 * Filtra automaticamente por documentType: 'CTE' e multi-tenancy
 * (organizationId + branchId via ExecutionContext).
 */
export interface IListCtesUseCase {
  execute(input: ListCtesInput, context: ExecutionContext): Promise<Result<ListCtesOutput, string>>;
}
