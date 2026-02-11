import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateCteUseCase } from '@/modules/fiscal/application/commands/cte/UpdateCteUseCase';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: UpdateCteUseCase
 *
 * Tests: valid update of DRAFT CTE, fail on non-DRAFT status,
 * fail on non-CTE document type, input validation.
 */
describe('UpdateCteUseCase', () => {
  let useCase: UpdateCteUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let ctx: ExecutionContext;

  /** Factory for mock fiscal document */
  function makeMockCteDocument(overrides: Partial<Record<string, unknown>> = {}): FiscalDocument {
    return {
      id: 'cte-001',
      documentType: 'CTE',
      series: '1',
      number: '000001',
      status: 'DRAFT',
      isEditable: true,
      issueDate: new Date('2026-01-15'),
      totalDocument: { amount: 3000 },
      updatedAt: new Date('2026-01-16'),
      ...overrides,
    } as unknown as FiscalDocument;
  }

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByFiscalKey: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveMany: vi.fn(),
      exists: vi.fn(),
      nextDocumentNumber: vi.fn(),
    };

    useCase = new UpdateCteUseCase(mockRepository);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should update a DRAFT CTe successfully', async () => {
      const mockDoc = makeMockCteDocument();
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', recipientName: 'Novo Destinatário' },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('cte-001');
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }

      expect(mockRepository.save).toHaveBeenCalledWith(mockDoc);
      expect(mockRepository.findById).toHaveBeenCalledWith('cte-001', 1, 1);
    });

    it('should fail when CTe is not in DRAFT status (AUTHORIZED)', async () => {
      const authorizedDoc = makeMockCteDocument({
        status: 'AUTHORIZED',
        isEditable: false,
      });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(authorizedDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', recipientName: 'Novo' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não pode ser atualizado');
        expect(result.error).toContain('AUTHORIZED');
      }
    });

    it('should fail when document is not a CTE', async () => {
      const nfeDoc = makeMockCteDocument({ documentType: 'NFE' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(nfeDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', recipientName: 'Novo' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não é um CTe');
        expect(result.error).toContain('NFE');
      }
    });

    it('should fail when CTe not found', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute(
        { cteId: 'nonexistent', recipientName: 'Novo' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should fail when cteId is empty', async () => {
      const result = await useCase.execute({ cteId: '', recipientName: 'Novo' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cteId é obrigatório');
      }
    });

    it('should fail when no update fields provided', async () => {
      const result = await useCase.execute({ cteId: 'cte-001' }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Pelo menos um campo');
      }
    });

    it('should fail when totalValue is negative', async () => {
      const result = await useCase.execute(
        { cteId: 'cte-001', totalValue: -100 },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Valor total não pode ser negativo');
      }
    });

    it('should fail when item has empty description', async () => {
      const result = await useCase.execute(
        {
          cteId: 'cte-001',
          items: [{ description: '', quantity: 1, value: 100 }],
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Descrição do item é obrigatória');
      }
    });

    it('should fail when item quantity is zero or negative', async () => {
      const result = await useCase.execute(
        {
          cteId: 'cte-001',
          items: [{ description: 'Frete', quantity: 0, value: 100 }],
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Quantidade do item deve ser positiva');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await useCase.execute(
        { cteId: 'cte-001', recipientName: 'Novo' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao atualizar CTe');
      }
    });
  });
});
