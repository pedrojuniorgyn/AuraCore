import { describe, it, expect, beforeEach } from 'vitest';
import { JournalEntryMapper } from '@/modules/accounting/infrastructure/persistence/JournalEntryMapper';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { Money, Result } from '@/shared/domain';
import type { JournalEntryRow, JournalEntryLineRow } from '@/modules/accounting/infrastructure/persistence/JournalEntrySchema';

/**
 * Helper para extrair valor de Result em testes
 */
function unwrapOrFail<T>(result: Result<T, string>, context: string): T {
  if (!Result.isOk(result)) {
    throw new Error(`${context} failed: ${result.error}`);
  }
  return result.value;
}

describe('JournalEntryMapper', () => {
  let validEntry: JournalEntry;

  beforeEach(() => {
    const entryResult = JournalEntry.create({
      id: '550e8400-e29b-41d4-a716-446655440000',
      organizationId: 1,
      branchId: 1,
      entryNumber: 'LC-2025-000001',
      entryDate: new Date('2025-01-15'),
      description: 'Test journal entry',
      source: 'MANUAL',
    });
    
    validEntry = unwrapOrFail(entryResult, 'JournalEntry.create');

    // Adicionar linhas
    const money = unwrapOrFail(Money.create(1000), 'Money.create');
    
    const debitLine = unwrapOrFail(
      JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: validEntry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: money,
      }),
      'JournalEntryLine.create debit'
    );
    validEntry.addLine(debitLine);

    const creditLine = unwrapOrFail(
      JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: validEntry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: money,
      }),
      'JournalEntryLine.create credit'
    );
    validEntry.addLine(creditLine);
  });

  describe('toPersistence', () => {
    it('should convert domain to persistence model', () => {
      const row = JournalEntryMapper.toPersistence(validEntry);

      expect(row.id).toBe(validEntry.id);
      expect(row.organizationId).toBe(1);
      expect(row.branchId).toBe(1);
      expect(row.entryNumber).toBe('LC-2025-000001');
      expect(row.periodYear).toBe(2025);
      expect(row.periodMonth).toBe(1);
      expect(row.status).toBe('DRAFT');
      expect(row.source).toBe('MANUAL');
    });
  });

  describe('toDomain', () => {
    it('should convert persistence to domain model', () => {
      const row: JournalEntryRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: 1,
        branchId: 1,
        entryNumber: 'LC-2025-000001',
        entryDate: new Date('2025-01-15'),
        periodYear: 2025,
        periodMonth: 1,
        description: 'Test entry',
        source: 'MANUAL',
        sourceId: null,
        status: 'DRAFT',
        reversedById: null,
        reversesId: null,
        postedAt: null,
        postedBy: null,
        notes: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = JournalEntryMapper.toDomain(row, []);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(row.id);
        expect(result.value.organizationId).toBe(1);
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.period.year).toBe(2025);
        expect(result.value.period.month).toBe(1);
      }
    });

    it('should include lines when provided', () => {
      const entryRow: JournalEntryRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: 1,
        branchId: 1,
        entryNumber: 'LC-2025-000001',
        entryDate: new Date('2025-01-15'),
        periodYear: 2025,
        periodMonth: 1,
        description: 'Test entry',
        source: 'MANUAL',
        sourceId: null,
        status: 'DRAFT',
        reversedById: null,
        reversesId: null,
        postedAt: null,
        postedBy: null,
        notes: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const lineRow: JournalEntryLineRow = {
        id: 'line-001',
        journalEntryId: '550e8400-e29b-41d4-a716-446655440000',
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: '1000.00',
        currency: 'BRL',
        description: null,
        costCenterId: null,
        businessPartnerId: null,
        createdAt: new Date(),
      };

      const result = JournalEntryMapper.toDomain(entryRow, [lineRow]);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.lineCount).toBe(1);
        expect(result.value.lines[0].amount.amount).toBe(1000);
        expect(result.value.lines[0].entryType).toBe('DEBIT');
      }
    });
  });

  describe('lineToPersistence', () => {
    it('should convert line domain to persistence', () => {
      const line = validEntry.lines[0];
      const row = JournalEntryMapper.lineToPersistence(line);

      expect(row.id).toBe(line.id);
      expect(row.journalEntryId).toBe(validEntry.id);
      expect(row.entryType).toBe('DEBIT');
      expect(row.amount).toBe('1000');
    });
  });
});

