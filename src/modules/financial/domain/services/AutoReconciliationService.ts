/**
 * Domain Service: AutoReconciliationService
 * Serviço de conciliação bancária automática
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 * - DOMAIN-SVC-007: 100% testável sem mocks
 *
 * Estratégias de matching:
 * 1. Exact Match: valor + data exata
 * 2. Fuzzy Match: valor exato + data ±3 dias + similaridade de descrição
 * 3. Amount Match: valor exato + window ±7 dias
 *
 * @module financial/domain/services
 */
import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface BankTransactionForReconciliation {
  id: string;
  fitId: string;
  transactionDate: Date;
  amount: number;
  description: string;
  direction: 'CREDIT' | 'DEBIT';
  reconciled: string; // 'S' or 'N'
}

export interface FinancialTitleForReconciliation {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  partnerName: string;
  amount: number;
  dueDate: Date;
  status: string;
  documentNumber?: string;
}

export interface ReconciliationMatch {
  transactionId: string;
  transactionFitId: string;
  titleId: string;
  titleType: 'PAYABLE' | 'RECEIVABLE';
  confidence: number; // 0..1
  matchReasons: string[];
  amountDifference: number;
}

export interface ReconciliationResult {
  totalTransactions: number;
  totalTitles: number;
  matchesFound: number;
  matches: ReconciliationMatch[];
  unmatchedTransactions: string[];
  unmatchedTitles: string[];
}

export interface ReconciliationConfig {
  /** Tolerância de valor em R$ (default: 0.01) */
  amountTolerance: number;
  /** Janela de dias para matching de data (default: 3) */
  dateWindowDays: number;
  /** Confiança mínima para auto-match (default: 0.8) */
  minAutoMatchConfidence: number;
  /** Habilitar fuzzy matching de descrição (default: true) */
  enableFuzzyDescription: boolean;
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  amountTolerance: 0.01,
  dateWindowDays: 3,
  minAutoMatchConfidence: 0.80,
  enableFuzzyDescription: true,
};

// ============================================================================
// SERVICE
// ============================================================================

export class AutoReconciliationService {
  private constructor() {}

  /**
   * Executa reconciliação automática entre transações bancárias e títulos financeiros
   */
  static reconcile(
    transactions: BankTransactionForReconciliation[],
    titles: FinancialTitleForReconciliation[],
    config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG
  ): Result<ReconciliationResult, string> {
    // Filtrar apenas transações não conciliadas
    const unreconciled = transactions.filter(t => t.reconciled !== 'S');

    if (unreconciled.length === 0) {
      return Result.ok({
        totalTransactions: transactions.length,
        totalTitles: titles.length,
        matchesFound: 0,
        matches: [],
        unmatchedTransactions: [],
        unmatchedTitles: titles.map(t => t.id),
      });
    }

    // Separar títulos por tipo para matching correto
    const payables = titles.filter(t => t.type === 'PAYABLE' && t.status === 'OPEN');
    const receivables = titles.filter(t => t.type === 'RECEIVABLE' && t.status === 'OPEN');

    const allMatches: ReconciliationMatch[] = [];
    const matchedTransactionIds = new Set<string>();
    const matchedTitleIds = new Set<string>();

    // Para cada transação, buscar melhor match
    for (const tx of unreconciled) {
      // DEBIT -> match com PAYABLE, CREDIT -> match com RECEIVABLE
      const candidates = tx.direction === 'DEBIT' ? payables : receivables;
      const titleType: 'PAYABLE' | 'RECEIVABLE' = tx.direction === 'DEBIT' ? 'PAYABLE' : 'RECEIVABLE';

      let bestMatch: ReconciliationMatch | null = null;

      for (const title of candidates) {
        // Pular títulos já matched
        if (matchedTitleIds.has(title.id)) continue;

        const match = this.scoreMatch(tx, title, titleType, config);
        if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
          bestMatch = match;
        }
      }

      if (bestMatch && bestMatch.confidence >= config.minAutoMatchConfidence) {
        allMatches.push(bestMatch);
        matchedTransactionIds.add(tx.id);
        matchedTitleIds.add(bestMatch.titleId);
      }
    }

    const unmatchedTransactions = unreconciled
      .filter(t => !matchedTransactionIds.has(t.id))
      .map(t => t.id);

    const unmatchedTitles = titles
      .filter(t => !matchedTitleIds.has(t.id) && t.status === 'OPEN')
      .map(t => t.id);

