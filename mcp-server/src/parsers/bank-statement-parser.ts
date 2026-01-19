/**
 * Bank Statement Parser para MCP Server
 * =====================================
 *
 * Parser local simplificado para extratos bancários OFX e CSV.
 * Implementa lógica similar ao D6 mas independente do projeto principal.
 *
 * @module mcp-server/parsers/bank-statement-parser
 * @see D6 BankStatementParser
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BankAccount {
  bankCode?: string;
  bankName?: string;
  branchCode?: string;
  accountNumber?: string;
  accountType?: string;
  currency: string;
}

export interface StatementPeriod {
  startDate: Date;
  endDate: Date;
  generatedAt?: Date;
}

export interface StatementBalance {
  openingBalance: number;
  closingBalance: number;
  availableBalance?: number;
}

export interface BankTransaction {
  fitId: string;
  transactionDate: Date;
  postDate?: Date;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  type: string;
  description: string;
  normalizedDescription?: string;
  category?: string;
  categoryConfidence?: number;
  payee?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  creditCount: number;
  debitCount: number;
  totalCredits: number;
  totalDebits: number;
  netMovement: number;
  averageTransactionAmount: number;
}

export interface ParsedBankStatement {
  format: 'OFX' | 'CSV';
  fileName: string;
  parsedAt: Date;
  account: BankAccount;
  period: StatementPeriod;
  balance: StatementBalance;
  transactions: BankTransaction[];
  summary: TransactionSummary;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface ParseResult {
  success: boolean;
  statement?: ParsedBankStatement;
  parserUsed?: 'OFX' | 'CSV';
  error?: string;
}

// ============================================================================
// CATEGORIZATION RULES
// ============================================================================

interface CategoryRule {
  category: string;
  patterns: RegExp[];
  direction?: 'CREDIT' | 'DEBIT';
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'FUEL',
    patterns: [/posto|shell|ipiranga|br\s*distribuidora|petrobras|gasolina|diesel|etanol|combustivel/i],
    direction: 'DEBIT',
  },
  {
    category: 'TOLL',
    patterns: [/pedagio|sem\s*parar|conectcar|veloe|move\s*mais|auto\s*expresso/i],
    direction: 'DEBIT',
  },
  {
    category: 'BANK_FEE',
    patterns: [/tarifa|tar\s*[a-z]+|taxa\s*manut|taxa\s*serv|anuidade|iof/i],
  },
  {
    category: 'TAX',
    patterns: [/darf|gps|inss|fgts|icms|iss|pis|cofins|irrf|csll|simples\s*nacional|iptu|ipva/i],
    direction: 'DEBIT',
  },
  {
    category: 'SALARY',
    patterns: [/salario|folha\s*de\s*pag|credito\s*salario|dep\s*sal/i],
    direction: 'CREDIT',
  },
  {
    category: 'UTILITY',
    patterns: [/celesc|copel|cemig|eletropaulo|enel|light|cpfl|sabesp|copasa|vivo|tim|claro|oi\s|net\s|sky|luz|energia|agua|gas|telefone/i],
    direction: 'DEBIT',
  },
  {
    category: 'TRANSFER',
    patterns: [/ted|doc|transf|pix|transferencia/i],
  },
  {
    category: 'INSURANCE',
    patterns: [/seguro|porto\s*seguro|bradesco\s*seguros|mapfre|tokio\s*marine|liberty|allianz|sulamerica/i],
    direction: 'DEBIT',
  },
];

function categorizeTransaction(description: string, amount: number): { category: string; confidence: number } {
  const direction: 'CREDIT' | 'DEBIT' = amount >= 0 ? 'CREDIT' : 'DEBIT';
  const normalizedDesc = description.toUpperCase();

  for (const rule of CATEGORY_RULES) {
    // Check direction match if specified
    if (rule.direction && rule.direction !== direction) {
      continue;
    }

    // Check pattern match
    for (const pattern of rule.patterns) {
      if (pattern.test(normalizedDesc)) {
        return { category: rule.category, confidence: 0.85 };
      }
    }
  }

  return { category: 'OTHER', confidence: 0.5 };
}

function normalizeDescription(description: string): string {
  return description
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-]/g, '')
    .trim();
}

// ============================================================================
// OFX PARSER
// ============================================================================

function parseOFX(content: string, fileName: string): ParseResult {
  try {
    // Check if valid OFX
    if (!content.includes('<OFX>') && !content.includes('<ofx>')) {
      return { success: false, error: 'Conteúdo OFX inválido - tag <OFX> não encontrada' };
    }

    const transactions: BankTransaction[] = [];
    const warnings: string[] = [];

    // Extract bank info
    const bankIdMatch = content.match(/<BANKID>([^<\n]+)/i);
    const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/i);
    const acctTypeMatch = content.match(/<ACCTTYPE>([^<\n]+)/i);
    const curDefMatch = content.match(/<CURDEF>([^<\n]+)/i);
    const fiOrgMatch = content.match(/<ORG>([^<\n]+)/i);

    // Extract period
    const dtStartMatch = content.match(/<DTSTART>(\d{8})/i);
    const dtEndMatch = content.match(/<DTEND>(\d{8})/i);

    // Extract balance
    const balAmtMatch = content.match(/<BALAMT>([^<\n]+)/i);
    const balDateMatch = content.match(/<DTASOF>(\d{8})/i);

    // Parse transactions
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    let txnCount = 0;

    while ((match = transactionRegex.exec(content)) !== null) {
      const txnBlock = match[1];
      
      const trnTypeMatch = txnBlock.match(/<TRNTYPE>([^<\n]+)/i);
      const dtPostedMatch = txnBlock.match(/<DTPOSTED>(\d{8})/i);
      const trnAmtMatch = txnBlock.match(/<TRNAMT>([^<\n]+)/i);
      const fitIdMatch = txnBlock.match(/<FITID>([^<\n]+)/i);
      const memoMatch = txnBlock.match(/<MEMO>([^<\n]+)/i);
      const nameMatch = txnBlock.match(/<NAME>([^<\n]+)/i);

      const amount = parseFloat(trnAmtMatch?.[1]?.trim() ?? '0');
      const description = (memoMatch?.[1] || nameMatch?.[1] || '').trim();
      const fitId = fitIdMatch?.[1]?.trim() || `TXN${Date.now()}${txnCount++}`;
      
      const txnDate = parseOFXDate(dtPostedMatch?.[1] ?? '');
      const direction: 'CREDIT' | 'DEBIT' = amount >= 0 ? 'CREDIT' : 'DEBIT';
      const { category, confidence } = categorizeTransaction(description, amount);

      transactions.push({
        fitId,
        transactionDate: txnDate,
        amount,
        direction,
        type: trnTypeMatch?.[1]?.trim() || 'OTHER',
        description,
        normalizedDescription: normalizeDescription(description),
        category,
        categoryConfidence: confidence,
      });
    }

    if (transactions.length === 0) {
      warnings.push('Nenhuma transação encontrada no arquivo OFX');
    }

    // Calculate summary
    const credits = transactions.filter(t => t.amount > 0);
    const debits = transactions.filter(t => t.amount < 0);
    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = Math.abs(debits.reduce((sum, t) => sum + t.amount, 0));

    const statement: ParsedBankStatement = {
      format: 'OFX',
      fileName,
      parsedAt: new Date(),
      account: {
        bankCode: bankIdMatch?.[1]?.trim(),
        bankName: fiOrgMatch?.[1]?.trim(),
        accountNumber: acctIdMatch?.[1]?.trim(),
        accountType: acctTypeMatch?.[1]?.trim() || 'CHECKING',
        currency: curDefMatch?.[1]?.trim() || 'BRL',
      },
      period: {
        startDate: parseOFXDate(dtStartMatch?.[1] ?? ''),
        endDate: parseOFXDate(dtEndMatch?.[1] ?? ''),
        generatedAt: new Date(),
      },
      balance: {
        openingBalance: 0, // OFX typically only has closing balance
        closingBalance: parseFloat(balAmtMatch?.[1]?.trim() ?? '0'),
      },
      transactions,
      summary: {
        totalTransactions: transactions.length,
        creditCount: credits.length,
        debitCount: debits.length,
        totalCredits,
        totalDebits,
        netMovement: totalCredits - totalDebits,
        averageTransactionAmount: transactions.length > 0
          ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
          : 0,
      },
      isValid: true,
      validationErrors: [],
      validationWarnings: warnings,
    };

    return { success: true, statement, parserUsed: 'OFX' };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Erro ao parsear OFX: ${errorMsg}` };
  }
}

function parseOFXDate(dateStr: string): Date {
  if (!dateStr || dateStr.length < 8) {
    return new Date();
  }
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCSV(content: string, fileName: string): ParseResult {
  try {
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
      return { success: false, error: 'Arquivo CSV inválido - menos de 2 linhas' };
    }

    const transactions: BankTransaction[] = [];
    const warnings: string[] = [];

    // Detect delimiter
    const firstLine = lines[0] ?? '';
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    // Parse header
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    // Find column indices
    const dateIdx = headers.findIndex(h => h.includes('data') || h === 'date');
    const descIdx = headers.findIndex(h => h.includes('lanca') || h.includes('histor') || h.includes('descri'));
    const valueIdx = headers.findIndex(h => h.includes('valor') || h.includes('value') || h.includes('amount'));
    const creditIdx = headers.findIndex(h => h.includes('crédit') || h.includes('credit'));
    const debitIdx = headers.findIndex(h => h.includes('débit') || h.includes('debit'));

    if (dateIdx === -1 || (valueIdx === -1 && creditIdx === -1)) {
      warnings.push('Não foi possível identificar colunas obrigatórias (data, valor)');
    }

    // Parse data rows
    let txnCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cols = line.split(delimiter).map(c => c.trim());
      
      // Parse date (DD/MM/YYYY format)
      const dateStr = cols[dateIdx] ?? '';
      const dateParts = dateStr.split('/');
      let txnDate = new Date();
      if (dateParts.length === 3) {
        txnDate = new Date(
          parseInt(dateParts[2] ?? '2026', 10),
          parseInt(dateParts[1] ?? '1', 10) - 1,
          parseInt(dateParts[0] ?? '1', 10)
        );
      }

      // Parse amount
      let amount = 0;
      if (creditIdx !== -1 && debitIdx !== -1) {
        // Separate credit/debit columns
        const credit = parseCSVNumber(cols[creditIdx] ?? '');
        const debit = parseCSVNumber(cols[debitIdx] ?? '');
        amount = credit > 0 ? credit : -debit;
      } else if (valueIdx !== -1) {
        // Single value column
        amount = parseCSVNumber(cols[valueIdx] ?? '');
      }

      const description = cols[descIdx] ?? `Transação ${i}`;
      const { category, confidence } = categorizeTransaction(description, amount);

      if (amount !== 0) {
        transactions.push({
          fitId: `CSV${Date.now()}${txnCount++}`,
          transactionDate: txnDate,
          amount,
          direction: amount >= 0 ? 'CREDIT' : 'DEBIT',
          type: 'OTHER',
          description,
          normalizedDescription: normalizeDescription(description),
          category,
          categoryConfidence: confidence,
        });
      }
    }

    if (transactions.length === 0) {
      warnings.push('Nenhuma transação encontrada no arquivo CSV');
    }

    // Calculate summary
    const credits = transactions.filter(t => t.amount > 0);
    const debits = transactions.filter(t => t.amount < 0);
    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = Math.abs(debits.reduce((sum, t) => sum + t.amount, 0));

    // Determine period from transactions
    const dates = transactions.map(t => t.transactionDate.getTime());
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

    const statement: ParsedBankStatement = {
      format: 'CSV',
      fileName,
      parsedAt: new Date(),
      account: {
        currency: 'BRL',
        accountType: 'CHECKING',
      },
      period: {
        startDate: minDate,
        endDate: maxDate,
        generatedAt: new Date(),
      },
      balance: {
        openingBalance: 0,
        closingBalance: 0,
      },
      transactions,
      summary: {
        totalTransactions: transactions.length,
        creditCount: credits.length,
        debitCount: debits.length,
        totalCredits,
        totalDebits,
        netMovement: totalCredits - totalDebits,
        averageTransactionAmount: transactions.length > 0
          ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
          : 0,
      },
      isValid: true,
      validationErrors: [],
      validationWarnings: warnings,
    };

    return { success: true, statement, parserUsed: 'CSV' };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Erro ao parsear CSV: ${errorMsg}` };
  }
}

function parseCSVNumber(value: string): number {
  // Handle Brazilian number format (1.234,56 or 1234,56)
  const cleaned = value
    .replace(/\./g, '')     // Remove thousands separator
    .replace(',', '.')       // Convert decimal separator
    .replace(/[^\d\-\.]/g, '') // Remove non-numeric chars
    .trim();
  
  return parseFloat(cleaned) || 0;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parseBankStatement(content: string, fileName: string): ParseResult {
  const lowerName = fileName.toLowerCase();
  
  // Determine format by extension
  if (lowerName.endsWith('.ofx') || lowerName.endsWith('.qfx')) {
    return parseOFX(content, fileName);
  }
  
  if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
    // Check if it's actually OFX content
    if (content.includes('<OFX>') || content.includes('<ofx>')) {
      return parseOFX(content, fileName);
    }
    return parseCSV(content, fileName);
  }

  // Try to detect format from content
  if (content.includes('<OFX>') || content.includes('<ofx>')) {
    return parseOFX(content, fileName);
  }

  // Default to CSV
  return parseCSV(content, fileName);
}
