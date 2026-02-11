/**
 * TitleGenerationService - Domain Service
 *
 * Pure business logic for financial title generation extracted from legacy
 * `src/services/financial-title-generator.ts`. Handles rules for generating
 * Contas a Pagar (Payables) and Contas a Receber (Receivables) from fiscal
 * documents.
 *
 * Responsibilities:
 * - Title type determination (PAYABLE vs RECEIVABLE) based on fiscal classification
 * - Due date calculation (single and installment)
 * - Installment splitting logic (parcelas)
 * - Title number/description generation
 * - Title eligibility validation
 * - Reversal eligibility validation
 * - Financial status transition rules
 *
 * This is a PURE domain service:
 * - 100% stateless (static methods only)
 * - Private constructor (prevent instantiation)
 * - Returns Result<T, string>
 * - NEVER throws
 * - ZERO infrastructure dependencies
 *
 * @module financial/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 * @see E7.13 - Services → DDD Migration (LS-003)
 * @see Lei 10.406/02 Art. 394-396 - Obrigações (vencimento)
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Fiscal classification that determines title type
 */
export type FiscalClassification = 'PURCHASE' | 'SALE' | 'CARGO' | 'RETURN' | 'TRANSFER' | 'OTHER';

/**
 * Type of financial title
 */
export type TitleType = 'PAYABLE' | 'RECEIVABLE';

/**
 * Financial status of a fiscal document
 */
export type FinancialStatus = 'NO_TITLE' | 'GENERATED' | 'PARTIAL' | 'PAID' | 'OVERDUE';

/**
 * Title payment status for reversal checks
 */
export type TitlePaymentStatus = 'OPEN' | 'PROCESSING' | 'PARTIAL' | 'PAID' | 'RECEIVED' | 'CANCELLED';

/**
 * Origin of the title
 */
export type TitleOrigin = 'FISCAL_NFE' | 'FISCAL_CTE' | 'FISCAL_NFSE' | 'MANUAL';

/**
 * Input for title type determination
 */
export interface TitleTypeDeterminationInput {
  fiscalClassification: FiscalClassification;
  documentType: string;
}

/**
 * Input for title eligibility validation
 */
export interface TitleEligibilityInput {
  financialStatus: FinancialStatus;
  fiscalClassification: FiscalClassification;
  documentType: string;
  documentNumber: string;
  expectedClassifications: FiscalClassification[];
}

/**
 * Input for due date calculation
 */
export interface DueDateCalculationInput {
  issueDate: Date;
  paymentTermDays: number;
  /** If true, skip weekends/holidays (simplified: only weekends for now) */
  skipNonBusinessDays?: boolean;
}

/**
 * Input for installment splitting
 */
export interface InstallmentSplitInput {
  totalAmount: number;
  numberOfInstallments: number;
  firstDueDate: Date;
  intervalDays: number;
  /** If true, skip weekends for due dates */
  skipNonBusinessDays?: boolean;
}

/**
 * Generated installment data
 */
export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  description: string;
}

/**
 * Input for title description generation
 */
export interface TitleDescriptionInput {
  documentType: string;
  documentNumber: string;
  partnerName: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

/**
 * Input for reversal eligibility validation
 */
export interface ReversalEligibilityInput {
  financialStatus: FinancialStatus;
  titlePaymentStatuses: TitlePaymentStatus[];
  documentNumber: string;
}

/**
 * Result of title generation (pure data, no persistence)
 */
export interface GeneratedTitleData {
  titleType: TitleType;
  description: string;
  documentNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  origin: TitleOrigin;
  installmentNumber: number;
  totalInstallments: number;
}

/**
 * Input for full title generation from fiscal document
 */
export interface GenerateTitleInput {
  documentType: string;
  documentNumber: string;
  fiscalClassification: FiscalClassification;
  financialStatus: FinancialStatus;
  issueDate: Date;
  netAmount: number;
  partnerName: string;
  /** Payment term in days (default: 0 = à vista) */
  paymentTermDays?: number;
  /** Number of installments (default: 1) */
  numberOfInstallments?: number;
  /** Interval between installments in days (default: 30) */
  installmentIntervalDays?: number;
}

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Domain Service: Financial Title Generation
 *
 * Encapsulates pure business rules for financial title (Contas a Pagar / Receber)
 * generation from fiscal documents. All methods are stateless and operate only
 * on input data without side effects.
 *
 * @example
 * ```typescript
 * // Determine title type
 * const typeResult = TitleGenerationService.determineTitleType({
 *   fiscalClassification: 'PURCHASE',
 *   documentType: 'NFE',
 * });
 *
 * // Generate installments
 * const installments = TitleGenerationService.splitInstallments({
 *   totalAmount: 3000,
 *   numberOfInstallments: 3,
 *   firstDueDate: new Date('2026-03-10'),
 *   intervalDays: 30,
 * });
 * ```
 */
export class TitleGenerationService {
  /** @private Prevent instantiation - stateless service (DOMAIN-SVC-001) */
  private constructor() {}

