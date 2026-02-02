/**
 * Application Service: ApprovalPermissionService
 * Gerencia permissões de aprovação e delegações
 * 
 * @module strategic/application/services
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { ApprovalDelegate } from '../../domain/entities/ApprovalDelegate';
import type { IApprovalPermissionRepository } from '../../domain/ports/output/IApprovalPermissionRepository';
import { STRATEGIC_TOKENS } from '../../infrastructure/di/tokens';

@injectable()
export class ApprovalPermissionService {
  constructor(
    @inject(STRATEGIC_TOKENS.ApprovalPermissionRepository)
    private readonly permissionRepo: IApprovalPermissionRepository
  ) {}

  /**
   * Verifica se usuário pode aprovar uma estratégia
   * 
   * Lógica:
   * 1. Verificar se é aprovador direto (configurado)
   * 2. Verificar se tem delegação ativa
   */
  async canApprove(
    userId: number,
    strategyId: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean> {
    // 1. Verificar se é aprovador direto
    const approvers = await this.permissionRepo.findApproversByOrg(
      organizationId,
      branchId
    );

    if (approvers.includes(userId)) {
      return true;
    }

    // 2. Verificar delegação ativa
    const delegates = await this.permissionRepo.findActiveDelegatesFor(
      userId,
      organizationId,
      branchId
    );

    // Usuário tem delegação ativa se alguma delegação está ativa agora
    const hasActiveDelegation = delegates.some((d) => d.isActiveNow());

    return hasActiveDelegation;
  }

  /**
   * Cria delegação de permissão
   */
  async delegate(
    from: number,
    to: number,
    startDate: Date,
    endDate: Date | null,
    organizationId: number,
    branchId: number,
    createdBy: string
  ): Promise<Result<ApprovalDelegate, string>> {
    // Verificar se delegator é aprovador
    const canDelegate = await this.canApprove(
      from,
      '', // strategyId não usado aqui
      organizationId,
      branchId
    );

    if (!canDelegate) {
      return Result.fail(
        'Usuário não tem permissão para delegar aprovações (não é aprovador)'
      );
    }

    // Criar delegação
    const delegateResult = ApprovalDelegate.create({
      organizationId,
      branchId,
      delegatorUserId: from,
      delegateUserId: to,
      startDate,
      endDate,
      createdBy,
    });

    if (!Result.isOk(delegateResult)) {
      return delegateResult;
    }

    // Salvar
    const saveResult = await this.permissionRepo.saveDelegate(
      delegateResult.value
    );

    if (!Result.isOk(saveResult)) {
      return Result.fail(saveResult.error);
    }

    return Result.ok(delegateResult.value);
  }

  /**
   * Revoga delegação
   */
  async revokeDelegate(
    delegateId: string,
    userId: number,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    // Buscar delegação
    const delegate = await this.permissionRepo.findDelegateById(
      delegateId,
      organizationId,
      branchId
    );

    if (!delegate) {
      return Result.fail('Delegação não encontrada');
    }

    // Verificar se usuário é o delegator ou aprovador
    const canRevoke =
      delegate.delegatorUserId === userId ||
      (await this.canApprove(userId, '', organizationId, branchId));

    if (!canRevoke) {
      return Result.fail('Usuário não tem permissão para revogar esta delegação');
    }

    // Revogar
    const revokeResult = delegate.revoke();
    if (!Result.isOk(revokeResult)) {
      return revokeResult;
    }

    // Salvar
    return await this.permissionRepo.saveDelegate(delegate);
  }

  /**
   * Lista delegações criadas por um usuário
   */
  async listDelegationsBy(
    delegatorUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]> {
    return await this.permissionRepo.findDelegationsBy(
      delegatorUserId,
      organizationId,
      branchId
    );
  }

  /**
   * Lista delegações recebidas por um usuário
   */
  async listDelegationsFor(
    delegateUserId: number,
    organizationId: number,
    branchId: number
  ): Promise<ApprovalDelegate[]> {
    return await this.permissionRepo.findActiveDelegatesFor(
      delegateUserId,
      organizationId,
      branchId
    );
  }
}
