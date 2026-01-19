/**
 * Import Bank Statement Use Case - Application Command
 * 
 * Handles the import of bank statements into the system,
 * including parsing, validation, categorization, and persistence.
 * 
 * @module financial/application/commands/import-bank-statement/ImportBankStatementUseCase
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IImportBankStatementUseCase,
  ImportBankStatementInput,
  ImportBankStatementOutput,
  PreviewBankStatementInput,
  PreviewBankStatementOutput,
  CategorizeBankTransactionInput,
} from '@/modules/financial/domain/ports/input/IImportBankStatementUseCase';
import type { BankTransaction, BankStatementImportResult } from '@/modules/financial/domain/types';
import { BankStatementParser } from '@/modules/financial/domain/services/bank-statement/BankStatementParser';
import { BankStatementValidator } from '@/modules/financial/domain/services/bank-statement/BankStatementValidator';
import { TransactionCategorizer } from '@/modules/financial/domain/services/bank-statement/TransactionCategorizer';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

/**
 * Bank Transaction Repository Interface
 */
export interface IBankTransactionRepository {
  findByFitId(
    fitId: string,
    organizationId: number,
    branchId: number
  ): Promise<BankTransaction | null>;
  
  findByAccountId(
    accountId: string,
    organizationId: number,
    branchId: number,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<BankTransaction[]>;
  
  save(
    transaction: BankTransaction,
    organizationId: number,
    branchId: number,
    bankAccountId: string
  ): Promise<void>;
  
  saveBatch(
    transactions: BankTransaction[],
    organizationId: number,
    branchId: number,
    bankAccountId: string
  ): Promise<{ saved: number; failed: number }>;
  
  updateCategory(
    fitId: string,
    category: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;
}

/**
 * Import Bank Statement Use Case
 * 
 * Orchestrates the import process for bank statements.
 */
@injectable()
export class ImportBankStatementUseCase implements IImportBankStatementUseCase {
  constructor(
    @inject(TOKENS.BankTransactionRepository)
    private readonly repository: IBankTransactionRepository
  ) {}

  /**
   * Import a bank statement file
   */
  async execute(
    input: ImportBankStatementInput
  ): Promise<Result<ImportBankStatementOutput, string>> {
    const startTime = Date.now();
    
    // 1. Validate input
    if (!input.content) {
      return Result.fail('Conteúdo do arquivo não fornecido');
    }
    
    if (!input.fileName) {
      return Result.fail('Nome do arquivo não fornecido');
    }
    
    if (!input.bankAccountId) {
      return Result.fail('ID da conta bancária não fornecido');
    }
    
    if (!input.organizationId || !input.branchId) {
      return Result.fail('Contexto de organização/filial não fornecido');
    }
    
    // 2. Parse the statement
    const parseResult = await BankStatementParser.parse(
      input.content,
      input.fileName,
      {
        defaultFormat: input.format,
        autoDetectFormat: !input.format,
        autoCategorizem: !input.options?.skipCategorization,
        validateBalance: !input.options?.skipValidation,
        detectDuplicates: !input.options?.skipDuplicateDetection,
        csvDelimiter: input.options?.csvDelimiter,
        csvDateFormat: input.options?.csvDateFormat,
      }
    );
    
    if (Result.isFail(parseResult)) {
      return Result.fail(`Erro ao processar arquivo: ${parseResult.error}`);
    }
    
    const { statement } = parseResult.value;
    
    // 3. Check for external duplicates (against database)
    let transactionsToImport = [...statement.transactions];
    let skippedDuplicates = 0;
    
    if (!input.options?.skipDuplicateDetection) {
      const existingTransactions = await this.repository.findByAccountId(
        input.bankAccountId,
        input.organizationId,
        input.branchId,
        {
          startDate: statement.period.startDate,
          endDate: statement.period.endDate,
        }
      );
      
      if (existingTransactions.length > 0) {
        const duplicateCheck = BankStatementValidator.checkExternalDuplicates(
          statement.transactions,
          existingTransactions
        );
        
        if (duplicateCheck.hasDuplicates) {
          const duplicateFitIds = new Set(
            duplicateCheck.duplicates.map(d => d.duplicate.fitId)
          );
          
          transactionsToImport = statement.transactions.filter(
            t => !duplicateFitIds.has(t.fitId)
          );
          
          skippedDuplicates = duplicateCheck.duplicates.length;
        }
      }
    }
    
    // 4. Apply custom categorization rules if provided
    if (input.options?.customRules && transactionsToImport.length > 0) {
      const categorizationResult = TransactionCategorizer.categorizeBatch(
        transactionsToImport,
        input.options.customRules
      );
      
      if (Result.isOk(categorizationResult)) {
        transactionsToImport = categorizationResult.value.transactions;
      }
    }
    
    // 5. Save transactions to database
    let savedCount = 0;
    let failedCount = 0;
    
    if (transactionsToImport.length > 0) {
      const saveResult = await this.repository.saveBatch(
        transactionsToImport,
        input.organizationId,
        input.branchId,
        input.bankAccountId
      );
      
      savedCount = saveResult.saved;
      failedCount = saveResult.failed;
    }
    
    // 6. Build import result
    const importResult: BankStatementImportResult = {
      success: failedCount === 0 && statement.validationErrors.length === 0,
      data: statement,
      transactionsImported: savedCount,
      transactionsSkipped: skippedDuplicates,
      transactionsFailed: failedCount,
      transactionsCategorized: transactionsToImport.filter(t => t.category && t.category !== 'OTHER').length,
      transactionsMatched: 0, // TODO: Implement auto-matching
      matchedPayables: [],
      matchedReceivables: [],
      errors: statement.validationErrors,
      warnings: [
        ...statement.validationWarnings,
        ...(skippedDuplicates > 0 
          ? [`${skippedDuplicates} transações duplicadas foram ignoradas`] 
          : []),
      ],
    };
    
    const processingTimeMs = Date.now() - startTime;
    
    return Result.ok({
      statement,
      importResult,
      processingTimeMs,
    });
  }

  /**
   * Preview import without saving
   */
  async preview(
    input: PreviewBankStatementInput
  ): Promise<Result<PreviewBankStatementOutput, string>> {
    // 1. Validate input
    if (!input.content) {
      return Result.fail('Conteúdo do arquivo não fornecido');
    }
    
    // 2. Detect format
    const formatResult = BankStatementParser.detectFormat(
      input.content,
      input.fileName
    );
    
    if (Result.isFail(formatResult)) {
      return Result.fail(formatResult.error);
    }
    
    // 3. Parse the statement
    const parseResult = await BankStatementParser.parse(
      input.content,
      input.fileName,
      {
        defaultFormat: input.format,
        autoDetectFormat: !input.format,
        autoCategorizem: true,
        validateBalance: true,
        detectDuplicates: true,
      }
    );
    
    if (Result.isFail(parseResult)) {
      return Result.fail(parseResult.error);
    }
    
    const { statement } = parseResult.value;
    
    // 4. Count potential duplicates against internal duplicates only
    // (we don't have bankAccountId to check external duplicates in preview)
    const duplicateCheck = BankStatementValidator.checkInternalDuplicates(
      statement.transactions
    );
    
    // 5. Build preview
    const preview: PreviewBankStatementOutput = {
      detectedFormat: formatResult.value,
      account: {
        bankCode: statement.account.bankCode || undefined,
        bankName: statement.account.bankName,
        branchCode: statement.account.branchCode || undefined,
        accountNumber: statement.account.accountNumber || undefined,
        accountType: statement.account.accountType,
      },
      period: {
        startDate: statement.period.startDate,
        endDate: statement.period.endDate,
      },
      summary: {
        totalTransactions: statement.summary.totalTransactions,
        totalCredits: statement.summary.totalCredits,
        totalDebits: statement.summary.totalDebits,
        netMovement: statement.summary.netMovement,
      },
      sampleTransactions: statement.transactions.slice(0, 10).map(t => ({
        date: t.transactionDate,
        description: t.description,
        amount: t.amount,
        category: t.category,
      })),
      warnings: statement.validationWarnings,
      potentialDuplicates: duplicateCheck.duplicates.length,
    };
    
    return Result.ok(preview);
  }

  /**
   * Manually categorize a transaction
   */
  async categorizeTransaction(
    input: CategorizeBankTransactionInput
  ): Promise<Result<BankTransaction, string>> {
    // 1. Validate input
    if (!input.fitId) {
      return Result.fail('ID da transação não fornecido');
    }
    
    if (!input.category) {
      return Result.fail('Categoria não fornecida');
    }
    
    // 2. Find transaction
    const transaction = await this.repository.findByFitId(
      input.fitId,
      input.organizationId,
      input.branchId
    );
    
    if (!transaction) {
      return Result.fail('Transação não encontrada');
    }
    
    // 3. Update category
    await this.repository.updateCategory(
      input.fitId,
      input.category,
      input.organizationId,
      input.branchId
    );
    
    // 4. Return updated transaction
    return Result.ok({
      ...transaction,
      category: input.category,
      categoryConfidence: 1.0, // Manual categorization = 100% confidence
    });
  }
}
