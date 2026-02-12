import { injectable, inject } from '@/shared/infrastructure/di/container';
import { Result, Money } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { DomainEvent } from '@/shared/domain/events/DomainEvent';
import type { IJournalEntryRepository } from '@/modules/accounting/domain/ports/output/IJournalEntryRepository';
import type { IAccountDeterminationRepository } from '@/modules/accounting/domain/ports/output/IAccountDeterminationRepository';
import { AccountDeterminationService } from '@/modules/accounting/domain/services/AccountDeterminationService';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { OPERATION_TYPES, type OperationTypeValue } from '@/modules/accounting/domain/value-objects/OperationType';
import { logger } from '@/shared/infrastructure/logging';

/**
 * FinancialAccountingIntegration
 * 
 * Service de integração que gera lançamentos contábeis automáticos para
 * TODAS as operações financeiras. Equivalente ao FI Document do SAP ou
 * CT2 do TOTVS Protheus.
 * 
 * Princípio: "Nenhum centavo se move sem rastro contábil"
 * 
 * Handlers:
 * - onPaymentCompleted → D: Fornecedores / C: Banco
 * - onReceivableReceived → D: Banco / C: Clientes
 * - onBillingFinalized → D: Clientes / C: Receita Transporte
 * - onPayableCancelled → Estorno do lançamento original
 * 
 * @see F1.2: FinancialAccountingIntegration
 */

interface PaymentCompletedPayload {
  payableId: string;
  paymentId: string;
  organizationId: number;
  branchId: number;
  supplierId: number;
  amount: number;
  currency: string;
  bankAccountId?: number;
  paidAt: string;
  interest?: number;
  fine?: number;
  discount?: number;
  bankFee?: number;
}

interface ReceivableReceivedPayload {
  receivableId: string;
  organizationId: number;
  branchId: number;
  customerId: number;
  amountReceived: number;
  currency: string;
  bankAccountId: number;
  receivedAt: string;
  receivedBy: string;
  interest?: number;
  fine?: number;
  discount?: number;
}

interface BillingFinalizedPayload {
  invoiceId: string;
  receivableId: string;
  organizationId: number;
  branchId: number;
  customerId: number;
  grossAmount: number;
  netAmount: number;
  currency: string;
  withholdingIrrf?: number;
  withholdingPis?: number;
  withholdingCofins?: number;
  withholdingCsll?: number;
  withholdingIss?: number;
  finalizedAt: string;
}

interface PayableCancelledPayload {
  payableId: string;
  organizationId: number;
  branchId: number;
  cancelledAt: string;
  cancelledBy: string;
}

@injectable()
export class FinancialAccountingIntegration {
  constructor(
    @inject(TOKENS.JournalEntryRepository)
    private readonly journalEntryRepo: IJournalEntryRepository,
    @inject(TOKENS.AccountDeterminationRepository)
    private readonly accountDeterminationRepo: IAccountDeterminationRepository,
  ) {}

  /**
   * Handler: Pagamento completado → Lançamento contábil
   * D: Fornecedores (2.1.01) / C: Banco (1.1.04)
   */
  async onPaymentCompleted(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as PaymentCompletedPayload;
    const { organizationId, branchId } = payload;

    logger.info(`[FinancialAccounting] onPaymentCompleted: payable=${payload.payableId}, amount=${payload.amount}`);

    try {
      // 1. Buscar regras de determinação
      const rules = await this.accountDeterminationRepo.findAll(organizationId, branchId);

      // 2. Lançamento principal: Pagamento fornecedor
      await this.createJournalEntry({
        organizationId,
        branchId,
        source: 'PAYMENT',
        sourceId: payload.paymentId,
        description: `Pagamento Fornecedor - Título ${payload.payableId}`,
        operationType: OPERATION_TYPES.PAYMENT_SUPPLIER,
        amount: payload.amount,
        currency: payload.currency,
        rules,
        businessPartnerId: payload.supplierId,
      });

      // 3. Lançamentos complementares (juros, multa, desconto, tarifa)
      if (payload.interest && payload.interest > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'PAYMENT', sourceId: payload.paymentId,
          description: `Juros Pagos - Título ${payload.payableId}`,
          operationType: OPERATION_TYPES.INTEREST_EXPENSE,
          amount: payload.interest, currency: payload.currency,
          rules,
        });
      }

