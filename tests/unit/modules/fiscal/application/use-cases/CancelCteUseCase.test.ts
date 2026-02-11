import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelCteUseCase } from '@/modules/fiscal/application/commands/cte/CancelCteUseCase';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: CancelCteUseCase
 *
 * Tests: cancel AUTHORIZED CTE, cancel DRAFT CTE, fail on wrong status,
 * fail on non-CTE, reason validation, and error handling.
 */
describe('CancelCteUseCase', () => {
  let useCase: CancelCteUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let mockLogger: ILogger;
  let ctx: ExecutionContext;

  const VALID_REASON = 'Cancelamento necessário por erro nos dados do destinatário do frete';

  /** Factory for mock fiscal document */
  function makeMockCteDocument(overrides: Partial<Record<string, unknown>> = {}): FiscalDocument {
    return {
      id: 'cte-001',
      documentType: 'CTE',
      series: '1',
      number: '000001',
      status: 'AUTHORIZED',
      issueDate: new Date('2026-01-15'),
      totalDocument: { amount: 5000 },
      cancel: vi.fn().mockReturnValue(Result.ok(undefined)),
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

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new CancelCteUseCase(mockRepository, mockLogger);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should cancel an AUTHORIZED CTe successfully', async () => {
      const mockDoc = makeMockCteDocument({ status: 'AUTHORIZED' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe('cte-001');
        expect(result.value.status).toBe('CANCELLED');
        expect(result.value.cancelledAt).toBeInstanceOf(Date);
      }

      expect(mockDoc.cancel).toHaveBeenCalledWith({
        reason: VALID_REASON,
        protocolNumber: '',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockDoc);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should cancel a DRAFT CTe successfully', async () => {
      const mockDoc = makeMockCteDocument({ status: 'DRAFT' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('CANCELLED');
      }

      expect(mockDoc.cancel).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when CTe is in CANCELLED status', async () => {
      const cancelledDoc = makeMockCteDocument({ status: 'CANCELLED' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cancelledDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não pode ser cancelado');
        expect(result.error).toContain('CANCELLED');
      }
    });

    it('should fail when CTe is in SUBMITTED status', async () => {
      const submittedDoc = makeMockCteDocument({ status: 'SUBMITTED' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(submittedDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não pode ser cancelado');
      }
    });

    it('should fail when document is not a CTE (NFE)', async () => {
      const nfeDoc = makeMockCteDocument({ documentType: 'NFE' });
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(nfeDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
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
        { cteId: 'nonexistent', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não encontrado');
      }
    });

    it('should fail when reason is too short (< 15 chars)', async () => {
      const result = await useCase.execute(
        { cteId: 'cte-001', reason: 'Motivo curto' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('pelo menos 15 caracteres');
      }
    });

    it('should fail when reason is empty', async () => {
      const result = await useCase.execute(
        { cteId: 'cte-001', reason: '' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Motivo do cancelamento é obrigatório');
      }
    });

    it('should fail when cteId is empty', async () => {
      const result = await useCase.execute(
        { cteId: '', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('cteId é obrigatório');
      }
    });

    it('should fail when organizationId is invalid', async () => {
      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        { ...ctx, organizationId: 0 },
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('organizationId inválido');
      }
    });

    it('should fail when domain cancel returns error', async () => {
      const mockDoc = makeMockCteDocument({ status: 'AUTHORIZED' });
      (mockDoc as unknown as { cancel: ReturnType<typeof vi.fn> }).cancel = vi
        .fn()
        .mockReturnValue(Result.fail('Cancellation deadline expired'));
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Cancellation deadline expired');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB failure'),
      );

      const result = await useCase.execute(
        { cteId: 'cte-001', reason: VALID_REASON },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao cancelar CTe');
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
