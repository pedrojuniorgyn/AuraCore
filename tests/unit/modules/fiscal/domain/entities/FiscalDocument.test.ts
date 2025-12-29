import { describe, it, expect, beforeEach } from 'vitest';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';
import { Money, Result } from '@/shared/domain';

function unwrapOrFail<T>(result: Result<T, string>, context: string): T {
  if (!Result.isOk(result)) {
    throw new Error(`${context} failed: ${result.error}`);
  }
  return result.value;
}

describe('FiscalDocument', () => {
  const validProps = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: 1,
    branchId: 1,
    documentType: 'NFE' as const,
    series: '001',
    number: '000000001',
    issuerId: 'issuer-001',
    issuerCnpj: '12345678000199',
    issuerName: 'Test Company',
    issueDate: new Date('2025-01-15'),
  };

  describe('create', () => {
    it('should create valid fiscal document', () => {
      const result = FiscalDocument.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(validProps.id);
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.documentType).toBe('NFE');
        expect(result.value.itemCount).toBe(0);
      }
    });

    it('should fail without organization', () => {
      const result = FiscalDocument.create({
        ...validProps,
        organizationId: 0,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without issuer CNPJ', () => {
      const result = FiscalDocument.create({
        ...validProps,
        issuerCnpj: '',
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('addItem', () => {
    it('should add item to DRAFT document', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');
      const cfop = unwrapOrFail(CFOP.create('5102'), 'CFOP.create');
      const unitPrice = unwrapOrFail(Money.create(100), 'Money.create');

      const item = unwrapOrFail(
        FiscalDocumentItem.create({
          id: 'item-001',
          documentId: doc.id,
          itemNumber: 1,
          productCode: 'PROD001',
          description: 'Test Product',
          ncm: '12345678',
          cfop,
          unit: 'UN',
          quantity: 10,
          unitPrice,
        }),
        'FiscalDocumentItem.create'
      );

      const addResult = doc.addItem(item);

      expect(Result.isOk(addResult)).toBe(true);
      expect(doc.itemCount).toBe(1);
      expect(doc.totalProducts.amount).toBe(1000); // 10 * 100
    });
  });

  describe('submit', () => {
    it('should submit document with items', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');
      const cfop = unwrapOrFail(CFOP.create('5102'), 'CFOP.create');
      const unitPrice = unwrapOrFail(Money.create(100), 'Money.create');

      const item = unwrapOrFail(
        FiscalDocumentItem.create({
          id: 'item-001',
          documentId: doc.id,
          itemNumber: 1,
          productCode: 'PROD001',
          description: 'Test Product',
          ncm: '12345678',
          cfop,
          unit: 'UN',
          quantity: 10,
          unitPrice,
        }),
        'FiscalDocumentItem.create'
      );
      doc.addItem(item);

      const submitResult = doc.submit();

      expect(Result.isOk(submitResult)).toBe(true);
      expect(doc.status).toBe('PENDING');
    });

    it('should fail to submit empty document', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');

      const submitResult = doc.submit();

      expect(Result.isFail(submitResult)).toBe(true);
    });

    it('should fail to submit already submitted document', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');
      const cfop = unwrapOrFail(CFOP.create('5102'), 'CFOP.create');
      const unitPrice = unwrapOrFail(Money.create(100), 'Money.create');

      const item = unwrapOrFail(
        FiscalDocumentItem.create({
          id: 'item-001',
          documentId: doc.id,
          itemNumber: 1,
          productCode: 'PROD001',
          description: 'Test Product',
          ncm: '12345678',
          cfop,
          unit: 'UN',
          quantity: 10,
          unitPrice,
        }),
        'FiscalDocumentItem.create'
      );
      doc.addItem(item);
      doc.submit();

      // Tentar submeter novamente
      const secondSubmit = doc.submit();

      expect(Result.isFail(secondSubmit)).toBe(true);
    });
  });

  describe('isEditable', () => {
    it('should be editable when DRAFT', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');

      expect(doc.isEditable).toBe(true);
    });

    it('should not be editable after submit', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');
      const cfop = unwrapOrFail(CFOP.create('5102'), 'CFOP.create');
      const unitPrice = unwrapOrFail(Money.create(100), 'Money.create');

      const item = unwrapOrFail(
        FiscalDocumentItem.create({
          id: 'item-001',
          documentId: doc.id,
          itemNumber: 1,
          productCode: 'PROD001',
          description: 'Test Product',
          ncm: '12345678',
          cfop,
          unit: 'UN',
          quantity: 10,
          unitPrice,
        }),
        'FiscalDocumentItem.create'
      );
      doc.addItem(item);
      doc.submit();

      expect(doc.isEditable).toBe(false);
    });
  });

  describe('model', () => {
    it('should return correct model for NFE', () => {
      const doc = unwrapOrFail(FiscalDocument.create(validProps), 'FiscalDocument.create');

      expect(doc.model).toBe('55');
    });

    it('should return correct model for CTE', () => {
      const doc = unwrapOrFail(
        FiscalDocument.create({ ...validProps, documentType: 'CTE' }),
        'FiscalDocument.create'
      );

      expect(doc.model).toBe('57');
    });
  });
});

