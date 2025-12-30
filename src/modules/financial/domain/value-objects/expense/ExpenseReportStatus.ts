import { Result } from '@/shared/domain';

/**
 * Value Object: Status do Relatório de Despesas
 * 
 * Representa os estados possíveis de um relatório de despesas:
 * - DRAFT: Rascunho, colaborador ainda está preenchendo
 * - SUBMITTED: Submetido para aprovação do gestor
 * - UNDER_REVIEW: Em análise pelo gestor
 * - APPROVED: Aprovado, pronto para processamento financeiro
 * - REJECTED: Rejeitado, deve ser revisado
 * - PAID: Reembolso já foi pago
 * 
 * Transições permitidas:
 * - DRAFT → SUBMITTED (submit)
 * - SUBMITTED → UNDER_REVIEW (início de análise)
 * - SUBMITTED → APPROVED (aprovação direta)
 * - SUBMITTED → REJECTED (rejeição)
 * - UNDER_REVIEW → APPROVED (approve)
 * - UNDER_REVIEW → REJECTED (reject)
 * - REJECTED → DRAFT (revisão para resubmissão)
 * - APPROVED → PAID (após pagamento do título)
 */
export type ExpenseReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

/**
 * Lista de todos os status válidos
 */
export const EXPENSE_REPORT_STATUSES: readonly ExpenseReportStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID',
] as const;

/**
 * Transições de status permitidas
 */
export const ALLOWED_EXPENSE_REPORT_TRANSITIONS: Record<ExpenseReportStatus, ExpenseReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: ['DRAFT'],
  PAID: [], // Estado final
};

/**
 * Verifica se um valor é um status válido
 */
export function isValidExpenseReportStatus(status: string): status is ExpenseReportStatus {
  return EXPENSE_REPORT_STATUSES.includes(status as ExpenseReportStatus);
}

/**
 * Verifica se transição de status é permitida
 */
export function canTransitionToExpenseReportStatus(
  from: ExpenseReportStatus,
  to: ExpenseReportStatus
): boolean {
  return ALLOWED_EXPENSE_REPORT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Cria um Value Object de status
 */
export function createExpenseReportStatus(status: string): Result<ExpenseReportStatus, string> {
  if (!isValidExpenseReportStatus(status)) {
    return Result.fail(
      `Invalid expense report status: ${status}. Must be one of: ${EXPENSE_REPORT_STATUSES.join(', ')}`
    );
  }
  
  return Result.ok(status);
}

/**
 * Descrições dos status
 */
export const EXPENSE_REPORT_STATUS_DESCRIPTIONS: Record<ExpenseReportStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Submetido para Aprovação',
  UNDER_REVIEW: 'Em Análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAID: 'Pago',
};

/**
 * Obtém a descrição de um status
 */
export function getExpenseReportStatusDescription(status: ExpenseReportStatus): string {
  return EXPENSE_REPORT_STATUS_DESCRIPTIONS[status];
}

