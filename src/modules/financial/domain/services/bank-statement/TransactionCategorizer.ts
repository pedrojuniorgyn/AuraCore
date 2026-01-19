/**
 * Transaction Categorizer - Domain Service
 * 
 * Automatically categorizes bank transactions based on description patterns,
 * transaction types, and other heuristics.
 * 
 * @module financial/domain/services/bank-statement/TransactionCategorizer
 */

import { Result } from '@/shared/domain';
import type {
  BankTransaction,
  TransactionCategory,
  CategorizationRule,
  OFXTransactionType,
  TransactionDirection,
} from '../../types';
import { DEFAULT_CATEGORIZATION_RULES } from '../../types';

/**
 * Categorization result for a single transaction
 */
export interface CategorizationResult {
  category: TransactionCategory;
  confidence: number; // 0-1
  matchedRuleId?: string;
  matchedRuleName?: string;
}

/**
 * Batch categorization summary
 */
export interface BatchCategorizationSummary {
  totalTransactions: number;
  categorizedCount: number;
  uncategorizedCount: number;
  byCategory: Record<TransactionCategory, number>;
  averageConfidence: number;
}

/**
 * Transaction Categorizer - Stateless Domain Service
 * 
 * Categorizes bank transactions automatically using pattern matching
 * and heuristics specific to Brazilian banks.
 */
export class TransactionCategorizer {
  private constructor() {
    // Prevent instantiation - all methods are static
  }

  /**
   * Categorize a single transaction
   */
  static categorize(
    transaction: BankTransaction,
    customRules?: CategorizationRule[]
  ): Result<CategorizationResult, string> {
    const rules = this.mergeRules(customRules);
    
    // Sort rules by priority (descending)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      const match = this.matchRule(transaction, rule);
      if (match.matched) {
        return Result.ok({
          category: rule.category,
          confidence: match.confidence,
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
        });
      }
    }
    
