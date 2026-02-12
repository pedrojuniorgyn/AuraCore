/**
 * AccountIntegrityService - Domain Service (F1.8)
 * 
 * Validações de integridade contábil conforme NBC TG 26 e boas práticas:
 * 
 * 1. Bloquear exclusão de conta que possui lançamentos
 * 2. Bloquear edição de código de conta após lançamentos postados
 * 3. Bloquear lançamento em conta sintética (só permite em analíticas)
 * 4. Validar partida dobrada (débito = crédito) em todo lançamento
 * 
 * 100% Stateless, ZERO dependências de infraestrutura.
 * 
 * @module accounting/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 * @see NBC TG 26 - Apresentação das Demonstrações Contábeis
 * @see BENCHMARK_ESTRUTURA_CONTABIL_FISCAL.md
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountInfo {
  id: string | number;
  code: string;
  name: string;
  isAnalytical: boolean;
  status: string;
}

export interface JournalLineInput {
  accountId: string;
  accountCode: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface AccountDeletionContext {
  account: AccountInfo;
  /** Quantidade de lançamentos (journal_entry_lines) vinculados à conta */
  linkedEntriesCount: number;
}

export interface AccountCodeEditContext {
  account: AccountInfo;
  newCode: string;
  /** Se há lançamentos POSTED vinculados à conta */
  hasPostedEntries: boolean;
}

export interface JournalValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class AccountIntegrityService {
  private constructor() {} // Stateless - prevent instantiation

  /**
   * Regra 1: Bloquear exclusão de conta com lançamentos
   * 
   * NBC TG 26: "As contas contábeis devem manter integridade referencial"
   * Uma conta com lançamentos vinculados NÃO pode ser excluída.
   */
  static validateDeletion(ctx: AccountDeletionContext): Result<true, string> {
    if (ctx.linkedEntriesCount > 0) {
      return Result.fail(
        `Não é possível excluir a conta "${ctx.account.code} - ${ctx.account.name}". ` +
        `Existem ${ctx.linkedEntriesCount} lançamento(s) vinculado(s). ` +
        `Desative a conta ao invés de excluí-la.`
      );
    }

    return Result.ok(true);
  }

  /**
   * Regra 2: Bloquear edição de código após lançamentos postados
   * 
   * NBC TG 26: "Os códigos das contas devem ser imutáveis após escrituração"
   * Se há lançamentos POSTED, o código da conta é imutável.
   */
  static validateCodeEdit(ctx: AccountCodeEditContext): Result<true, string> {
    if (ctx.hasPostedEntries) {
      return Result.fail(
        `Não é possível alterar o código da conta "${ctx.account.code}" para "${ctx.newCode}". ` +
        `Existem lançamentos postados vinculados. O código é imutável após escrituração. ` +
        `Crie uma nova conta com o código desejado.`
      );
    }

    // Validar formato do novo código (padrão brasileiro X.X.XX.XXX)
    const codePattern = /^\d{1,2}(\.\d{1,3}){1,5}$/;
    if (!codePattern.test(ctx.newCode.trim())) {
      return Result.fail(
        `Formato de código inválido: "${ctx.newCode}". ` +
        `Use o padrão brasileiro: X.X.XX.XXX (ex: 1.1.01.001)`
      );
    }

    return Result.ok(true);
  }

  /**
   * Regra 3: Bloquear lançamento em conta sintética
   * 
   * NBC TG 26: "Lançamentos contábeis devem ser feitos apenas em contas analíticas"
   * Contas sintéticas (grupo/totalizadora) não aceitam lançamentos diretos.
   */
  static validateAccountIsAnalytical(account: AccountInfo): Result<true, string> {
    if (!account.isAnalytical) {
      return Result.fail(
        `A conta "${account.code} - ${account.name}" é sintética (totalizadora). ` +
        `Lançamentos contábeis só são permitidos em contas analíticas. ` +
        `Selecione uma conta filha (analítica) desta conta.`
      );
    }

    if (account.status !== 'ACTIVE') {
      return Result.fail(
        `A conta "${account.code} - ${account.name}" está inativa (status: ${account.status}). ` +
        `Lançamentos só são permitidos em contas ativas.`
      );
    }

    return Result.ok(true);
  }

  /**
   * Regra 4: Validar partida dobrada (débito = crédito)
   * 
   * NBC TG 26 / CPC 26: "O método das partidas dobradas garante que todo débito
   * tenha um crédito correspondente de igual valor."
   * 
   * Tolerância: R$ 0.01 (arredondamento)
   */
  static validateDoubleEntry(lines: JournalLineInput[]): JournalValidationResult {
    const errors: string[] = [];

    if (lines.length < 2) {
      errors.push('Um lançamento contábil deve ter pelo menos 2 linhas (1 débito + 1 crédito).');
    }

    const debits = lines.filter(l => l.entryType === 'DEBIT');
    const credits = lines.filter(l => l.entryType === 'CREDIT');

    if (debits.length === 0) {
      errors.push('O lançamento deve ter pelo menos uma linha de débito.');
    }

    if (credits.length === 0) {
      errors.push('O lançamento deve ter pelo menos uma linha de crédito.');
    }

    const totalDebit = debits.reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = credits.reduce((sum, l) => sum + l.amount, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    if (difference > 0.01) {
      errors.push(
        `Partida dobrada desbalanceada. ` +
        `Total Débito: R$ ${totalDebit.toFixed(2)}, ` +
        `Total Crédito: R$ ${totalCredit.toFixed(2)}, ` +
        `Diferença: R$ ${difference.toFixed(2)}`
      );
    }

    // Validar valores positivos
    for (const line of lines) {
      if (line.amount <= 0) {
        errors.push(
          `Valor inválido na conta ${line.accountCode} (${line.entryType}): ` +
          `R$ ${line.amount.toFixed(2)}. Valores devem ser positivos.`
        );
      }
    }

    // Validar contas duplicadas (mesma conta não pode ser débito E crédito no mesmo lançamento)
    const debitAccounts = new Set(debits.map(l => l.accountId));
    const creditAccounts = new Set(credits.map(l => l.accountId));
    for (const accountId of debitAccounts) {
      if (creditAccounts.has(accountId)) {
        const line = lines.find(l => l.accountId === accountId);
        errors.push(
          `A conta ${line?.accountCode ?? accountId} aparece tanto no débito quanto no crédito. ` +
          `Uma conta não pode ser debitada e creditada no mesmo lançamento.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validação completa de um lançamento contábil
   * Combina todas as regras de integridade.
   */
  static validateJournalEntry(
    lines: JournalLineInput[],
    accounts: AccountInfo[]
  ): JournalValidationResult {
    const errors: string[] = [];

    // 1. Validar partida dobrada
    const doubleEntryResult = AccountIntegrityService.validateDoubleEntry(lines);
    errors.push(...doubleEntryResult.errors);

    // 2. Validar cada conta é analítica e ativa
    for (const line of lines) {
      const account = accounts.find(
        a => String(a.id) === line.accountId || a.code === line.accountCode
      );

      if (!account) {
        errors.push(
          `Conta não encontrada: ${line.accountCode} (ID: ${line.accountId}). ` +
          `Verifique se o plano de contas está correto.`
        );
        continue;
      }

      const analyticalResult = AccountIntegrityService.validateAccountIsAnalytical(account);
      if (Result.isFail(analyticalResult)) {
        errors.push(analyticalResult.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
