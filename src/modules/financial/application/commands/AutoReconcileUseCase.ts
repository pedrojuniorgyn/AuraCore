/**
 * Command Use Case: AutoReconcileUseCase
 * Conciliação bancária automática
 *
 * Busca transações bancárias não conciliadas e tenta matchear
 * com títulos a pagar/receber em aberto.
 *
 * Regras:
 * - USE-CASE-001: Command em application/commands/
 * - USE-CASE-005: Recebe ExecutionContext
 * - USE-CASE-006: Retorna Promise<Result<Output, string>>
 * - USE-CASE-009: Delega lógica para Domain (AutoReconciliationService)
 *
 * @module financial/application/commands
 */
import { injectable } from 'tsyringe';
import { sql } from 'drizzle-orm';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import {
  AutoReconciliationService,
  type BankTransactionForReconciliation,
  type FinancialTitleForReconciliation,
  type ReconciliationConfig,
  type ReconciliationResult,
  DEFAULT_RECONCILIATION_CONFIG,
} from '../../domain/services/AutoReconciliationService';
import {
  withAuditedTransaction,
} from '@/shared/infrastructure/persistence/withAuditedTransaction';

// ============================================================================
// INPUT / OUTPUT
// ============================================================================

export interface AutoReconcileInput {
  organizationId: number;
  branchId: number;
  bankAccountId: string;
  /** Período inicial para buscar transações */
  startDate: Date;
  /** Período final para buscar transações */
  endDate: Date;
  /** Configurações de matching (usar defaults se não informado) */
  config?: Partial<ReconciliationConfig>;
  /** Se true, apenas sugere mas não aplica (dry-run) */
  dryRun?: boolean;
  /** ID do usuário executando */
  userId: string;
}

export interface AutoReconcileOutput extends ReconciliationResult {
  appliedCount: number;
  dryRun: boolean;
}

// ============================================================================
// USE CASE
// ============================================================================

@injectable()
export class AutoReconcileUseCase {

  async execute(input: AutoReconcileInput): Promise<Result<AutoReconcileOutput, string>> {
    // 1. Validar input
    if (!input.bankAccountId) {
      return Result.fail('bankAccountId é obrigatório');
    }
    if (!input.startDate || !input.endDate) {
      return Result.fail('startDate e endDate são obrigatórios');
    }
    if (input.startDate > input.endDate) {
      return Result.fail('startDate deve ser anterior a endDate');
    }

    // 2. Buscar transações bancárias não conciliadas
    const transactions = await this.fetchUnreconciledTransactions(
      input.organizationId,
      input.branchId,
      input.bankAccountId,
      input.startDate,
      input.endDate
    );

    if (transactions.length === 0) {
      return Result.ok({
        totalTransactions: 0,
        totalTitles: 0,
        matchesFound: 0,
        matches: [],
        unmatchedTransactions: [],
        unmatchedTitles: [],
        appliedCount: 0,
        dryRun: input.dryRun ?? false,
      });
    }

    // 3. Buscar títulos financeiros em aberto
    const titles = await this.fetchOpenTitles(
      input.organizationId,
      input.branchId,
      input.startDate,
      input.endDate
    );

    // 4. Executar matching via Domain Service
    const config: ReconciliationConfig = {
      ...DEFAULT_RECONCILIATION_CONFIG,
      ...input.config,
    };

    const reconcileResult = AutoReconciliationService.reconcile(
      transactions,
      titles,
      config
    );

    if (Result.isFail(reconcileResult)) {
      return Result.fail(reconcileResult.error);
    }

    const result = reconcileResult.value;
    const isDryRun = input.dryRun ?? false;

    // 5. Se dry-run, retornar sugestões sem aplicar
    if (isDryRun) {
      return Result.ok({
        ...result,
        appliedCount: 0,
        dryRun: true,
      });
    }

    // 6. Aplicar matches dentro de transação com audit trail
    const applyResult = await withAuditedTransaction(
      {
        userId: input.userId,
        organizationId: input.organizationId,
        branchId: input.branchId,
      },
      async ({ tx, audit }) => {
        let applied = 0;

        for (const match of result.matches) {
          const now = new Date();

          // Atualizar transação bancária como conciliada
          if (match.titleType === 'PAYABLE') {
            await tx.execute(sql`
              UPDATE bank_transactions
              SET reconciled = 'S',
                  reconciled_at = ${now},
                  reconciled_by = ${input.userId},
                  accounts_payable_id = ${match.titleId},
                  updated_at = ${now}
              WHERE id = ${match.transactionId}
                AND organization_id = ${input.organizationId}
                AND branch_id = ${input.branchId}
            `);
          } else {
            await tx.execute(sql`
              UPDATE bank_transactions
              SET reconciled = 'S',
                  reconciled_at = ${now},
                  reconciled_by = ${input.userId},
                  accounts_receivable_id = ${match.titleId},
                  updated_at = ${now}
              WHERE id = ${match.transactionId}
                AND organization_id = ${input.organizationId}
                AND branch_id = ${input.branchId}
            `);
          }

          // Audit para cada reconciliação
          audit({
            entityType: 'BankTransaction',
            entityId: match.transactionId,
            operation: 'UPDATE',
            newValues: {
              reconciled: 'S',
              matchedTitleId: match.titleId,
              matchedTitleType: match.titleType,
              confidence: match.confidence,
              matchReasons: match.matchReasons,
            },
            metadata: {
              action: 'auto_reconciliation',
              bankAccountId: input.bankAccountId,
            },
          });

          applied++;
        }

        return Result.ok(applied);
      }
    );

    if (Result.isFail(applyResult)) {
      return Result.fail(`Erro ao aplicar reconciliação: ${applyResult.error}`);
    }

    return Result.ok({
      ...result,
      appliedCount: applyResult.value,
      dryRun: false,
    });
  }

