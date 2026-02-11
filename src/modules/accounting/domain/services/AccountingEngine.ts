/**
 * AccountingEngine - Domain Service
 *
 * Pure business logic for accounting operations extracted from legacy
 * `src/services/accounting-engine.ts`. Complements JournalEntryGenerator
 * by handling higher-level business rules.
 *
 * Responsibilities:
 * - Document eligibility validation (can document be posted?)
 * - Counterpart account determination (PURCHASE → Fornecedores, SALE → Clientes)
 * - Account code format validation
 * - Period validation for journal entries
 * - Entry description generation
 * - Double-entry invariant validation
 * - Reversal eligibility checks
 *
 * This is a PURE domain service:
 * - 100% stateless (static methods only)
 * - Private constructor (prevent instantiation)
 * - Returns Result<T, string>
 * - NEVER throws
 * - ZERO infrastructure dependencies
 *
 * @module accounting/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 * @see JournalEntryGenerator for journal line generation logic
 * @see E7.13 - Services → DDD Migration (LS-002)
 * @see NBC TG 26 - Apresentação das Demonstrações Contábeis
 * @see NBC TG 1000 - Contabilidade para PMEs
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Fiscal classification of a document for accounting purposes
 */
export type FiscalClassification = 'PURCHASE' | 'SALE' | 'CARGO' | 'RETURN' | 'TRANSFER';

/**
 * Accounting status of a fiscal document
 */
export type AccountingStatus = 'PENDING' | 'POSTED' | 'REVERSED';

/**
 * Status of a journal entry
 */
export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED';

/**
 * Input for document eligibility validation
 */
export interface DocumentEligibilityInput {
  accountingStatus: AccountingStatus;
  hasItems: boolean;
  documentType: string;
  documentNumber: string;
}

/**
 * Input for counterpart account determination
 */
export interface CounterpartInput {
  fiscalClassification: FiscalClassification;
  organizationId: number;
}

/**
 * Result of counterpart account determination
 */
export interface CounterpartAccountRule {
  /** Account code pattern (e.g., "2.1.01%" for suppliers) */
  accountCodePattern: string;
  /** Human-readable description */
  description: string;
  /** Entry type for the counterpart */
  entryType: 'CREDIT' | 'DEBIT';
}

/**
 * Input for journal entry description generation
 */
export interface EntryDescriptionInput {
  documentType: string;
  documentNumber: string;
  partnerName?: string;
  isReversal?: boolean;
  originalEntryNumber?: string;
}

/**
 * Input for period validation
 */
export interface PeriodValidationInput {
  entryDate: Date;
  periodYear: number;
  periodMonth: number;
  isPeriodClosed: boolean;
}

/**
 * Debit/Credit line for balance validation
 */
export interface BalanceLine {
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
}

/**
 * Result of balance validation
 */
export interface BalanceValidationResult {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
}

/**
 * Account validation input
 */
export interface AccountValidationInput {
  code: string;
  isAnalytical: boolean;
  name: string;
}

/**
 * Item for journal entry line generation
 */
export interface JournalItemInput {
  chartAccountId: number | null;
  chartAccountCode: string | null;
  chartAccountName: string | null;
  netAmount: number;
}

/**
 * Generated journal line data (pure data, no persistence)
 */
export interface GeneratedJournalLine {
  lineNumber: number;
  entryType: 'DEBIT' | 'CREDIT';
  chartAccountId: number;
  chartAccountCode: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
}

/**
 * Result of journal entry generation
 */
export interface JournalEntryGenerationResult {
  lines: GeneratedJournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lineCount: number;
}

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Domain Service: Accounting Engine
 *
 * Encapsulates pure accounting business rules following Brazilian accounting
 * standards (NBC TG 26, CPC). All methods are stateless and operate only
 * on input data without side effects.
 *
 * @example
 * ```typescript
 * // Check if document can be posted
 * const eligibility = AccountingEngine.validateDocumentEligibility({
 *   accountingStatus: 'PENDING',
 *   hasItems: true,
 *   documentType: 'NFE',
 *   documentNumber: '12345',
 * });
 *
 * if (Result.isFail(eligibility)) {
 *   console.error(eligibility.error);
 * }
 * ```
 */
export class AccountingEngine {
  /** @private Prevent instantiation - stateless service (DOMAIN-SVC-001) */
  private constructor() {}

  // ==========================================================================
  // DOCUMENT ELIGIBILITY
  // ==========================================================================

