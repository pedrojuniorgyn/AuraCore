import { describe, it, expect, beforeEach } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';
import { MockSefazService } from '@/modules/fiscal/infrastructure/services/MockSefazService';
import { MockPdfGenerator } from '@/modules/fiscal/infrastructure/services/MockPdfGenerator';

/**
 * Testes de Integração - E7.4 SEMANA 5
 * 
 * Testa integração entre:
 * - SEFAZ Mock Service
 * - PDF Generator Mock
 * - Fiscal Domain
 * 
 * Cobertura: 12 testes
 * - 4 testes SEFAZ (transmit, authorize, cancel, query)
 * - 4 testes PDF Generator (DANFE, DACTE, DAMDFE, NFS-e)
 * - 4 testes Fluxo Completo
 */
describe('Fiscal Integration Tests - SEFAZ + PDF + Accounting', () => {
  let sefazService: MockSefazService;
  let pdfGenerator: MockPdfGenerator;

  beforeEach(() => {
    sefazService = new MockSefazService();
    pdfGenerator = new MockPdfGenerator();
  });

  // ==================== SEFAZ INTEGRATION TESTS ====================

  describe('SEFAZ Mock Service', () => {
    it('1. Deve transmitir documento para SEFAZ com sucesso', async () => {
      const document = createMockDocument('NFE');
      
      const result = await sefazService.transmit(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.success).toBe(true);
        expect(result.value.protocolNumber).toMatch(/^\d{15}$/); // 15 dígitos
        expect(result.value.fiscalKey).toBe(document.fiscalKey?.value || '');
      }
    });

    it('2. Deve autorizar documento na SEFAZ', async () => {
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);
      const fiscalKey = fiscalKeyResult.value!.value;
      
      const result = await sefazService.authorize(fiscalKey);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.authorized).toBe(true);
        expect(result.value.statusCode).toBe('100');
        expect(result.value.statusMessage).toContain('Autorizado');
      }
    });

    it('3. Deve cancelar documento na SEFAZ', async () => {
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);
      const fiscalKey = fiscalKeyResult.value!.value;
      const reason = 'Erro no valor - Cancelamento de teste';
      
      const result = await sefazService.cancel(fiscalKey, reason);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.cancelled).toBe(true);
        expect(result.value.statusCode).toBe('101');
      }
    });

    it('4. Deve consultar status de documento na SEFAZ', async () => {
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);
      const fiscalKey = fiscalKeyResult.value!.value;
      
      const result = await sefazService.queryStatus(fiscalKey);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toMatch(/^(AUTHORIZED|CANCELLED|PENDING)$/);
        expect(result.value.fiscalKey).toBe(fiscalKey);
      }
    });
  });

  // ==================== PDF GENERATOR TESTS ====================

  describe('PDF Generator Mock', () => {
    it('5. Deve gerar DANFE (NFE)', async () => {
      const document = createMockDocument('NFE');
      
      const result = await pdfGenerator.generateDanfe(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const pdf = result.value;
        expect(pdf).toBeInstanceOf(Buffer);
        expect(pdf.toString()).toContain('%PDF'); // PDF header
        expect(pdf.toString()).toContain('DANFE');
      }
    });

    it('6. Deve gerar DACTE (CTE)', async () => {
      const document = createMockDocument('CTE');
      
      const result = await pdfGenerator.generateDacte(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const pdf = result.value;
        expect(pdf).toBeInstanceOf(Buffer);
        expect(pdf.toString()).toContain('DACTE');
      }
    });

    it('7. Deve gerar DAMDFE (MDFE)', async () => {
      const document = createMockDocument('MDFE');
      
      const result = await pdfGenerator.generateDamdfe(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const pdf = result.value;
        expect(pdf).toBeInstanceOf(Buffer);
        expect(pdf.toString()).toContain('DAMDFE');
      }
    });

    it('8. Deve gerar documento NFS-e', async () => {
      const document = createMockDocument('NFSE');
      
      const result = await pdfGenerator.generateNfseDocument(document);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const pdf = result.value;
        expect(pdf).toBeInstanceOf(Buffer);
        expect(pdf.toString()).toContain('NFS-e');
      }
    });
  });

  // ==================== END-TO-END FLOW TESTS ====================

  describe('Fluxo Completo - Documento Fiscal', () => {
    it('9. Deve completar fluxo: criar → transmitir → autorizar', async () => {
      // 1. Criar documento
      const document = createMockDocument('NFE');
      expect(document.status).toBe('DRAFT');

      // 2. Submeter
      const submitResult = document.submit();
      expect(Result.isOk(submitResult)).toBe(true);
      expect(document.status).toBe('PENDING');

      // 3. Transmitir para SEFAZ
      const transmitResult = await sefazService.transmit(document);
      expect(Result.isOk(transmitResult)).toBe(true);

      // 4. Autorizar na SEFAZ
      // Gerar chave fiscal válida para autorização
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);
      
      const authorizeResult = await sefazService.authorize(fiscalKeyResult.value!.value);
      expect(Result.isOk(authorizeResult)).toBe(true);
      expect(Result.isOk(authorizeResult) && authorizeResult.value.authorized).toBe(true);
    });

    it('10. Deve completar fluxo de cancelamento', async () => {
      // 1. Criar documento autorizado
      const document = createMockDocument('NFE');
      document.submit();
      expect(document.status).toBe('PENDING');

      // Simular transição PENDING → PROCESSING
      document['_props'].status = 'PROCESSING';
      
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);

      const authorizeResult = document.authorize({
        fiscalKey: fiscalKeyResult.value!,
        protocolNumber: 'PROT-123',
        protocolDate: new Date(),
      });
      expect(Result.isOk(authorizeResult)).toBe(true);
      expect(document.status).toBe('AUTHORIZED');

      // 2. Cancelar na SEFAZ
      const cancelResult = await sefazService.cancel(
        document.fiscalKey!.value,
        'Cancelamento de teste - valor incorreto'
      );
      expect(Result.isOk(cancelResult)).toBe(true);
      expect(Result.isOk(cancelResult) && cancelResult.value.cancelled).toBe(true);

      // 3. Cancelar no domain
      const domainCancelResult = document.cancel({
        reason: 'Cancelamento de teste - valor incorreto',
        protocolNumber: Result.isOk(cancelResult) ? cancelResult.value.protocolNumber : 'PROT-CANCEL',
      });
      expect(Result.isOk(domainCancelResult)).toBe(true);
      expect(document.status).toBe('CANCELLED');
    });

    it('11. Deve rejeitar PDF para documento de tipo incorreto', async () => {
      const document = createMockDocument('CTE'); // CTE
      
      // Tentar gerar DANFE (que é para NFE)
      const result = await pdfGenerator.generateDanfe(document);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não é NFE');
      }
    });

    it('12. Deve rejeitar cancelamento SEFAZ com motivo curto', async () => {
      const fiscalKeyResult = FiscalKey.generate({
        ufCode: '35',
        yearMonth: '2501',
        cnpj: '12345678000190',
        model: '55',
        series: '001',
        number: '000000001',
        emissionType: '1',
        numericCode: '12345678',
      });
      expect(Result.isOk(fiscalKeyResult)).toBe(true);

      const fiscalKey = fiscalKeyResult.value!.value;
      const shortReason = 'Curto'; // Menos de 15 caracteres
      
      const result = await sefazService.cancel(fiscalKey, shortReason);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('mínimo 15 caracteres');
      }
    });
  });
});

