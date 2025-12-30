import { Result } from '@/shared/domain';
import { ReceiptType } from '../value-objects/receipt/ReceiptType';

/**
 * Domain Service: Gerador de Números de Recibo
 * 
 * Gera números sequenciais únicos por organização/filial/tipo/série.
 * 
 * Exemplo:
 * - Primeiro recibo FRETE da série 'A': 1
 * - Segundo recibo FRETE da série 'A': 2
 * - Primeiro recibo ADIANTAMENTO da série 'A': 1 (contador separado)
 */
export interface IReceiptNumberGenerator {
  /**
   * Gera próximo número para o tipo/série
   */
  generateNext(
    organizationId: number,
    branchId: number,
    tipo: ReceiptType,
    serie: string
  ): Promise<Result<number, string>>;

  /**
   * Obtém o último número gerado (para consulta)
   */
  getCurrentNumber(
    organizationId: number,
    branchId: number,
    tipo: ReceiptType,
    serie: string
  ): Promise<Result<number, string>>;
}

