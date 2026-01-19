/**
 * Bank Statement Validator - Domain Service
 * 
 * Validates bank statement data integrity, detects duplicates,
 * and ensures data consistency.
 * 
 * @module financial/domain/services/bank-statement/BankStatementValidator
 */

import { Result } from '@/shared/domain';
import type {
  BankStatementData,
  BankTransaction,
} from '../../types';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  transactionFitId?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  transactionFitId?: string;
}

/**
 * Duplicate detection result
 */
export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: Array<{
    original: BankTransaction;
    duplicate: BankTransaction;
    reason: string;
  }>;
}

/**
 * Bank Statement Validator - Stateless Domain Service
 * 
 * Validates bank statement data for integrity and consistency.
 */
export class BankStatementValidator {
  private constructor() {
    // Prevent instantiation - all methods are static
  }

  /**
   * Validate complete bank statement
   */
  static validate(statement: BankStatementData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate account info
    this.validateAccount(statement, errors, warnings);

    // Validate period
    this.validatePeriod(statement, errors, warnings);

    // Validate balance
    this.validateBalance(statement, errors, warnings);

    // Validate transactions
    this.validateTransactions(statement, errors, warnings);

    // Check for internal duplicates
    const duplicateCheck = this.checkInternalDuplicates(statement.transactions);
    if (duplicateCheck.hasDuplicates) {
      for (const dup of duplicateCheck.duplicates) {
        warnings.push({
          code: 'DUPLICATE_TRANSACTION',
          message: `Transação duplicada detectada: ${dup.reason}`,
          transactionFitId: dup.duplicate.fitId,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate account information
   */
  private static validateAccount(
    statement: BankStatementData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { account } = statement;

    if (!account.bankCode) {
      warnings.push({
        code: 'MISSING_BANK_CODE',
        message: 'Código do banco não informado',
        field: 'account.bankCode',
      });
    }

    if (!account.accountNumber) {
      errors.push({
        code: 'MISSING_ACCOUNT_NUMBER',
        message: 'Número da conta não informado',
        field: 'account.accountNumber',
      });
    }

    if (!account.currency) {
      warnings.push({
        code: 'MISSING_CURRENCY',
        message: 'Moeda não informada, assumindo BRL',
        field: 'account.currency',
      });
    }
  }

  /**
   * Validate statement period
   */
  private static validatePeriod(
    statement: BankStatementData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { period } = statement;

    if (!period.startDate || isNaN(period.startDate.getTime())) {
      errors.push({
        code: 'INVALID_START_DATE',
        message: 'Data inicial do período inválida',
        field: 'period.startDate',
      });
      return;
    }

    if (!period.endDate || isNaN(period.endDate.getTime())) {
      errors.push({
        code: 'INVALID_END_DATE',
        message: 'Data final do período inválida',
        field: 'period.endDate',
      });
      return;
    }

    if (period.startDate > period.endDate) {
      errors.push({
        code: 'INVALID_PERIOD',
        message: 'Data inicial é posterior à data final',
        field: 'period',
      });
    }

    // Check if period is too long (more than 1 year)
    const daysDiff = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      warnings.push({
        code: 'LONG_PERIOD',
        message: `Período do extrato é muito longo (${Math.floor(daysDiff)} dias)`,
        field: 'period',
      });
    }
  }

  /**
   * Validate balance information
   */
  private static validateBalance(
    statement: BankStatementData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { balance, transactions } = statement;

    if (isNaN(balance.openingBalance)) {
      warnings.push({
        code: 'INVALID_OPENING_BALANCE',
        message: 'Saldo inicial inválido',
        field: 'balance.openingBalance',
      });
    }

    if (isNaN(balance.closingBalance)) {
      errors.push({
        code: 'INVALID_CLOSING_BALANCE',
        message: 'Saldo final inválido',
        field: 'balance.closingBalance',
      });
      return;
    }

    // Validate balance consistency with transactions
    if (transactions.length > 0 && balance.openingBalance !== 0) {
      const calculatedBalance = this.calculateExpectedBalance(
        balance.openingBalance,
        transactions
      );
      const diff = Math.abs(calculatedBalance - balance.closingBalance);

      if (diff > 0.01) {
        warnings.push({
          code: 'BALANCE_MISMATCH',
          message: `Saldo calculado (${calculatedBalance.toFixed(2)}) difere do informado (${balance.closingBalance.toFixed(2)})`,
          field: 'balance',
        });
      }
    }
  }

  /**
   * Validate transactions
   */
  private static validateTransactions(
    statement: BankStatementData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { transactions, period } = statement;

    if (transactions.length === 0) {
      warnings.push({
        code: 'NO_TRANSACTIONS',
        message: 'Extrato não contém transações',
      });
      return;
    }

    for (const txn of transactions) {
      // Validate required fields
      if (!txn.fitId) {
        errors.push({
          code: 'MISSING_FIT_ID',
          message: 'ID da transação ausente',
          transactionFitId: 'unknown',
        });
      }

      if (!txn.transactionDate || isNaN(txn.transactionDate.getTime())) {
        errors.push({
          code: 'INVALID_TRANSACTION_DATE',
          message: 'Data da transação inválida',
          transactionFitId: txn.fitId,
        });
      }

      if (isNaN(txn.amount)) {
        errors.push({
          code: 'INVALID_AMOUNT',
          message: 'Valor da transação inválido',
          transactionFitId: txn.fitId,
        });
      }

      if (!txn.description) {
        warnings.push({
          code: 'MISSING_DESCRIPTION',
          message: 'Descrição da transação ausente',
          transactionFitId: txn.fitId,
        });
      }

      // Check if transaction is within period
      if (txn.transactionDate && period.startDate && period.endDate) {
        if (txn.transactionDate < period.startDate || txn.transactionDate > period.endDate) {
          warnings.push({
            code: 'TRANSACTION_OUTSIDE_PERIOD',
            message: 'Transação fora do período do extrato',
            transactionFitId: txn.fitId,
          });
        }
      }

      // Validate amount consistency with direction
      if (txn.direction === 'CREDIT' && txn.amount < 0) {
        warnings.push({
          code: 'DIRECTION_AMOUNT_MISMATCH',
          message: 'Direção CREDIT mas valor é negativo',
          transactionFitId: txn.fitId,
        });
      }

      if (txn.direction === 'DEBIT' && txn.amount > 0) {
        warnings.push({
          code: 'DIRECTION_AMOUNT_MISMATCH',
          message: 'Direção DEBIT mas valor é positivo',
          transactionFitId: txn.fitId,
        });
      }
    }
  }

  /**
   * Check for duplicate transactions within the statement
   */
  static checkInternalDuplicates(transactions: BankTransaction[]): DuplicateCheckResult {
    const duplicates: DuplicateCheckResult['duplicates'] = [];
    const seen = new Map<string, BankTransaction>();

    for (const txn of transactions) {
      // Key 1: Same FIT ID
      if (seen.has(txn.fitId)) {
        duplicates.push({
          original: seen.get(txn.fitId)!,
          duplicate: txn,
          reason: `Mesmo ID: ${txn.fitId}`,
        });
        continue;
      }
      seen.set(txn.fitId, txn);

      // Key 2: Same date + amount + description (fuzzy duplicate)
      const fuzzyKey = this.generateFuzzyKey(txn);
      if (seen.has(fuzzyKey)) {
        const original = seen.get(fuzzyKey)!;
        // Only flag if it's not the same transaction by ID
        if (original.fitId !== txn.fitId) {
          duplicates.push({
            original,
            duplicate: txn,
            reason: `Mesma data, valor e descrição similar`,
          });
        }
      } else {
        seen.set(fuzzyKey, txn);
      }
    }

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }

  /**
   * Check if transactions exist in database (external duplicates)
   */
  static checkExternalDuplicates(
    newTransactions: BankTransaction[],
    existingTransactions: BankTransaction[]
  ): DuplicateCheckResult {
    const duplicates: DuplicateCheckResult['duplicates'] = [];
    
    const existingKeys = new Set<string>();
    const existingFuzzyKeys = new Map<string, BankTransaction>();

    for (const existing of existingTransactions) {
      existingKeys.add(existing.fitId);
      existingFuzzyKeys.set(this.generateFuzzyKey(existing), existing);
    }

    for (const txn of newTransactions) {
      // Check exact FIT ID match
      if (existingKeys.has(txn.fitId)) {
        duplicates.push({
          original: existingTransactions.find(e => e.fitId === txn.fitId)!,
          duplicate: txn,
          reason: `ID já existe no sistema`,
        });
        continue;
      }

      // Check fuzzy match
      const fuzzyKey = this.generateFuzzyKey(txn);
      if (existingFuzzyKeys.has(fuzzyKey)) {
        duplicates.push({
          original: existingFuzzyKeys.get(fuzzyKey)!,
          duplicate: txn,
          reason: `Transação similar já existe`,
        });
      }
    }

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }

  /**
   * Generate fuzzy key for duplicate detection
   */
  private static generateFuzzyKey(txn: BankTransaction): string {
    const dateStr = txn.transactionDate.toISOString().split('T')[0];
    const amount = txn.amount.toFixed(2);
    const desc = (txn.normalizedDescription || txn.description)
      .toLowerCase()
      .replace(/\s+/g, '')
      .substring(0, 20);
    
    return `${dateStr}|${amount}|${desc}`;
  }

  /**
   * Calculate expected balance from opening balance and transactions
   */
  private static calculateExpectedBalance(
    openingBalance: number,
    transactions: BankTransaction[]
  ): number {
    let balance = openingBalance;
    for (const txn of transactions) {
      balance += txn.amount;
    }
    return balance;
  }

  /**
   * Validate bank account format (Brazilian banks)
   */
  static validateBrazilianAccount(
    bankCode: string,
    branchCode: string,
    accountNumber: string
  ): Result<boolean, string> {
    // Bank code: 3 digits
    if (!/^\d{3}$/.test(bankCode)) {
      return Result.fail('Código do banco deve ter 3 dígitos');
    }

    // Branch: 4-5 digits (with optional check digit)
    if (!/^\d{4,5}(-?\d)?$/.test(branchCode)) {
      return Result.fail('Agência deve ter 4-5 dígitos');
    }

    // Account: 5-12 digits (varies by bank)
    if (!/^\d{5,12}(-?\d)?$/.test(accountNumber)) {
      return Result.fail('Número da conta inválido');
    }

    return Result.ok(true);
  }

  /**
   * Validate CNPJ format
   */
  static validateCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length !== 14) {
      return false;
    }

    // Check for repeated digits
    if (/^(\d)\1+$/.test(cleaned)) {
      return false;
    }

    // Validate check digits
    let sum = 0;
    let weight = 5;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    
    if (digit !== parseInt(cleaned[12])) {
      return false;
    }

    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    
    return digit === parseInt(cleaned[13]);
  }

  /**
   * Validate CPF format
   */
  static validateCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11) {
      return false;
    }

    // Check for repeated digits
    if (/^(\d)\1+$/.test(cleaned)) {
      return false;
    }

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    
    if (digit !== parseInt(cleaned[9])) {
      return false;
    }

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i]) * (11 - i);
    }
    
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    
    return digit === parseInt(cleaned[10]);
  }
}