      if (payload.fine && payload.fine > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'PAYMENT', sourceId: payload.paymentId,
          description: `Multa Paga - Título ${payload.payableId}`,
          operationType: OPERATION_TYPES.FINE_EXPENSE,
          amount: payload.fine, currency: payload.currency,
          rules,
        });
      }

      if (payload.discount && payload.discount > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'PAYMENT', sourceId: payload.paymentId,
          description: `Desconto Obtido - Título ${payload.payableId}`,
          operationType: OPERATION_TYPES.DISCOUNT_RECEIVED,
          amount: payload.discount, currency: payload.currency,
          rules,
        });
      }

      if (payload.bankFee && payload.bankFee > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'PAYMENT', sourceId: payload.paymentId,
          description: `Tarifa Bancária - Título ${payload.payableId}`,
          operationType: OPERATION_TYPES.BANK_FEE,
          amount: payload.bankFee, currency: payload.currency,
          rules,
        });
      }

    } catch (error: unknown) {
      logger.error(
        `[FinancialAccounting] Erro ao gerar lançamento para pagamento ${payload.payableId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handler: Recebimento registrado → Lançamento contábil
   * D: Banco (1.1.04) / C: Clientes (1.1.02)
   */
  async onReceivableReceived(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as ReceivableReceivedPayload;
    const { organizationId, branchId } = payload;

    logger.info(`[FinancialAccounting] onReceivableReceived: receivable=${payload.receivableId}, amount=${payload.amountReceived}`);

    try {
      const rules = await this.accountDeterminationRepo.findAll(organizationId, branchId);

      // Lançamento principal: Recebimento de cliente
      await this.createJournalEntry({
        organizationId, branchId,
        source: 'RECEIPT', sourceId: payload.receivableId,
        description: `Recebimento Cliente - Título ${payload.receivableId}`,
        operationType: OPERATION_TYPES.RECEIPT_CUSTOMER,
        amount: payload.amountReceived, currency: payload.currency,
        rules,
        businessPartnerId: payload.customerId,
      });

      // Juros recebidos
      if (payload.interest && payload.interest > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'RECEIPT', sourceId: payload.receivableId,
          description: `Juros Recebidos - Título ${payload.receivableId}`,
          operationType: OPERATION_TYPES.INTEREST_INCOME,
          amount: payload.interest, currency: payload.currency,
          rules,
        });
      }

      // Multa recebida
      if (payload.fine && payload.fine > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'RECEIPT', sourceId: payload.receivableId,
          description: `Multa Recebida - Título ${payload.receivableId}`,
          operationType: OPERATION_TYPES.FINE_INCOME,
          amount: payload.fine, currency: payload.currency,
          rules,
        });
      }

      // Desconto concedido
      if (payload.discount && payload.discount > 0) {
        await this.createJournalEntry({
          organizationId, branchId,
          source: 'RECEIPT', sourceId: payload.receivableId,
          description: `Desconto Concedido - Título ${payload.receivableId}`,
          operationType: OPERATION_TYPES.DISCOUNT_GIVEN,
          amount: payload.discount, currency: payload.currency,
          rules,
        });
      }

    } catch (error: unknown) {
      logger.error(
        `[FinancialAccounting] Erro ao gerar lançamento para recebimento ${payload.receivableId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handler: Faturamento finalizado → Lançamento contábil
   * D: Clientes (1.1.02) / C: Receita Transporte (3.1.01)
   * + lançamentos de retenção
   */
  async onBillingFinalized(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as BillingFinalizedPayload;
    const { organizationId, branchId } = payload;

    logger.info(`[FinancialAccounting] onBillingFinalized: invoice=${payload.invoiceId}, gross=${payload.grossAmount}`);

    try {
      const rules = await this.accountDeterminationRepo.findAll(organizationId, branchId);

      // Lançamento principal: Receita de faturamento (valor bruto)
      await this.createJournalEntry({
        organizationId, branchId,
        source: 'RECEIPT', sourceId: payload.invoiceId,
        description: `Faturamento - Invoice ${payload.invoiceId}`,
        operationType: OPERATION_TYPES.BILLING_REVENUE,
        amount: payload.grossAmount, currency: payload.currency,
        rules,
        businessPartnerId: payload.customerId,
      });

      // Lançamentos de retenção
      const withholdings: Array<{ amount: number | undefined; type: OperationTypeValue; label: string }> = [
        { amount: payload.withholdingIrrf, type: OPERATION_TYPES.BILLING_IRRF, label: 'IRRF' },
        { amount: payload.withholdingPis, type: OPERATION_TYPES.BILLING_PIS, label: 'PIS' },
        { amount: payload.withholdingCofins, type: OPERATION_TYPES.BILLING_COFINS, label: 'COFINS' },
        { amount: payload.withholdingCsll, type: OPERATION_TYPES.BILLING_CSLL, label: 'CSLL' },
        { amount: payload.withholdingIss, type: OPERATION_TYPES.BILLING_ISS, label: 'ISS' },
      ];

      for (const wh of withholdings) {
        if (wh.amount && wh.amount > 0) {
          await this.createJournalEntry({
            organizationId, branchId,
            source: 'RECEIPT', sourceId: payload.invoiceId,
            description: `Retenção ${wh.label} - Invoice ${payload.invoiceId}`,
            operationType: wh.type,
            amount: wh.amount, currency: payload.currency,
            rules,
          });
        }
      }

    } catch (error: unknown) {
      logger.error(
        `[FinancialAccounting] Erro ao gerar lançamento para faturamento ${payload.invoiceId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Handler: Título cancelado → Estorno contábil
   */
  async onPayableCancelled(event: DomainEvent): Promise<void> {
    const payload = event.payload as unknown as PayableCancelledPayload;
    const { organizationId, branchId } = payload;

    logger.info(`[FinancialAccounting] onPayableCancelled: payable=${payload.payableId}`);

    try {
      // Buscar lançamento original
      const original = await this.journalEntryRepo.findBySourceId(
        payload.payableId,
        organizationId,
        branchId
      );

      if (!original) {
        logger.info(`[FinancialAccounting] Nenhum lançamento contábil encontrado para payable ${payload.payableId} — nada a estornar`);
        return;
      }

      if (original.status !== 'POSTED') {
        logger.warn(`[FinancialAccounting] Lançamento ${original.id} não está POSTED (status=${original.status}) — ignorando estorno`);
        return;
      }

      // Gerar próximo número de lançamento
      const entryNumber = await this.journalEntryRepo.nextEntryNumber(organizationId, branchId);

      // Criar lançamento de estorno
      const reversalResult = JournalEntry.createReversal(original, {
        id: globalThis.crypto.randomUUID(),
        entryNumber,
        description: `Estorno por cancelamento - Título ${payload.payableId}`,
      });

      if (Result.isFail(reversalResult)) {
        logger.error(`[FinancialAccounting] Erro ao criar estorno: ${reversalResult.error}`);
        return;
      }

      const reversal = reversalResult.value;

      // Postar automaticamente
      const postResult = reversal.post(payload.cancelledBy);
      if (Result.isFail(postResult)) {
        logger.error(`[FinancialAccounting] Erro ao postar estorno: ${postResult.error}`);
        return;
      }

      // Marcar original como estornado
      const markResult = original.markAsReversed(reversal.id);
      if (Result.isFail(markResult)) {
        logger.error(`[FinancialAccounting] Erro ao marcar original como estornado: ${markResult.error}`);
        return;
      }

      // Salvar ambos
      await this.journalEntryRepo.saveMany([original, reversal]);

      logger.info(`[FinancialAccounting] Estorno gerado: ${reversal.id} (estorna ${original.id})`);

    } catch (error: unknown) {
      logger.error(
        `[FinancialAccounting] Erro ao estornar lançamento para payable ${payload.payableId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============ PRIVATE HELPERS ============

  private async createJournalEntry(params: {
    organizationId: number;
    branchId: number;
    source: 'PAYMENT' | 'RECEIPT' | 'FISCAL_DOC';
    sourceId: string;
    description: string;
    operationType: OperationTypeValue;
    amount: number;
    currency: string;
    rules: Awaited<ReturnType<IAccountDeterminationRepository['findAll']>>;
    businessPartnerId?: number;
    costCenterId?: number;
  }): Promise<void> {
    // 1. Determinar contas
    const accountsResult = AccountDeterminationService.determineAccounts(
      params.rules,
      params.operationType
    );

    if (Result.isFail(accountsResult)) {
      logger.warn(`[FinancialAccounting] ${accountsResult.error} — lançamento não gerado para ${params.description}`);
      return;
    }

    const accounts = accountsResult.value;

    // 2. Gerar entry number
    const entryNumber = await this.journalEntryRepo.nextEntryNumber(
      params.organizationId,
      params.branchId
    );

    // 3. Criar Journal Entry
    const entryId = globalThis.crypto.randomUUID();
    const entryResult = JournalEntry.create({
      id: entryId,
      organizationId: params.organizationId,
      branchId: params.branchId,
      entryNumber,
      entryDate: new Date(),
      description: params.description,
      source: params.source,
      sourceId: params.sourceId,
    });

    if (Result.isFail(entryResult)) {
      logger.error(`[FinancialAccounting] Erro ao criar JournalEntry: ${entryResult.error}`);
      return;
    }

    const entry = entryResult.value;

    // 4. Criar Money
    const moneyResult = Money.create(params.amount, params.currency);
    if (Result.isFail(moneyResult)) {
      logger.error(`[FinancialAccounting] Valor inválido: ${moneyResult.error}`);
      return;
    }

    // 5. Adicionar linha de débito
    const debitLineResult = JournalEntryLine.create({
      id: globalThis.crypto.randomUUID(),
      journalEntryId: entryId,
      accountId: accounts.debitAccountId,
      accountCode: accounts.debitAccountCode,
      entryType: 'DEBIT',
      amount: moneyResult.value,
      description: params.description,
      businessPartnerId: params.businessPartnerId,
      costCenterId: params.costCenterId,
    });

    if (Result.isFail(debitLineResult)) {
      logger.error(`[FinancialAccounting] Erro na linha débito: ${debitLineResult.error}`);
      return;
    }

    const addDebitResult = entry.addLine(debitLineResult.value);
    if (Result.isFail(addDebitResult)) {
      logger.error(`[FinancialAccounting] Erro ao adicionar débito: ${addDebitResult.error}`);
      return;
    }

    // 6. Adicionar linha de crédito
    const creditLineResult = JournalEntryLine.create({
      id: globalThis.crypto.randomUUID(),
      journalEntryId: entryId,
      accountId: accounts.creditAccountId,
      accountCode: accounts.creditAccountCode,
      entryType: 'CREDIT',
      amount: moneyResult.value,
      description: params.description,
      businessPartnerId: params.businessPartnerId,
      costCenterId: params.costCenterId,
    });

    if (Result.isFail(creditLineResult)) {
      logger.error(`[FinancialAccounting] Erro na linha crédito: ${creditLineResult.error}`);
      return;
    }

    const addCreditResult = entry.addLine(creditLineResult.value);
    if (Result.isFail(addCreditResult)) {
      logger.error(`[FinancialAccounting] Erro ao adicionar crédito: ${addCreditResult.error}`);
      return;
    }

    // 7. Postar automaticamente (lançamentos automáticos são postados imediatamente)
    const postResult = entry.post('SYSTEM');
    if (Result.isFail(postResult)) {
      logger.error(`[FinancialAccounting] Erro ao postar: ${postResult.error}`);
      return;
    }

    // 8. Salvar
    await this.journalEntryRepo.save(entry);

    logger.info(`[FinancialAccounting] Lançamento gerado: ${entryNumber} (${params.operationType}) — D:${accounts.debitAccountCode} / C:${accounts.creditAccountCode} = ${params.amount}`);
  }
}
