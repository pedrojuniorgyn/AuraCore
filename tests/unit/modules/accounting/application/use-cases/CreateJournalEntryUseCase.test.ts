import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateJournalEntryUseCase } from '@/modules/accounting/application/use-cases/CreateJournalEntryUseCase';
import type { IJournalEntryRepository } from '@/modules/accounting/domain/ports/output/IJournalEntryRepository';
import { Result } from '@/shared/domain';
import type { ExecutionContext } from '@/modules/accounting/application/use-cases/BaseUseCase';

describe('CreateJournalEntryUseCase', () => {
  let useCase: CreateJournalEntryUseCase;
  let mockRepository: IJournalEntryRepository;
  let ctx: ExecutionContext;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveMany: vi.fn().mockResolvedValue(undefined),
      findByPeriod: vi.fn(),
      findBySourceId: vi.fn(),
      exists: vi.fn(),
      nextEntryNumber: vi.fn().mockResolvedValue('LC-2025-000001'),
    };

    useCase = new CreateJournalEntryUseCase(mockRepository);

    ctx = {
      userId: 'user-001',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  describe('execute', () => {
    const validInput = {
      entryDate: new Date().toISOString(),
      description: 'Test journal entry',
      source: 'MANUAL' as const,
      lines: [],
    };

    it('should create journal entry successfully', async () => {
      const result = await useCase.execute(validInput, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.entryNumber).toBe('LC-2025-000001');
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.lineCount).toBe(0);
      }
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create journal entry with lines', async () => {
      const inputWithLines = {
        ...validInput,
        lines: [
          {
            accountId: '550e8400-e29b-41d4-a716-446655440001',
            accountCode: '1.1.1.01',
            entryType: 'DEBIT' as const,
            amount: 1000,
            currency: 'BRL',
          },
          {
            accountId: '550e8400-e29b-41d4-a716-446655440002',
            accountCode: '2.1.1.01',
            entryType: 'CREDIT' as const,
            amount: 1000,
            currency: 'BRL',
          },
        ],
      };

      const result = await useCase.execute(inputWithLines, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.lineCount).toBe(2);
        expect(result.value.totalDebit).toBe(1000);
        expect(result.value.totalCredit).toBe(1000);
        expect(result.value.isBalanced).toBe(true);
      }
    });

    it('should fail with empty description', async () => {
      const result = await useCase.execute({
        ...validInput,
        description: '',
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
      const savedEntry = (mockRepository.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedEntry.organizationId).toBe(5);
      expect(savedEntry.branchId).toBe(10);
    });
  });
});

