import { Entity, Result } from '@/shared/domain';
import { OperationType, type OperationTypeValue } from '../value-objects/OperationType';

/**
 * AccountDetermination Entity
 * 
 * Tabela de determinação automática de contas contábeis.
 * Mapeia tipo de operação → par de contas (débito/crédito).
 * Configurável por organização e filial.
 * 
 * Referência SAP: OBYS/OKB9 (Account Determination for Automatic Posting)
 * Referência TOTVS: CT5 (Lançamento Padrão)
 * 
 * @see ENTITY-001 a ENTITY-012
 * @see ARCH-007: Entities com comportamento
 */

export interface AccountDeterminationProps {
  organizationId: number;
  branchId: number;
  operationType: OperationType;
  debitAccountId: string;
  debitAccountCode: string;
  creditAccountId: string;
  creditAccountCode: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountDetermination extends Entity<string> {
  private readonly props: AccountDeterminationProps;

  private constructor(id: string, props: AccountDeterminationProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // ============ GETTERS ============

  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get operationType(): OperationType { return this.props.operationType; }
  get operationTypeValue(): OperationTypeValue { return this.props.operationType.value; }
  get debitAccountId(): string { return this.props.debitAccountId; }
  get debitAccountCode(): string { return this.props.debitAccountCode; }
  get creditAccountId(): string { return this.props.creditAccountId; }
  get creditAccountCode(): string { return this.props.creditAccountCode; }
  get description(): string { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }

  // ============ BEHAVIORS ============

  /**
   * Desativa esta regra de determinação
   */
  deactivate(): Result<void, string> {
    if (!this.props.isActive) {
      return Result.fail('Regra já está desativada');
    }
    this.props.isActive = false;
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Ativa esta regra de determinação
   */
  activate(): Result<void, string> {
    if (this.props.isActive) {
      return Result.fail('Regra já está ativa');
    }
    this.props.isActive = true;
    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Atualiza contas contábeis
   */
  updateAccounts(params: {
    debitAccountId: string;
    debitAccountCode: string;
    creditAccountId: string;
    creditAccountCode: string;
  }): Result<void, string> {
    if (!params.debitAccountId.trim()) {
      return Result.fail('ID da conta de débito é obrigatório');
    }
    if (!params.debitAccountCode.trim()) {
      return Result.fail('Código da conta de débito é obrigatório');
    }
    if (!params.creditAccountId.trim()) {
      return Result.fail('ID da conta de crédito é obrigatório');
    }
    if (!params.creditAccountCode.trim()) {
      return Result.fail('Código da conta de crédito é obrigatório');
    }

    (this.props as { debitAccountId: string }).debitAccountId = params.debitAccountId.trim();
    (this.props as { debitAccountCode: string }).debitAccountCode = params.debitAccountCode.trim();
    (this.props as { creditAccountId: string }).creditAccountId = params.creditAccountId.trim();
    (this.props as { creditAccountCode: string }).creditAccountCode = params.creditAccountCode.trim();
    this.touch();
    return Result.ok(undefined);
  }

  // ============ FACTORY METHODS ============

  /**
   * Cria nova regra de determinação COM validações
   */
  static create(props: {
    organizationId: number;
    branchId: number;
    operationType: string;
    debitAccountId: string;
    debitAccountCode: string;
    creditAccountId: string;
    creditAccountCode: string;
    description: string;
  }): Result<AccountDetermination, string> {
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId deve ser positivo');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId deve ser positivo');
    }
    if (!props.debitAccountId.trim()) {
      return Result.fail('ID da conta de débito é obrigatório');
    }
    if (!props.debitAccountCode.trim()) {
      return Result.fail('Código da conta de débito é obrigatório');
    }
    if (!props.creditAccountId.trim()) {
      return Result.fail('ID da conta de crédito é obrigatório');
    }
    if (!props.creditAccountCode.trim()) {
      return Result.fail('Código da conta de crédito é obrigatório');
    }
    if (!props.description.trim()) {
      return Result.fail('Descrição é obrigatória');
    }

    const operationTypeResult = OperationType.create(props.operationType);
    if (Result.isFail(operationTypeResult)) {
      return Result.fail(operationTypeResult.error);
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new AccountDetermination(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      operationType: operationTypeResult.value,
      debitAccountId: props.debitAccountId.trim(),
      debitAccountCode: props.debitAccountCode.trim(),
      creditAccountId: props.creditAccountId.trim(),
      creditAccountCode: props.creditAccountCode.trim(),
      description: props.description.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Reconstitui do banco SEM validações
   */
  static reconstitute(props: AccountDeterminationProps & { id: string }): Result<AccountDetermination, string> {
    return Result.ok(new AccountDetermination(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      operationType: props.operationType,
      debitAccountId: props.debitAccountId,
      debitAccountCode: props.debitAccountCode,
      creditAccountId: props.creditAccountId,
      creditAccountCode: props.creditAccountCode,
      description: props.description,
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    }, props.createdAt));
  }
}
