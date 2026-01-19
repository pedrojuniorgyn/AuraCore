/**
 * Import Bank Statement Use Case - Input Port Interface
 * 
 * Defines the contract for importing bank statements into the system.
 * 
 * @module financial/domain/ports/input/IImportBankStatementUseCase
 */

import type { Result } from '@/shared/domain';
import type {
  BankStatementData,
  BankStatementFormat,
  BankStatementImportResult,
  BankTransaction,
  TransactionCategory,
  CategorizationRule,
} from '../../types';

/**
 * Input for importing a bank statement
 */
export interface ImportBankStatementInput {
  /** File content as string */
  content: string;
  
  /** Original file name */
  fileName: string;
  
  /** Bank account ID to associate transactions with */
  bankAccountId: string;
  
  /** Multi-tenancy */
  organizationId: number;
  branchId: number;
  
  /** Optional: Force specific format */
  format?: BankStatementFormat;
  
  /** Options */
  options?: {
    /** Skip duplicate detection (default: false) */
    skipDuplicateDetection?: boolean;
    
    /** Skip auto-categorization (default: false) */
    skipCategorization?: boolean;
    
    /** Skip validation (default: false) */
    skipValidation?: boolean;
    
    /** Auto-match with payables/receivables (default: false) */
    autoMatch?: boolean;
    
    /** Custom categorization rules */
    customRules?: CategorizationRule[];
    
    /** CSV-specific options */
    csvDelimiter?: string;
    csvDateFormat?: string;
  };
}

/**
 * Output of importing a bank statement
 */
export interface ImportBankStatementOutput {
  /** Parsed statement data */
  statement: BankStatementData;
  
  /** Import statistics */
  importResult: BankStatementImportResult;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Input for getting import preview
 */
export interface PreviewBankStatementInput {
  /** File content as string */
  content: string;
  
  /** Original file name */
  fileName: string;
  
  /** Multi-tenancy */
  organizationId: number;
  branchId: number;
  
  /** Optional: Force specific format */
  format?: BankStatementFormat;
}

/**
 * Output of import preview
 */
export interface PreviewBankStatementOutput {
  /** Detected format */
  detectedFormat: BankStatementFormat;
  
  /** Account info extracted */
  account: {
    bankCode?: string;
    bankName?: string;
    branchCode?: string;
    accountNumber?: string;
    accountType?: string;
  };
  
  /** Period info */
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Transaction summary */
  summary: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    netMovement: number;
  };
  
  /** Sample transactions (first 10) */
  sampleTransactions: Array<{
    date: Date;
    description: string;
    amount: number;
    category?: TransactionCategory;
  }>;
  
  /** Potential issues detected */
  warnings: string[];
  
  /** Number of potential duplicates */
  potentialDuplicates: number;
}

/**
 * Input for manual categorization
 */
export interface CategorizeBankTransactionInput {
  /** Transaction FIT ID */
  fitId: string;
  
  /** Category to assign */
  category: TransactionCategory;
  
  /** Multi-tenancy */
  organizationId: number;
  branchId: number;
}

/**
 * Input Port Interface for importing bank statements
 */
export interface IImportBankStatementUseCase {
  /**
   * Import a bank statement file
   */
  execute(input: ImportBankStatementInput): Promise<Result<ImportBankStatementOutput, string>>;
  
  /**
   * Preview import without saving
   */
  preview(input: PreviewBankStatementInput): Promise<Result<PreviewBankStatementOutput, string>>;
  
  /**
   * Manually categorize a transaction
   */
  categorizeTransaction(input: CategorizeBankTransactionInput): Promise<Result<BankTransaction, string>>;
}