    return Result.ok({
      totalTransactions: transactions.length,
      totalTitles: titles.length,
      matchesFound: allMatches.length,
      matches: allMatches.sort((a, b) => b.confidence - a.confidence),
      unmatchedTransactions,
      unmatchedTitles,
    });
  }

  /**
   * Calcula score de match entre uma transação e um título
   */
  private static scoreMatch(
    tx: BankTransactionForReconciliation,
    title: FinancialTitleForReconciliation,
    titleType: 'PAYABLE' | 'RECEIVABLE',
    config: ReconciliationConfig
  ): ReconciliationMatch | null {
    const reasons: string[] = [];
    let score = 0;

    // 1. Match de valor (peso: 0.40)
    const txAmount = Math.abs(tx.amount);
    const amountDiff = Math.abs(txAmount - title.amount);

    if (amountDiff <= config.amountTolerance) {
      score += 0.40;
      reasons.push(`Valor exato: R$ ${txAmount.toFixed(2)}`);
    } else if (amountDiff <= 1.00) {
      // Tolerância de R$ 1 (taxas bancárias pequenas)
      score += 0.25;
      reasons.push(`Valor próximo: diferença R$ ${amountDiff.toFixed(2)}`);
    } else {
      // Sem match de valor, não vale a pena continuar
      return null;
    }

    // 2. Match de data (peso: 0.30)
    const txDate = new Date(tx.transactionDate);
    const titleDate = new Date(title.dueDate);
    const daysDiff = Math.abs(
      (txDate.getTime() - titleDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      score += 0.30;
      reasons.push('Data exata');
    } else if (daysDiff <= config.dateWindowDays) {
      score += 0.20 * (1 - daysDiff / (config.dateWindowDays + 1));
      reasons.push(`Data próxima: ${Math.round(daysDiff)} dia(s) de diferença`);
    } else if (daysDiff <= 7) {
      score += 0.05;
      reasons.push(`Data dentro de 7 dias`);
    }

    // 3. Match de descrição (peso: 0.20)
    if (config.enableFuzzyDescription) {
      const descScore = this.descriptionSimilarity(tx.description, title.partnerName, title.description);
      score += 0.20 * descScore;
      if (descScore > 0.5) {
        reasons.push(`Descrição similar (${Math.round(descScore * 100)}%)`);
      }
    }

    // 4. Match de número de documento (peso: 0.10)
    if (title.documentNumber) {
      const docInDesc = tx.description.includes(title.documentNumber);
      if (docInDesc) {
        score += 0.10;
        reasons.push(`Documento ${title.documentNumber} na descrição`);
      }
    }

    if (reasons.length === 0) return null;

    return {
      transactionId: tx.id,
      transactionFitId: tx.fitId,
      titleId: title.id,
      titleType,
      confidence: Math.min(score, 1.0),
      matchReasons: reasons,
      amountDifference: amountDiff,
    };
  }

  /**
   * Calcula similaridade entre descrição da transação e dados do título
   */
  private static descriptionSimilarity(
    txDescription: string,
    partnerName: string,
    titleDescription: string
  ): number {
    const txLower = txDescription.toLowerCase().trim();
    const partnerLower = partnerName.toLowerCase().trim();
    const titleLower = titleDescription.toLowerCase().trim();

    // Check if partner name appears in transaction description
    if (txLower.includes(partnerLower) || partnerLower.includes(txLower)) {
      return 1.0;
    }

    // Tokenize and compare words
    const txWords = this.tokenize(txLower);
    const partnerWords = this.tokenize(partnerLower);
    const titleWords = this.tokenize(titleLower);
    const candidateWords = new Set([...partnerWords, ...titleWords]);

    if (txWords.length === 0 || candidateWords.size === 0) return 0;

    let matchingWords = 0;
    for (const word of txWords) {
      if (word.length < 3) continue; // Ignorar palavras muito curtas
      for (const candidate of candidateWords) {
        if (candidate.includes(word) || word.includes(candidate)) {
          matchingWords++;
          break;
        }
      }
    }

    return matchingWords / Math.max(txWords.length, 1);
  }

  /**
   * Tokeniza string removendo caracteres especiais
   */
  private static tokenize(text: string): string[] {
    return text
      .replace(/[^a-záàâãéèêíïóôõöúüç\s]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);
  }
}
