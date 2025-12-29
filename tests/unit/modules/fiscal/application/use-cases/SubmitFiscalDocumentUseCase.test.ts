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

    // Mock repository (BUG 2 FIX: validar branchId no mock)
    mockRepository = {
      findById: async (id, _organizationId, branchId) => {
        // Repository agora filtra por branchId - só retorna se branch bater
        if (id === 'doc-123' && branchId === testDocument.branchId) {
          return testDocument;
        }
        return null;
      },
      save: async () => {},
      nextDocumentNumber: async () => '000000001',
      findByFiscalKey: async (_fiscalKey, _organizationId, _branchId) => null,
      findMany: async (_filter, _pagination) => ({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      exists: async (_id, _organizationId, _branchId) => false,
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

  it('deve rejeitar acesso a documento de outra branch (não-admin) - BUG 2 FIX', async () => {
    // Com multi-tenancy completo, o repository filtra por branchId
    // Documento de branch 1 não é encontrado quando busca com branchId: 2
    const otherBranchContext = { ...context, branchId: 2 };

    const result = await useCase.execute({ id: 'doc-123' }, otherBranchContext);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('not found'); // Repository retorna null
    }
  });

  it('deve rejeitar acesso a documento de outra branch (admin) - BUG 2 FIX', async () => {
    // Admin também não pode acessar documento de outra branch diretamente
    // Precisa mudar o context.branchId antes (via middleware/API)
    const adminContext = { ...context, branchId: 2, isAdmin: true };

    const result = await useCase.execute({ id: 'doc-123' }, adminContext);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('not found'); // Repository retorna null
    }
  });
});

