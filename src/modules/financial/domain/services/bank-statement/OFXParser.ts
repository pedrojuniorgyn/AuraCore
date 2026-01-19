/**
 * OFX Parser - Domain Service
 * 
 * Parses OFX (Open Financial Exchange) files and extracts
 * bank statement data in a structured format.
 * 
 * @module financial/domain/services/bank-statement/OFXParser
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
  BankAccountType,
} from '../../types';

/**
 * Raw OFX transaction from parser
 */
interface RawOFXTransaction {
  TRNTYPE?: string;
  DTPOSTED?: string;
  DTUSER?: string;
  DTAVAIL?: string;
  TRNAMT?: string | number;
  FITID?: string;
  CHECKNUM?: string;
  REFNUM?: string;
  NAME?: string;
  MEMO?: string;
  PAYEE?: {
    NAME?: string;
  };
}

/**
 * Raw OFX account info
 */
interface RawOFXAccount {
  BANKID?: string;
  BRANCHID?: string;
  ACCTID?: string;
  ACCTTYPE?: string;
}

/**
 * Raw OFX balance info
 */
interface RawOFXBalance {
  BALAMT?: string | number;
  DTASOF?: string;
}

/**
 * Raw OFX statement response
 */
interface RawOFXStatementResponse {
  STMTRS?: {
    CURDEF?: string;
    BANKACCTFROM?: RawOFXAccount;
    BANKTRANLIST?: {
      DTSTART?: string;
      DTEND?: string;
      STMTTRN?: RawOFXTransaction | RawOFXTransaction[];
    };
    LEDGERBAL?: RawOFXBalance;
    AVAILBAL?: RawOFXBalance;
  };
  CCSTMTRS?: {
    CURDEF?: string;
    CCACCTFROM?: {
      ACCTID?: string;
    };
    BANKTRANLIST?: {
      DTSTART?: string;
      DTEND?: string;
      STMTTRN?: RawOFXTransaction | RawOFXTransaction[];
    };
    LEDGERBAL?: RawOFXBalance;
    AVAILBAL?: RawOFXBalance;
  };
}

/**
 * OFX Parser - Stateless Domain Service
 * 
 * Parses OFX files and extracts structured bank statement data.
 * Supports both bank accounts and credit cards.
 */
export class OFXParser {
  private constructor() {
    // Prevent instantiation - all methods are static
  }

