/**
 * @module agent/workflows/BankReconciliationWorkflow
 * @description Workflow para conciliação bancária automática
 * 
 * Orquestra o fluxo de conciliação:
 * 1. Buscar extrato bancário
 * 2. Buscar lançamentos do sistema
 * 3. Realizar matching automático
 * 4. Identificar divergências
 * 5. Gerar resumo
 */

import { Result } from '@/shared/domain';
import { agentLogger } from '../observability';

/**
 * Entrada do extrato bancário
 */
export interface BankStatementEntry {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
  balance?: number;
}

/**
 * Lançamento financeiro do sistema
 */
export interface FinancialEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'receivable' | 'payable';
  documentNumber?: string;
  status: 'open' | 'paid' | 'cancelled';
}

/**
 * Entrada conciliada
 */
export interface MatchedEntry {
  statementEntry: BankStatementEntry;
  systemEntry: FinancialEntry;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'manual';
}

/**
 * Resumo da conciliação
 */
export interface ReconciliationSummary {
  totalStatementEntries: number;
  totalSystemEntries: number;
  matchedCount: number;
  unmatchedStatementCount: number;
  unmatchedSystemCount: number;
  totalCredits: number;
  totalDebits: number;
  balance: number;
}

/**
 * Status do workflow
 */
export type ReconciliationStatus =
  | 'pending'
  | 'fetching'
  | 'parsing'
  | 'matching'
  | 'review'
  | 'completed'
  | 'failed';

/**
 * Estado do workflow
 */
export interface BankReconciliationState {
  // Input
  bankAccountId: number;
  statementSource: 'email' | 'drive' | 'upload' | 'ofx';
  statementIdentifier: string;
  period: { start: string; end: string };

  // Processamento
  statementEntries: BankStatementEntry[];
  systemEntries: FinancialEntry[];
  matchedEntries: MatchedEntry[];
  unmatchedStatement: BankStatementEntry[];
  unmatchedSystem: FinancialEntry[];

  // Output
  reconciliationId: string | null;
  summary: ReconciliationSummary | null;
  status: ReconciliationStatus;
  errors: string[];
  logs: string[];

  // Contexto
  organizationId: number;
  branchId: number;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Input para iniciar o workflow
 */
export interface BankReconciliationInput {
  bankAccountId: number;
  statementSource: 'email' | 'drive' | 'upload' | 'ofx';
  statementIdentifier: string;
  period: { start: string; end: string };
  organizationId: number;
  branchId: number;
  userId: string;
}

/**
 * Workflow de conciliação bancária
 */
export class BankReconciliationWorkflow {
  /**
   * Executa o workflow completo
   */
  async execute(input: BankReconciliationInput): Promise<Result<BankReconciliationState, string>> {
    const timer = agentLogger.startTimer();

    // Estado inicial
    const state: BankReconciliationState = {
      bankAccountId: input.bankAccountId,
      statementSource: input.statementSource,
      statementIdentifier: input.statementIdentifier,
      period: input.period,
      statementEntries: [],
      systemEntries: [],
      matchedEntries: [],
      unmatchedStatement: [],
      unmatchedSystem: [],
      reconciliationId: null,
      summary: null,
      status: 'pending',
      errors: [],
      logs: [`[${new Date().toISOString()}] Iniciando conciliação bancária`],
      organizationId: input.organizationId,
      branchId: input.branchId,
      userId: input.userId,
      startedAt: new Date(),
    };

    try {
      agentLogger.info('workflow', 'BankReconciliation.start', {
        bankAccountId: input.bankAccountId,
        source: input.statementSource,
        period: input.period,
      });

      // Passo 1: Buscar extrato
      const fetchResult = await this.fetchStatement(state);
      this.applyResult(state, fetchResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, timer);
      }

      // Passo 2: Buscar lançamentos do sistema
      const systemResult = await this.fetchSystemEntries(state);
      this.applyResult(state, systemResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, timer);
      }

      // Passo 3: Fazer matching
      const matchResult = await this.matchEntries(state);
      this.applyResult(state, matchResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, timer);
      }

