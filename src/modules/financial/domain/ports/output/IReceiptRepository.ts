import { Result } from '@/shared/domain';
import { Receipt } from '../../entities/receipt/Receipt';
import { ReceiptType } from '../../value-objects/receipt/ReceiptType';

/**
 * Filtros para busca de recibos
 */
export interface FindReceiptsFilters {
  organizationId: number;
  branchId: number;
  tipo?: ReceiptType;
  serie?: string;
  status?: 'ACTIVE' | 'CANCELLED';
  emitidoPor?: string;
  dataRecebimentoInicio?: Date;
  dataRecebimentoFim?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Port: Repository de Recibos
 * 
 * Define operações de persistência para Aggregate Root Receipt.
 * 
 * REGRAS OBRIGATÓRIAS:
 * - Multi-tenancy: TODOS os métodos filtram por organizationId E branchId
 * - Soft delete: deletedAt IS NULL em todos os filtros
 * - branchId NUNCA é opcional
 */
export interface IReceiptRepository {
  /**
   * Salva recibo (insert ou update)
   */
  save(receipt: Receipt): Promise<Result<void, string>>;

  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<Receipt | null, string>>;

  /**
   * Busca por número
   */
  findByNumero(
    tipo: ReceiptType,
    serie: string,
    numero: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<Receipt | null, string>>;

  /**
   * Busca múltiplos recibos
   */
  findMany(
    filters: FindReceiptsFilters
  ): Promise<Result<Receipt[], string>>;

  /**
   * Conta total de recibos
   */
  count(
    filters: FindReceiptsFilters
  ): Promise<Result<number, string>>;

  /**
   * Verifica se recibo existe
   */
  exists(
    tipo: ReceiptType,
    serie: string,
    numero: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<boolean, string>>;
}