  /**
   * Parse OFX content string
   */
  static async parse(
    content: string,
    fileName: string
  ): Promise<Result<BankStatementData, string>> {
    try {
      // Clean OFX content
      const cleanedContent = this.cleanOFXContent(content);
      
      // Parse using ofx-js
      const ofxJs = await import('ofx-js');
      const parsed = await ofxJs.parse(cleanedContent);
      
      // Extract statement response
      const stmtResponse = this.extractStatementResponse(parsed);
      if (!stmtResponse) {
        return Result.fail('Não foi possível extrair dados do extrato OFX');
      }
      
      // Extract account info
      const account = this.extractAccountInfo(stmtResponse);
      if (Result.isFail(account)) {
        return Result.fail(`Erro ao extrair informações da conta: ${account.error}`);
      }
      
      // Extract period
      const period = this.extractPeriod(stmtResponse);
      if (Result.isFail(period)) {
        return Result.fail(`Erro ao extrair período: ${period.error}`);
      }
      
      // Extract balance
      const balance = this.extractBalance(stmtResponse);
      if (Result.isFail(balance)) {
        return Result.fail(`Erro ao extrair saldo: ${balance.error}`);
      }
      
      // Extract transactions
      const transactions = this.extractTransactions(stmtResponse);
      if (Result.isFail(transactions)) {
        return Result.fail(`Erro ao extrair transações: ${transactions.error}`);
      }
      
      // Calculate summary
      const summary = this.calculateSummary(transactions.value);
      
      // Build result
      const statementData: BankStatementData = {
        format: 'OFX',
        fileName,
        parsedAt: new Date(),
        account: account.value,
        period: period.value,
        balance: balance.value,
        transactions: transactions.value,
        summary,
        isValid: true,
        validationErrors: [],
        validationWarnings: [],
      };
      
      return Result.ok(statementData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Erro ao processar arquivo OFX: ${message}`);
    }
  }

  /**
   * Clean OFX content (handle SGML vs XML format)
   */
  private static cleanOFXContent(content: string): string {
    // Remove BOM if present
    let cleaned = content.replace(/^\uFEFF/, '');
    
    // If it's SGML format (no self-closing tags), we need to handle it
    // OFX 1.x uses SGML, OFX 2.x uses XML
    
    // Check if it's SGML (no XML declaration)
    if (!cleaned.includes('<?xml')) {
      // Remove SGML headers
      cleaned = cleaned.replace(/^[\s\S]*?<OFX>/i, '<OFX>');
    }
    
    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove extra whitespace between tags
    cleaned = cleaned.replace(/>\s+</g, '><');
    
    return cleaned.trim();
  }

  /**
   * Extract statement response from parsed OFX
   */
  private static extractStatementResponse(parsed: unknown): RawOFXStatementResponse | null {
    const ofx = (parsed as { OFX?: unknown })?.OFX;
    if (!ofx) return null;
    
    // Bank statement
    const bankMsgs = (ofx as { BANKMSGSRSV1?: unknown })?.BANKMSGSRSV1;
    if (bankMsgs) {
      const stmtTrnRs = (bankMsgs as { STMTTRNRS?: unknown })?.STMTTRNRS;
      if (stmtTrnRs) {
        return stmtTrnRs as RawOFXStatementResponse;
      }
    }
    
    // Credit card statement
    const ccMsgs = (ofx as { CREDITCARDMSGSRSV1?: unknown })?.CREDITCARDMSGSRSV1;
    if (ccMsgs) {
      const ccStmtTrnRs = (ccMsgs as { CCSTMTTRNRS?: unknown })?.CCSTMTTRNRS;
      if (ccStmtTrnRs) {
        return ccStmtTrnRs as RawOFXStatementResponse;
      }
    }
    
    return null;
  }

  /**
   * Extract account information
   */
  private static extractAccountInfo(
    response: RawOFXStatementResponse
  ): Result<BankAccountInfo, string> {
    // Check for bank account
    const stmtRs = response.STMTRS;
    if (stmtRs?.BANKACCTFROM) {
      const acct = stmtRs.BANKACCTFROM;
      return Result.ok({
        bankCode: acct.BANKID || '',
        bankName: this.getBankName(acct.BANKID || ''),
        branchCode: acct.BRANCHID || '',
        accountNumber: acct.ACCTID || '',
        accountType: this.mapAccountType(acct.ACCTTYPE),
        currency: stmtRs.CURDEF || 'BRL',
      });
    }
    
    // Check for credit card
    const ccStmtRs = response.CCSTMTRS;
    if (ccStmtRs?.CCACCTFROM) {
      return Result.ok({
        bankCode: '',
        branchCode: '',
        accountNumber: ccStmtRs.CCACCTFROM.ACCTID || '',
        accountType: 'CREDITCARD',
        currency: ccStmtRs.CURDEF || 'BRL',
      });
    }
    
    return Result.fail('Informações da conta não encontradas');
  }

  /**
   * Extract statement period
   */
  private static extractPeriod(
    response: RawOFXStatementResponse
  ): Result<StatementPeriod, string> {
    const bankTranList = response.STMTRS?.BANKTRANLIST || response.CCSTMTRS?.BANKTRANLIST;
    
    if (!bankTranList) {
      return Result.fail('Lista de transações não encontrada');
    }
    
    const startDate = this.parseOFXDate(bankTranList.DTSTART || '');
    const endDate = this.parseOFXDate(bankTranList.DTEND || '');
    
    if (!startDate || !endDate) {
      return Result.fail('Datas do período inválidas');
    }
    
    return Result.ok({
      startDate,
      endDate,
      generatedAt: new Date(),
    });
  }

  /**
   * Extract balance information
   */
  private static extractBalance(
    response: RawOFXStatementResponse
  ): Result<BalanceInfo, string> {
    const stmtRs = response.STMTRS || response.CCSTMTRS;
    
    if (!stmtRs) {
      return Result.fail('Informações de saldo não encontradas');
    }
    
    const ledgerBal = stmtRs.LEDGERBAL;
    const availBal = stmtRs.AVAILBAL;
    
    const closingBalance = this.parseAmount(ledgerBal?.BALAMT);
    const availableBalance = this.parseAmount(availBal?.BALAMT);
    const asOfDate = this.parseOFXDate(ledgerBal?.DTASOF || '') || new Date();
    
    return Result.ok({
      openingBalance: 0, // OFX doesn't provide opening balance directly
      closingBalance,
      availableBalance,
      currency: stmtRs.CURDEF || 'BRL',
      asOfDate,
    });
  }

  /**
   * Extract transactions
   */
  private static extractTransactions(
    response: RawOFXStatementResponse
  ): Result<BankTransaction[], string> {
    const bankTranList = response.STMTRS?.BANKTRANLIST || response.CCSTMTRS?.BANKTRANLIST;
    
    if (!bankTranList) {
      return Result.ok([]); // No transactions is valid
    }
    
    const rawTransactions = bankTranList.STMTTRN;
    if (!rawTransactions) {
      return Result.ok([]);
    }
    
    // Ensure array
    const transactionsArray = Array.isArray(rawTransactions) 
      ? rawTransactions 
      : [rawTransactions];
    
    const transactions: BankTransaction[] = [];
    
    for (const raw of transactionsArray) {
      const transaction = this.parseTransaction(raw);
      if (Result.isOk(transaction)) {
        transactions.push(transaction.value);
      }
    }
    
    // Sort by date (oldest first)
    transactions.sort((a, b) => 
      a.transactionDate.getTime() - b.transactionDate.getTime()
    );
    
    return Result.ok(transactions);
  }

  /**
   * Parse a single transaction
   */
  private static parseTransaction(
    raw: RawOFXTransaction
  ): Result<BankTransaction, string> {
    const fitId = raw.FITID || '';
    if (!fitId) {
      return Result.fail('ID da transação ausente');
    }
    
    const transactionDate = this.parseOFXDate(raw.DTPOSTED || '');
    if (!transactionDate) {
      return Result.fail('Data da transação inválida');
    }
    
    const amount = this.parseAmount(raw.TRNAMT);
    const type = this.mapTransactionType(raw.TRNTYPE);
    const direction: TransactionDirection = amount >= 0 ? 'CREDIT' : 'DEBIT';
    
    // Get description (NAME or MEMO)
    const description = raw.NAME || raw.MEMO || '';
    const memo = raw.NAME && raw.MEMO ? raw.MEMO : undefined;
    
    // Get payee
    const payee = raw.PAYEE?.NAME || raw.NAME;
    
    const transaction: BankTransaction = {
      fitId,
      checkNumber: raw.CHECKNUM,
      referenceNumber: raw.REFNUM,
      transactionDate,
      postDate: this.parseOFXDate(raw.DTAVAIL || '') ?? undefined,
      amount,
      direction,
      type,
      description,
      normalizedDescription: this.normalizeDescription(description),
      memo,
      payee,
      reconciliationStatus: 'PENDING',
      rawData: raw as unknown as Record<string, unknown>,
    };
    
    return Result.ok(transaction);
  }

  /**
   * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD)
   */
  private static parseOFXDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // Remove timezone info if present
    const cleanDate = dateStr.split('[')[0];
    
    // Try different formats
    let year: number, month: number, day: number;
    let hours = 0, minutes = 0, seconds = 0;
    
    if (cleanDate.length >= 8) {
      year = parseInt(cleanDate.substring(0, 4));
      month = parseInt(cleanDate.substring(4, 6)) - 1; // JS months are 0-indexed
      day = parseInt(cleanDate.substring(6, 8));
      
      if (cleanDate.length >= 14) {
        hours = parseInt(cleanDate.substring(8, 10));
        minutes = parseInt(cleanDate.substring(10, 12));
        seconds = parseInt(cleanDate.substring(12, 14));
      }
      
      const date = new Date(year, month, day, hours, minutes, seconds);
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  }

  /**
   * Parse amount string to number
   */
  private static parseAmount(amount: string | number | undefined): number {
    if (amount === undefined || amount === null) return 0;
    
    if (typeof amount === 'number') return amount;
    
    // Remove any non-numeric characters except - and .
    const cleaned = amount.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Map OFX transaction type to our type
   */
  private static mapTransactionType(type: string | undefined): OFXTransactionType {
    if (!type) return 'OTHER';
    
    const typeMap: Record<string, OFXTransactionType> = {
      'CREDIT': 'CREDIT',
      'DEBIT': 'DEBIT',
      'INT': 'INT',
      'DIV': 'DIV',
      'FEE': 'FEE',
      'SRVCHG': 'SRVCHG',
      'DEP': 'DEP',
      'ATM': 'ATM',
      'POS': 'POS',
      'XFER': 'XFER',
      'CHECK': 'CHECK',
      'PAYMENT': 'PAYMENT',
      'CASH': 'CASH',
      'DIRECTDEP': 'DIRECTDEP',
      'DIRECTDEBIT': 'DIRECTDEBIT',
      'REPEATPMT': 'REPEATPMT',
      'OTHER': 'OTHER',
    };
    
    return typeMap[type.toUpperCase()] || 'OTHER';
  }

  /**
   * Map OFX account type to our type
   */
  private static mapAccountType(type: string | undefined): BankAccountType {
    if (!type) return 'CHECKING';
    
    const typeMap: Record<string, BankAccountType> = {
      'CHECKING': 'CHECKING',
      'SAVINGS': 'SAVINGS',
      'MONEYMRKT': 'SAVINGS',
      'CREDITLINE': 'CREDITCARD',
    };
    
    return typeMap[type.toUpperCase()] || 'CHECKING';
  }

  /**
   * Get bank name from code (Brazilian banks)
   */
  private static getBankName(bankCode: string): string | undefined {
    const banks: Record<string, string> = {
      '001': 'Banco do Brasil',
      '033': 'Santander',
      '104': 'Caixa Econômica Federal',
      '237': 'Bradesco',
      '341': 'Itaú',
      '356': 'Real',
      '389': 'Mercantil do Brasil',
      '399': 'HSBC',
      '422': 'Safra',
      '453': 'Rural',
      '633': 'Rendimento',
      '652': 'Itaú Unibanco',
      '745': 'Citibank',
      '756': 'Sicoob',
    };
    
    return banks[bankCode];
  }

  /**
   * Normalize description for matching
   */
  private static normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
      // Update totals
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
      
      // Update by type
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
   * Detect OFX file format version
   */
  static detectVersion(content: string): '1.x' | '2.x' | 'unknown' {
    if (content.includes('<?xml') || content.includes('<?OFX')) {
      return '2.x';
    }
    if (content.includes('OFXHEADER:')) {
      return '1.x';
    }
    return 'unknown';
  }

  /**
   * Check if content is valid OFX
   */
  static isValidOFX(content: string): boolean {
    return content.includes('<OFX>') || content.includes('<ofx>');
  }
}
