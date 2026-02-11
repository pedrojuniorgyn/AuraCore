import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostJournalEntryUseCase } from '@/modules/accounting/application/commands/PostJournalEntryUseCase';
import type { IJournalEntryRepository } from '@/modules/accounting/domain/ports/output/IJournalEntryRepository';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { Money, Result } from '@/shared/domain';
import type { ExecutionContext } from '@/modules/accounting/application/use-cases/BaseUseCase';

/**
 * Helper para extrair valor de Result em testes sem usar non-null assertion
 */
function unwrapOrFail<T>(result: Result<T, string>, context: string): T {
  if (!Result.isOk(result)) {
    throw new Error(`${context} failed: ${result.error}`);
  }
  return result.value;
}

describe('PostJournalEntryUseCase', () => {
  let useCase: PostJournalEntryUseCase;
  let mockRepository: IJournalEntryRepository;
  let ctx: ExecutionContext;
  let balancedEntry: JournalEntry;

  beforeEach(() => {
    // Criar entrada balanceada
    const entryResult = JournalEntry.create({
      id: '550e8400-e29b-41d4-a716-446655440000',
      organizationId: 1,
      branchId: 1,
      entryNumber: 'LC-2025-000001',
      entryDate: new Date(),
      description: 'Test entry',
      source: 'MANUAL',
    });
    balancedEntry = unwrapOrFail(entryResult, 'JournalEntry.create');

    // Adicionar linhas balanceadas
    const money = unwrapOrFail(Money.create(1000), 'Money.create');
    const line1 = unwrapOrFail(JournalEntryLine.create({
      id: 'line-001',
      journalEntryId: balancedEntry.id,
      accountId: 'acc-001',
      accountCode: '1.1.1.01',
      entryType: 'DEBIT',
      amount: money,
    }), 'JournalEntryLine.create (line1)');
    balancedEntry.addLine(line1);
    
    const line2 = unwrapOrFail(JournalEntryLine.create({
      id: 'line-002',
      journalEntryId: balancedEntry.id,
      accountId: 'acc-002',
      accountCode: '2.1.1.01',
      entryType: 'CREDIT',
      amount: money,
    }), 'JournalEntryLine.create (line2)');
    balancedEntry.addLine(line2);

    mockRepository = {
      findById: vi.fn().mockResolvedValue(balancedEntry),
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveMany: vi.fn().mockResolvedValue(undefined),
      findByPeriod: vi.fn(),
      findBySourceId: vi.fn(),
      exists: vi.fn(),
      nextEntryNumber: vi.fn(),
    };

    const mockEventPublisher: IEventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      publishBatch: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getHandlers: vi.fn().mockReturnValue([]),
    };

    const mockLogger: ILogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new PostJournalEntryUseCase(
      mockRepository,
      mockEventPublisher,
      mockLogger
    );

    ctx = {
      userId: 'user-001',
      organizationId: 1,
      branchId: 1,
      isAdmin: false,
    };
  });

  describe('execute', () => {
    it('should post balanced entry', async () => {
      const result = await useCase.execute({
        journalEntryId: balancedEntry.id,
      }, ctx);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.status).toBe('POSTED');
        expect(result.value.postedBy).toBe('user-001');
      }
    });

    it('should fail if entry not found', async () => {
      (mockRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute({
        journalEntryId: '550e8400-e29b-41d4-a716-446655440999',
      }, ctx);

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('not found');
      }
    });

    it('should fail for non-admin accessing other branch', async () => {
      const result = await useCase.execute({
        journalEntryId: balancedEntry.id,
      }, {
        ...ctx,
        branchId: 999,
        isAdmin: false,
      });

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Access denied');
      }
    });
  });
});

