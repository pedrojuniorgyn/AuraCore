/**
 * Port: IVerificationItemRepository
 * Interface para persistência de VerificationItem
 *
 * ⚠️ MULTI-TENANCY: Todos os métodos DEVEM receber organizationId E branchId
 *
 * @module strategic/domain/ports/output
 */
import type { VerificationItem } from '../../entities/VerificationItem';
import type { Result } from '@/shared/domain';
import type { VerificationItemStatus } from '../../entities/VerificationItem';

export interface VerificationItemFilters {
  controlItemId?: string;
  status?: VerificationItemStatus;
  responsibleUserId?: string;
}

export interface IVerificationItemRepository {
  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem | null>;

  /**
   * Busca por Item de Controle
   */
  findByControlItemId(
    controlItemId: string,
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem[]>;

  /**
   * Lista com filtros e paginação
   */
  findAll(
    organizationId: number,
    branchId: number,
    filters?: VerificationItemFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ items: VerificationItem[]; total: number }>;

  /**
   * Busca itens com verificações em atraso
   */
  findOverdue(
    organizationId: number,
    branchId: number
  ): Promise<VerificationItem[]>;

  /**
   * Salva (insert ou update)
   */
  save(entity: VerificationItem): Promise<Result<void, string>>;

  /**
   * Soft delete
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number,
    deletedBy: string
  ): Promise<Result<void, string>>;
}
