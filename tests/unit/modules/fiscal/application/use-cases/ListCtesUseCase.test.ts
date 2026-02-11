import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListCtesUseCase } from '@/modules/fiscal/application/queries/cte/ListCtesUseCase';
import type { IFiscalDocumentRepository, PaginatedResult } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: ListCtesUseCase
 *
 * Tests pagination, filtering, empty results, and error handling
 * for the CTe listing query use case.
 */
describe('ListCtesUseCase', () => {
  let useCase: ListCtesUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let ctx: ExecutionContext;

  /** Factory for mock fiscal documents representing CTes */
  function makeMockCteDocument(overrides: Partial<Record<string, unknown>> = {}): FiscalDocument {
    return {
      id: overrides.id ?? 'cte-001',
      documentType: 'CTE',
      series: '1',
      number: '000001',
      status: 'AUTHORIZED',
      fiscalKey: { value: '12345678901234567890123456789012345678901234' },
      issueDate: new Date('2026-01-15'),
      totalDocument: { amount: 5000 },
      issuerName: 'Transportadora XYZ',
      recipientName: 'Destinatário ABC',
      notes: '',
      createdAt: new Date('2026-01-15'),
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

    useCase = new ListCtesUseCase(mockRepository);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should list CTes with pagination', async () => {
      const mockDocs = [
        makeMockCteDocument({ id: 'cte-001', number: '000001' }),
        makeMockCteDocument({ id: 'cte-002', number: '000002' }),
      ];

      const paginatedResult: PaginatedResult<FiscalDocument> = {
        data: mockDocs,
        total: 25,
        page: 1,
        pageSize: 20,
        totalPages: 2,
      };

      (mockRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(paginatedResult);

      const result = await useCase.execute({ page: 1, pageSize: 20 }, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.total).toBe(25);
        expect(result.value.page).toBe(1);
        expect(result.value.pageSize).toBe(20);
        expect(result.value.totalPages).toBe(2);
        expect(result.value.items[0].id).toBe('cte-001');
      }

      // Verify repository was called with CTE filter
      expect(mockRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 1,
          branchId: 1,
          documentType: ['CTE'],
        }),
        expect.objectContaining({ page: 1, pageSize: 20 }),
      );
    });

    it('should return empty result when no CTes found', async () => {
      const emptyResult: PaginatedResult<FiscalDocument> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };

      (mockRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(emptyResult);

      const result = await useCase.execute({}, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.total).toBe(0);
        expect(result.value.totalPages).toBe(0);
      }
    });

    it('should use default pagination when not specified', async () => {
      const emptyResult: PaginatedResult<FiscalDocument> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };

      (mockRepository.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(emptyResult);

      const result = await useCase.execute({}, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.page).toBe(1);
        expect(result.value.pageSize).toBe(20);
      }
    });

    it('should fail for invalid page number', async () => {
      const result = await useCase.execute({ page: 0 }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Página deve ser >= 1');
      }
    });

    it('should fail for pageSize exceeding 100', async () => {
      const result = await useCase.execute({ pageSize: 101 }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Tamanho da página deve ser entre 1 e 100');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await useCase.execute({}, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao listar CTes');
        expect(result.error).toContain('Database connection failed');
      }
    });
  });
});
