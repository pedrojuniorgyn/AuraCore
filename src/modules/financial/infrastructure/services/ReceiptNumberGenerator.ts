import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { ReceiptType } from '../../domain/value-objects/receipt/ReceiptType';
import { IReceiptNumberGenerator } from '../../domain/services/IReceiptNumberGenerator';
import { db } from '@/lib/db';
import { receipts } from '../persistence/receipt/ReceiptSchema';
import { eq, and, isNull, max } from 'drizzle-orm';

/**
 * Implementação: Gerador de Números de Recibo
 * 
 * Gera números sequenciais por org/branch/tipo/série
 * usando a tabela de receipts como fonte de verdade.
 */
@injectable()
export class ReceiptNumberGenerator implements IReceiptNumberGenerator {
  /**
   * Gera próximo número para o tipo/série
   */
  async generateNext(
    organizationId: number,
    branchId: number,
    tipo: ReceiptType,
    serie: string
  ): Promise<Result<number, string>> {
    try {
      // Buscar último número usado
      const lastReceipts = await db
        .select({ maxNumero: max(receipts.numero) })
        .from(receipts)
        .where(
          and(
            eq(receipts.organizationId, organizationId),
            eq(receipts.branchId, branchId),
            eq(receipts.tipo, tipo),
            eq(receipts.serie, serie.toUpperCase()),
            isNull(receipts.deletedAt)
          )
        );

      const lastNumero = lastReceipts[0]?.maxNumero;
      const nextNumero = lastNumero ? lastNumero + 1 : 1;

      return Result.ok(nextNumero);
    } catch (error) {
      return Result.fail(
        `Failed to generate next receipt number: ${(error as Error).message}`
      );
    }
  }

  /**
   * Obtém o último número gerado
   */
  async getCurrentNumber(
    organizationId: number,
    branchId: number,
    tipo: ReceiptType,
    serie: string
  ): Promise<Result<number, string>> {
    try {
      const lastReceipts = await db
        .select({ maxNumero: max(receipts.numero) })
        .from(receipts)
        .where(
          and(
            eq(receipts.organizationId, organizationId),
            eq(receipts.branchId, branchId),
            eq(receipts.tipo, tipo),
            eq(receipts.serie, serie.toUpperCase()),
            isNull(receipts.deletedAt)
          )
        );

      const lastNumero = lastReceipts[0]?.maxNumero;

      return Result.ok(lastNumero || 0);
    } catch (error) {
      return Result.fail(
        `Failed to get current receipt number: ${(error as Error).message}`
      );
    }
  }
}

