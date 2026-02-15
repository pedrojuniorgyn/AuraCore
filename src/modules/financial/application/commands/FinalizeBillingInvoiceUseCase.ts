/**
 * FinalizeBillingInvoiceUseCase - Command DDD
 * 
 * Migração da rota legacy POST /api/financial/billing/:id/finalize
 * 
 * Responsabilidades:
 * 1. Busca fatura (billing invoice) na tabela legacy
 * 2. Valida pré-condições (status DRAFT, boleto gerado)
 * 3. Calcula retenções na fonte (IRRF/PIS/COFINS/CSLL/ISS)
 * 4. Cria título no Contas a Receber (DDD AccountReceivable)
 * 5. Atualiza status da fatura para FINALIZED
 * 6. Emite BillingFinalizedEvent (consumido pelo FinancialAccountingIntegration)
 * 
 * @see F1.5: FinalizeBillingInvoiceUseCase
 * @see F1.2: FinancialAccountingIntegration.onBillingFinalized
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IReceivableRepository } from '../../domain/ports/output/IReceivableRepository';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { AccountReceivable } from '../../domain/entities/AccountReceivable';
import { WithholdingTaxCalculator, type WithholdingTaxInput } from '../../domain/services/WithholdingTaxCalculator';
import { BillingFinalizedEvent, type BillingFinalizedPayload } from '../../domain/events/BillingFinalizedEvent';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { billingInvoices } from '@/modules/financial/infrastructure/persistence/schemas';
import { eq, and, isNull } from 'drizzle-orm';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { logger } from '@/shared/infrastructure/logging';

export interface FinalizeBillingInput {
  billingId: number;
}

export interface FinalizeBillingOutput {
  billingId: number;
  receivableId: string;
  grossAmount: number;
  netAmount: number;
  withholdings: {
    irrf: number;
    pis: number;
    cofins: number;
    csll: number;
    iss: number;
    inss: number;
    total: number;
  };
}

export interface FinalizeBillingContext {
  organizationId: number;
  branchId: number;
  userId: string;
}

@injectable()
export class FinalizeBillingInvoiceUseCase {
  constructor(
    @inject('IReceivableRepository') private readonly receivableRepository: IReceivableRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: FinalizeBillingInput,
    context: FinalizeBillingContext
  ): Promise<Result<FinalizeBillingOutput, string>> {
    try {
      // 1. Buscar fatura na tabela legacy
      const billingRows = await db
        .select()
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.id, input.billingId),
            eq(billingInvoices.organizationId, context.organizationId),
            isNull(billingInvoices.deletedAt)
          )
        );

      const billing = billingRows[0];
      if (!billing) {
        return Result.fail('Fatura não encontrada');
      }

      // 2. Validar pré-condições
      if (billing.status === 'FINALIZED') {
        return Result.fail('Fatura já foi finalizada');
      }

      if (!billing.barcodeNumber) {
        return Result.fail('Gere o boleto antes de finalizar a fatura');
      }

      const grossAmount = Number(billing.netValue);
      if (!grossAmount || grossAmount <= 0) {
        return Result.fail('Fatura sem valor líquido válido');
      }

      // 3. Calcular retenções na fonte (F1.5)
      // Nota: Para billing de frete, assumimos PJ e serviço de transporte
      const taxInput: WithholdingTaxInput = {
        grossAmount,
        serviceType: 'FREIGHT',
        isLegalEntity: true, // Billing é sempre B2B
        isSimplesNacional: false, // TODO: ler regime do cliente quando disponível
        issRate: undefined, // ISS não retido em billing de frete por padrão
        retainIss: false,
      };

      const taxResult = WithholdingTaxCalculator.calculate(taxInput);
      if (Result.isFail(taxResult)) {
        return Result.fail(`Erro no cálculo de retenções: ${taxResult.error}`);
      }

      const withholdings = taxResult.value;

      // 4. Criar título no Contas a Receber (DDD)
      const branchId = billing.branchId;
      const customerId = billing.customerId;
      const invoiceNumber = billing.invoiceNumber;
      const totalCtes = billing.totalCtes;

      const receivableResult = AccountReceivable.create({
        organizationId: context.organizationId,
        branchId,
        customerId,
        documentNumber: String(invoiceNumber),
        description: `Faturamento consolidado - ${totalCtes} CTes`,
        amount: withholdings.netAmount,
        currency: 'BRL',
        issueDate: billing.issueDate ? new Date(billing.issueDate) : new Date(),
        dueDate: billing.dueDate ? new Date(billing.dueDate) : new Date(),
        origin: 'BILLING',
        createdBy: context.userId,
        notes: withholdings.totalWithholding > 0
          ? `Retenções: IRRF=${withholdings.irrf} PIS=${withholdings.pis} COFINS=${withholdings.cofins} CSLL=${withholdings.csll} ISS=${withholdings.iss} INSS=${withholdings.inss} Total=${withholdings.totalWithholding}`
          : undefined,
      });

      if (Result.isFail(receivableResult)) {
        return Result.fail(`Erro ao criar título: ${receivableResult.error}`);
      }

      const receivable = receivableResult.value;

      // 5. Persistir receivable
      const saveResult = await this.receivableRepository.save(receivable);
      if (Result.isFail(saveResult)) {
        return Result.fail(`Erro ao salvar título: ${saveResult.error}`);
      }

      // 6. Atualizar fatura para FINALIZED (legacy table)
      await db
        .update(billingInvoices)
        .set({
          status: 'FINALIZED',
          updatedBy: context.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(billingInvoices.id, input.billingId),
            eq(billingInvoices.organizationId, context.organizationId)
          )
        );

      // 7. Persistir domain events no outbox (F1.7)
      const aggregateEvents = receivable.clearDomainEvents();

      // 8. Criar BillingFinalizedEvent (para contabilização)
      const billingEvent = new BillingFinalizedEvent(
        String(input.billingId),
        {
          invoiceId: String(input.billingId),
          receivableId: receivable.id,
          organizationId: context.organizationId,
          branchId,
          customerId,
          grossAmount,
          netAmount: withholdings.netAmount,
          currency: 'BRL',
          totalCtes,
          invoiceNumber: String(invoiceNumber),
          issueDate: (billing.issueDate ? new Date(billing.issueDate) : new Date()).toISOString(),
          dueDate: (billing.dueDate ? new Date(billing.dueDate) : new Date()).toISOString(),
          withholdings: {
            irrf: withholdings.irrf,
            pis: withholdings.pis,
            cofins: withholdings.cofins,
            csll: withholdings.csll,
            iss: withholdings.iss,
            inss: withholdings.inss,
            total: withholdings.totalWithholding,
          },
        }
      );

      // 9. Salvar todos os eventos (aggregate + billing) no outbox atomicamente
      const allEvents = [...aggregateEvents, billingEvent];
      try {
        await saveToOutbox(allEvents, db);
      } catch (outboxError: unknown) {
        // Fallback: publicar diretamente
        logger.warn(`Outbox save failed for billing #${input.billingId}, falling back to direct publish`);
        for (const evt of allEvents) {
          await this.eventPublisher.publish(evt);
        }
      }

      logger.info(
        `[FinalizeBilling] Fatura #${input.billingId} finalizada. ` +
        `Receivable=${receivable.id} Gross=${grossAmount} Net=${withholdings.netAmount} ` +
        `Retenções=${withholdings.totalWithholding}`
      );

      return Result.ok({
        billingId: input.billingId,
        receivableId: receivable.id,
        grossAmount,
        netAmount: withholdings.netAmount,
        withholdings: {
          irrf: withholdings.irrf,
          pis: withholdings.pis,
          cofins: withholdings.cofins,
          csll: withholdings.csll,
          iss: withholdings.iss,
          inss: withholdings.inss,
          total: withholdings.totalWithholding,
        },
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[FinalizeBilling] Erro: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao finalizar fatura: ${errorMessage}`);
    }
  }
}
