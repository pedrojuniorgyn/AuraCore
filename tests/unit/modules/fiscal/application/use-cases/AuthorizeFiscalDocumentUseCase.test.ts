import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { AuthorizeFiscalDocumentUseCase } from '@/modules/fiscal/application/use-cases/AuthorizeFiscalDocumentUseCase';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import { FiscalKey } from '@/modules/fiscal/domain/value-objects/FiscalKey';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('AuthorizeFiscalDocumentUseCase', () => {
  let useCase: AuthorizeFiscalDocumentUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let context: ExecutionContext;
  let testDocument: FiscalDocument;

  beforeEach(() => {
    // Criar documento PROCESSING de teste
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
      throw new Error('Failed to create test document');
    }

    testDocument = docResult.value;

    // Adicionar um item para permitir submit()
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

    const addItemResult = testDocument.addItem(itemResult.value);
    if (Result.isFail(addItemResult)) {
      throw new Error('Failed to add item');
    }

    // Colocar em PROCESSING
    const submitResult = testDocument.submit();
    if (Result.isFail(submitResult)) {
      throw new Error('Failed to submit test document');
    }

    const processResult = testDocument.process();
    if (Result.isFail(processResult)) {
      throw new Error('Failed to process test document');
    }

    // Mock repository (BUG 2 FIX: adicionar branchId aos métodos)
    mockRepository = {
      findById: async (id, _organizationId, _branchId) => (id === 'doc-123' ? testDocument : null),
      save: async () => {},
      nextDocumentNumber: async () => '000000001',
      findByFiscalKey: async (_fiscalKey, _organizationId, _branchId) => null,
      findMany: async () => ({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      exists: async (_id, _organizationId, _branchId) => false,
      saveMany: async () => {},
    };

    useCase = new AuthorizeFiscalDocumentUseCase(mockRepository);

    context = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('deve autorizar documento PROCESSING com sucesso', async () => {
    // Gerar chave fiscal válida
    const fiscalKeyGenResult = FiscalKey.generate({
      ufCode: '35',
      yearMonth: '2501',
      cnpj: '12345678000190',
      model: '55',
      series: '001',
      number: '000000001',
      emissionType: '1',
      numericCode: '12345678',
    });

    if (Result.isFail(fiscalKeyGenResult)) {
      throw new Error('Failed to generate fiscal key');
    }

    const fiscalKey = fiscalKeyGenResult.value.value;

    const input = {
      id: 'doc-123',
      fiscalKey,
      protocolNumber: 'PROT-123456',
      protocolDate: new Date('2025-01-15T10:00:00'),
    };

    const result = await useCase.execute(input, context);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.id).toBe('doc-123');
      expect(result.value.status).toBe('AUTHORIZED');
      expect(result.value.fiscalKey).toBe(fiscalKey);
      expect(result.value.protocolNumber).toBe('PROT-123456');
    }
  });

  it('deve rejeitar chave fiscal inválida', async () => {
    const input = {
      id: 'doc-123',
      fiscalKey: '123', // Inválido (não tem 44 dígitos)
      protocolNumber: 'PROT-123456',
      protocolDate: new Date('2025-01-15T10:00:00'),
    };

    const result = await useCase.execute(input, context);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid fiscal key');
    }
  });

  it('deve rejeitar autorização de documento inexistente', async () => {
    const fiscalKey = '35250112345678000190550010000000011000000018';

    const input = {
      id: 'doc-999',
      fiscalKey,
      protocolNumber: 'PROT-123456',
      protocolDate: new Date('2025-01-15T10:00:00'),
    };

    const result = await useCase.execute(input, context);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('not found');
    }
  });
});

