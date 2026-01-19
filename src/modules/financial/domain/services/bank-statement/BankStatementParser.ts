/**
 * Bank Statement Parser - Domain Service
 * 
 * Main parser that orchestrates OFX and CSV parsing,
 * auto-detecting file format and applying appropriate parser.
 * 
 * @module financial/domain/services/bank-statement/BankStatementParser
 */

import { Result } from '@/shared/domain';
import type {
  BankStatementData,
  BankStatementFormat,
  BankStatementParserConfig,
} from '../../types';
import { DEFAULT_PARSER_CONFIG } from '../../types';
import { OFXParser } from './OFXParser';
import { CSVParser } from './CSVParser';
import { BankStatementValidator } from './BankStatementValidator';
import { TransactionCategorizer } from './TransactionCategorizer';

/**
 * Parser result with additional metadata
 */
export interface ParseResult {
  statement: BankStatementData;
  parserUsed: 'OFX' | 'CSV';
  processingTimeMs: number;
}

/**
 * Bank Statement Parser - Stateless Domain Service
 * 
 * Main entry point for parsing bank statements.
 * Auto-detects format and applies appropriate parser.
 */
export class BankStatementParser {
  private constructor() {
    // Prevent instantiation - all methods are static
  }

  /**
   * Parse bank statement file content
   * Auto-detects format and applies appropriate parser
   */
  static async parse(
    content: string,
    fileName: string,
    config?: Partial<BankStatementParserConfig>
  ): Promise<Result<ParseResult, string>> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_PARSER_CONFIG, ...config };
    
    // Detect format
    let format: BankStatementFormat;
    if (mergedConfig.autoDetectFormat) {
      const detectedFormat = this.detectFormat(content, fileName);
      if (Result.isFail(detectedFormat)) {
        return Result.fail(detectedFormat.error);
      }
      format = detectedFormat.value;
    } else {
      format = mergedConfig.defaultFormat || 'OFX';
    }
    
    // Parse based on format
    let parseResult: Result<BankStatementData, string>;
    
    switch (format) {
      case 'OFX':
      case 'QFX':
        parseResult = await OFXParser.parse(content, fileName);
        break;
      case 'CSV':
      case 'TXT':
        parseResult = await CSVParser.parse(content, fileName, mergedConfig);
        break;
      default:
        return Result.fail(`Formato não suportado: ${format}`);
    }
    
    if (Result.isFail(parseResult)) {
      return Result.fail(parseResult.error);
    }
    
    let statement = parseResult.value;
    
    // Apply categorization if enabled
    if (mergedConfig.autoCategorizem && statement.transactions.length > 0) {
      const categorizationResult = TransactionCategorizer.categorizeBatch(
        statement.transactions
      );
      
      if (Result.isOk(categorizationResult)) {
        // Convert byCategory from count-only to count+total format
        const byCategoryWithTotals: Record<string, { count: number; total: number }> = {};
        for (const [category, count] of Object.entries(categorizationResult.value.summary.byCategory)) {
          byCategoryWithTotals[category] = {
            count,
            total: categorizationResult.value.transactions
              .filter(t => t.category === category)
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
          };
        }

        statement = {
          ...statement,
          transactions: categorizationResult.value.transactions,
          summary: {
            ...statement.summary,
            byCategory: byCategoryWithTotals as typeof statement.summary.byCategory,
          },
        };
      }
    }
    
    // Normalize descriptions if enabled
    if (mergedConfig.normalizeDescriptions) {
      statement = {
        ...statement,
        transactions: statement.transactions.map(txn => ({
          ...txn,
          normalizedDescription: TransactionCategorizer.normalizeDescription(txn.description),
        })),
      };
    }
    
    // Extract payee from description if enabled
    if (mergedConfig.extractPayeeFromDescription) {
      statement = {
        ...statement,
        transactions: statement.transactions.map(txn => ({
          ...txn,
          payee: txn.payee || TransactionCategorizer.extractPayeeFromDescription(txn.description),
        })),
      };
    }
    
    // Validate if enabled
    if (mergedConfig.validateBalance) {
      const validation = BankStatementValidator.validate(statement);
      statement = {
        ...statement,
        isValid: validation.isValid,
        validationErrors: validation.errors.map(e => e.message),
        validationWarnings: validation.warnings.map(w => w.message),
      };
    }
    
    // Detect duplicates if enabled
    if (mergedConfig.detectDuplicates) {
      const duplicateCheck = BankStatementValidator.checkInternalDuplicates(
        statement.transactions
      );
      
      if (duplicateCheck.hasDuplicates) {
        for (const dup of duplicateCheck.duplicates) {
          // Mark duplicates
          const dupIndex = statement.transactions.findIndex(
            t => t.fitId === dup.duplicate.fitId
          );
          if (dupIndex >= 0) {
            statement.transactions[dupIndex] = {
              ...statement.transactions[dupIndex],
              reconciliationStatus: 'DUPLICATE',
            };
          }
          
          // Add warning
          statement.validationWarnings.push(
            `Transação duplicada: ${dup.reason} (${dup.duplicate.fitId})`
          );
        }
      }
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    return Result.ok({
      statement,
      parserUsed: format === 'OFX' || format === 'QFX' ? 'OFX' : 'CSV',
      processingTimeMs,
    });
  }

  /**
   * Detect file format from content and filename
   */
  static detectFormat(
    content: string,
    fileName: string
  ): Result<BankStatementFormat, string> {
    // Check file extension first
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'ofx') {
      return Result.ok('OFX');
    }
    
    if (extension === 'qfx') {
      return Result.ok('QFX');
    }
    
    if (extension === 'csv') {
      return Result.ok('CSV');
    }
    
    if (extension === 'txt') {
      // Could be OFX or CSV - need to inspect content
      if (OFXParser.isValidOFX(content)) {
        return Result.ok('OFX');
      }
      if (CSVParser.isValidCSV(content)) {
        return Result.ok('CSV');
      }
    }
    
    // Inspect content
    if (OFXParser.isValidOFX(content)) {
      return Result.ok('OFX');
    }
    
    if (CSVParser.isValidCSV(content)) {
      return Result.ok('CSV');
    }
    
    return Result.fail(
      'Não foi possível detectar o formato do arquivo. ' +
      'Formatos suportados: OFX, QFX, CSV'
    );
  }

  /**
   * Parse OFX content directly
   */
  static async parseOFX(
    content: string,
    fileName: string
  ): Promise<Result<BankStatementData, string>> {
    return OFXParser.parse(content, fileName);
  }

  /**
   * Parse CSV content directly
   */
  static async parseCSV(
    content: string,
    fileName: string,
    config?: Partial<BankStatementParserConfig>
  ): Promise<Result<BankStatementData, string>> {
    return CSVParser.parse(content, fileName, config);
  }

  /**
   * Validate parsed statement
   */
  static validate(statement: BankStatementData): Result<BankStatementData, string> {
    const validation = BankStatementValidator.validate(statement);
    
    return Result.ok({
      ...statement,
      isValid: validation.isValid,
      validationErrors: validation.errors.map(e => e.message),
      validationWarnings: validation.warnings.map(w => w.message),
    });
  }

  /**
   * Get supported formats
   */
  static getSupportedFormats(): BankStatementFormat[] {
    return ['OFX', 'QFX', 'CSV', 'TXT'];
  }

  /**
   * Check if format is supported
   */
  static isFormatSupported(format: string): boolean {
    return this.getSupportedFormats().includes(format.toUpperCase() as BankStatementFormat);
  }
}
