/**
 * Repository Port: IApprovalHistoryRepository
 * Interface para persistência de histórico de aprovação
 *
 * @module strategic/domain/ports/output
 * @see ADR-0021
 */
import { ApprovalHistory } from '../../entities/ApprovalHistory';

export interface IApprovalHistoryRepository {
  /**
   * Busca histórico de uma estratégia específica
   */
  findByStrategyId(
    strategyId: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory[]>;

  /**
   * Busca histórico de ações de um usuário específico
   */
  findByActorUserId(
    actorUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory[]>;

  /**
   * Salva uma entrada de histórico
   */
  save(entity: ApprovalHistory): Promise<void>;

  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalHistory | null>;
}
