import { Result, Money } from '@/shared/domain';
import { FiscalDocument, FiscalDocumentProps } from '../../domain/entities/FiscalDocument';
import { FiscalDocumentItem, FiscalDocumentItemProps } from '../../domain/entities/FiscalDocumentItem';
import { FiscalKey } from '../../domain/value-objects/FiscalKey';
import { CFOP } from '../../domain/value-objects/CFOP';
import { DocumentType, DocumentStatus } from '../../domain/value-objects/DocumentType';

/**
 * Persistence model types (from Drizzle)
 */
export interface FiscalDocumentPersistence {
  id: string;
  documentType: string;
  series: string;
  number: string;
  status: string;
  issueDate: Date;
  // BUG 1 FIX: Campos de emitente
  issuerId: string;
  issuerCnpj: string;
  issuerName: string;
  // BUG 2 FIX: recipient opcional
  recipientId: string | null; // BUG 1 NEW FIX: System identifier
  recipientCnpjCpf: string | null;
  recipientName: string | null;
  totalValue: string; // decimal as string in MSSQL
  currency: string; // BUG 1 FIX: ISO 4217 currency code
  fiscalKey: string | null;
  protocolNumber: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
  notes: string | null;
  organizationId: number;
  branchId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalDocumentItemPersistence {
  id: string;
  documentId: string;
  itemNumber: number;
  description: string;
  quantity: string; // decimal as string
  unitPrice: string; // decimal as string
  totalValue: string; // decimal as string
  currency: string; // BUG 1 FIX: ISO 4217 currency code
  ncm: string | null;
  cfop: string;
  unitOfMeasure: string;
  createdAt: Date;
}

/**
 * Mapper: FiscalDocument Domain ↔ Persistence
 */
export class FiscalDocumentMapper {
  /**
   * Domain → Persistence
   */
  static toPersistence(document: FiscalDocument): FiscalDocumentPersistence {
    return {
      id: document.id,
      documentType: document.documentType,
      series: document.series,
      number: document.number,
      status: document.status,
      issueDate: document.issueDate,
      // BUG 1 FIX: Incluir campos de emitente
      issuerId: document.issuerId,
      issuerCnpj: document.issuerCnpj,
      issuerName: document.issuerName,
      // BUG 2 FIX + BUG 1 NEW FIX: recipient opcional com recipientId
      recipientId: document.recipientId ?? null,
      recipientCnpjCpf: document.recipientCnpjCpf ?? null,
      recipientName: document.recipientName ?? null,
      totalValue: String(document.totalDocument.amount), // MSSQL decimal as string
      currency: document.totalDocument.currency, // BUG 1 FIX: Salvar currency
      fiscalKey: document.fiscalKey?.value ?? null,
      protocolNumber: document.protocolNumber ?? null,
      rejectionCode: null, // TODO: Add to domain model if needed
      rejectionReason: null, // TODO: Add to domain model if needed
      notes: document.notes ?? null,
      organizationId: document.organizationId,
      branchId: document.branchId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Persistence → Domain
   */
  static toDomain(persistence: FiscalDocumentPersistence, items: FiscalDocumentItemPersistence[]): Result<FiscalDocument, string> {
    // Converter items
    const domainItems: FiscalDocumentItem[] = [];
    for (const itemPersistence of items) {
      const itemResult = this.itemToDomain(itemPersistence);
      if (Result.isFail(itemResult)) {
        return Result.fail(itemResult.error);
      }
      domainItems.push(itemResult.value);
    }

    // Converter totalValue (BUG 1 FIX: passar currency)
    const totalValueResult = Money.create(parseFloat(persistence.totalValue), persistence.currency);
    if (Result.isFail(totalValueResult)) {
      return Result.fail(`Invalid total value: ${totalValueResult.error}`);
    }

    // Converter fiscalKey (se existir)
    let fiscalKey: FiscalKey | undefined;
    if (persistence.fiscalKey) {
      const fiscalKeyResult = FiscalKey.create(persistence.fiscalKey);
      if (Result.isFail(fiscalKeyResult)) {
        return Result.fail(`Invalid fiscal key: ${fiscalKeyResult.error}`);
      }
      fiscalKey = fiscalKeyResult.value;
    }

    // Reconstitute aggregate with minimal required fields
    // FiscalDocument.create() always creates DRAFT, we'll restore state after
    const documentResult = FiscalDocument.create({
      id: persistence.id,
      documentType: persistence.documentType as DocumentType,
      series: persistence.series,
      number: persistence.number,
      issueDate: persistence.issueDate,
      // BUG 1 FIX: Usar campos reais de emitente do persistence
      issuerId: persistence.issuerId,
      issuerCnpj: persistence.issuerCnpj,
      issuerName: persistence.issuerName,
      // BUG 1 NEW FIX: recipientId é system ID, não CNPJ/CPF
      recipientId: persistence.recipientId ?? undefined,
      recipientCnpjCpf: persistence.recipientCnpjCpf ?? undefined,
      recipientName: persistence.recipientName ?? undefined,
      notes: persistence.notes ?? undefined,
      organizationId: persistence.organizationId,
      branchId: persistence.branchId,
    });

    if (Result.isFail(documentResult)) {
      return Result.fail(documentResult.error);
    }

    const document = documentResult.value;

    // Add items to document
    for (const item of domainItems) {
      const addItemResult = document.addItem(item);
      if (Result.isFail(addItemResult)) {
        return Result.fail(`Failed to add item during reconstitution: ${addItemResult.error}`);
      }
    }

    // Restaurar estado usando bracket notation (private access)
    const docAsAny = document as unknown as Record<string, unknown>;
    const props = docAsAny['_props'] as Record<string, unknown>;
    props['status'] = persistence.status as DocumentStatus;
    props['fiscalKey'] = fiscalKey;
    props['protocolNumber'] = persistence.protocolNumber ?? undefined;
    docAsAny['_createdAt'] = persistence.createdAt;
    docAsAny['_updatedAt'] = persistence.updatedAt;

    return Result.ok(document);
  }

  /**
   * Item: Domain → Persistence
   */
  static itemToPersistence(item: FiscalDocumentItem, documentId: string): FiscalDocumentItemPersistence {
    return {
      id: item.id,
      documentId,
      itemNumber: item.itemNumber,
      description: item.description,
      quantity: String(item.quantity), // MSSQL decimal as string
      unitPrice: String(item.unitPrice.amount), // MSSQL decimal as string
      totalValue: String(item.unitPrice.amount * item.quantity), // Calculated
      currency: item.unitPrice.currency, // BUG 1 FIX: Salvar currency
      ncm: item.ncm ?? null,
      cfop: item.cfop.code,
      unitOfMeasure: item.unit,
      createdAt: item.createdAt,
    };
  }

  /**
   * Item: Persistence → Domain
   */
  static itemToDomain(persistence: FiscalDocumentItemPersistence): Result<FiscalDocumentItem, string> {
    // Converter unitPrice (BUG 1 FIX: passar currency)
    const unitPriceResult = Money.create(parseFloat(persistence.unitPrice), persistence.currency);
    if (Result.isFail(unitPriceResult)) {
      return Result.fail(`Invalid unit price: ${unitPriceResult.error}`);
    }

    // Converter CFOP
    const cfopResult = CFOP.create(persistence.cfop);
    if (Result.isFail(cfopResult)) {
      return Result.fail(`Invalid CFOP: ${cfopResult.error}`);
    }

    // BUG 2 FIX: Usar reconstitute() ao invés de create() para preservar createdAt
    // Calcular totalPrice a partir do persistence ou recalcular (BUG 1 FIX: passar currency)
    const totalPriceResult = Money.create(parseFloat(persistence.totalValue), persistence.currency);
    if (Result.isFail(totalPriceResult)) {
      return Result.fail(`Invalid total value: ${totalPriceResult.error}`);
    }

    const item = FiscalDocumentItem.reconstitute(
      {
        id: persistence.id,
        documentId: persistence.documentId,
        itemNumber: persistence.itemNumber,
        productCode: 'TEMP', // TODO: Add to persistence schema
        description: persistence.description,
        ncm: persistence.ncm ?? '',
        cfop: cfopResult.value,
        unit: persistence.unitOfMeasure,
        quantity: parseFloat(persistence.quantity),
        unitPrice: unitPriceResult.value,
        totalPrice: totalPriceResult.value,
      },
      persistence.createdAt // BUG 2 FIX: Preservar timestamp original
    );

    return Result.ok(item);
  }
}

