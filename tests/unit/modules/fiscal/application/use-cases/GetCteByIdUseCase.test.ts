import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetCteByIdUseCase } from '@/modules/fiscal/application/queries/cte/GetCteByIdUseCase';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: GetCteByIdUseCase
 *
 * Tests: found CTE, not found, wrong document type (not CTE),
 * empty cteId, and repository error handling.
 */
describe('GetCteByIdUseCase', () => {
  let useCase: GetCteByIdUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let ctx: ExecutionContext;

  /** Factory for a mock CTe fiscal document */
  function makeMockCteDocument(overrides: Partial<Record<string, unknown>> = {}): FiscalDocument {
    return {
      id: 'cte-001',
      documentType: 'CTE',
      series: '1',
      number: '000001',
      status: 'AUTHORIZED',
      fiscalKey: { value: '12345678901234567890123456789012345678901234' },
      issueDate: new Date('2026-01-15'),
      totalDocument: { amount: 5000 },
      issuerCnpj: '12345678000199',
      issuerName: 'Transportadora XYZ',
      recipientCnpjCpf: '98765432000188',
      recipientName: 'Destinatário ABC',
      items: [
        {
          description: 'Frete de carga',
          quantity: 1,
          totalPrice: { amount: 5000 },
        },
      ],
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
      ...overrides,
    } as unknown as FiscalDocument;
  }

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByFiscalKey: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn(),
      saveMany: vi.fn(),
      exists: vi.fn(),
      nextDocumentNumber: vi.fn(),
    };

    useCase = new GetCteByIdUseCase(mockRepository);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should return CTe details when found', async () => {
      const mockDoc = makeMockCteDocument();
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute({ cteId: 'cte-001' }, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('cte-001');
        expect(result.value.series).toBe('1');
        expect(result.value.number).toBe('000001');
        expect(result.value.status).toBe('AUTHORIZED');
        expect(result.value.totalValue).toBe(5000);
        expect(result.value.senderName).toBe('Transportadora XYZ');
        expect(result.value.recipientName).toBe('Destinatário ABC');
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].description).toBe('Frete de carga');
      }

      expect(mockRepository.findById).toHaveBeenCalledWith('cte-001', 1, 1);
    });

    it('should fail when CTe not found', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute({ cteId: 'nonexistent-id' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should fail when document is not a CTE (wrong type)', async () => {
      const nfeDoc = makeMockCteDocument({ documentType: 'NFE' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(nfeDoc);

      const result = await useCase.execute({ cteId: 'cte-001' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não é um CTe');
        expect(result.error).toContain('NFE');
      }
    });

    it('should fail when cteId is empty', async () => {
      const result = await useCase.execute({ cteId: '' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cteId é obrigatório');
      }
    });

    it('should fail when cteId is whitespace only', async () => {
      const result = await useCase.execute({ cteId: '   ' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cteId é obrigatório');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection timeout'),
      );

      const result = await useCase.execute({ cteId: 'cte-001' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao buscar CTe');
        expect(result.error).toContain('Connection timeout');
      }
    });
  });
});
