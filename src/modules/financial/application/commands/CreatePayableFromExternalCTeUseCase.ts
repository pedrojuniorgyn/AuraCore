/**
 * CreatePayableFromExternalCTeUseCase - Command DDD (F0.5.3)
 * 
 * Gera conta a pagar automaticamente a partir de um CTe externo (redespacho).
 * Quando CTe com cte_origin=EXTERNAL é importado, cria AccountPayable
 * com o valor do frete (totalValue).
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
import type {
  ICreatePayableFromExternalCTe,
  CreatePayableFromExternalCTeInput,
  CreatePayableFromExternalCTeOutput,
} from '../../domain/ports/input/ICreatePayableFromExternalCTe';
import { saveToOutbox } from '@/shared/infrastructure/events/outbox/saveToOutbox';
import { db } from '@/lib/db';
import { cteHeader } from '@/modules/fiscal/infrastructure/persistence/schemas';
import { businessPartners } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '@/shared/infrastructure/logging';

@injectable()
export class CreatePayableFromExternalCTeUseCase implements ICreatePayableFromExternalCTe {
  constructor(
    @inject(TOKENS.PayableRepository) private readonly payableRepository: IPayableRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    input: CreatePayableFromExternalCTeInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<CreatePayableFromExternalCTeOutput, string>> {
    try {
      // 1. Buscar CTe
      const cteRows = await db
        .select()
        .from(cteHeader)
        .where(
          and(
            eq(cteHeader.id, Number(input.cteId)),
            eq(cteHeader.organizationId, context.organizationId),
            isNull(cteHeader.deletedAt)
          )
        );

      const cte = cteRows[0];
      if (!cte) {
        return Result.fail('CTe não encontrado');
      }

      // 2. Validar que é CTe externo
      if (cte.cteOrigin !== 'EXTERNAL') {
        return Result.fail(`CTe não é externo (origin: ${cte.cteOrigin}). Apenas CTes externos geram payable automaticamente.`);
      }

      // 3. Obter dados do tomador (transportadora que emitiu)
      let carrierName = 'Transportadora desconhecida';
      if (cte.takerId) {
        const partnerRows = await db
          .select({ name: businessPartners.name })
          .from(businessPartners)
          .where(eq(businessPartners.id, cte.takerId));

        if (partnerRows[0]?.name) {
          carrierName = partnerRows[0].name;
        }
      }

      // 4. Calcular valor do frete
      const freightAmount = Number(cte.totalValue);
      if (freightAmount <= 0) {
        return Result.fail('CTe sem valor total. Impossível gerar payable.');
      }

      // 5. Criar Money e PaymentTerms
      const amountResult = Money.create(freightAmount, 'BRL');
      if (Result.isFail(amountResult)) {
        return Result.fail(`Valor inválido: ${amountResult.error}`);
      }

      // Vencimento: 30 dias após emissão (padrão para frete de redespacho)
      const dueDate = new Date(cte.issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const termsResult = PaymentTerms.create({
        dueDate,
        amount: amountResult.value,
      });

      if (Result.isFail(termsResult)) {
        return Result.fail(`Erro nas condições de pagamento: ${termsResult.error}`);
      }

      // 6. Criar AccountPayable
      const payableId = this.uuidGenerator.generate();
      const cteNumber = String(cte.cteNumber);
      const payableResult = AccountPayable.create({
        id: payableId,
        organizationId: context.organizationId,
        branchId: context.branchId,
        supplierId: cte.takerId,
        documentNumber: `CTe ${cteNumber}`,
        description: `Frete redespacho CTe ${cteNumber} - ${carrierName}`,
        terms: termsResult.value,
        notes: `Gerado automaticamente do CTe externo #${cte.id} (chave: ${cte.cteKey ?? 'N/A'})`,
      });

      if (Result.isFail(payableResult)) {
        return Result.fail(`Erro ao criar payable: ${payableResult.error}`);
      }

      const payable = payableResult.value;

      // 7. Salvar payable
      await this.payableRepository.save(payable);

      // 8. Publicar domain events via outbox
      const events = payable.clearDomainEvents();
      if (events.length > 0) {
        try {
          await saveToOutbox(events, db);
        } catch (outboxError: unknown) {
          logger.warn(`Outbox save failed for CTe payable, falling back to direct publish`);
          for (const evt of events) {
            await this.eventPublisher.publish(evt);
          }
        }
      }

      logger.info(
        `[CreatePayableFromExternalCTe] Payable ${payableId} criado para CTe externo ${cteNumber} ` +
        `(transportadora: ${carrierName}, valor: R$ ${freightAmount.toFixed(2)})`
      );

      return Result.ok({
        payableId,
        freightAmount,
        carrierName,
        cteNumber,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[CreatePayableFromExternalCTe] Erro: ${errorMessage}`, error instanceof Error ? error : undefined);
      return Result.fail(`Erro ao gerar payable do CTe externo: ${errorMessage}`);
    }
  }
}
