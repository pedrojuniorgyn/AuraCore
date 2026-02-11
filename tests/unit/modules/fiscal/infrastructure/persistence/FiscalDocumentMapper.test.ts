import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { FiscalDocumentMapper } from '@/modules/fiscal/infrastructure/persistence/FiscalDocumentMapper';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import type { FiscalDocumentPersistence, FiscalDocumentItemPersistence } from '@/modules/fiscal/infrastructure/persistence/FiscalDocumentMapper';

describe('FiscalDocumentMapper', () => {
  it('deve converter documento domain → persistence', () => {
    // Criar documento de teste
    const docResult = FiscalDocument.create({
      id: 'doc-123',
      organizationId: 1,
      branchId: 1,
      documentType: 'NFE',
      series: '1',
      number: '000000001',
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Teste',
      recipientId: 'recipient-123',
      recipientCnpjCpf: '98765432000101',
      recipientName: 'Cliente Teste',
      issueDate: new Date('2025-01-15T10:00:00'),
      notes: 'Observações',
    });

    if (Result.isFail(docResult)) {
      throw new Error('Failed to create document');
    }

    const document = docResult.value;

    // Converter para persistence
    const persistence = FiscalDocumentMapper.toPersistence(document);

    // Verificar campos
    expect(persistence.id).toBe('doc-123');
    expect(persistence.documentType).toBe('NFE');
    expect(persistence.series).toBe('1');
    expect(persistence.number).toBe('000000001');
    expect(persistence.status).toBe('DRAFT');
    // BUG 1 FIX TEST: Verificar campos de emitente
    expect(persistence.issuerId).toBe('issuer-123');
    expect(persistence.issuerCnpj).toBe('12345678000190');
    expect(persistence.issuerName).toBe('Empresa Teste');
    // BUG 2 FIX TEST: recipient opcional (não é 'TEMP')
    expect(persistence.recipientCnpjCpf).toBe('98765432000101');
    expect(persistence.recipientName).toBe('Cliente Teste');
    expect(persistence.notes).toBe('Observações');
    expect(persistence.organizationId).toBe(1);
    expect(persistence.branchId).toBe(1);
    expect(typeof persistence.totalValue).toBe('string'); // MSSQL decimal as string
  });

  it('deve converter item domain → persistence', () => {
    const unitPriceResult = Money.create(100);
    if (Result.isFail(unitPriceResult)) {
      throw new Error('Failed to create unit price');
    }

    const cfopResult = CFOP.create('5102');
    if (Result.isFail(cfopResult)) {
      throw new Error('Failed to create CFOP');
    }

    const itemResult = FiscalDocumentItem.create({
      id: 'item-123',
      documentId: 'doc-123',
      itemNumber: 1,
      productCode: 'PROD-001',
      description: 'Produto Teste',
      ncm: '12345678',
      cfop: cfopResult.value,
      unit: 'UN',
      quantity: 10,
      unitPrice: unitPriceResult.value,
    });

    if (Result.isFail(itemResult)) {
      throw new Error('Failed to create item');
    }

    const item = itemResult.value;

    // Converter para persistence
    const persistence = FiscalDocumentMapper.itemToPersistence(item, 'doc-123', 1, 1);

    // Verificar campos
    expect(persistence.id).toBe('item-123');
    expect(persistence.documentId).toBe('doc-123');
    expect(persistence.itemNumber).toBe(1);
    expect(persistence.description).toBe('Produto Teste');
    expect(persistence.ncm).toBe('12345678');
    expect(persistence.cfop).toBe('5102');
    expect(persistence.unitOfMeasure).toBe('UN');
    expect(typeof persistence.quantity).toBe('string'); // MSSQL decimal
    expect(typeof persistence.unitPrice).toBe('string'); // MSSQL decimal
    expect(typeof persistence.totalValue).toBe('string'); // MSSQL decimal
  });

  it('deve fazer roundtrip document: domain → persistence → domain', () => {
    // Criar documento original
    const originalDocResult = FiscalDocument.create({
      id: 'doc-123',
      organizationId: 1,
      branchId: 1,
      documentType: 'NFE',
      series: '1',
      number: '000000001',
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Teste',
      issueDate: new Date('2025-01-15T10:00:00'),
    });

    if (Result.isFail(originalDocResult)) {
      throw new Error('Failed to create original document');
    }

    const originalDoc = originalDocResult.value;

    // Adicionar um item
    const unitPriceResult = Money.create(100);
    if (Result.isFail(unitPriceResult)) {
      throw new Error('Failed to create unit price');
    }

    const cfopResult = CFOP.create('5102');
    if (Result.isFail(cfopResult)) {
      throw new Error('Failed to create CFOP');
    }

    const itemResult = FiscalDocumentItem.create({
      id: 'item-123',
      documentId: 'doc-123',
      itemNumber: 1,
      productCode: 'PROD-001',
      description: 'Produto Teste',
      ncm: '12345678',
      cfop: cfopResult.value,
      unit: 'UN',
      quantity: 10,
      unitPrice: unitPriceResult.value,
    });

    if (Result.isFail(itemResult)) {
      throw new Error('Failed to create item');
    }

    const addItemResult = originalDoc.addItem(itemResult.value);
    if (Result.isFail(addItemResult)) {
      throw new Error('Failed to add item');
    }

    // Converter para persistence
    const docPersistence = FiscalDocumentMapper.toPersistence(originalDoc);
    const itemsPersistence = [FiscalDocumentMapper.itemToPersistence(itemResult.value, 'doc-123', 1, 1)];

    // Converter de volta para domain
    const reconstructedResult = FiscalDocumentMapper.toDomain(docPersistence, itemsPersistence);

    expect(Result.isOk(reconstructedResult)).toBe(true);
    if (Result.isOk(reconstructedResult)) {
      const reconstructed = reconstructedResult.value;

      // Verificar campos principais
      expect(reconstructed.id).toBe(originalDoc.id);
      expect(reconstructed.documentType).toBe(originalDoc.documentType);
      expect(reconstructed.series).toBe(originalDoc.series);
      expect(reconstructed.number).toBe(originalDoc.number);
      expect(reconstructed.status).toBe(originalDoc.status);
      // BUG 1 FIX TEST: Verificar que campos de emitente foram preservados no roundtrip
      expect(reconstructed.issuerId).toBe(originalDoc.issuerId);
      expect(reconstructed.issuerCnpj).toBe(originalDoc.issuerCnpj);
      expect(reconstructed.issuerName).toBe(originalDoc.issuerName);
      expect(reconstructed.organizationId).toBe(originalDoc.organizationId);
      expect(reconstructed.branchId).toBe(originalDoc.branchId);
      expect(reconstructed.items.length).toBe(1);
    }
  });

  it('deve preservar moeda em conversão', () => {
    const docResult = FiscalDocument.create({
      id: 'doc-123',
      organizationId: 1,
      branchId: 1,
      documentType: 'NFE',
      series: '1',
      number: '000000001',
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Teste',
      issueDate: new Date('2025-01-15'),
    });

    if (Result.isFail(docResult)) {
      throw new Error('Failed to create document');
    }

    const document = docResult.value;

    // Converter para persistence e verificar totalValue como string
    const persistence = FiscalDocumentMapper.toPersistence(document);

    expect(typeof persistence.totalValue).toBe('string');
    expect(parseFloat(persistence.totalValue)).toBeGreaterThanOrEqual(0);
  });

  it('deve tratar recipient opcional corretamente (Bug 2 fix)', () => {
    // Criar documento SEM recipient
    const docResult = FiscalDocument.create({
      id: 'doc-456',
      organizationId: 1,
      branchId: 1,
      documentType: 'NFE',
      series: '1',
      number: '000000002',
      issuerId: 'issuer-456',
      issuerCnpj: '98765432000100',
      issuerName: 'Outra Empresa',
      issueDate: new Date('2025-01-16'),
      // SEM recipient (undefined)
    });

    if (Result.isFail(docResult)) {
      throw new Error('Failed to create document');
    }

    const document = docResult.value;

    // Converter para persistence
    const persistence = FiscalDocumentMapper.toPersistence(document);

    // BUG 2 FIX TEST: recipient deve ser null (não 'TEMP')
    expect(persistence.recipientCnpjCpf).toBeNull();
    expect(persistence.recipientName).toBeNull();

    // Roundtrip: persistence → domain
    const reconstructedResult = FiscalDocumentMapper.toDomain(persistence, []);

    expect(Result.isOk(reconstructedResult)).toBe(true);
    if (Result.isOk(reconstructedResult)) {
      const reconstructed = reconstructedResult.value;

      // Verificar que recipient continua undefined após roundtrip
      expect(reconstructed.recipientCnpjCpf).toBeUndefined();
      expect(reconstructed.recipientName).toBeUndefined();
    }
  });
});

