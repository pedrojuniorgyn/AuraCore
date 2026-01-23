/**
 * Financial Domain Types - Payable
 * 
 * Tipos puros do domain para operações de Contas a Pagar.
 * Estes tipos são usados pelos Input Ports (domain/ports/input/).
 * 
 * @see ARCH-001: Domain não importa de Application
 * @see ARCH-003: Domain não importa bibliotecas externas (Zod)
 */

/**
 * Input para criar Conta a Pagar
 */
export interface CreatePayableInput {
  supplierId: number;
  documentNumber: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  categoryId?: number;
  costCenterId?: number;
  notes?: string;
  discountUntil?: string;
  discountAmount?: number;
  fineRate?: number;
  interestRate?: number;
}

/**
 * Output após criar Conta a Pagar
 */
export interface CreatePayableOutput {
  id: string;
  documentNumber: string;
  status: string;
  amount: number;
  currency: string;
  dueDate: string;
  createdAt: string;
}

/**
 * Métodos de pagamento suportados
 */
export type PaymentMethod = 'PIX' | 'BOLETO' | 'TED' | 'DOC' | 'CHEQUE' | 'CASH' | 'OTHER';

/**
 * Input para pagar Conta a Pagar
 */
export interface PayAccountPayableInput {
  payableId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  bankAccountId?: string;
  transactionId?: string;
  notes?: string;
  autoConfirm: boolean;
}

/**
 * Output após pagar Conta a Pagar
 */
export interface PayAccountPayableOutput {
  payableId: string;
  paymentId: string;
  payableStatus: string;
  paymentStatus: string;
  totalPaid: number;
  remainingAmount: number;
  paidAt: string;
}

/**
 * Contexto de execução para Use Cases
 */
export interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin?: boolean;
}

/**
 * Response type para Payable (usado em consultas)
 */
export interface PayableResponse {
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
 * Resultado paginado de Payables
 */
export interface PaginatedPayables {
  data: PayableResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
