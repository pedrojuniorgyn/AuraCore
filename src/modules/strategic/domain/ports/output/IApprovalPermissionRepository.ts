/**
 * Repository Interface: IApprovalPermissionRepository
 * Gerencia permissões de aprovação e delegações
 * 
 * @module strategic/domain/ports/output
 * @see REPO-001 a REPO-012
 */
import type { ApprovalDelegate } from '../../entities/ApprovalDelegate';
import type { Result } from '@/shared/domain';

export interface IApprovalPermissionRepository {
  /**
   * Busca IDs de usuários que são aprovadores configurados
   * para uma organização/filial
   */
  findApproversByOrg(
    organizationId: number,
    branchId: number
  ): Promise<number[]>;

  /**
   * Busca delegações ativas onde o usuário é delegado
   * (ou seja, recebeu permissão de outro usuário)
   */
  findActiveDelegatesFor(
    delegateUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]>;

  /**
   * Busca delegações criadas por um usuário
   * (delegações que ele deu para outros)
   */
  findDelegationsBy(
    delegatorUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]>;

  /**
   * Salva delegação (create ou update)
   */
  saveDelegate(
    delegate: ApprovalDelegate
  ): Promise<Result<void, string>>;

  /**
   * Revoga delegação
   */
  revokeDelegate(
    delegateId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>>;

  /**
   * Busca delegação por ID
   */
  findDelegateById(
    delegateId: string,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate | null>;
}
