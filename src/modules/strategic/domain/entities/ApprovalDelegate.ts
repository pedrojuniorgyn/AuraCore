/**
 * Entity: ApprovalDelegate
 * Representa uma delegação temporária de permissão de aprovação
 * 
 * Regras de negócio:
 * - Delegação tem período de validade (startDate → endDate)
 * - Pode ser revogada antes do fim (isActive = false)
 * - Validação temporal automática via isActiveNow()
 * 
 * @module strategic/domain/entities
 * @see ENTITY-001 a ENTITY-012
 */
import { Entity, Result } from '@/shared/domain';

export interface ApprovalDelegateProps {
  organizationId: number;
  branchId: number;
  delegatorUserId: number; // Quem delega
  delegateUserId: number;   // Quem recebe delegação
  startDate: Date;
  endDate: Date | null;     // null = sem data fim (indefinido)
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalDelegateProps {
  organizationId: number;
  branchId: number;
  delegatorUserId: number;
  delegateUserId: number;
  startDate: Date;
  endDate: Date | null;
  createdBy: string;
}

export class ApprovalDelegate extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: ApprovalDelegateProps
  ) {
    super(id);
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get delegatorUserId(): number { return this.props.delegatorUserId; }
  get delegateUserId(): number { return this.props.delegateUserId; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date | null { return this.props.endDate; }
  get isActive(): boolean { return this.props.isActive; }
  get createdBy(): string | null { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Factory: create() COM validações
   */
  static create(
    props: CreateApprovalDelegateProps
  ): Result<ApprovalDelegate, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId obrigatório');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId obrigatório');
    }

    if (!props.delegatorUserId || props.delegatorUserId <= 0) {
      return Result.fail('delegatorUserId obrigatório');
    }

    if (!props.delegateUserId || props.delegateUserId <= 0) {
      return Result.fail('delegateUserId obrigatório');
    }

    if (props.delegatorUserId === props.delegateUserId) {
      return Result.fail('Usuário não pode delegar para si mesmo');
    }

    if (!props.startDate) {
      return Result.fail('startDate obrigatória');
    }

    // Se endDate existe, deve ser >= startDate
    if (props.endDate && props.endDate < props.startDate) {
      return Result.fail('endDate deve ser >= startDate');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(
      new ApprovalDelegate(id, {
        ...props,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(
    props: ApprovalDelegateProps & { id: string }
  ): Result<ApprovalDelegate, string> {
    return Result.ok(new ApprovalDelegate(props.id, props));
  }

  /**
   * Verifica se delegação está ativa AGORA
   * 
   * Regras:
   * - isActive deve ser true
   * - Data atual >= startDate
   * - Data atual <= endDate (se endDate definida)
   */
  isActiveNow(): boolean {
    if (!this.props.isActive) {
      return false;
    }

    const now = new Date();

    // Deve ter começado
    if (this.props.startDate > now) {
      return false;
    }

    // Se tem endDate, não deve ter terminado
    if (this.props.endDate && this.props.endDate < now) {
      return false;
    }

    return true;
  }

  /**
   * Revoga delegação (soft delete via isActive)
   */
  revoke(): Result<void, string> {
    if (!this.props.isActive) {
      return Result.fail('Delegação já está inativa');
    }

    this.props.isActive = false;
    this.props.updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Estende período de delegação
   */
  extendUntil(newEndDate: Date): Result<void, string> {
    if (!this.props.isActive) {
      return Result.fail('Não é possível estender delegação inativa');
    }

    if (newEndDate < this.props.startDate) {
      return Result.fail('Nova data fim deve ser >= startDate');
    }

    const now = new Date();
    if (newEndDate < now) {
      return Result.fail('Nova data fim deve ser >= data atual');
    }

    this.props.endDate = newEndDate;
    this.props.updatedAt = new Date();

    return Result.ok(undefined);
  }
}