// ==================== HELPER FUNCTIONS ====================

function createMockDocument(type: 'NFE' | 'CTE' | 'MDFE' | 'NFSE'): FiscalDocument {
  const fiscalKeyResult = FiscalKey.generate({
    ufCode: '35',
    yearMonth: '2501',
    cnpj: '12345678000190',
    model: type === 'NFE' ? '55' : type === 'CTE' ? '57' : type === 'MDFE' ? '58' : '99',
    series: '001',
    number: '000000001',
    emissionType: '1',
    numericCode: '12345678',
  });

  if (Result.isFail(fiscalKeyResult)) {
    throw new Error('Failed to generate fiscal key');
  }

  const totalValue = Money.create(1000, 'BRL');
  if (Result.isFail(totalValue)) {
    throw new Error('Failed to create total value');
  }

  const documentResult = FiscalDocument.create({
    id: 'test-doc-123',
    organizationId: 1,
    branchId: 1,
    documentType: type,
    series: '001',
    number: '000000001',
    issueDate: new Date(),
    issuerId: 'issuer-123',
    issuerCnpj: '12345678000190',
    issuerName: 'Test Issuer Company',
    totalDocument: totalValue.value,
    fiscalKey: fiscalKeyResult.value,
  });

  if (Result.isFail(documentResult)) {
    throw new Error(`Failed to create document: ${documentResult.error}`);
  }

  const document = documentResult.value;

  // Adicionar item
  const cfop = CFOP.create('5102');
  if (Result.isFail(cfop)) {
    throw new Error('Failed to create CFOP');
  }

  const unitPrice = Money.create(100, 'BRL');
  const totalPrice = Money.create(1000, 'BRL');
  if (Result.isFail(unitPrice) || Result.isFail(totalPrice)) {
    throw new Error('Failed to create prices');
  }

  const itemResult = FiscalDocumentItem.create({
    id: 'item-1',
    documentId: document.id,
    itemNumber: 1,
    productCode: 'PROD-001',
    description: 'Test Product',
    ncm: '12345678',
    cfop: cfop.value,
    unit: 'UN',
    quantity: 10,
    unitPrice: unitPrice.value,
    totalPrice: totalPrice.value,
  });

  if (Result.isFail(itemResult)) {
    throw new Error(`Failed to create item: ${itemResult.error}`);
  }

  const addItemResult = document.addItem(itemResult.value);
  if (Result.isFail(addItemResult)) {
    throw new Error(`Failed to add item: ${addItemResult.error}`);
  }

  return document;
}

