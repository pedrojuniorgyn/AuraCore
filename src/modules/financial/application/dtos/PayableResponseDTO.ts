import { AccountPayable } from '../../domain/entities/AccountPayable';
import { Result } from '@/shared/domain';

/**
 * DTO para resposta de listagem/busca
 */
export interface PayableResponseDTO {
  id: string;
  organizationId: number;
  branchId: number;
  supplierId: number;
  documentNumber: string;
  description: string;
  status: string;
  originalAmount: number;
  totalDue: number;
  totalPaid: number;
  remainingAmount: number;
  currency: string;
  dueDate: string;
  isOverdue: boolean;
  categoryId?: number;
  costCenterId?: number;
  notes?: string;
  paymentsCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mapper: Domain → DTO
 */
export function toPayableResponseDTO(payable: AccountPayable): PayableResponseDTO {
  const totalDueResult = payable.terms.calculateTotalDue();
  
  return {
    id: payable.id,
    organizationId: payable.organizationId,
    branchId: payable.branchId,
    supplierId: payable.supplierId,
    documentNumber: payable.documentNumber,
    description: payable.description,
    status: payable.status,
    originalAmount: payable.originalAmount.amount,
    totalDue: Result.isOk(totalDueResult) ? totalDueResult.value.amount : payable.originalAmount.amount,
    totalPaid: payable.totalPaid.amount,
    remainingAmount: payable.remainingAmount.amount,
    currency: payable.originalAmount.currency,
    dueDate: payable.terms.dueDate.toISOString(),
    isOverdue: payable.isOverdue,
    categoryId: payable.categoryId,
    costCenterId: payable.costCenterId,
    notes: payable.notes,
    paymentsCount: payable.payments.length,
    version: payable.version,
    createdAt: payable.createdAt.toISOString(),
    updatedAt: payable.updatedAt.toISOString(),
  };
}

/**
 * DTO para listagem paginada
 */
export interface PaginatedPayablesDTO {
  data: PayableResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

