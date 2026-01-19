/**
 * Bank Statement Types - Phase D6
 * 
 * Types for bank statement extraction and parsing from OFX/CSV files.
 * Supports multiple bank formats and transaction categorization.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Supported bank statement file formats
 */
export type BankStatementFormat = 'OFX' | 'QFX' | 'CSV' | 'TXT';

/**
 * Transaction types as defined in OFX specification
 */
export type OFXTransactionType =
  | 'CREDIT'      // Generic credit
  | 'DEBIT'       // Generic debit
  | 'INT'         // Interest earned
  | 'DIV'         // Dividend
  | 'FEE'         // FI fee
  | 'SRVCHG'      // Service charge
  | 'DEP'         // Deposit
  | 'ATM'         // ATM debit or credit
  | 'POS'         // Point of sale debit or credit
  | 'XFER'        // Transfer
  | 'CHECK'       // Check
  | 'PAYMENT'     // Electronic payment
  | 'CASH'        // Cash withdrawal
  | 'DIRECTDEP'   // Direct deposit
  | 'DIRECTDEBIT' // Merchant initiated debit
  | 'REPEATPMT'   // Repeating payment
  | 'OTHER';      // Other

/**
 * Account types
 */
export type BankAccountType = 
  | 'CHECKING'    // Conta corrente
  | 'SAVINGS'     // Poupança
  | 'CREDITCARD'  // Cartão de crédito
  | 'INVESTMENT'  // Investimento
  | 'OTHER';

/**
 * Transaction direction for categorization
 */
export type TransactionDirection = 'CREDIT' | 'DEBIT';

/**
 * Status of transaction reconciliation
 */
export type ReconciliationStatus = 
  | 'PENDING'     // Aguardando conciliação
  | 'MATCHED'     // Conciliado automaticamente
  | 'MANUAL'      // Conciliado manualmente
  | 'IGNORED'     // Ignorado pelo usuário
  | 'DUPLICATE';  // Duplicata detectada

/**
 * Suggested category for automatic categorization
 */
export type TransactionCategory =
  | 'SALARY'           // Salários e proventos
  | 'SUPPLIER_PAYMENT' // Pagamento a fornecedores
  | 'CUSTOMER_RECEIPT' // Recebimento de clientes
  | 'TAX'              // Impostos e taxas
  | 'UTILITY'          // Contas de consumo (água, luz, telefone)
  | 'BANK_FEE'         // Tarifas bancárias
  | 'INTEREST'         // Juros (recebidos ou pagos)
  | 'LOAN'             // Empréstimos
  | 'TRANSFER'         // Transferências entre contas
  | 'FUEL'             // Combustível
  | 'MAINTENANCE'      // Manutenção de veículos
  | 'TOLL'             // Pedágios
  | 'INSURANCE'        // Seguros
  | 'OTHER';           // Outros

// ============================================================================
// VALUE OBJECTS
// ============================================================================

/**
 * Bank account identification
 */
export interface BankAccountInfo {
  bankCode: string;           // Código do banco (ex: 341 para Itaú)
  bankName?: string;          // Nome do banco
  branchCode: string;         // Agência
  accountNumber: string;      // Número da conta
  accountType: BankAccountType;
  currency: string;           // Moeda (BRL, USD, etc)
}

/**
 * Statement period information
 */
export interface StatementPeriod {
  startDate: Date;
  endDate: Date;
  generatedAt?: Date;        // Data de geração do extrato
}

/**
 * Balance information
 */
export interface BalanceInfo {
  openingBalance: number;     // Saldo inicial do período
  closingBalance: number;     // Saldo final do período
  availableBalance?: number;  // Saldo disponível
  currency: string;
  asOfDate: Date;
}

// ============================================================================
// TRANSACTION
// ============================================================================

/**
 * Individual bank transaction
 */
export interface BankTransaction {
  // Identification
  fitId: string;              // Financial Institution Transaction ID (unique)
  checkNumber?: string;       // Número do cheque, se aplicável
  referenceNumber?: string;   // Número de referência adicional
  