  // ==========================================================================
  // TITLE TYPE DETERMINATION
  // ==========================================================================

  /**
   * Determines whether a fiscal document should generate a PAYABLE or RECEIVABLE.
   *
   * Brazilian conventions:
   * - PURCHASE (NFe entrada) → Conta a Pagar (PAYABLE)
   * - SALE (NFe saída) → Conta a Receber (RECEIVABLE)
   * - CARGO (CTe) → Conta a Receber (RECEIVABLE)
   * - RETURN → Depends on context (not auto-generated)
   *
   * @param input - Fiscal classification and document type
   * @returns TitleType (PAYABLE or RECEIVABLE)
   */
  static determineTitleType(
    input: TitleTypeDeterminationInput
  ): Result<TitleType, string> {
    switch (input.fiscalClassification) {
      case 'PURCHASE':
        return Result.ok('PAYABLE');

      case 'SALE':
        return Result.ok('RECEIVABLE');

      case 'CARGO':
        return Result.ok('RECEIVABLE');

      case 'RETURN':
        return Result.fail(
          `Documentos de DEVOLUÇÃO não geram títulos automaticamente. ` +
          `Use processo manual de devolução para ${input.documentType}.`
        );

      case 'TRANSFER':
        return Result.fail(
          `Documentos de TRANSFERÊNCIA não geram títulos financeiros. ` +
          `Transferências são operações internas.`
        );

      case 'OTHER':
        return Result.fail(
          `Classificação fiscal "${input.fiscalClassification}" não gera títulos automaticamente. ` +
          `Classifique o documento como PURCHASE ou SALE/CARGO primeiro.`
        );

      default: {
        const _exhaustive: never = input.fiscalClassification;
        return Result.fail(
          `Classificação fiscal não suportada: ${String(_exhaustive)}`
        );
      }
    }
  }

  // ==========================================================================
  // TITLE ELIGIBILITY VALIDATION
  // ==========================================================================

  /**
   * Validates whether a fiscal document is eligible for title generation.
   *
   * Rules:
   * - Financial status must be NO_TITLE
   * - Fiscal classification must match expected types
   * - Document must have valid type
   *
   * @param input - Eligibility validation data
   * @returns Result.ok(true) if eligible
   */
  static validateTitleEligibility(
    input: TitleEligibilityInput
  ): Result<true, string> {
    // Already has title?
    if (input.financialStatus !== 'NO_TITLE') {
      return Result.fail(
        `Documento ${input.documentType} ${input.documentNumber} já possui título financeiro gerado ` +
        `(status financeiro: ${input.financialStatus})`
      );
    }

    // Valid classification?
    if (!input.expectedClassifications.includes(input.fiscalClassification)) {
      const expected = input.expectedClassifications.join(' ou ');
      return Result.fail(
        `Documento classificado como ${input.fiscalClassification}. ` +
        `Apenas documentos ${expected} geram este tipo de título.`
      );
    }

    return Result.ok(true);
  }

  // ==========================================================================
  // DUE DATE CALCULATION
  // ==========================================================================