  /**
   * Busca transações bancárias não conciliadas no período
   */
  private async fetchUnreconciledTransactions(
    organizationId: number,
    branchId: number,
    bankAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BankTransactionForReconciliation[]> {
    const rows = await db.execute<{
      id: string;
      fit_id: string;
      transaction_date: Date;
      amount: string;
      description: string;
      transaction_type: string;
      reconciled: string;
    }>(sql`
      SELECT
        id,
        COALESCE(fit_id, CAST(id AS VARCHAR(36))) as fit_id,
        transaction_date,
        amount,
        description,
        transaction_type,
        reconciled
      FROM bank_transactions
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND bank_account_id = ${bankAccountId}
        AND transaction_date >= ${startDate}
        AND transaction_date <= ${endDate}
        AND reconciled = 'N'
        AND deleted_at IS NULL
      ORDER BY transaction_date ASC
    `);

    const results = Array.isArray(rows)
      ? rows
      : (rows as { recordset?: unknown[] }).recordset || [];

    return (results as Array<{
      id: string;
      fit_id: string;
      transaction_date: Date;
      amount: string;
      description: string;
      transaction_type: string;
      reconciled: string;
    }>).map(r => ({
      id: r.id,
      fitId: r.fit_id,
      transactionDate: new Date(r.transaction_date),
      amount: Number(r.amount),
      description: r.description || '',
      direction: Number(r.amount) >= 0 ? 'CREDIT' as const : 'DEBIT' as const,
      reconciled: r.reconciled,
    }));
  }

  /**
   * Busca títulos financeiros em aberto no período
   */
  private async fetchOpenTitles(
    organizationId: number,
    branchId: number,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialTitleForReconciliation[]> {
    // Buscar payables em aberto
    const payableRows = await db.execute<{
      id: string;
      description: string;
      partner_name: string;
      amount: string;
      due_date: Date;
      status: string;
      document_number: string;
    }>(sql`
      SELECT
        id,
        COALESCE(description, '') as description,
        COALESCE(partner_name, '') as partner_name,
        amount,
        due_date,
        status,
        COALESCE(document_number, '') as document_number
      FROM accounts_payable
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND status = 'OPEN'
        AND due_date >= ${startDate}
        AND due_date <= ${endDate}
        AND deleted_at IS NULL
    `);

    // Buscar receivables em aberto
    const receivableRows = await db.execute<{
      id: string;
      description: string;
      partner_name: string;
      amount: string;
      due_date: Date;
      status: string;
      document_number: string;
    }>(sql`
      SELECT
        id,
        COALESCE(description, '') as description,
        COALESCE(partner_name, '') as partner_name,
        amount,
        due_date,
        status,
        COALESCE(document_number, '') as document_number
      FROM accounts_receivable
      WHERE organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND status = 'OPEN'
        AND due_date >= ${startDate}
        AND due_date <= ${endDate}
        AND deleted_at IS NULL
    `);

    const payables = Array.isArray(payableRows)
      ? payableRows
      : (payableRows as { recordset?: unknown[] }).recordset || [];

    const receivables = Array.isArray(receivableRows)
      ? receivableRows
      : (receivableRows as { recordset?: unknown[] }).recordset || [];

    const toTitle = (
      type: 'PAYABLE' | 'RECEIVABLE'
    ) => (r: {
      id: string;
      description: string;
      partner_name: string;
      amount: string;
      due_date: Date;
      status: string;
      document_number: string;
    }): FinancialTitleForReconciliation => ({
      id: r.id,
      type,
      description: r.description,
      partnerName: r.partner_name,
      amount: Number(r.amount),
      dueDate: new Date(r.due_date),
      status: r.status,
      documentNumber: r.document_number || undefined,
    });

    return [
      ...(payables as Array<{
        id: string;
        description: string;
        partner_name: string;
        amount: string;
        due_date: Date;
        status: string;
        document_number: string;
      }>).map(toTitle('PAYABLE')),
      ...(receivables as Array<{
        id: string;
        description: string;
        partner_name: string;
        amount: string;
        due_date: Date;
        status: string;
        document_number: string;
      }>).map(toTitle('RECEIVABLE')),
    ];
  }
}
