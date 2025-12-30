import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { Receipt } from '../../../domain/entities/receipt/Receipt';
import { ReceiptType } from '../../../domain/value-objects/receipt/ReceiptType';
import { 
  IReceiptRepository, 
  FindReceiptsFilters 
} from '../../../domain/ports/output/IReceiptRepository';
import { ReceiptMapper, ReceiptPersistence } from './ReceiptMapper';
import { receipts } from './ReceiptSchema';
import { db } from '@/lib/db';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';

/**
 * Implementação Drizzle: Repository de Recibos
 * 
 * REGRAS OBRIGATÓRIAS (infrastructure-layer.json):
 * 1. Multi-tenancy: TODOS os métodos filtram por organizationId E branchId
 * 2. Soft delete: deletedAt IS NULL em todos os filtros
 * 3. UPDATE com TODOS os campos mutáveis
 * 4. INSERT com TODOS os campos
 */
@injectable()
export class DrizzleReceiptRepository implements IReceiptRepository {
  /**
   * Salva recibo (insert ou update)
   */
  async save(receipt: Receipt): Promise<Result<void, string>> {
    try {
      const persistence = ReceiptMapper.toPersistence(receipt);

      // Verificar se existe
      const existingReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(
          and(
            eq(receipts.id, receipt.id),
            eq(receipts.organizationId, receipt.organizationId),
            eq(receipts.branchId, receipt.branchId),
            isNull(receipts.deletedAt)
          )
        );

      if (existingReceipts.length > 0) {
        // UPDATE com TODOS os campos mutáveis
        await db
          .update(receipts)
          .set({
            // Numeração (pode mudar se necessário)
            tipo: persistence.tipo,
            numero: persistence.numero,
            serie: persistence.serie,
            
            // Pagador
            pagadorNome: persistence.pagadorNome,
            pagadorDocumento: persistence.pagadorDocumento,
            pagadorTipoDocumento: persistence.pagadorTipoDocumento,
            pagadorEnderecoLogradouro: persistence.pagadorEnderecoLogradouro,
            pagadorEnderecoNumero: persistence.pagadorEnderecoNumero,
            pagadorEnderecoComplemento: persistence.pagadorEnderecoComplemento,
            pagadorEnderecoBairro: persistence.pagadorEnderecoBairro,
            pagadorEnderecoCidade: persistence.pagadorEnderecoCidade,
            pagadorEnderecoEstado: persistence.pagadorEnderecoEstado,
            pagadorEnderecoCep: persistence.pagadorEnderecoCep,
            
            // Recebedor
            recebedorNome: persistence.recebedorNome,
            recebedorDocumento: persistence.recebedorDocumento,
            recebedorTipoDocumento: persistence.recebedorTipoDocumento,
            recebedorEnderecoLogradouro: persistence.recebedorEnderecoLogradouro,
            recebedorEnderecoNumero: persistence.recebedorEnderecoNumero,
            recebedorEnderecoComplemento: persistence.recebedorEnderecoComplemento,
            recebedorEnderecoBairro: persistence.recebedorEnderecoBairro,
            recebedorEnderecoCidade: persistence.recebedorEnderecoCidade,
            recebedorEnderecoEstado: persistence.recebedorEnderecoEstado,
            recebedorEnderecoCep: persistence.recebedorEnderecoCep,
            
            // Valores
            valorAmount: persistence.valorAmount,
            valorCurrency: persistence.valorCurrency,
            valorPorExtenso: persistence.valorPorExtenso,
            
            // Detalhes
            descricao: persistence.descricao,
            formaPagamento: persistence.formaPagamento,
            dataRecebimento: persistence.dataRecebimento,
            localRecebimento: persistence.localRecebimento,
            
            // Vinculações
            financialTransactionId: persistence.financialTransactionId,
            payableId: persistence.payableId,
            receivableId: persistence.receivableId,
            tripId: persistence.tripId,
            expenseReportId: persistence.expenseReportId,
            
            // Emissão
            emitidoPor: persistence.emitidoPor,
            emitidoEm: persistence.emitidoEm,
            
            // Cancelamento
            status: persistence.status,
            canceladoEm: persistence.canceladoEm,
            canceladoPor: persistence.canceladoPor,
            motivoCancelamento: persistence.motivoCancelamento,
            
            // Auditoria
            updatedAt: persistence.updatedAt,
            updatedBy: persistence.updatedBy,
          })
          .where(
            and(
              eq(receipts.id, receipt.id),
              eq(receipts.organizationId, receipt.organizationId),
              eq(receipts.branchId, receipt.branchId)
            )
          );
      } else {
        // INSERT com TODOS os campos
        await db.insert(receipts).values(persistence);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to save receipt: ${(error as Error).message}`);
    }
  }

  /**
   * Busca por ID
   */
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<Receipt | null, string>> {
    try {
      const result = await db
        .select()
        .from(receipts)
        .where(
          and(
            eq(receipts.id, id),
            eq(receipts.organizationId, organizationId),
            eq(receipts.branchId, branchId),
            isNull(receipts.deletedAt)
          )
        );

      if (result.length === 0) {
        return Result.ok(null);
      }

      return ReceiptMapper.toDomain(result[0] as ReceiptPersistence);
    } catch (error) {
      return Result.fail(`Failed to find receipt by id: ${(error as Error).message}`);
    }
  }

  /**
   * Busca por número
   */
  async findByNumero(
    tipo: ReceiptType,
    serie: string,
    numero: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<Receipt | null, string>> {
    try {
      const result = await db
        .select()
        .from(receipts)
        .where(
          and(
            eq(receipts.tipo, tipo),
            eq(receipts.serie, serie.toUpperCase()),
            eq(receipts.numero, numero),
            eq(receipts.organizationId, organizationId),
            eq(receipts.branchId, branchId),
            isNull(receipts.deletedAt)
          )
        );

      if (result.length === 0) {
        return Result.ok(null);
      }

      return ReceiptMapper.toDomain(result[0] as ReceiptPersistence);
    } catch (error) {
      return Result.fail(`Failed to find receipt by numero: ${(error as Error).message}`);
    }
  }

  /**
   * Busca múltiplos recibos
   */
  async findMany(
    filters: FindReceiptsFilters
  ): Promise<Result<Receipt[], string>> {
    try {
      const conditions = [
        eq(receipts.organizationId, filters.organizationId),
        eq(receipts.branchId, filters.branchId),
        isNull(receipts.deletedAt),
      ];

      if (filters.tipo) {
        conditions.push(eq(receipts.tipo, filters.tipo));
      }

      if (filters.serie) {
        conditions.push(eq(receipts.serie, filters.serie.toUpperCase()));
      }

      if (filters.status) {
        conditions.push(eq(receipts.status, filters.status));
      }

      if (filters.emitidoPor) {
        conditions.push(eq(receipts.emitidoPor, filters.emitidoPor));
      }

      if (filters.dataRecebimentoInicio) {
        conditions.push(gte(receipts.dataRecebimento, filters.dataRecebimentoInicio));
      }

      if (filters.dataRecebimentoFim) {
        conditions.push(lte(receipts.dataRecebimento, filters.dataRecebimentoFim));
      }

      // TODO: Implementar paginação quando Drizzle ORM tiver suporte adequado para SQL Server
      // Por enquanto, retorna todos os registros limitados pela WHERE clause
      const result = await db
        .select()
        .from(receipts)
        .where(and(...conditions))
        .orderBy(receipts.emitidoEm);

      const receiptResults = result.map((r: unknown) =>
        ReceiptMapper.toDomain(r as ReceiptPersistence)
      );

      const receiptsArray: Receipt[] = [];
      for (const receiptResult of receiptResults) {
        if (Result.isFail(receiptResult)) {
          return Result.fail(receiptResult.error);
        }
        receiptsArray.push(receiptResult.value);
      }

      return Result.ok(receiptsArray);
    } catch (error) {
      return Result.fail(`Failed to find receipts: ${(error as Error).message}`);
    }
  }

  /**
   * Conta total de recibos
   */
  async count(
    filters: FindReceiptsFilters
  ): Promise<Result<number, string>> {
    try {
      const conditions = [
        eq(receipts.organizationId, filters.organizationId),
        eq(receipts.branchId, filters.branchId),
        isNull(receipts.deletedAt),
      ];

      if (filters.tipo) {
        conditions.push(eq(receipts.tipo, filters.tipo));
      }

      if (filters.serie) {
        conditions.push(eq(receipts.serie, filters.serie.toUpperCase()));
      }

      if (filters.status) {
        conditions.push(eq(receipts.status, filters.status));
      }

      if (filters.emitidoPor) {
        conditions.push(eq(receipts.emitidoPor, filters.emitidoPor));
      }

      if (filters.dataRecebimentoInicio) {
        conditions.push(gte(receipts.dataRecebimento, filters.dataRecebimentoInicio));
      }

      if (filters.dataRecebimentoFim) {
        conditions.push(lte(receipts.dataRecebimento, filters.dataRecebimentoFim));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(receipts)
        .where(and(...conditions));

      return Result.ok(Number(result[0].count));
    } catch (error) {
      return Result.fail(`Failed to count receipts: ${(error as Error).message}`);
    }
  }

  /**
   * Verifica se recibo existe
   */
  async exists(
    tipo: ReceiptType,
    serie: string,
    numero: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<boolean, string>> {
    try {
      const result = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(
          and(
            eq(receipts.tipo, tipo),
            eq(receipts.serie, serie.toUpperCase()),
            eq(receipts.numero, numero),
            eq(receipts.organizationId, organizationId),
            eq(receipts.branchId, branchId),
            isNull(receipts.deletedAt)
          )
        );

      return Result.ok(result.length > 0);
    } catch (error) {
      return Result.fail(`Failed to check receipt exists: ${(error as Error).message}`);
    }
  }
}

