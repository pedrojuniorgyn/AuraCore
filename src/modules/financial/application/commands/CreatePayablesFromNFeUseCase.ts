/**
 * CreatePayablesFromNFeUseCase - Command DDD (F0.5.2)
 * 
 * Gera contas a pagar automaticamente a partir de uma NFe de compra importada.
 * Extrai parcelas de <cobr><dup> do XML e cria um AccountPayable por parcela.
 * 
 * Fluxo:
 * 1. Busca fiscal_documents (legacy) pelo ID
 * 2. Valida que é NFe de compra (documentType=NFE, fiscalClassification=PURCHASE)
 * 3. Valida que financialStatus=NO_TITLE (não gerar duplicado)
 * 4. Parse XML para extrair parcelas (cobr > dup)
 * 5. Para cada parcela: cria AccountPayable + PaymentTerms
 * 6. Salva todos os payables via IPayableRepository
 * 7. Atualiza financialStatus para GENERATED
 * 8. Publica domain events via outbox
 * 
 * @see PLANEJAMENTO_CONTAS_PAGAR_RECEBER.md
 */
import { injectable, inject } from 'tsyringe';
import { Result, Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { AccountPayable } from '../../domain/entities/AccountPayable';
import { PaymentTerms } from '../../domain/value-objects/PaymentTerms';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';
import type { ICreatePayablesFromNFe, CreatePayablesFromNFeInput, CreatePayablesFromNFeOutput } from '../../domain/ports/input/ICreatePayablesFromNFe';
import { NfeXmlParser } from '@/modules/fiscal/domain/services/NfeXmlParser';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { fiscalDocuments } from '@/modules/fiscal/infrastructure/persistence/FiscalDocumentSchema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class CreatePayablesFromNFeUseCase implements ICreatePayablesFromNFe {
  constructor(
    @inject(TOKENS.PayableRepository) private readonly payableRepository: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: CreatePayablesFromNFeInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreatePayablesFromNFeOutput, string>> {
    try {
      // 1. Buscar fiscal document (legacy schema)
      const rows = await db
        .select()
        .from(fiscalDocuments)
        .where(
          and(
            eq(fiscalDocuments.id, input.fiscalDocumentId),
            eq(fiscalDocuments.organizationId, context.organizationId),
            isNull(fiscalDocuments.deletedAt)
          )
        );

      const doc = rows[0];
      if (!doc) {
        return Result.fail('Documento fiscal não encontrado');
      }

      // 2. Validar tipo (NFe de compra)
      if (doc.documentType !== 'NFE') {
        return Result.fail(`Tipo de documento inválido: ${doc.documentType}. Esperado: NFE`);
      }

      if (doc.fiscalClassification !== 'PURCHASE') {
        return Result.fail(`Classificação fiscal inválida: ${doc.fiscalClassification}. Esperado: PURCHASE`);
      }

      // 3. Validar que não já gerou títulos
      if (doc.financialStatus !== 'NO_TITLE') {
        return Result.fail(`Títulos já gerados para este documento (status: ${doc.financialStatus})`);
      }

      // 4. Parse XML para extrair parcelas
      if (!doc.xmlContent) {
        return Result.fail('Documento fiscal não possui XML. Impossível extrair parcelas.');
      }

      const parseResult = await NfeXmlParser.parse(doc.xmlContent);
      if (Result.isFail(parseResult)) {
        return Result.fail(`Erro ao parsear XML: ${parseResult.error}`);
      }

      const parsedNfe = parseResult.value;

      // 5. Extrair parcelas (installments)
      const installments = parsedNfe.payment?.installments ?? [];
      
      if (installments.length === 0) {
        // Fallback: parcela única com valor total e vencimento = issueDate
        const totalAmount = Number(doc.netAmount);
        if (totalAmount <= 0) {
          return Result.fail('Documento sem valor líquido para gerar título');
        }

        installments.push({
          number: '001',
          dueDate: doc.dueDate ? new Date(doc.dueDate) : new Date(doc.issueDate),
          amount: totalAmount,
        });
      }

      // 6. Para cada parcela, criar AccountPayable
      const createdPayables: AccountPayable[] = [];
      const supplierId = doc.partnerId ?? 0;
      const supplierName = doc.partnerName ?? 'Fornecedor desconhecido';
      const documentNumber = doc.documentNumber;

      for (const installment of installments) {
        // Money
        const amountResult = Money.create(installment.amount, 'BRL');
        if (Result.isFail(amountResult)) {
          return Result.fail(`Valor inválido na parcela ${installment.number}: ${amountResult.error}`);
        }

        // PaymentTerms
        const termsResult = PaymentTerms.create({
          dueDate: installment.dueDate,
          amount: amountResult.value,
        });

        if (Result.isFail(termsResult)) {
          return Result.fail(`Erro nas condições de pagamento (parcela ${installment.number}): ${termsResult.error}`);
        }

        // AccountPayable
        const payableId = this.uuidGenerator.generate();
        const suffix = installments.length > 1 ? `/${installment.number}` : '';
        const payableResult = AccountPayable.create({
          id: payableId,
          organizationId: context.organizationId,
          branchId: context.branchId,
          supplierId,
          documentNumber: `NFe ${documentNumber}${suffix}`,
          description: `NFe ${documentNumber} - ${supplierName} (Parcela ${installment.number}/${String(installments.length).padStart(3, '0')})`,
          terms: termsResult.value,
          notes: `Gerado automaticamente da NFe ${doc.accessKey ?? documentNumber}`,
        });

        if (Result.isFail(payableResult)) {
          return Result.fail(`Erro ao criar payable (parcela ${installment.number}): ${payableResult.error}`);
        }

        createdPayables.push(payableResult.value);
      }

      // 7. Salvar todos os payables
      for (const payable of createdPayables) {
        await this.payableRepository.save(payable);
      }

      // 8. Atualizar financialStatus do documento fiscal
      await db
        .update(fiscalDocuments)
        .set({
          financialStatus: 'GENERATED',
          updatedAt: new Date(),
          updatedBy: context.userId,
        })
        .where(eq(fiscalDocuments.id, input.fiscalDocumentId));

      // 9. Publicar domain events via outbox
      const allEvents = createdPayables.flatMap(p => p.clearDomainEvents());
      if (allEvents.length > 0) {
        try {
          await saveToOutbox(allEvents, db);
        } catch (outboxError: unknown) {
          logger.warn(`Outbox save failed for NFe payables, falling back to direct publish`);
          for (const evt of allEvents) {
            await this.eventPublisher.publish(evt);
          }
        }
      }

      const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);

      logger.info(
        `[CreatePayablesFromNFe] ${createdPayables.length} payable(s) criados para NFe ${documentNumber} ` +
        `(fornecedor: ${supplierName}, total: R$ ${totalAmount.toFixed(2)})`
      );

      return Result.ok({
        payableIds: createdPayables.map(p => p.id),
        installmentCount: createdPayables.length,
        totalAmount,
        supplierName,
        documentNumber,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[CreatePayablesFromNFe] Erro: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao gerar payables da NFe: ${errorMessage}`);
    }
  }
}
