import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { FiscalDocument } from '../../domain/entities/FiscalDocument';
import type { IJournalEntryRepository } from '@/modules/accounting/domain/ports/output/IJournalEntryRepository';
import type { IAccountDeterminationRepository } from '@/modules/accounting/domain/ports/output/IAccountDeterminationRepository';
import { AccountDeterminationService } from '@/modules/accounting/domain/services/AccountDeterminationService';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { OPERATION_TYPES, type OperationTypeValue } from '@/modules/accounting/domain/value-objects/OperationType';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { logger } from '@/shared/infrastructure/logging';

/**
 * FiscalAccountingIntegration
 * 
 * Serviço de integração entre Fiscal e Accounting (E7.3).
 * Responsável por gerar lançamentos contábeis automáticos quando documentos fiscais são autorizados.
 * 
 * REFATORADO (F1.3): IDs hardcoded substituídos por AccountDeterminationService
 * Typo corrigido: isAuthrized → isAuthorized
 * 
 * Regras de Contabilização:
 * 
 * **NFE de Entrada (Compra):**
 * D - Estoque/Ativo (determinado por PURCHASE_NFE)
 * C - Fornecedores (determinado por PURCHASE_NFE)
 * 
 * **NFE de Saída (Venda):**
 * D - Clientes (determinado por SALE_NFE)
 * C - Receita de Vendas (determinado por SALE_NFE)
 * 
 * **CTE (Frete):**
 * D - Despesa com Frete (determinado por CTE_FREIGHT)
 * C - Fornecedores (determinado por CTE_FREIGHT)
 * 
 * Ref: E7.3 (Accounting Module), E7.4 Week 5, F1.3
 */