  /**
   * Calculates the due date from issue date + payment term in days.
   *
   * If skipNonBusinessDays is true, the due date is moved forward to the
   * next business day (Monday-Friday). This is a simplified implementation
   * that does not consider Brazilian holidays.
   *
   * @param input - Issue date and payment term
   * @returns Calculated due date
   *
   * @see Lei 10.406/02 Art. 132 - Contagem de prazos
   */
  static calculateDueDate(
    input: DueDateCalculationInput
  ): Result<Date, string> {
    if (!(input.issueDate instanceof Date) || isNaN(input.issueDate.getTime())) {
      return Result.fail('Data de emissão inválida');
    }

    if (input.paymentTermDays < 0) {
      return Result.fail('Prazo de pagamento não pode ser negativo');
    }

    if (!Number.isInteger(input.paymentTermDays)) {
      return Result.fail('Prazo de pagamento deve ser um número inteiro de dias');
    }

    const dueDate = new Date(input.issueDate);
    dueDate.setDate(dueDate.getDate() + input.paymentTermDays);

    // Skip weekends if requested
    if (input.skipNonBusinessDays) {
      const dayOfWeek = dueDate.getDay();
      if (dayOfWeek === 0) {
        // Sunday → Monday
        dueDate.setDate(dueDate.getDate() + 1);
      } else if (dayOfWeek === 6) {
        // Saturday → Monday
        dueDate.setDate(dueDate.getDate() + 2);
      }
    }

    return Result.ok(dueDate);
  }

  // ==========================================================================
  // INSTALLMENT SPLITTING
  // ==========================================================================

  /**
   * Splits a total amount into equal installments with calculated due dates.
   *
   * Handles rounding by adding the remainder (centavos) to the last installment,
   * ensuring the sum of installments exactly equals the total amount.
   *
   * @param input - Splitting configuration
   * @returns Array of installments with amounts and due dates
   *
   * @see CDC Art. 52 - Informação sobre parcelas
   */
  static splitInstallments(
    input: InstallmentSplitInput
  ): Result<Installment[], string> {
    if (input.totalAmount <= 0) {
      return Result.fail('Valor total deve ser positivo');
    }

    if (input.numberOfInstallments < 1) {
      return Result.fail('Número de parcelas deve ser pelo menos 1');
    }

    if (!Number.isInteger(input.numberOfInstallments)) {
      return Result.fail('Número de parcelas deve ser inteiro');
    }

    if (input.intervalDays < 1 && input.numberOfInstallments > 1) {
      return Result.fail('Intervalo entre parcelas deve ser pelo menos 1 dia');
    }

    if (!(input.firstDueDate instanceof Date) || isNaN(input.firstDueDate.getTime())) {
      return Result.fail('Data do primeiro vencimento inválida');
    }

    const installments: Installment[] = [];
    const baseAmount = Math.floor((input.totalAmount / input.numberOfInstallments) * 100) / 100;
    const remainingCentavos = Math.round(
      (input.totalAmount - baseAmount * input.numberOfInstallments) * 100
    ) / 100;

    for (let i = 0; i < input.numberOfInstallments; i++) {
      const dueDate = new Date(input.firstDueDate);
      dueDate.setDate(dueDate.getDate() + (i * input.intervalDays));

      // Skip weekends if requested
      if (input.skipNonBusinessDays) {
        const dayOfWeek = dueDate.getDay();
        if (dayOfWeek === 0) {
          dueDate.setDate(dueDate.getDate() + 1);
        } else if (dayOfWeek === 6) {
          dueDate.setDate(dueDate.getDate() + 2);
        }
      }

      // Last installment absorbs rounding difference
      const isLast = i === input.numberOfInstallments - 1;
      const amount = isLast
        ? Math.round((baseAmount + remainingCentavos) * 100) / 100
        : baseAmount;

      installments.push({
        installmentNumber: i + 1,
        amount,
        dueDate,
        description: input.numberOfInstallments === 1
          ? 'Parcela única'
          : `Parcela ${i + 1}/${input.numberOfInstallments}`,
      });
    }

    // Final validation: sum of installments must equal total
    const sumOfInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
    const diff = Math.abs(sumOfInstallments - input.totalAmount);

    if (diff > 0.01) {
      return Result.fail(
        `Erro de arredondamento no parcelamento: ` +
        `soma das parcelas (${sumOfInstallments.toFixed(2)}) ≠ ` +
        `total (${input.totalAmount.toFixed(2)}). Diferença: ${diff.toFixed(2)}`
      );
    }

    return Result.ok(installments);
  }