      // Passo 4: Gerar resumo
      const summaryResult = await this.generateSummary(state);
      this.applyResult(state, summaryResult);

      return this.buildResult(state, timer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      state.status = 'failed';
      state.errors.push(`Erro no workflow: ${errorMessage}`);

      agentLogger.error('workflow', 'BankReconciliation.error', {
        error: errorMessage,
        durationMs: timer(),
      });

      return this.buildResult(state, timer);
    }
  }

  /**
   * Passo 1: Buscar extrato bancário
   */
  private async fetchStatement(state: BankReconciliationState): Promise<Partial<BankReconciliationState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Buscando extrato de ${state.statementSource}...`];

    try {
      state.status = 'fetching';

      // TODO: Implementar busca real por fonte
      // Por enquanto, simular dados
      const statementEntries: BankStatementEntry[] = [
        {
          date: state.period.start,
          description: 'TED RECEBIDA - CLIENTE ABC',
          amount: 5000.00,
          type: 'credit',
          reference: '123456789',
        },
        {
          date: state.period.start,
          description: 'PAGTO BOLETO - FORNECEDOR XYZ',
          amount: 1500.00,
          type: 'debit',
          reference: '987654321',
        },
        {
          date: state.period.end,
          description: 'PIX RECEBIDO',
          amount: 2500.00,
          type: 'credit',
          reference: 'PIX123',
        },
        {
          date: state.period.end,
          description: 'TARIFA BANCARIA',
          amount: 35.00,
          type: 'debit',
        },
      ];

      logs.push(`[${new Date().toISOString()}] ${statementEntries.length} lançamentos encontrados no extrato`);

      return {
        statementEntries,
        status: 'parsing' as const,
        logs,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao buscar extrato: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 2: Buscar lançamentos do sistema
   */
  private async fetchSystemEntries(state: BankReconciliationState): Promise<Partial<BankReconciliationState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Buscando lançamentos do sistema...`];

    try {
      // TODO: Implementar busca real no AuraCore
      // Por enquanto, simular dados
      const systemEntries: FinancialEntry[] = [
        {
          id: 'fin-001',
          date: state.period.start,
          description: 'Fatura 001 - Cliente ABC',
          amount: 5000.00,
          type: 'receivable',
          documentNumber: 'FAT-001',
          status: 'open',
        },
        {
          id: 'fin-002',
          date: state.period.start,
          description: 'Boleto 002 - Fornecedor XYZ',
          amount: 1500.00,
          type: 'payable',
          documentNumber: 'BOL-002',
          status: 'open',
        },
        {
          id: 'fin-003',
          date: state.period.end,
          description: 'Venda PIX - Cliente DEF',
          amount: 2500.00,
          type: 'receivable',
          documentNumber: 'PIX-003',
          status: 'open',
        },
      ];

      logs.push(`[${new Date().toISOString()}] ${systemEntries.length} lançamentos encontrados no sistema`);

      return {
        systemEntries,
        status: 'matching' as const,
        logs,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao buscar lançamentos: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 3: Realizar matching automático
   */
  private async matchEntries(state: BankReconciliationState): Promise<Partial<BankReconciliationState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Iniciando conciliação automática...`];

    try {
      const matchedEntries: MatchedEntry[] = [];
      const unmatchedStatement: BankStatementEntry[] = [];
      const unmatchedSystem: FinancialEntry[] = [...state.systemEntries];

      for (const stmtEntry of state.statementEntries) {
        // Tentar match por valor e data
        const matchIndex = unmatchedSystem.findIndex(sysEntry => {
          const amountMatch = Math.abs(stmtEntry.amount - sysEntry.amount) < 0.01;
          const dateMatch = stmtEntry.date === sysEntry.date;
          const typeMatch = (stmtEntry.type === 'credit' && sysEntry.type === 'receivable') ||
                           (stmtEntry.type === 'debit' && sysEntry.type === 'payable');
          return amountMatch && dateMatch && typeMatch;
        });

        if (matchIndex >= 0) {
          const sysEntry = unmatchedSystem.splice(matchIndex, 1)[0];
          matchedEntries.push({
            statementEntry: stmtEntry,
            systemEntry: sysEntry,
            confidence: 0.95,
            matchType: 'exact',
          });
          logs.push(`[${new Date().toISOString()}] Match: R$ ${stmtEntry.amount} - ${stmtEntry.description.substring(0, 30)} <-> ${sysEntry.description.substring(0, 30)}`);
        } else {
          // Tentar match fuzzy (apenas por valor)
          const fuzzyIndex = unmatchedSystem.findIndex(sysEntry => {
            const amountMatch = Math.abs(stmtEntry.amount - sysEntry.amount) < 0.01;
            const typeMatch = (stmtEntry.type === 'credit' && sysEntry.type === 'receivable') ||
                             (stmtEntry.type === 'debit' && sysEntry.type === 'payable');
            return amountMatch && typeMatch;
          });

          if (fuzzyIndex >= 0) {
            const sysEntry = unmatchedSystem.splice(fuzzyIndex, 1)[0];
            matchedEntries.push({
              statementEntry: stmtEntry,
              systemEntry: sysEntry,
              confidence: 0.75,
              matchType: 'fuzzy',
            });
            logs.push(`[${new Date().toISOString()}] Match (fuzzy): R$ ${stmtEntry.amount} - ${stmtEntry.description.substring(0, 30)}`);
          } else {
            unmatchedStatement.push(stmtEntry);
          }
        }
      }

      logs.push(`[${new Date().toISOString()}] Conciliação: ${matchedEntries.length} matches, ${unmatchedStatement.length} pendentes extrato, ${unmatchedSystem.length} pendentes sistema`);

      return {
        matchedEntries,
        unmatchedStatement,
        unmatchedSystem,
        status: 'review' as const,
        logs,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro no matching: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 4: Gerar resumo
   */
  private async generateSummary(state: BankReconciliationState): Promise<Partial<BankReconciliationState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Gerando resumo...`];

    try {
      const totalCredits = state.statementEntries
        .filter(e => e.type === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);

      const totalDebits = state.statementEntries
        .filter(e => e.type === 'debit')
        .reduce((sum, e) => sum + e.amount, 0);

      const summary: ReconciliationSummary = {
        totalStatementEntries: state.statementEntries.length,
        totalSystemEntries: state.systemEntries.length,
        matchedCount: state.matchedEntries.length,
        unmatchedStatementCount: state.unmatchedStatement.length,
        unmatchedSystemCount: state.unmatchedSystem.length,
        totalCredits,
        totalDebits,
        balance: totalCredits - totalDebits,
      };

      const reconciliationId = `REC-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      logs.push(`[${new Date().toISOString()}] Conciliação ${reconciliationId} concluída`);
      logs.push(`[${new Date().toISOString()}] Créditos: R$ ${totalCredits.toFixed(2)}, Débitos: R$ ${totalDebits.toFixed(2)}, Saldo: R$ ${summary.balance.toFixed(2)}`);

      return {
        summary,
        reconciliationId,
        status: 'completed' as const,
        completedAt: new Date(),
        logs,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao gerar resumo: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Aplica resultado parcial ao estado
   */
  private applyResult(state: BankReconciliationState, result: Partial<BankReconciliationState>): void {
    Object.assign(state, result);
  }

  /**
   * Verifica se o estado falhou
   */
  private hasFailed(state: BankReconciliationState): boolean {
    return state.status === 'failed';
  }

  /**
   * Constrói resultado final
   */
  private buildResult(
    state: BankReconciliationState,
    timer: () => number
  ): Result<BankReconciliationState, string> {
    const durationMs = timer();

    agentLogger.info('workflow', 'BankReconciliation.complete', {
      status: state.status,
      matchedCount: state.matchedEntries.length,
      unmatchedStatementCount: state.unmatchedStatement.length,
      unmatchedSystemCount: state.unmatchedSystem.length,
      durationMs,
    });

    return Result.ok(state);
  }
}