  /**
   * Validates whether a fiscal document is eligible for journal entry generation.
   *
   * Rules:
   * - Document must have accountingStatus = 'PENDING'
   * - Document must have at least one item
   * - Documents already POSTED cannot be posted again
   *
   * @param input - Document eligibility data
   * @returns Result.ok(true) if eligible, Result.fail with reason if not
   *
   * @see NBC TG 26 - Apresentação das Demonstrações Contábeis
   */
  static validateDocumentEligibility(
    input: DocumentEligibilityInput
  ): Result<true, string> {
    if (input.accountingStatus === 'POSTED') {
      return Result.fail(
        `Documento ${input.documentType} ${input.documentNumber} já possui lançamento contábil (status: POSTED)`
      );
    }

    if (input.accountingStatus === 'REVERSED') {
      return Result.fail(
        `Documento ${input.documentType} ${input.documentNumber} teve lançamento revertido. ` +
        `Gere um novo lançamento se necessário.`
      );
    }

    if (!input.hasItems) {
      return Result.fail(
        `Documento ${input.documentType} ${input.documentNumber} não possui itens para contabilizar`
      );
    }

    return Result.ok(true);
  }

  // ==========================================================================
  // COUNTERPART ACCOUNT DETERMINATION
  // ==========================================================================

  /**
   * Determines the counterpart (credit/debit) account pattern based on
   * fiscal classification of the document.
   *
   * Brazilian accounting conventions:
   * - PURCHASE → Credit to "Fornecedores a Pagar" (2.1.01%)
   * - SALE/CARGO → Debit to "Clientes a Receber" (1.1.03%)
   * - RETURN (purchase return) → Debit to "Fornecedores" (2.1.01%)
   * - RETURN (sale return) not handled here - requires separate logic
   * - TRANSFER → Debit to "Estoques em Trânsito" (1.1.04%)
   *
   * @param input - Fiscal classification and organization context
   * @returns CounterpartAccountRule with account pattern and entry type
   *
   * @see Plano de Contas Referencial da RFB
   */
  static determineCounterpartAccount(
    input: CounterpartInput
  ): Result<CounterpartAccountRule, string> {
    switch (input.fiscalClassification) {
      case 'PURCHASE':
        return Result.ok({
          accountCodePattern: '2.1.01%',
          description: 'Fornecedores a Pagar',
          entryType: 'CREDIT',
        });

      case 'SALE':
      case 'CARGO':
        return Result.ok({
          accountCodePattern: '1.1.03%',
          description: 'Clientes a Receber',
          entryType: 'DEBIT',
        });

      case 'RETURN':
        return Result.ok({
          accountCodePattern: '2.1.01%',
          description: 'Fornecedores (Devolução)',
          entryType: 'DEBIT',
        });

      case 'TRANSFER':
        return Result.ok({
          accountCodePattern: '1.1.04%',
          description: 'Estoques em Trânsito',
          entryType: 'DEBIT',
        });

      default: {
        const _exhaustive: never = input.fiscalClassification;
        return Result.fail(
          `Classificação fiscal não suportada para contabilização: ${String(_exhaustive)}`
        );
      }
    }
  }

  // ==========================================================================
  // ACCOUNT VALIDATION
  // ==========================================================================

  /**
   * Validates that an account is analytical (can receive journal entries).
   *
   * Brazilian accounting rules (NBC TG 26):
   * - Synthetic accounts only consolidate (group/summary accounts)
   * - Only analytical accounts accept direct journal entries
   *
   * @param account - Account to validate
   * @returns Result.ok(true) if analytical, Result.fail with detailed message if synthetic
   */
  static validateAccountIsAnalytical(
    account: AccountValidationInput
  ): Result<true, string> {
    if (!account.isAnalytical) {
      return Result.fail(
        `Conta "${account.code} - ${account.name}" é SINTÉTICA. ` +
        `Lançamentos devem ser feitos em contas ANALÍTICAS. ` +
        `Regra: NBC TG 26 - Contas sintéticas apenas consolidam.`
      );
    }

    return Result.ok(true);
  }

  /**
   * Validates account code format according to Brazilian chart of accounts pattern.
   *
   * Expected format: X.X.XX.XXX (hierarchical, dot-separated)
   * - Level 1: Single digit (1-9)
   * - Subsequent levels: 1-3 digits separated by dots
   *
   * @param code - Account code to validate
   * @returns Result.ok(true) if valid format
   */
  static validateAccountCodeFormat(code: string): Result<true, string> {
    const trimmed = code.trim();

    if (!trimmed) {
      return Result.fail('Código da conta contábil não pode ser vazio');
    }

    // Brazilian chart of accounts pattern: X.X.XX or X.X.XX.XXX etc.
    const pattern = /^[1-9]\.[0-9]{1,2}(\.[0-9]{1,3})*$/;

    if (!pattern.test(trimmed)) {
      return Result.fail(
        `Código "${trimmed}" não segue o padrão do Plano de Contas Referencial. ` +
        `Formato esperado: X.X.XX.XXX (hierárquico, separado por pontos)`
      );
    }

    return Result.ok(true);
  }