  // ==========================================================================
  // TITLE DESCRIPTION GENERATION
  // ==========================================================================

  /**
   * Generates a standardized title description.
   *
   * Format:
   * - Single: "{docType} {docNumber} - {partnerName}"
   * - Installment: "{docType} {docNumber} - {partnerName} (X/Y)"
   *
   * @param input - Description generation data
   * @returns Formatted description string
   */
  static generateTitleDescription(
    input: TitleDescriptionInput
  ): Result<string, string> {
    const docType = input.documentType.trim();
    const docNumber = input.documentNumber.trim();
    const partnerName = input.partnerName.trim();

    if (!docType) {
      return Result.fail('Tipo de documento é obrigatório');
    }

    if (!docNumber) {
      return Result.fail('Número do documento é obrigatório');
    }

    if (!partnerName) {
      return Result.fail('Nome do parceiro é obrigatório');
    }

    let description = `${docType} ${docNumber} - ${partnerName}`;

    if (
      input.installmentNumber !== undefined &&
      input.totalInstallments !== undefined &&
      input.totalInstallments > 1
    ) {
      description += ` (${input.installmentNumber}/${input.totalInstallments})`;
    }

    return Result.ok(description);
  }

  // ==========================================================================
  // TITLE ORIGIN DETERMINATION
  // ==========================================================================

  /**
   * Determines the title origin based on document type.
   *
   * @param documentType - Type of the fiscal document (NFE, CTE, NFSE, etc.)
   * @returns TitleOrigin enum value
   */
  static determineTitleOrigin(
    documentType: string
  ): Result<TitleOrigin, string> {
    const normalized = documentType.trim().toUpperCase();

    switch (normalized) {
      case 'NFE':
      case 'NFCE':
        return Result.ok('FISCAL_NFE');

      case 'CTE':
      case 'CTEOS':
        return Result.ok('FISCAL_CTE');

      case 'NFSE':
        return Result.ok('FISCAL_NFSE');

      default:
        return Result.fail(
          `Tipo de documento "${documentType}" não tem origem de título definida. ` +
          `Tipos suportados: NFE, CTE, NFSE.`
        );
    }
  }

  // ==========================================================================
  // REVERSAL ELIGIBILITY VALIDATION
  // ==========================================================================

  /**
   * Validates whether financial titles can be reversed (undone).
   *
   * Rules:
   * - Document must have titles generated (financialStatus ≠ NO_TITLE)
   * - No titles can be PAID, RECEIVED, or PARTIAL
   * - Only OPEN titles can be reversed
   *
   * @param input - Reversal eligibility data
   * @returns Result.ok(true) if titles can be reversed
   */
  static validateReversalEligibility(
    input: ReversalEligibilityInput
  ): Result<true, string> {
    // Must have titles
    if (input.financialStatus === 'NO_TITLE') {
      return Result.fail(
        `Documento ${input.documentNumber} não possui títulos gerados para reverter`
      );
    }

    // Check for paid/received titles
    const paidStatuses: TitlePaymentStatus[] = ['PAID', 'RECEIVED', 'PARTIAL'];
    const paidTitles = input.titlePaymentStatuses.filter(s => paidStatuses.includes(s));

    if (paidTitles.length > 0) {
      return Result.fail(
        `Não é possível reverter títulos já pagos ou recebidos. ` +
        `Documento ${input.documentNumber} possui ${paidTitles.length} título(s) com status: ` +
        `${[...new Set(paidTitles)].join(', ')}. ` +
        `Estorne os pagamentos primeiro.`
      );
    }

    // Check for processing titles
    const processingTitles = input.titlePaymentStatuses.filter(s => s === 'PROCESSING');
    if (processingTitles.length > 0) {
      return Result.fail(
        `Não é possível reverter títulos em processamento. ` +
        `Aguarde ou cancele o processamento antes de reverter.`
      );
    }

    return Result.ok(true);
  }

