import { Result } from '@/shared/domain';

/**
 * Value Object: Tipo de Recibo
 * 
 * Define as categorias de recibos emitidos no contexto TMS/Logística:
 * - FRETE: Pagamento a motorista autônomo
 * - ADIANTAMENTO: Adiantamento de viagem
 * - REEMBOLSO: Reembolso de despesas
 * - DEVOLUCAO: Devolução de valores
 * - SERVICO: Prestação de serviço genérica
 * - GENERICO: Outros pagamentos/recebimentos
 */
export type ReceiptType =
  | 'FRETE'
  | 'ADIANTAMENTO'
  | 'REEMBOLSO'
  | 'DEVOLUCAO'
  | 'SERVICO'
  | 'GENERICO';

/**
 * Lista de todos os tipos válidos
 */
export const RECEIPT_TYPES: readonly ReceiptType[] = [
  'FRETE',
  'ADIANTAMENTO',
  'REEMBOLSO',
  'DEVOLUCAO',
  'SERVICO',
  'GENERICO',
] as const;

/**
 * Verifica se um valor é um tipo válido
 */
export function isValidReceiptType(type: string): type is ReceiptType {
  return RECEIPT_TYPES.includes(type as ReceiptType);
}

/**
 * Cria um Value Object de tipo
 */
export function createReceiptType(type: string): Result<ReceiptType, string> {
  if (!isValidReceiptType(type)) {
    return Result.fail(
      `Invalid receipt type: ${type}. Must be one of: ${RECEIPT_TYPES.join(', ')}`
    );
  }
  
  return Result.ok(type);
}