  // ==========================================================================
  // PERIOD VALIDATION
  // ==========================================================================

  /**
   * Validates that a journal entry date falls within the specified accounting period
   * and that the period is open.
   *
   * Rules:
   * - Entry date must be within the period's month/year
   * - Period must not be closed
   * - Entry date cannot be in the future
   *
   * @param input - Period validation data
   * @returns Result.ok(true) if valid
   *
   * @see NBC TG 26 - Regime de Competência
   */
  static validatePeriod(input: PeriodValidationInput): Result<true, string> {
    // Closed period check
    if (input.isPeriodClosed) {
      const periodKey = `${input.periodYear}-${input.periodMonth.toString().padStart(2, '0')}`;
      return Result.fail(
        `Período contábil ${periodKey} está fechado. ` +
        `Não é possível lançar em períodos encerrados.`
      );
    }

    // Entry date must be within the period
    const entryMonth = input.entryDate.getMonth() + 1;
    const entryYear = input.entryDate.getFullYear();

    if (entryYear !== input.periodYear || entryMonth !== input.periodMonth) {
      return Result.fail(
        `Data do lançamento (${input.entryDate.toISOString().substring(0, 10)}) ` +
        `não pertence ao período ${input.periodYear}-${input.periodMonth.toString().padStart(2, '0')}`
      );
    }

    // Future date check
    const now = new Date();
    if (input.entryDate > now) {
      return Result.fail(
        `Data do lançamento (${input.entryDate.toISOString().substring(0, 10)}) ` +
        `não pode ser futura`
      );
    }

    return Result.ok(true);
  }

  // ==========================================================================
  // DOUBLE-ENTRY VALIDATION (PARTIDAS DOBRADAS)
  // ==========================================================================

  /**
   * Validates the fundamental accounting invariant: Σ Debits = Σ Credits.
   *
   * Uses a tolerance of 0.01 (1 centavo) to handle floating-point precision
   * issues common in financial calculations.
   *
   * @param lines - Array of debit/credit lines to validate
   * @returns BalanceValidationResult with details
   *
   * @see NBC TG 26 - Partidas Dobradas
   */
  static validateDoubleEntry(
    lines: BalanceLine[]
  ): Result<BalanceValidationResult, string> {
    if (lines.length === 0) {
      return Result.fail('Lançamento contábil deve ter pelo menos uma linha');
    }

    const hasDebit = lines.some(l => l.entryType === 'DEBIT');
    const hasCredit = lines.some(l => l.entryType === 'CREDIT');

    if (!hasDebit) {
      return Result.fail('Lançamento contábil deve ter pelo menos uma linha de DÉBITO');
    }

    if (!hasCredit) {
      return Result.fail('Lançamento contábil deve ter pelo menos uma linha de CRÉDITO');
    }

    // Validate individual amounts
    for (const line of lines) {
      if (line.amount <= 0) {
        return Result.fail(
          `Valor da linha deve ser positivo. Encontrado: ${line.amount} (${line.entryType})`
        );
      }
    }

    const totalDebit = lines
      .filter(l => l.entryType === 'DEBIT')
      .reduce((sum, l) => sum + l.amount, 0);

    const totalCredit = lines
      .filter(l => l.entryType === 'CREDIT')
      .reduce((sum, l) => sum + l.amount, 0);

    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    // Round to 2 decimal places for display
    const result: BalanceValidationResult = {
      isBalanced,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference: Math.round(difference * 100) / 100,
    };

    if (!isBalanced) {
      return Result.fail(
        `Lançamento desbalanceado: Débitos=R$ ${result.totalDebit.toFixed(2)}, ` +
        `Créditos=R$ ${result.totalCredit.toFixed(2)}, ` +
        `Diferença=R$ ${result.difference.toFixed(2)}. ` +
        `Regra: Partidas Dobradas (NBC TG 26)`
      );
    }

    return Result.ok(result);
  }

  // ==========================================================================
  // REVERSAL VALIDATION
  // ==========================================================================

  /**
   * Validates whether a journal entry can be reversed (estornado).
   *
   * Rules:
   * - Only POSTED entries can be reversed
   * - Already REVERSED entries cannot be reversed again
   * - DRAFT entries should be deleted, not reversed
   * - CANCELLED entries cannot be reversed
   *
   * @param status - Current status of the journal entry
   * @returns Result.ok(true) if can be reversed
   */
  static validateReversalEligibility(
    status: JournalEntryStatus
  ): Result<true, string> {
    switch (status) {
      case 'POSTED':
        return Result.ok(true);

      case 'REVERSED':
        return Result.fail('Lançamento já foi revertido (estornado)');

      case 'DRAFT':
        return Result.fail(
          'Lançamento em rascunho não pode ser revertido. ' +
          'Exclua o rascunho ao invés de reverter.'
        );

      case 'CANCELLED':
        return Result.fail('Lançamento cancelado não pode ser revertido');

      default: {
        const _exhaustive: never = status;
        return Result.fail(`Status desconhecido: ${String(_exhaustive)}`);
      }
    }
  }

