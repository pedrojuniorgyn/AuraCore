import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { expectOk, expectFail } from '../../../../../helpers/resultHelper';
import { FiscalDocumentMapper } from '@/modules/fiscal/infrastructure/persistence/FiscalDocumentMapper';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { TaxRegime } from '@/modules/fiscal/domain/tax/value-objects/TaxRegime';

describe('FiscalDocumentMapper - Week 3 (Tax Reform Fields)', () => {
  describe('toPersistence', () => {
    it('should map taxRegime to persistence', () => {
      const documentResult = FiscalDocument.create({
        id: 'doc-001',
        organizationId: 1,
        branchId: 1,
        documentType: 'NFE',
        series: '1',
        number: '000000001',
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        issueDate: new Date(2027, 0, 15),
        taxRegime: expectOk(TaxRegime.transition()),
      });

      expect(Result.isOk(documentResult)).toBe(true);
      const document = (documentResult as { value: FiscalDocument }).value;

      const persistence = FiscalDocumentMapper.toPersistence(document);

      expect(persistence.taxRegime).toBe('TRANSITION');
    });

    it('should map totalIbs to persistence with amount and currency', () => {
      const documentResult = FiscalDocument.create({
        id: 'doc-002',
        organizationId: 1,
        branchId: 1,
        documentType: 'NFE',
        series: '1',
        number: '000000002',
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        issueDate: new Date(2027, 0, 15),
      });

      expect(Result.isOk(documentResult)).toBe(true);
      const document = (documentResult as { value: FiscalDocument }).value;

      const ibsResult = Money.create(150.50, 'BRL');
      expect(Result.isOk(ibsResult)).toBe(true);
      
      const docAsRecord = document as unknown as Record<string, unknown>;
      const props = docAsRecord['_props'] as Record<string, unknown>;
      props['totalIbs'] = (ibsResult as { value: Money }).value;

      const persistence = FiscalDocumentMapper.toPersistence(document);

      expect(persistence.totalIbs).toBe('150.5');
      expect(persistence.totalIbsCurrency).toBe('BRL');
    });

    it('should map null totalIbs when undefined', () => {
      const documentResult = FiscalDocument.create({
        id: 'doc-003',
        organizationId: 1,
        branchId: 1,
        documentType: 'NFE',
        series: '1',
        number: '000000003',
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        issueDate: new Date(2027, 0, 15),
      });

      expect(Result.isOk(documentResult)).toBe(true);
      const document = (documentResult as { value: FiscalDocument }).value;

      const persistence = FiscalDocumentMapper.toPersistence(document);

      expect(persistence.totalIbs).toBeNull();
      expect(persistence.totalIbsCurrency).toBeNull();
    });

    it('should map governmentPurchase to persistence', () => {
      const documentResult = FiscalDocument.create({
        id: 'doc-004',
        organizationId: 1,
        branchId: 1,
        documentType: 'NFE',
        series: '1',
        number: '000000004',
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        issueDate: new Date(2027, 0, 15),
        governmentPurchase: {
          entityType: 2,
          rateReduction: 20.5,
        },
      });

      expect(Result.isOk(documentResult)).toBe(true);
      const document = (documentResult as { value: FiscalDocument }).value;

      const persistence = FiscalDocumentMapper.toPersistence(document);

      expect(persistence.governmentPurchaseEntityType).toBe(2);
      expect(persistence.governmentPurchaseRateReduction).toBe('20.5');
    });

    it('should map ibsCbsMunicipalityCode to persistence', () => {
      const documentResult = FiscalDocument.create({
        id: 'doc-005',
        organizationId: 1,
        branchId: 1,
        documentType: 'NFE',
        series: '1',
        number: '000000005',
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        issueDate: new Date(2027, 0, 15),
        ibsCbsMunicipalityCode: '3550308',
      });

      expect(Result.isOk(documentResult)).toBe(true);
      const document = (documentResult as { value: FiscalDocument }).value;

      const persistence = FiscalDocumentMapper.toPersistence(document);

      expect(persistence.ibsCbsMunicipalityCode).toBe('3550308');
    });
  });

  describe('toDomain', () => {
    it('should map taxRegime from persistence to domain', () => {
      const persistence = {
        id: 'doc-006',
        documentType: 'NFE',
        series: '1',
        number: '000000006',
        status: 'DRAFT',
        issueDate: new Date(2027, 0, 15),
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        recipientId: null,
        recipientCnpjCpf: null,
        recipientName: null,
        totalValue: '1000.00',
        currency: 'BRL',
        taxRegime: 'TRANSITION',
        totalIbs: null,
        totalIbsCurrency: null,
        totalCbs: null,
        totalCbsCurrency: null,
        totalIs: null,
        totalIsCurrency: null,
        totalDFeValue: null,
        totalDFeValueCurrency: null,
        ibsCbsMunicipalityCode: null,
        governmentPurchaseEntityType: null,
        governmentPurchaseRateReduction: null,
        fiscalKey: null,
        protocolNumber: null,
        rejectionCode: null,
        rejectionReason: null,
        notes: null,
        organizationId: 1,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = FiscalDocumentMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      const document = (result as { value: FiscalDocument }).value;
      expect(document.taxRegime.value).toBe('TRANSITION');
    });

    it('should map totalIbs from persistence to domain', () => {
      const persistence = {
        id: 'doc-007',
        documentType: 'NFE',
        series: '1',
        number: '000000007',
        status: 'DRAFT',
        issueDate: new Date(2027, 0, 15),
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        recipientId: null,
        recipientCnpjCpf: null,
        recipientName: null,
        totalValue: '1000.00',
        currency: 'BRL',
        taxRegime: 'TRANSITION',
        totalIbs: '150.50',
        totalIbsCurrency: 'BRL',
        totalCbs: null,
        totalCbsCurrency: null,
        totalIs: null,
        totalIsCurrency: null,
        totalDFeValue: null,
        totalDFeValueCurrency: null,
        ibsCbsMunicipalityCode: null,
        governmentPurchaseEntityType: null,
        governmentPurchaseRateReduction: null,
        fiscalKey: null,
        protocolNumber: null,
        rejectionCode: null,
        rejectionReason: null,
        notes: null,
        organizationId: 1,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = FiscalDocumentMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      const document = (result as { value: FiscalDocument }).value;
      expect(document.totalIbs).toBeDefined();
      expect(document.totalIbs?.amount).toBe(150.50);
      expect(document.totalIbs?.currency).toBe('BRL');
    });

    it('should handle null totalIbs from persistence', () => {
      const persistence = {
        id: 'doc-008',
        documentType: 'NFE',
        series: '1',
        number: '000000008',
        status: 'DRAFT',
        issueDate: new Date(2027, 0, 15),
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        recipientId: null,
        recipientCnpjCpf: null,
        recipientName: null,
        totalValue: '1000.00',
        currency: 'BRL',
        taxRegime: 'CURRENT',
        totalIbs: null,
        totalIbsCurrency: null,
        totalCbs: null,
        totalCbsCurrency: null,
        totalIs: null,
        totalIsCurrency: null,
        totalDFeValue: null,
        totalDFeValueCurrency: null,
        ibsCbsMunicipalityCode: null,
        governmentPurchaseEntityType: null,
        governmentPurchaseRateReduction: null,
        fiscalKey: null,
        protocolNumber: null,
        rejectionCode: null,
        rejectionReason: null,
        notes: null,
        organizationId: 1,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = FiscalDocumentMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      const document = (result as { value: FiscalDocument }).value;
      expect(document.totalIbs).toBeUndefined();
    });

    it('should map governmentPurchase from persistence to domain', () => {
      const persistence = {
        id: 'doc-009',
        documentType: 'NFE',
        series: '1',
        number: '000000009',
        status: 'DRAFT',
        issueDate: new Date(2027, 0, 15),
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        recipientId: null,
        recipientCnpjCpf: null,
        recipientName: null,
        totalValue: '1000.00',
        currency: 'BRL',
        taxRegime: 'TRANSITION',
        totalIbs: null,
        totalIbsCurrency: null,
        totalCbs: null,
        totalCbsCurrency: null,
        totalIs: null,
        totalIsCurrency: null,
        totalDFeValue: null,
        totalDFeValueCurrency: null,
        ibsCbsMunicipalityCode: null,
        governmentPurchaseEntityType: 2,
        governmentPurchaseRateReduction: '20.5',
        fiscalKey: null,
        protocolNumber: null,
        rejectionCode: null,
        rejectionReason: null,
        notes: null,
        organizationId: 1,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = FiscalDocumentMapper.toDomain(persistence, []);

      expect(Result.isOk(result)).toBe(true);
      const document = (result as { value: FiscalDocument }).value;
      expect(document.governmentPurchase).toBeDefined();
      expect(document.governmentPurchase?.entityType).toBe(2);
      expect(document.governmentPurchase?.rateReduction).toBe(20.5);
    });

    it('should fail with invalid taxRegime', () => {
      const persistence = {
        id: 'doc-010',
        documentType: 'NFE',
        series: '1',
        number: '000000010',
        status: 'DRAFT',
        issueDate: new Date(2027, 0, 15),
        issuerId: 'issuer-001',
        issuerCnpj: '12345678000195',
        issuerName: 'Empresa Teste',
        recipientId: null,
        recipientCnpjCpf: null,
        recipientName: null,
        totalValue: '1000.00',
        currency: 'BRL',
        taxRegime: 'INVALID',
        totalIbs: null,
        totalIbsCurrency: null,
        totalCbs: null,
        totalCbsCurrency: null,
        totalIs: null,
        totalIsCurrency: null,
        totalDFeValue: null,
        totalDFeValueCurrency: null,
        ibsCbsMunicipalityCode: null,
        governmentPurchaseEntityType: null,
        governmentPurchaseRateReduction: null,
        fiscalKey: null,
        protocolNumber: null,
        rejectionCode: null,
        rejectionReason: null,
        notes: null,
        organizationId: 1,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = FiscalDocumentMapper.toDomain(persistence, []);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Invalid tax regime');
      }
    });
  });
});

