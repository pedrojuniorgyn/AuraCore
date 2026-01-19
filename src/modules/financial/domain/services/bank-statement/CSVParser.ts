/**
 * CSV Parser - Domain Service
 * 
 * Parses CSV bank statement files and extracts structured data.
 * Supports multiple Brazilian bank formats.
 * 
 * @module financial/domain/services/bank-statement/CSVParser
 */

import { Result } from '@/shared/domain';
import type {
  BankStatementData,
  BankTransaction,
  BankAccountInfo,
  StatementPeriod,
  BalanceInfo,
  TransactionSummary,
  OFXTransactionType,
  TransactionDirection,
  BankStatementParserConfig,
} from '../../types';

/**
 * CSV column mapping configuration
 */
export interface CSVColumnMapping {
  dateColumn: number | string;
  amountColumn: number | string;
  descriptionColumn: number | string;
  balanceColumn?: number | string;
  typeColumn?: number | string;
  idColumn?: number | string;
}

/**
 * Detected bank format
 */
export type BankCSVFormat = 
  | 'ITAU'
  | 'BRADESCO'
  | 'SANTANDER'
  | 'BB'
  | 'CAIXA'
  | 'NUBANK'
  | 'INTER'
  | 'C6'
  | 'GENERIC';

/**
 * CSV Parser - Stateless Domain Service
 * 
 * Parses CSV bank statement files with auto-detection of bank format.
 */
export class CSVParser {
  private constructor() {
    // Prevent instantiation - all methods are static
  }