    // No rule matched - return OTHER with low confidence
    return Result.ok({
      category: 'OTHER',
      confidence: 0.1,
    });
  }

  /**
   * Categorize multiple transactions in batch
   */
  static categorizeBatch(
    transactions: BankTransaction[],
    customRules?: CategorizationRule[]
  ): Result<{
    transactions: BankTransaction[];
    summary: BatchCategorizationSummary;
  }, string> {
    const categorizedTransactions: BankTransaction[] = [];
    const byCategory: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;
    let totalConfidence = 0;
    let categorizedCount = 0;
    
    for (const txn of transactions) {
      const result = this.categorize(txn, customRules);
      
      if (Result.isOk(result)) {
        const categorized: BankTransaction = {
          ...txn,
          category: result.value.category,
          categoryConfidence: result.value.confidence,
        };
        categorizedTransactions.push(categorized);
        
        // Update stats
        byCategory[result.value.category] = (byCategory[result.value.category] || 0) + 1;
        totalConfidence += result.value.confidence;
        
        if (result.value.category !== 'OTHER') {
          categorizedCount++;
        }
      } else {
        // Keep original transaction if categorization fails
        categorizedTransactions.push(txn);
      }
    }
    
    const summary: BatchCategorizationSummary = {
      totalTransactions: transactions.length,
      categorizedCount,
      uncategorizedCount: transactions.length - categorizedCount,
      byCategory,
      averageConfidence: transactions.length > 0 
        ? totalConfidence / transactions.length 
        : 0,
    };
    
    return Result.ok({
      transactions: categorizedTransactions,
      summary,
    });
  }

  /**
   * Match a transaction against a categorization rule
   */
  private static matchRule(
    transaction: BankTransaction,
    rule: CategorizationRule
  ): { matched: boolean; confidence: number } {
    let matchCount = 0;
    let totalConditions = 0;
    
    // Check direction
    if (rule.direction) {
      totalConditions++;
      if (transaction.direction === rule.direction) {
        matchCount++;
      } else {
        // Direction mismatch is a hard fail
        return { matched: false, confidence: 0 };
      }
    }
    
    // Check transaction types
    if (rule.transactionTypes && rule.transactionTypes.length > 0) {
      totalConditions++;
      if (rule.transactionTypes.includes(transaction.type)) {
        matchCount++;
      }
    }
    
    // Check description patterns
    if (rule.descriptionPatterns && rule.descriptionPatterns.length > 0) {
      totalConditions++;
      const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
      
      for (const pattern of rule.descriptionPatterns) {
        if (pattern.test(description)) {
          matchCount++;
          break; // Only need one match
        }
      }
    }
    
    // Check payee patterns
    if (rule.payeePatterns && rule.payeePatterns.length > 0 && transaction.payee) {
      totalConditions++;
      const payee = transaction.payee.toLowerCase();
      
      for (const pattern of rule.payeePatterns) {
        if (pattern.test(payee)) {
          matchCount++;
          break;
        }
      }
    }
    
    // Check amount range
    if (rule.amountRange) {
      totalConditions++;
      const absAmount = Math.abs(transaction.amount);
      
      const minOk = rule.amountRange.min === undefined || absAmount >= rule.amountRange.min;
      const maxOk = rule.amountRange.max === undefined || absAmount <= rule.amountRange.max;
      
      if (minOk && maxOk) {
        matchCount++;
      }
    }
    
    // Calculate confidence based on how many conditions matched
    if (totalConditions === 0) {
      return { matched: false, confidence: 0 };
    }
    
    const confidence = matchCount / totalConditions;
    
    // Require at least 50% of conditions to match
    const matched = confidence >= 0.5;
    
    return { matched, confidence };
  }

  /**
   * Merge custom rules with default rules
   */
  private static mergeRules(customRules?: CategorizationRule[]): CategorizationRule[] {
    if (!customRules || customRules.length === 0) {
      return DEFAULT_CATEGORIZATION_RULES;
    }
    
    // Custom rules take precedence (will be checked first due to higher priority boost)
    const boostedCustomRules = customRules.map(rule => ({
      ...rule,
      priority: rule.priority + 1000, // Boost priority
    }));
    
    return [...boostedCustomRules, ...DEFAULT_CATEGORIZATION_RULES];
  }

  /**
   * Normalize transaction description for better matching
   */
  static normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      // Remove special characters
      .replace(/[^\w\s]/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove common prefixes
      .replace(/^(pag|pgto|pagto|deb|cred|dep|saque|transf|ted|doc|pix)\s*/i, '')
      // Remove dates in various formats
      .replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, '')
      // Remove times
      .replace(/\d{2}:\d{2}(:\d{2})?/g, '')
      // Remove transaction codes
      .replace(/\b[A-Z0-9]{6,}\b/g, '')
      // Trim
      .trim();
  }

  /**
   * Extract payee name from description
   */
  static extractPayeeFromDescription(description: string): string | undefined {
    const normalized = this.normalizeDescription(description);
    
    // Common patterns for payee extraction
    const patterns = [
      // "PAGTO A FORNECEDOR XYZ"
      /(?:pagto?|pgto)\s+(?:a|para)\s+(.+)/i,
      // "TED DE EMPRESA ABC"
      /(?:ted|doc|pix)\s+(?:de|para)\s+(.+)/i,
      // "RECEB DE CLIENTE 123"
      /(?:receb|recebimento)\s+(?:de|para)\s+(.+)/i,
      // "COMPRA LOJA X"
      /(?:compra|venda)\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return this.capitalizeWords(match[1].trim());
      }
    }
    
    // If no pattern matched, try to extract the longest capitalized sequence
    const words = description.split(/\s+/);
    const capitalizedSequences: string[] = [];
    let currentSequence: string[] = [];
    
    for (const word of words) {
      if (word.length > 2 && word === word.toUpperCase()) {
        currentSequence.push(word);
      } else if (currentSequence.length > 0) {
        capitalizedSequences.push(currentSequence.join(' '));
        currentSequence = [];
      }
    }
    
    if (currentSequence.length > 0) {
      capitalizedSequences.push(currentSequence.join(' '));
    }
    
    // Return the longest sequence that looks like a name
    const filtered = capitalizedSequences.filter(s => 
      s.length > 3 && 
      !/^\d+$/.test(s) && // Not just numbers
      !/^[A-Z]{2,4}$/.test(s) // Not abbreviations
    );
    
    if (filtered.length > 0) {
      return this.capitalizeWords(filtered.sort((a, b) => b.length - a.length)[0].toLowerCase());
    }
    
    return undefined;
  }

  /**
   * Capitalize first letter of each word
   */
  private static capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Create a custom categorization rule
   */
  static createRule(
    id: string,
    name: string,
    category: TransactionCategory,
    options: {
      priority?: number;
      descriptionPatterns?: (string | RegExp)[];
      payeePatterns?: (string | RegExp)[];
      amountRange?: { min?: number; max?: number };
      transactionTypes?: OFXTransactionType[];
      direction?: TransactionDirection;
    }
  ): CategorizationRule {
    return {
      id,
      name,
      category,
      priority: options.priority ?? 50,
      descriptionPatterns: options.descriptionPatterns?.map(p => 
        typeof p === 'string' ? new RegExp(p, 'i') : p
      ),
      payeePatterns: options.payeePatterns?.map(p => 
        typeof p === 'string' ? new RegExp(p, 'i') : p
      ),
      amountRange: options.amountRange,
      transactionTypes: options.transactionTypes,
      direction: options.direction,
    };
  }

  /**
   * Get suggested categories for a transaction (multiple possibilities)
   */
  static getSuggestions(
    transaction: BankTransaction,
    customRules?: CategorizationRule[],
    maxSuggestions: number = 3
  ): Array<CategorizationResult & { score: number }> {
    const rules = this.mergeRules(customRules);
    const suggestions: Array<CategorizationResult & { score: number }> = [];
    
    // Sort rules by priority
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      const match = this.matchRule(transaction, rule);
      
      if (match.confidence > 0.3) { // Lower threshold for suggestions
        suggestions.push({
          category: rule.category,
          confidence: match.confidence,
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
          score: match.confidence * (rule.priority / 100),
        });
      }
    }
    
    // Sort by score and return top N
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }

  /**
   * Detect likely PIX transaction
   */
  static isPixTransaction(transaction: BankTransaction): boolean {
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /pix|qr\s*code|chave\s*pix|pagamento\s*instant/i.test(description);
  }

  /**
   * Detect likely TED transaction
   */
  static isTedTransaction(transaction: BankTransaction): boolean {
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /\bted\b|transf\s*eletr/i.test(description);
  }

  /**
   * Detect likely DOC transaction
   */
  static isDocTransaction(transaction: BankTransaction): boolean {
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /\bdoc\b/i.test(description);
  }

  /**
   * Detect likely salary/payroll transaction
   */
  static isSalaryTransaction(transaction: BankTransaction): boolean {
    if (transaction.direction !== 'CREDIT') return false;
    
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /salario|folha|pagamento.*salario|credito.*salario|prov.*func/i.test(description);
  }

  /**
   * Detect likely tax payment
   */
  static isTaxPayment(transaction: BankTransaction): boolean {
    if (transaction.direction !== 'DEBIT') return false;
    
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /darf|gps|inss|fgts|icms|iss|pis|cofins|irrf|csll|simples|das.*mei|iptu|ipva|guia/i.test(description);
  }

  /**
   * Detect likely bank fee
   */
  static isBankFee(transaction: BankTransaction): boolean {
    if (transaction.direction !== 'DEBIT') return false;
    
    const description = (transaction.normalizedDescription || transaction.description).toLowerCase();
    return /tarifa|taxa.*manut|taxa.*serv|anuidade|iof|cpmf|pacote.*serv/i.test(description) ||
           transaction.type === 'FEE' ||
           transaction.type === 'SRVCHG';
  }
}