  // ==========================================================================
  // FULL TITLE GENERATION (ORCHESTRATION)
  // ==========================================================================

  /**
   * Generates complete financial title data from a fiscal document.
   *
   * This is the main orchestration method that combines:
   * 1. Eligibility validation
   * 2. Title type determination
   * 3. Due date calculation
   * 4. Installment splitting
   * 5. Description generation
   * 6. Origin determination
   *
   * Returns pure data - no persistence. The Use Case layer handles saving.
   *
   * @param input - Full generation input
   * @returns Array of GeneratedTitleData (one per installment)
   */
  static generateTitles(
    input: GenerateTitleInput
  ): Result<GeneratedTitleData[], string> {
    // 1. Determine title type
    const titleTypeResult = TitleGenerationService.determineTitleType({
      fiscalClassification: input.fiscalClassification,
      documentType: input.documentType,
    });

    if (Result.isFail(titleTypeResult)) {
      return Result.fail(titleTypeResult.error);
    }

    const titleType = titleTypeResult.value;

    // 2. Validate eligibility
    const expectedClassifications: FiscalClassification[] =
      titleType === 'PAYABLE'
        ? ['PURCHASE']
        : ['SALE', 'CARGO'];

    const eligibilityResult = TitleGenerationService.validateTitleEligibility({
      financialStatus: input.financialStatus,
      fiscalClassification: input.fiscalClassification,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      expectedClassifications,
    });

    if (Result.isFail(eligibilityResult)) {
      return Result.fail(eligibilityResult.error);
    }

    // 3. Validate amount
    if (input.netAmount <= 0) {
      return Result.fail(
        `Valor líquido do documento deve ser positivo. Encontrado: ${input.netAmount}`
      );
    }

    // 4. Determine origin
    const originResult = TitleGenerationService.determineTitleOrigin(input.documentType);
    if (Result.isFail(originResult)) {
      return Result.fail(originResult.error);
    }

    const origin = originResult.value;

    // 5. Calculate first due date
    const paymentTermDays = input.paymentTermDays ?? 0;
    const dueDateResult = TitleGenerationService.calculateDueDate({
      issueDate: input.issueDate,
      paymentTermDays,
    });

    if (Result.isFail(dueDateResult)) {
      return Result.fail(dueDateResult.error);
    }

    const firstDueDate = dueDateResult.value;
    const numberOfInstallments = input.numberOfInstallments ?? 1;
    const intervalDays = input.installmentIntervalDays ?? 30;

    // 6. Split installments
    const installmentsResult = TitleGenerationService.splitInstallments({
      totalAmount: input.netAmount,
      numberOfInstallments,
      firstDueDate,
      intervalDays,
    });

    if (Result.isFail(installmentsResult)) {
      return Result.fail(installmentsResult.error);
    }

    const installments = installmentsResult.value;

    // 7. Generate title data for each installment
    const titles: GeneratedTitleData[] = [];

    for (const installment of installments) {
      const descriptionResult = TitleGenerationService.generateTitleDescription({
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        partnerName: input.partnerName,
        installmentNumber: installment.installmentNumber,
        totalInstallments: numberOfInstallments,
      });

      if (Result.isFail(descriptionResult)) {
        return Result.fail(descriptionResult.error);
      }

      titles.push({
        titleType,
        description: descriptionResult.value,
        documentNumber: input.documentNumber.trim(),
        issueDate: input.issueDate,
        dueDate: installment.dueDate,
        amount: installment.amount,
        origin,
        installmentNumber: installment.installmentNumber,
        totalInstallments: numberOfInstallments,
      });
    }

    return Result.ok(titles);
  }
}
