import type { AccountDetermination } from '../../entities/AccountDetermination';
import type { OperationTypeValue } from '../../value-objects/OperationType';

/**
 * IAccountDeterminationRepository - Output Port
 * 
 * Interface para persistência de regras de determinação contábil.
 * 
 * @see REPO-001: Interface em domain/ports/output/
 * @see REPO-005: TODA query filtra organizationId + branchId
 */
export interface IAccountDeterminationRepository {
  /**
   * Busca regra por tipo de operação (para uma org/branch específica)
   */
  findByOperationType(
    organizationId: number,
    branchId: number,
    operationType: OperationTypeValue
  ): Promise<AccountDetermination | null>;

  /**
   * Lista todas as regras de uma organização/filial
   */
  findAll(
    organizationId: number,
    branchId: number
  ): Promise<AccountDetermination[]>;

  /**
   * Salva (insert ou update) uma regra
   */
  save(entity: AccountDetermination): Promise<void>;

  /**
   * Remove (soft delete) uma regra
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;

  /**
   * Seed: Insere regras padrão se não existirem
   */
  seedDefaults(
    organizationId: number,
    branchId: number,
    rules: AccountDetermination[]
  ): Promise<number>;
}