@injectable()
export class FiscalAccountingIntegration {
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly journalEntryRepository: IJournalEntryRepository,
    @inject(TOKENS.AccountDeterminationRepository)
    private readonly accountDeterminationRepo: IAccountDeterminationRepository
  ) {}

  /**
   * Gera lançamento contábil para documento fiscal autorizado
   * 
   * @param document Documento fiscal autorizado
   * @param context Contexto de execução (user, org, branch)
   * @returns Result com ID do lançamento criado
   */
  async generateJournalEntryForAuthorizedDocument(
    document: FiscalDocument,
    context: {
      userId: string;
      organizationId: number;
      branchId: number;
    }
  ): Promise<Result<string, string>> {
    try {
      // Validar que documento está autorizado (F1.3: typo corrigido)
      if (!document.isAuthorized) {
        return Result.fail('Documento não está autorizado. Não é possível gerar lançamento contábil.');
      }

      // Buscar regras de determinação contábil para esta org/branch
      const rules = await this.accountDeterminationRepo.findAll(
        context.organizationId,
        context.branchId
      );

      // Determinar tipo de operação baseado no documento
      const cfopCode = document.items[0]?.cfop.code || '0000';
      const isInbound = cfopCode.startsWith('1') || cfopCode.startsWith('2');
      const isOutbound = cfopCode.startsWith('5') || cfopCode.startsWith('6');

      let operationType: OperationTypeValue;
      if (document.documentType === 'NFE' && isInbound) {
        operationType = OPERATION_TYPES.PURCHASE_NFE;
      } else if (document.documentType === 'NFE' && isOutbound) {
        operationType = OPERATION_TYPES.SALE_NFE;
      } else if (document.documentType === 'CTE') {
        operationType = OPERATION_TYPES.CTE_FREIGHT;
      } else {
        operationType = OPERATION_TYPES.GENERIC_FISCAL;
      }

      // Determinar contas via AccountDeterminationService
      const accountsResult = AccountDeterminationService.determineAccounts(rules, operationType);

      if (Result.isFail(accountsResult)) {
        logger.warn(`[FiscalAccounting] ${accountsResult.error} — usando fallback para ${document.documentType} ${document.number}`);
        // Fallback: contas genéricas com warning
        return this.createEntryWithFallbackAccounts(document, context, operationType);
      }

      const accounts = accountsResult.value;

      // Gerar número do lançamento
      const entryNumber = await this.journalEntryRepository.nextEntryNumber(
        context.organizationId,
        context.branchId
      );

      // Criar lançamento
      const journalEntryId = globalThis.crypto.randomUUID();
      const journalEntryResult = JournalEntry.create({
        id: journalEntryId,
        organizationId: context.organizationId,
        branchId: context.branchId,
        entryNumber,
        entryDate: document.issueDate,
        description: `${document.documentType} ${document.number} - ${document.issuerName}`,
        source: 'FISCAL_DOC',
        sourceId: document.id,
      });

      if (Result.isFail(journalEntryResult)) {
        return Result.fail(String(journalEntryResult.error));
      }

      const journalEntry = journalEntryResult.value;
      const totalValue = document.totalDocument;

      // D - Conta de débito (determinada)
      const debitLine = JournalEntryLine.create({
        id: globalThis.crypto.randomUUID(),
        journalEntryId: journalEntry.id,
        accountId: accounts.debitAccountId,
        accountCode: accounts.debitAccountCode,
        entryType: 'DEBIT',
        amount: totalValue,
        description: `${accounts.description} - Débito`
      });

      if (Result.isFail(debitLine)) {
        return Result.fail(String(debitLine.error));
      }

      // C - Conta de crédito (determinada)
      const creditLine = JournalEntryLine.create({
        id: globalThis.crypto.randomUUID(),
        journalEntryId: journalEntry.id,
        accountId: accounts.creditAccountId,
        accountCode: accounts.creditAccountCode,
        entryType: 'CREDIT',
        amount: totalValue,
        description: `${accounts.description} - Crédito`
      });

      if (Result.isFail(creditLine)) {
        return Result.fail(String(creditLine.error));
      }

      // Adicionar linhas ao lançamento
      const addDebit = journalEntry.addLine(debitLine.value);
      const addCredit = journalEntry.addLine(creditLine.value);

      if (Result.isFail(addDebit) || Result.isFail(addCredit)) {
        return Result.fail(String(addDebit.error || addCredit.error));
      }

      // Salvar lançamento
      await this.journalEntryRepository.save(journalEntry);

      logger.info(
        `[FiscalAccounting] Lançamento gerado: ${entryNumber} (${operationType}) — D:${accounts.debitAccountCode} / C:${accounts.creditAccountCode} = ${totalValue.amount}`
      );

      return Result.ok(journalEntry.id);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar lançamento contábil: ${errorMessage}`);
    }
  }

  /**
   * Fallback: cria lançamento com contas genéricas quando não há regra de determinação.
   * Log de warning para alertar o usuário a configurar as contas.
   */
  private async createEntryWithFallbackAccounts(
    document: FiscalDocument,
    context: { userId: string; organizationId: number; branchId: number },
    operationType: OperationTypeValue
  ): Promise<Result<string, string>> {
    logger.warn(
      `[FiscalAccounting] FALLBACK: Usando contas genéricas para ${operationType}. ` +
      `Configure Contabilidade > Determinação de Contas para org=${context.organizationId} branch=${context.branchId}.`
    );

    const entryNumber = await this.journalEntryRepository.nextEntryNumber(
      context.organizationId,
      context.branchId
    );

    const journalEntryId = globalThis.crypto.randomUUID();
    const journalEntryResult = JournalEntry.create({
      id: journalEntryId,
      organizationId: context.organizationId,
      branchId: context.branchId,
      entryNumber,
      entryDate: document.issueDate,
      description: `[SEM DETERMINAÇÃO] ${document.documentType} ${document.number} - ${document.issuerName}`,
      source: 'FISCAL_DOC',
      sourceId: document.id,
      notes: `ATENÇÃO: Lançamento gerado sem regra de determinação contábil para ${operationType}. Revisar e corrigir manualmente.`,
    });

    if (Result.isFail(journalEntryResult)) {
      return Result.fail(String(journalEntryResult.error));
    }

    const journalEntry = journalEntryResult.value;
    const totalValue = document.totalDocument;
    const fallbackDebitId = globalThis.crypto.randomUUID();
    const fallbackCreditId = globalThis.crypto.randomUUID();

    const debitLine = JournalEntryLine.create({
      id: globalThis.crypto.randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: fallbackDebitId,
      accountCode: '9.9.99.001',
      entryType: 'DEBIT',
      amount: totalValue,
      description: `[FALLBACK] ${document.documentType} - Débito - CONFIGURAR CONTA`
    });

    const creditLine = JournalEntryLine.create({
      id: globalThis.crypto.randomUUID(),
      journalEntryId: journalEntry.id,
      accountId: fallbackCreditId,
      accountCode: '9.9.99.002',
      entryType: 'CREDIT',
      amount: totalValue,
      description: `[FALLBACK] ${document.documentType} - Crédito - CONFIGURAR CONTA`
    });

    if (Result.isFail(debitLine) || Result.isFail(creditLine)) {
      return Result.fail(`Erro ao criar linhas fallback: ${debitLine.error ?? creditLine.error}`);
    }

    journalEntry.addLine(debitLine.value);
    journalEntry.addLine(creditLine.value);

    await this.journalEntryRepository.save(journalEntry);

    return Result.ok(journalEntry.id);
  }
}