  /**
   * Parse CSV content string
   */
  static async parse(
    content: string,
    fileName: string,
    config?: Partial<BankStatementParserConfig>
  ): Promise<Result<BankStatementData, string>> {
    try {
      // Detect delimiter
      const delimiter = config?.csvDelimiter || this.detectDelimiter(content);
      
      // Parse CSV
      const lines = this.parseCSVLines(content, delimiter);
      if (lines.length === 0) {
        return Result.fail('Arquivo CSV vazio');
      }
      
      // Detect if has header
      const hasHeader = config?.csvHasHeader ?? this.detectHeader(lines[0]);
      
      // Detect bank format
      const bankFormat = this.detectBankFormat(lines, hasHeader);
      
      // Get column mapping
      const mapping = this.getColumnMapping(bankFormat, config);
      
      // Extract data
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      // Extract transactions
      const transactions = this.extractTransactions(dataLines, mapping, config?.csvDateFormat);
      if (Result.isFail(transactions)) {
        return Result.fail(`Erro ao extrair transações: ${transactions.error}`);
      }
      
      // Calculate period from transactions
      const period = this.calculatePeriod(transactions.value);
      
      // Calculate balance
      const balance = this.calculateBalance(transactions.value, dataLines, mapping);
      
      // Calculate summary
      const summary = this.calculateSummary(transactions.value);
      
      // Extract account info (limited in CSV)
      const account: BankAccountInfo = {
        bankCode: '',
        branchCode: '',
        accountNumber: '',
        accountType: 'CHECKING',
        currency: 'BRL',
      };
      
      // Build result
      const statementData: BankStatementData = {
        format: 'CSV',
        fileName,
        parsedAt: new Date(),
        account,
        period,
        balance,
        transactions: transactions.value,
        summary,
        isValid: true,
        validationErrors: [],
        validationWarnings: [],
      };
      
      return Result.ok(statementData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao processar arquivo CSV: ${message}`);
    }
  }

  /**
   * Parse CSV lines handling quotes and escapes
   */
  private static parseCSVLines(content: string, delimiter: string): string[][] {
    const lines: string[][] = [];
    const rows = content.split(/\r?\n/);
    
    for (const row of rows) {
      if (!row.trim()) continue;
      
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentCell += '"';
            i++;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      
      cells.push(currentCell.trim());
      lines.push(cells);
    }
    
    return lines;
  }

  /**
   * Detect CSV delimiter
   */
  static detectDelimiter(content: string): string {
    const firstLine = content.split(/\r?\n/)[0] || '';
    
    const delimiters = [';', ',', '\t', '|'];
    let maxCount = 0;
    let detected = ';'; // Default for Brazilian banks
    
    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detected = delimiter;
      }
    }
    
    return detected;
  }

  /**
   * Detect if first line is header
   */
  private static detectHeader(firstLine: string[]): boolean {
    // Check if first line contains typical header words
    const headerWords = [
      'data', 'date', 'valor', 'value', 'amount', 'descricao', 'description',
      'historico', 'lancamento', 'saldo', 'balance', 'tipo', 'type'
    ];
    
    const firstLineText = firstLine.join(' ').toLowerCase();
    
    return headerWords.some(word => firstLineText.includes(word));
  }

  /**
   * Detect bank format from CSV structure
   */
  private static detectBankFormat(lines: string[][], hasHeader: boolean): BankCSVFormat {
    const header = hasHeader ? lines[0] : null;
    const firstDataLine = hasHeader ? lines[1] : lines[0];
    
    if (!firstDataLine) return 'GENERIC';
    
    // Check column count and patterns
    const columnCount = firstDataLine.length;
    const headerText = header?.join(' ').toLowerCase() || '';
    
    // Itaú pattern: Date;Description;Value;Balance
    if (headerText.includes('lancamento') && headerText.includes('historico')) {
      return 'ITAU';
    }
    
    // Bradesco pattern
    if (headerText.includes('data') && headerText.includes('historico') && headerText.includes('valor')) {
      return 'BRADESCO';
    }
    
    // Nubank pattern
    if (headerText.includes('data') && headerText.includes('descrição') && headerText.includes('valor')) {
      return 'NUBANK';
    }
    
    // Inter pattern
    if (headerText.includes('data lançamento') || headerText.includes('data lancamento')) {
      return 'INTER';
    }
    
    // C6 pattern
    if (headerText.includes('c6')) {
      return 'C6';
    }
    
    // Santander pattern
    if (columnCount === 4 && headerText.includes('data') && headerText.includes('descricao')) {
      return 'SANTANDER';
    }
    
    // BB pattern
    if (headerText.includes('banco do brasil') || headerText.includes('bb')) {
      return 'BB';
    }
    
    // Caixa pattern
    if (headerText.includes('caixa') || headerText.includes('cef')) {
      return 'CAIXA';
    }
    
    return 'GENERIC';
  }

  /**
   * Get column mapping for bank format
   */
  private static getColumnMapping(
    format: BankCSVFormat,
    config?: Partial<BankStatementParserConfig>
  ): CSVColumnMapping {
    // User-defined mapping takes precedence
    if (config?.csvDateColumn !== undefined && 
        config?.csvAmountColumn !== undefined && 
        config?.csvDescriptionColumn !== undefined) {
      return {
        dateColumn: config.csvDateColumn,
        amountColumn: config.csvAmountColumn,
        descriptionColumn: config.csvDescriptionColumn,
      };
    }
    
    // Bank-specific mappings
    const mappings: Record<BankCSVFormat, CSVColumnMapping> = {
      ITAU: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        balanceColumn: 3,
      },
      BRADESCO: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        balanceColumn: 3,
      },
      SANTANDER: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        balanceColumn: 3,
      },
      BB: {
        dateColumn: 0,
        descriptionColumn: 2,
        amountColumn: 3,
        typeColumn: 1,
      },
      CAIXA: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
      },
      NUBANK: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
      },
      INTER: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        balanceColumn: 3,
      },
      C6: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
      },
      GENERIC: {
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
      },
    };
    
    return mappings[format];
  }

  /**
   * Extract transactions from CSV lines
   */
  private static extractTransactions(
    lines: string[][],
    mapping: CSVColumnMapping,
    dateFormat?: string
  ): Result<BankTransaction[], string> {
    const transactions: BankTransaction[] = [];
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Skip empty lines
      if (line.every(cell => !cell.trim())) continue;
      
      // Get values
      const dateValue = this.getCellValue(line, mapping.dateColumn);
      const amountValue = this.getCellValue(line, mapping.amountColumn);
      const descriptionValue = this.getCellValue(line, mapping.descriptionColumn);
      
      // Skip if essential data is missing
      if (!dateValue || !amountValue) continue;
      
      // Parse date
      const transactionDate = this.parseDate(dateValue, dateFormat);
      if (!transactionDate) {
        // Skip invalid date rows (might be header or footer)
        continue;
      }
      
      // Parse amount
      const amount = this.parseAmount(amountValue);
      
      // Determine direction
      const direction: TransactionDirection = amount >= 0 ? 'CREDIT' : 'DEBIT';
      
      // Determine type
      const typeValue = mapping.typeColumn 
        ? this.getCellValue(line, mapping.typeColumn) 
        : undefined;
      const type = this.inferTransactionType(typeValue, descriptionValue, direction);
      
      // Generate unique ID
      const fitId = this.generateFitId(transactionDate, amount, descriptionValue, lineNumber);
      
      const transaction: BankTransaction = {
        fitId,
        transactionDate,
        amount,
        direction,
        type,
        description: descriptionValue || '',
        normalizedDescription: this.normalizeDescription(descriptionValue || ''),
        reconciliationStatus: 'PENDING',
        rawData: { line: lineNumber, values: line },
      };
      
      transactions.push(transaction);
    }
    
    if (transactions.length === 0) {
      return Result.fail('Nenhuma transação válida encontrada no arquivo');
    }
    
    // Sort by date
    transactions.sort((a, b) => 
      a.transactionDate.getTime() - b.transactionDate.getTime()
    );
    
    return Result.ok(transactions);
  }

  /**
   * Get cell value by column (index or name)
   */
  private static getCellValue(line: string[], column: number | string): string {
    if (typeof column === 'number') {
      return line[column] || '';
    }
    // If column is string, it's a header name - not implemented yet
    return '';
  }

  /**
   * Parse date string in various formats
   */
  private static parseDate(dateStr: string, format?: string): Date | null {
    if (!dateStr) return null;
    
    const cleaned = dateStr.trim();
    
    // Try specified format first
    if (format) {
      const parsed = this.parseDateWithFormat(cleaned, format);
      if (parsed) return parsed;
    }
    
    // Try common Brazilian formats
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{2})$/, // DD/MM/YY
    ];
    
    // DD/MM/YYYY or DD-MM-YYYY
    const match1 = cleaned.match(formats[0]) || cleaned.match(formats[1]);
    if (match1) {
      const day = parseInt(match1[1]);
      const month = parseInt(match1[2]) - 1;
      const year = parseInt(match1[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // YYYY-MM-DD
    const match2 = cleaned.match(formats[2]);
    if (match2) {
      const year = parseInt(match2[1]);
      const month = parseInt(match2[2]) - 1;
      const day = parseInt(match2[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // DD/MM/YY
    const match3 = cleaned.match(formats[3]);
    if (match3) {
      const day = parseInt(match3[1]);
      const month = parseInt(match3[2]) - 1;
      let year = parseInt(match3[3]);
      year = year < 50 ? 2000 + year : 1900 + year;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try native parsing as fallback
    const fallback = new Date(cleaned);
    if (!isNaN(fallback.getTime())) return fallback;
    
    return null;
  }

  /**
   * Parse date with specific format
   */
  private static parseDateWithFormat(dateStr: string, format: string): Date | null {
    // Simple format parsing
    const formatParts = format.split(/[\/\-\.]/);
    const dateParts = dateStr.split(/[\/\-\.]/);
    
    if (formatParts.length !== dateParts.length) return null;
    
    let day = 1, month = 0, year = 2000;
    
    for (let i = 0; i < formatParts.length; i++) {
      const part = formatParts[i].toUpperCase();
      const value = parseInt(dateParts[i]);
      
      if (part === 'DD' || part === 'D') {
        day = value;
      } else if (part === 'MM' || part === 'M') {
        month = value - 1;
      } else if (part === 'YYYY') {
        year = value;
      } else if (part === 'YY') {
        year = value < 50 ? 2000 + value : 1900 + value;
      }
    }
    
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Parse amount string (handles Brazilian format)
   */
  private static parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    let cleaned = amountStr.trim();
    
    // Detect if negative (prefix or suffix)
    const isNegative = cleaned.startsWith('-') || 
                       cleaned.endsWith('-') || 
                       cleaned.toLowerCase().includes('d') || // D for Débito
                       cleaned.includes('(') && cleaned.includes(')');
    
    // Remove all non-numeric except . and ,
    cleaned = cleaned.replace(/[^\d.,]/g, '');
    
    // Handle Brazilian format (1.234,56) vs US format (1,234.56)
    // If there's both . and , the last one is decimal separator
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    } else if (lastComma >= 0) {
      // Only comma, treat as decimal
      cleaned = cleaned.replace(',', '.');
    }
    
    let amount = parseFloat(cleaned);
    if (isNaN(amount)) return 0;
    
    if (isNegative && amount > 0) {
      amount = -amount;
    }
    
    return amount;
  }

  /**
   * Infer transaction type from description
   */
  private static inferTransactionType(
    typeValue: string | undefined,
    description: string,
    direction: TransactionDirection
  ): OFXTransactionType {
    const desc = description.toLowerCase();
    
    // Check explicit type value
    if (typeValue) {
      const type = typeValue.toLowerCase();
      if (type.includes('pix')) return 'XFER';
      if (type.includes('ted')) return 'XFER';
      if (type.includes('doc')) return 'XFER';
      if (type.includes('tarifa') || type.includes('taxa')) return 'FEE';
      if (type.includes('juro')) return 'INT';
    }
    
    // Infer from description
    if (desc.includes('pix') || desc.includes('ted') || desc.includes('doc')) return 'XFER';
    if (desc.includes('tarifa') || desc.includes('taxa')) return 'FEE';
    if (desc.includes('saque')) return 'CASH';
    if (desc.includes('deposito') || desc.includes('depósito')) return 'DEP';
    if (desc.includes('cheque')) return 'CHECK';
    if (desc.includes('juro') || desc.includes('rendimento')) return 'INT';
    if (desc.includes('compra') || desc.includes('pagamento')) return direction === 'DEBIT' ? 'DEBIT' : 'PAYMENT';
    
    return direction === 'CREDIT' ? 'CREDIT' : 'DEBIT';
  }

  /**
   * Generate unique FIT ID
   */
  private static generateFitId(
    date: Date,
    amount: number,
    description: string,
    lineNumber: number
  ): string {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const amountStr = Math.abs(amount).toFixed(2).replace('.', '');
    const descHash = this.simpleHash(description).toString(16).substring(0, 6);
    
    return `CSV${dateStr}${amountStr}${descHash}${lineNumber}`;
  }

  /**
   * Simple string hash
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Normalize description
   */
  private static normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate period from transactions
   */
  private static calculatePeriod(transactions: BankTransaction[]): StatementPeriod {
    if (transactions.length === 0) {
      return {
        startDate: new Date(),
        endDate: new Date(),
        generatedAt: new Date(),
      };
    }
    
    const dates = transactions.map(t => t.transactionDate.getTime());
    
    return {
      startDate: new Date(Math.min(...dates)),
      endDate: new Date(Math.max(...dates)),
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate balance from transactions
   */
  private static calculateBalance(
    transactions: BankTransaction[],
    _lines: string[][],
    _mapping: CSVColumnMapping
  ): BalanceInfo {
    // Calculate from transactions
    let balance = 0;
    for (const txn of transactions) {
      balance += txn.amount;
    }
    
    return {
      openingBalance: 0,
      closingBalance: balance,
      currency: 'BRL',
      asOfDate: transactions.length > 0 
        ? transactions[transactions.length - 1].transactionDate 
        : new Date(),
    };
  }

  /**
   * Calculate transaction summary
   */
  private static calculateSummary(transactions: BankTransaction[]): TransactionSummary {
    let totalCredits = 0;
    let totalDebits = 0;
    let creditCount = 0;
    let debitCount = 0;
    let largestCredit: BankTransaction | undefined;
    let largestDebit: BankTransaction | undefined;
    
    const byType: TransactionSummary['byType'] = {} as TransactionSummary['byType'];
    
    for (const txn of transactions) {
      if (txn.amount >= 0) {
        totalCredits += txn.amount;
        creditCount++;
        if (!largestCredit || txn.amount > largestCredit.amount) {
          largestCredit = txn;
        }
      } else {
        totalDebits += Math.abs(txn.amount);
        debitCount++;
        if (!largestDebit || Math.abs(txn.amount) > Math.abs(largestDebit.amount)) {
          largestDebit = txn;
        }
      }
      
      if (!byType[txn.type]) {
        byType[txn.type] = { count: 0, total: 0 };
      }
      byType[txn.type].count++;
      byType[txn.type].total += Math.abs(txn.amount);
    }
    
    const totalTransactions = transactions.length;
    const netMovement = totalCredits - totalDebits;
    const averageTransactionAmount = totalTransactions > 0
      ? (totalCredits + totalDebits) / totalTransactions
      : 0;
    
    return {
      totalTransactions,
      totalCredits,
      totalDebits,
      creditCount,
      debitCount,
      netMovement,
      byType,
      averageTransactionAmount,
      largestCredit,
      largestDebit,
    };
  }

  /**
   * Check if content is valid CSV
   */
  static isValidCSV(content: string): boolean {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return false;
    
    // Check if lines have consistent column count
    const delimiter = this.detectDelimiter(content);
    const firstLineColumns = (lines[0].match(new RegExp(`\\${delimiter}`, 'g')) || []).length + 1;
    
    // At least 3 columns for bank statement
    return firstLineColumns >= 3;
  }
}