  // ==========================================================================
  // DESCRIPTION GENERATION
  // ==========================================================================

  /**
   * Generates a standardized journal entry description based on document data.
   *
   * Format:
   * - Normal entry: "Lançamento automático - {type} {number} - {partner}"
   * - Reversal: "Estorno - Lçto {originalNumber} - {type} {number}"
   *
   * @param input - Data for description generation
   * @returns Formatted description string
   */
  static generateEntryDescription(
    input: EntryDescriptionInput
  ): Result<string, string> {
    const docType = input.documentType.trim();
    const docNumber = input.documentNumber.trim();

    if (!docType) {
      return Result.fail('Tipo de documento é obrigatório para gerar descrição');
    }

    if (!docNumber) {
      return Result.fail('Número do documento é obrigatório para gerar descrição');
    }

    if (input.isReversal && input.originalEntryNumber) {
      const description = `Estorno - Lçto ${input.originalEntryNumber.trim()} - ${docType} ${docNumber}`;
      return Result.ok(description);
    }

    const partner = input.partnerName?.trim();
    const description = partner
      ? `Lançamento automático - ${docType} ${docNumber} - ${partner}`
      : `Lançamento automático - ${docType} ${docNumber}`;

    return Result.ok(description);
  }

  // ==========================================================================
  // JOURNAL LINES GENERATION (PURE LOGIC)
  // ==========================================================================

  /**
   * Generates journal entry lines from fiscal document items.
   *
   * This method handles the PURE calculation logic:
   * - One DEBIT line per classified item (grouped by chart account)
   * - One CREDIT line for the counterpart (total amount)
   * - Validates balance (Σ Debits = Σ Credits)
   *
   * Items without a chart account are skipped (not yet classified).
   *
   * @param items - Fiscal document items with chart account info
   * @param counterpartAccountId - ID of the counterpart account
   * @param counterpartAccountCode - Code of the counterpart account
   * @param counterpartAccountName - Name of the counterpart account
   * @param totalAmount - Total document amount for the credit line
   * @returns Generated journal lines with balance validation
   *
   * @see NBC TG 26 - Partidas Dobradas
   */
  static generateJournalLines(
    items: JournalItemInput[],
    counterpartAccountId: number,
    counterpartAccountCode: string,
    counterpartAccountName: string,
    totalAmount: number
  ): Result<JournalEntryGenerationResult, string> {
    if (items.length === 0) {
      return Result.fail('Nenhum item fornecido para geração de linhas contábeis');
    }

    if (totalAmount <= 0) {
      return Result.fail('Valor total do documento deve ser positivo');
    }

    const lines: GeneratedJournalLine[] = [];
    let lineNumber = 1;
    let totalDebit = 0;

    // DEBIT lines: one per item with chart account
    for (const item of items) {
      if (!item.chartAccountId) {
        continue; // Skip items without chart account (not yet classified)
      }

      if (item.netAmount <= 0) {
        continue; // Skip zero/negative amounts
      }

      lines.push({
        lineNumber,
        entryType: 'DEBIT',
        chartAccountId: item.chartAccountId,
        chartAccountCode: item.chartAccountCode || '',
        description: item.chartAccountName || 'Sem descrição',
        debitAmount: Math.round(item.netAmount * 100) / 100,
        creditAmount: 0,
      });

      totalDebit += item.netAmount;
      lineNumber++;
    }

    if (lines.length === 0) {
      return Result.fail(
        'Nenhum item possui conta contábil classificada. ' +
        'Classifique os itens antes de gerar o lançamento.'
      );
    }

    // CREDIT line: counterpart (total amount)
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

    lines.push({
      lineNumber,
      entryType: 'CREDIT',
      chartAccountId: counterpartAccountId,
      chartAccountCode: counterpartAccountCode,
      description: counterpartAccountName,
      debitAmount: 0,
      creditAmount: roundedTotalAmount,
    });

    const roundedTotalDebit = Math.round(totalDebit * 100) / 100;

    // Validate balance
    const difference = Math.abs(roundedTotalDebit - roundedTotalAmount);
    const isBalanced = difference < 0.01;

    return Result.ok({
      lines,
      totalDebit: roundedTotalDebit,
      totalCredit: roundedTotalAmount,
      isBalanced,
      lineCount: lines.length,
    });
  }
}