  // Transaction details
  transactionDate: Date;      // Data da transação
  postDate?: Date;            // Data de compensação
  amount: number;             // Valor (positivo = crédito, negativo = débito)
  direction: TransactionDirection;
  type: OFXTransactionType;
  
  // Description
  description: string;        // Descrição original do banco
  normalizedDescription?: string; // Descrição normalizada/limpa
  memo?: string;              // Memo adicional
  
  // Counterparty
  payee?: string;             // Nome do beneficiário/pagador
  payeeDocument?: string;     // CNPJ/CPF do beneficiário (se identificado)
  
  // Categorization
  category?: TransactionCategory;
  categoryConfidence?: number; // 0-1 confidence score
  
  // Reconciliation
  reconciliationStatus: ReconciliationStatus;
  matchedPayableId?: string;  // ID do título a pagar vinculado
  matchedReceivableId?: string; // ID do título a receber vinculado
  
  // Metadata
  rawData?: Record<string, unknown>; // Dados originais do parser
}

// ============================================================================
// BANK STATEMENT DATA
// ============================================================================

/**
 * Complete bank statement data
 */
export interface BankStatementData {
  // Metadata
  format: BankStatementFormat;
  fileName: string;
  parsedAt: Date;
  
  // Account information
  account: BankAccountInfo;
  
  // Period and balances
  period: StatementPeriod;
  balance: BalanceInfo;
  
  // Transactions
  transactions: BankTransaction[];
  
  // Summary
  summary: TransactionSummary;
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

/**
 * Transaction summary statistics
 */
export interface TransactionSummary {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  creditCount: number;
  debitCount: number;
  netMovement: number;        // totalCredits - totalDebits
  
  // By type breakdown
  byType: Record<OFXTransactionType, {
    count: number;
    total: number;
  }>;
  
  // By category breakdown (if categorized)
  byCategory?: Record<TransactionCategory, {
    count: number;
    total: number;
  }>;
  
  // Period stats
  averageTransactionAmount: number;
  largestCredit?: BankTransaction;
  largestDebit?: BankTransaction;
}

// ============================================================================
// PARSER CONFIGURATION
// ============================================================================

/**
 * Configuration for bank statement parser
 */
export interface BankStatementParserConfig {
  // Format detection
  autoDetectFormat: boolean;
  defaultFormat?: BankStatementFormat;
  
  // CSV specific
  csvDelimiter?: string;
  csvHasHeader?: boolean;
  csvDateColumn?: number | string;
  csvAmountColumn?: number | string;
  csvDescriptionColumn?: number | string;
  csvDateFormat?: string;     // e.g., 'DD/MM/YYYY'
  
  // Processing options
  normalizeDescriptions: boolean;
  extractPayeeFromDescription: boolean;
  autoCategorizem: boolean;
  detectDuplicates: boolean;
  
  // Validation
  validateBalance: boolean;   // Validate if transactions match balance change
  toleranceAmount?: number;   // Tolerance for balance validation (default: 0.01)
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: BankStatementParserConfig = {
  autoDetectFormat: true,
  normalizeDescriptions: true,
  extractPayeeFromDescription: true,
  autoCategorizem: true,
  detectDuplicates: true,
  validateBalance: true,
  toleranceAmount: 0.01,
};

// ============================================================================
// CATEGORIZATION RULES
// ============================================================================

/**
 * Rule for automatic transaction categorization
 */
export interface CategorizationRule {
  id: string;
  name: string;
  category: TransactionCategory;
  priority: number;           // Higher = checked first
  
