import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocument } from '../../domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '../../domain/entities/FiscalDocumentItem';
import { CFOP } from '../../domain/value-objects/CFOP';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  ICreateFiscalDocument,
  CreateFiscalDocumentInput,
  CreateFiscalDocumentOutput,
} from '../../domain/ports/input';

/**
 * Use Case: Create Fiscal Document
 *
 * Cria um novo documento fiscal em rascunho (DRAFT) com os itens fornecidos.
 * O documento pode ser editado até ser submetido (submit).
 * 
 * @see ARCH-010: Implementa ICreateFiscalDocument
 */
@injectable()
export class CreateFiscalDocumentUseCase implements ICreateFiscalDocument {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository,
    @inject(TOKENS.UuidGenerator) private readonly uuidGenerator: IUuidGenerator
  ) {}

  async execute(
    input: CreateFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<CreateFiscalDocumentOutput, string>> {
    try {
      // Gerar próximo número do documento
      const nextNumber = await this.repository.nextDocumentNumber(
        context.organizationId,
        context.branchId,
        input.documentType,
        input.series
      );

      // Gerar ID do documento primeiro
      const documentId = this.uuidGenerator.generate();

      // Converter items para FiscalDocumentItem entities
      const items: FiscalDocumentItem[] = [];
      for (const itemInput of input.items) {
        const unitPriceResult = Money.create(itemInput.unitPrice);
        if (Result.isFail(unitPriceResult)) {
          return Result.fail(`Invalid unit price: ${unitPriceResult.error}`);
        }

        const cfopResult = CFOP.create(itemInput.cfop);
        if (Result.isFail(cfopResult)) {
          return Result.fail(`Invalid CFOP for item: ${cfopResult.error}`);
        }

        const itemResult = FiscalDocumentItem.create({
          id: this.uuidGenerator.generate(),
          documentId, // Usar o ID gerado acima
          itemNumber: items.length + 1,
          productCode: 'TEMP', // TODO: Get from product
          description: itemInput.description,
          quantity: itemInput.quantity,
          unitPrice: unitPriceResult.value,
          ncm: itemInput.ncm ?? '',
          cfop: cfopResult.value,
          unit: itemInput.unitOfMeasure,
        });

        if (Result.isFail(itemResult)) {
          return Result.fail(`Invalid item: ${itemResult.error}`);
        }

        items.push(itemResult.value);
      }

      // Criar documento fiscal
      const issueDate = typeof input.issueDate === 'string'
        ? new Date(input.issueDate)
        : input.issueDate;

      const documentResult = FiscalDocument.create({
        id: documentId, // Usar o ID gerado
        documentType: input.documentType,
        series: input.series,
        number: nextNumber,
        issueDate,
        issuerId: input.issuerId,
        issuerCnpj: input.issuerCnpj,
        issuerName: input.issuerName,
        recipientId: input.recipientId,
        recipientCnpjCpf: input.recipientCnpjCpf ?? undefined,
        recipientName: input.recipientName ?? undefined,
        notes: input.notes,
        organizationId: context.organizationId,
        branchId: context.branchId,
      });

      if (Result.isFail(documentResult)) {
        return Result.fail(documentResult.error);
      }

      const document = documentResult.value;

      // Adicionar items ao documento
      for (const item of items) {
        const addItemResult = document.addItem(item);
        if (Result.isFail(addItemResult)) {
          return Result.fail(`Failed to add item: ${addItemResult.error}`);
        }
      }

      // Persistir
      await this.repository.save(document);

      // Retornar DTO
      return Result.ok({
        id: document.id,
        documentType: document.documentType as 'NFE' | 'NFCE' | 'CTE' | 'MDFE' | 'NFSE',
        series: document.series,
        number: document.number,
        status: 'DRAFT' as const,
        issueDate: document.issueDate,
        issuerId: document.issuerId,
        issuerName: document.issuerName,
        recipientCnpjCpf: document.recipientCnpjCpf,
        recipientName: document.recipientName,
        totalDocument: document.totalDocument.amount,
        itemsCount: document.items.length,
        createdAt: document.createdAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to create fiscal document: ${errorMessage}`);
    }
  }
}

