import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

/**
 * Status de aprovação do adiantamento
 */
export type AdvanceApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Lista de todos os status válidos
 */
const VALID_ADVANCE_STATUSES: readonly AdvanceApprovalStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

/**
 * Verifica se um valor é um status válido
 */
function isValidAdvanceStatus(status: string): status is AdvanceApprovalStatus {
  return VALID_ADVANCE_STATUSES.includes(status as AdvanceApprovalStatus);
}

/**
 * Props do Advance
 */
export interface AdvanceProps {
  valorSolicitado: Money;
  dataSolicitacao: Date;
  statusAprovacao: AdvanceApprovalStatus;
  valorAprovado?: Money;
  dataLiberacao?: Date;
  aprovadorId?: string;
}

/**
 * Value Object: Adiantamento de Despesas
 * 
 * Representa um adiantamento solicitado pelo colaborador
 * para cobrir despesas previstas durante uma atividade.
 * 
 * Fluxo:
 * 1. Colaborador solicita valor (status = PENDING)
 * 2. Gestor aprova/rejeita
 * 3. Se aprovado, financeiro libera valor
 */
export class Advance {
  private constructor(private readonly _props: AdvanceProps) {}

  get valorSolicitado(): Money {
    return this._props.valorSolicitado;
  }

  get dataSolicitacao(): Date {
    return this._props.dataSolicitacao;
  }

  get statusAprovacao(): AdvanceApprovalStatus {
    return this._props.statusAprovacao;
  }

  get valorAprovado(): Money | undefined {
    return this._props.valorAprovado;
  }

  get dataLiberacao(): Date | undefined {
    return this._props.dataLiberacao;
  }

  get aprovadorId(): string | undefined {
    return this._props.aprovadorId;
  }

  /**
   * Cria um novo adiantamento solicitado
   */
  static create(valorSolicitado: Money, dataSolicitacao: Date): Result<Advance, string> {
    if (valorSolicitado.amount <= 0) {
      return Result.fail('Valor solicitado must be greater than 0');
    }

    const advance = new Advance({
      valorSolicitado,
      dataSolicitacao,
      statusAprovacao: 'PENDING',
    });

    return Result.ok(advance);
  }

  /**
   * Reconstitui adiantamento do banco
   */
  static reconstitute(props: AdvanceProps): Result<Advance, string> {
    // Validar statusAprovacao
    if (!isValidAdvanceStatus(props.statusAprovacao)) {
      return Result.fail(
        `Invalid advance status: ${props.statusAprovacao}. Must be one of: ${VALID_ADVANCE_STATUSES.join(', ')}`
      );
    }

    // Validar valor solicitado
    if (props.valorSolicitado.amount <= 0) {
      return Result.fail('Valor solicitado must be greater than 0');
    }

    const advance = new Advance(props);
    return Result.ok(advance);
  }

  /**
   * Aprova o adiantamento
   */
  approve(valorAprovado: Money, aprovadorId: string): Result<Advance, string> {
    if (this._props.statusAprovacao !== 'PENDING') {
      return Result.fail(`Cannot approve advance with status ${this._props.statusAprovacao}`);
    }

    if (valorAprovado.amount <= 0) {
      return Result.fail('Valor aprovado must be greater than 0');
    }

    if (!aprovadorId || aprovadorId.trim() === '') {
      return Result.fail('Aprovador ID is required');
    }

    const approved = new Advance({
      ...this._props,
      statusAprovacao: 'APPROVED',
      valorAprovado,
      dataLiberacao: new Date(),
      aprovadorId,
    });

    return Result.ok(approved);
  }

  /**
   * Rejeita o adiantamento
   */
  reject(aprovadorId: string): Result<Advance, string> {
    if (this._props.statusAprovacao !== 'PENDING') {
      return Result.fail(`Cannot reject advance with status ${this._props.statusAprovacao}`);
    }

    if (!aprovadorId || aprovadorId.trim() === '') {
      return Result.fail('Aprovador ID is required');
    }

    const rejected = new Advance({
      ...this._props,
      statusAprovacao: 'REJECTED',
      aprovadorId,
    });

    return Result.ok(rejected);
  }

  /**
   * Retorna o valor efetivo do adiantamento
   * (aprovado se existir, senão solicitado)
   */
  get effectiveAmount(): Money {
    return this._props.valorAprovado || this._props.valorSolicitado;
  }
}

