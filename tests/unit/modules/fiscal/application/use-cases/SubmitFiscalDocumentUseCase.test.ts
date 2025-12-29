import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { SubmitFiscalDocumentUseCase } from '@/modules/fiscal/application/use-cases/SubmitFiscalDocumentUseCase';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import { CFOP } from '@/modules/fiscal/domain/value-objects/CFOP';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('SubmitFiscalDocumentUseCase', () => {
  let useCase: SubmitFiscalDocumentUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let context: ExecutionContext;
  let testDocument: FiscalDocument;

  beforeEach(() => {
    // Criar documento DRAFT de teste
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

    // Mock repository
    mockRepository = {
      findById: async (id) => (id === 'doc-123' ? testDocument : null),
      save: async () => {},
      nextDocumentNumber: async () => '000000001',
      findByFiscalKey: async () => null,
      findMany: async () => ({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      exists: async () => false,
      saveMany: async () => {},
    };

    useCase = new SubmitFiscalDocumentUseCase(mockRepository);

    context = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('deve submeter documento DRAFT com sucesso', async () => {
    const result = await useCase.execute({ id: 'doc-123' }, context);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.id).toBe('doc-123');
      expect(result.value.status).toBe('PENDING');
    }
  });

  it('deve rejeitar submissão de documento inexistente', async () => {
    const result = await useCase.execute({ id: 'doc-999' }, context);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('not found');
    }
  });

  it('deve rejeitar acesso a documento de outra branch (não-admin)', async () => {
    const otherBranchContext = { ...context, branchId: 2 };

    const result = await useCase.execute({ id: 'doc-123' }, otherBranchContext);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('permission');
    }
  });

  it('deve permitir acesso a documento de outra branch (admin)', async () => {
    const adminContext = { ...context, branchId: 2, isAdmin: true };

    const result = await useCase.execute({ id: 'doc-123' }, adminContext);

    expect(Result.isOk(result)).toBe(true);
  });
});

