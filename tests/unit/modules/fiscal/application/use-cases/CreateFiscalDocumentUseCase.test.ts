import { describe, it, expect, beforeEach } from 'vitest';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { CreateFiscalDocumentUseCase } from '@/modules/fiscal/application/use-cases/CreateFiscalDocumentUseCase';
import { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import { FiscalDocumentItem } from '@/modules/fiscal/domain/entities/FiscalDocumentItem';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { ExecutionContext } from '@/modules/fiscal/application/use-cases/BaseUseCase';

describe('CreateFiscalDocumentUseCase', () => {
  let useCase: CreateFiscalDocumentUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let context: ExecutionContext;

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      nextDocumentNumber: async () => '000000001',
      save: async () => {},
      findById: async () => null,
      findByFiscalKey: async () => null,
      findMany: async () => ({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      exists: async () => false,
      saveMany: async () => {},
    };

    useCase = new CreateFiscalDocumentUseCase(mockRepository);

    context = {
      userId: 'user-123',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  it('deve criar documento fiscal com sucesso', async () => {
    const input = {
      documentType: 'NFE' as const,
      series: '1',
      issueDate: new Date('2025-01-15'),
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Emissora LTDA',
      recipientCnpjCpf: '98765432000101',
      recipientName: 'Cliente Destinatário SA',
      items: [
        {
          description: 'Produto Teste',
          quantity: 10,
          unitPrice: 100,
          ncm: '12345678',
          cfop: '5102',
          unitOfMeasure: 'UN',
        },
      ],
      notes: 'Observações do documento',
    };

    const result = await useCase.execute(input, context);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.documentType).toBe('NFE');
      expect(result.value.series).toBe('1');
      expect(result.value.number).toBe('000000001');
      expect(result.value.status).toBe('DRAFT');
      expect(result.value.issuerId).toBe('issuer-123');
      expect(result.value.issuerName).toBe('Empresa Emissora LTDA');
      expect(result.value.recipientCnpjCpf).toBe('98765432000101');
      expect(result.value.recipientName).toBe('Cliente Destinatário SA');
      expect(result.value.itemsCount).toBe(1);
      expect(result.value.totalDocument).toBeGreaterThan(0);
    }
  });

  it('deve rejeitar item com CFOP inválido', async () => {
    const input = {
      documentType: 'NFE' as const,
      series: '1',
      issueDate: new Date('2025-01-15'),
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Emissora LTDA',
      items: [
        {
          description: 'Produto Teste',
          quantity: 10,
          unitPrice: 100,
          cfop: '999', // CFOP inválido (3 dígitos)
          unitOfMeasure: 'UN',
        },
      ],
    };

    const result = await useCase.execute(input, context);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Invalid CFOP');
    }
  });

  it('deve rejeitar item com preço negativo', async () => {
    const input = {
      documentType: 'NFE' as const,
      series: '1',
      issueDate: new Date('2025-01-15'),
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Emissora LTDA',
      items: [
        {
          description: 'Produto Teste',
          quantity: 10,
          unitPrice: -100, // Preço negativo
          ncm: '12345678', // NCM válido para não falhar antes
          cfop: '5102',
          unitOfMeasure: 'UN',
        },
      ],
    };

    const result = await useCase.execute(input, context);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Unit price cannot be negative');
    }
  });

  it('deve criar documento sem recipient (opcional)', async () => {
    const input = {
      documentType: 'NFE' as const,
      series: '1',
      issueDate: new Date('2025-01-15'),
      issuerId: 'issuer-123',
      issuerCnpj: '12345678000190',
      issuerName: 'Empresa Emissora LTDA',
      // Sem recipient
      items: [
        {
          description: 'Produto Teste',
          quantity: 5,
          unitPrice: 50,
          ncm: '12345678', // NCM válido
          cfop: '5102',
          unitOfMeasure: 'UN',
        },
      ],
    };

    const result = await useCase.execute(input, context);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.recipientCnpjCpf).toBeUndefined();
      expect(result.value.recipientName).toBeUndefined();
    }
  });
});

