import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManifestNfeUseCase } from '@/modules/fiscal/application/use-cases/ManifestNfeUseCase';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: ManifestNfeUseCase
 *
 * Tests: valid CIENCIA manifest, DESCONHECIMENTO requires reason,
 * invalid fiscal key, wrong document type, and error handling.
 */
describe('ManifestNfeUseCase', () => {
  let useCase: ManifestNfeUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let mockLogger: ILogger;
  let ctx: ExecutionContext;

  /** Valid 44-digit fiscal key for testing */
  const VALID_FISCAL_KEY = '35260112345678000199550010000001231000001234';

  /** Factory for mock NFe fiscal document */
  function makeMockNfeDocument(overrides: Partial<Record<string, unknown>> = {}): FiscalDocument {
    return {
      id: 'nfe-001',
      documentType: 'NFE',
      series: '1',
      number: '000123',
      status: 'AUTHORIZED',
      fiscalKey: { value: VALID_FISCAL_KEY },
      issueDate: new Date('2026-01-15'),
      totalDocument: { amount: 10000 },
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

    useCase = new ManifestNfeUseCase(mockRepository, mockLogger);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should manifest CIENCIA successfully without reason', async () => {
      const mockDoc = makeMockNfeDocument();
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.documentId).toBe('nfe-001');
        expect(result.value.fiscalKey).toBe(VALID_FISCAL_KEY);
        expect(result.value.manifestType).toBe('CIENCIA');
        expect(result.value.processedAt).toBeInstanceOf(Date);
      }

      expect(mockRepository.findByFiscalKey).toHaveBeenCalledWith(VALID_FISCAL_KEY, 1, 1);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should manifest CONFIRMACAO successfully', async () => {
      const mockDoc = makeMockNfeDocument();
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'CONFIRMACAO',
        },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.manifestType).toBe('CONFIRMACAO');
      }
    });

    it('should manifest DESCONHECIMENTO with valid reason', async () => {
      const mockDoc = makeMockNfeDocument();
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'DESCONHECIMENTO',
          reason: 'Não reconheço esta operação realizada em nome da empresa',
        },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.manifestType).toBe('DESCONHECIMENTO');
      }
    });

    it('should fail DESCONHECIMENTO without reason', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'DESCONHECIMENTO',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Justificativa é obrigatória');
        expect(result.error).toContain('DESCONHECIMENTO');
      }
    });

    it('should fail NAO_REALIZADA without reason', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'NAO_REALIZADA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Justificativa é obrigatória');
        expect(result.error).toContain('NAO_REALIZADA');
      }
    });

    it('should fail NAO_REALIZADA with short reason (< 15 chars)', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'NAO_REALIZADA',
          reason: 'Curta demais',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('pelo menos 15 caracteres');
      }
    });

    it('should fail with invalid fiscal key (wrong length)', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: '12345678',
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('44 dígitos');
      }
    });

    it('should fail with fiscal key containing non-numeric chars', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: '3526011234567800019955001000000123100000123A',
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('apenas dígitos numéricos');
      }
    });

    it('should fail with empty fiscal key', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: '',
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Chave fiscal é obrigatória');
      }
    });

    it('should fail when NFe not found by fiscal key', async () => {
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não encontrada');
      }
    });

    it('should fail when document is not NFE (is CTE)', async () => {
      const cteDoc = makeMockNfeDocument({ documentType: 'CTE' });
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(cteDoc);

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não é uma NFe');
        expect(result.error).toContain('CTE');
      }
    });

    it('should fail with invalid manifestType', async () => {
      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'INVALID_TYPE' as 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Tipo de manifestação inválido');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await useCase.execute(
        {
          fiscalKey: VALID_FISCAL_KEY,
          manifestType: 'CIENCIA',
        },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao manifestar NFe');
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