  // Matching conditions (OR logic between different fields, AND within patterns)
  descriptionPatterns?: RegExp[];
  payeePatterns?: RegExp[];
  amountRange?: {
    min?: number;
    max?: number;
  };
  transactionTypes?: OFXTransactionType[];
  direction?: TransactionDirection;
}

/**
 * Built-in categorization rules for Brazilian banks
 */
export const DEFAULT_CATEGORIZATION_RULES: CategorizationRule[] = [
  {
    id: 'fuel',
    name: 'Combustível',
    category: 'FUEL',
    priority: 100,
    descriptionPatterns: [
      /posto|shell|ipiranga|br\s*distribuidora|petrobras|auto\s*posto|combustivel|gasolina|diesel|etanol/i,
    ],
    direction: 'DEBIT',
  },
  {
    id: 'toll',
    name: 'Pedágio',
    category: 'TOLL',
    priority: 100,
    descriptionPatterns: [
      /pedagio|sem\s*parar|conectcar|veloe|move\s*mais|auto\s*expresso|ccr|ecorodovias|arteris/i,
    ],
    direction: 'DEBIT',
  },
  {
    id: 'bank_fee',
    name: 'Tarifa Bancária',
    category: 'BANK_FEE',
    priority: 90,
    descriptionPatterns: [
      /tarifa|tar\s*[a-z]+|taxa\s*manut|taxa\s*serv|anuidade|iof|cpmf/i,
    ],
    transactionTypes: ['FEE', 'SRVCHG'],
  },
  {
    id: 'interest_received',
    name: 'Juros Recebidos',
    category: 'INTEREST',
    priority: 90,
    transactionTypes: ['INT', 'DIV'],
    direction: 'CREDIT',
  },
  {
    id: 'salary',
    name: 'Salário',
    category: 'SALARY',
    priority: 80,
    descriptionPatterns: [
      /salario|folha\s*de\s*pag|pagamento\s*.*\s*salario|credito\s*salario|dep\s*sal/i,
    ],
    direction: 'CREDIT',
  },
  {
    id: 'tax',
    name: 'Impostos',
    category: 'TAX',
    priority: 80,
    descriptionPatterns: [
      /darf|gps|inss|fgts|icms|iss|pis|cofins|irrf|csll|simples\s*nacional|das\s*mei|iptu|ipva/i,
    ],
    direction: 'DEBIT',
  },
  {
    id: 'utility',
    name: 'Contas de Consumo',
    category: 'UTILITY',
    priority: 70,
    descriptionPatterns: [
      /celesc|copel|cemig|eletropaulo|enel|light|cpfl|energisa|coelba|sabesp|copasa|sanepar|casan|vivo|tim|claro|oi\s|net\s|sky|algar|nextel|internet|telefone|celular|luz|energia|agua|gas/i,
    ],
    direction: 'DEBIT',
  },
  {
    id: 'transfer',
    name: 'Transferência',
    category: 'TRANSFER',
    priority: 60,
    descriptionPatterns: [
      /ted|doc|transf|pix|transferencia/i,
    ],
    transactionTypes: ['XFER'],
  },
  {
    id: 'insurance',
    name: 'Seguro',
    category: 'INSURANCE',
    priority: 60,
    descriptionPatterns: [
      /seguro|porto\s*seguro|bradesco\s*seguros|itau\s*seguros|mapfre|tokio\s*marine|liberty|allianz|sulamerica|hdi|azul\s*seguros/i,
    ],
    direction: 'DEBIT',
  },
];

// ============================================================================
// IMPORT RESULT
// ============================================================================

/**
 * Result of importing a bank statement
 */
export interface BankStatementImportResult {
  success: boolean;
  data?: BankStatementData;
  
  // Import statistics
  transactionsImported: number;
  transactionsSkipped: number;   // Duplicates or invalid
  transactionsFailed: number;
  
  // Categorization stats
  transactionsCategorized: number;
  
  // Matching stats (if auto-match enabled)
  transactionsMatched: number;
  matchedPayables: string[];
  matchedReceivables: string[];
  
  // Errors and warnings
  errors: string[];
  warnings: string[];
}

// ============================================================================
// RECONCILIATION
// ============================================================================

/**
 * Reconciliation suggestion
 */
export interface ReconciliationSuggestion {
  transactionFitId: string;
  suggestedMatch: {
    type: 'PAYABLE' | 'RECEIVABLE';
    id: string;
    description: string;
    amount: number;
    dueDate: Date;
  };
  confidence: number;         // 0-1 confidence score
  matchReasons: string[];     // Why this match is suggested
}

/**
 * Batch reconciliation request
 */
export interface BatchReconciliationRequest {
  bankAccountId: string;
  transactions: Array<{
    fitId: string;
    matchType: 'PAYABLE' | 'RECEIVABLE' | 'IGNORE';
    matchId?: string;
  }>;
}
