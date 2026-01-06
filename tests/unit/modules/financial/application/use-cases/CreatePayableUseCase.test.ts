import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatePayableUseCase } from '@/modules/financial/application/use-cases/CreatePayableUseCase';
import { IPayableRepository } from '@/modules/financial/domain/ports/output/IPayableRepository';
import { Result } from '@/shared/domain';
import type { IUuidGenerator } from '@/shared/domain';
import { ExecutionContext } from '@/modules/financial/application/use-cases/BaseUseCase';

describe('CreatePayableUseCase', () => {
  let useCase: CreatePayableUseCase;
  let mockRepository: IPayableRepository;
  let mockUuidGenerator: IUuidGenerator;
  let ctx: ExecutionContext;

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      findOverdue: vi.fn(),
      findBySupplier: vi.fn(),
      exists: vi.fn(),
      nextDocumentNumber: vi.fn(),
    };

    // Mock UUID generator
    mockUuidGenerator = {
      generate: vi.fn().mockReturnValue('00000001-0000-4000-8000-000000000000'),
    };

    useCase = new CreatePayableUseCase(mockRepository, mockUuidGenerator);

    ctx = {
      userId: 'user-001',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  describe('execute', () => {
    const validInput = {
      supplierId: 100,
      documentNumber: 'NF-12345',
      description: 'Test payable',
      amount: 1000,
      currency: 'BRL',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    };

    it('should create payable successfully', async () => {
      const result = await useCase.execute(validInput, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.documentNumber).toBe('NF-12345');
        expect(result.value.status).toBe('OPEN');
        expect(result.value.amount).toBe(1000);
      }
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail with invalid supplierId', async () => {
      const result = await useCase.execute({
        ...validInput,
        supplierId: -1,
      }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Validation failed');
      }
    });

    it('should fail with empty document number', async () => {
      const result = await useCase.execute({
        ...validInput,
        documentNumber: '',
      }, ctx);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail with negative amount', async () => {
      const result = await useCase.execute({
        ...validInput,
        amount: -100,
      }, ctx);

      expect(Result.isFail(result)).toBe(true);
    });

    it('should use organization and branch from context', async () => {
      const result = await useCase.execute(validInput, {
        ...ctx,
        organizationId: 5,
        branchId: 10,
      });

      expect(Result.isOk(result)).toBe(true);
      // Verificar que save foi chamado com payable correto
      const savedPayable = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedPayable.organizationId).toBe(5);
      expect(savedPayable.branchId).toBe(10);
    });

    it('should handle repository error', async () => {
      (mockRepository.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

      const result = await useCase.execute(validInput, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Failed to save');
      }
    });
  });
});

