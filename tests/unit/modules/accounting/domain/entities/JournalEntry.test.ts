import { describe, it, expect, beforeEach } from 'vitest';
import { JournalEntry } from '@/modules/accounting/domain/entities/JournalEntry';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';
import { Money, Result } from '@/shared/domain';

describe('JournalEntry', () => {
  const validProps = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: 1,
    branchId: 1,
    entryNumber: 'LC-2025-000001',
    entryDate: new Date('2025-01-15'),
    description: 'Test journal entry',
    source: 'MANUAL' as const,
  };

  describe('create', () => {
    it('should create valid JournalEntry', () => {
      const result = JournalEntry.create(validProps);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.id).toBe(validProps.id);
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.lineCount).toBe(0);
      }
    });

    it('should fail without id', () => {
      const result = JournalEntry.create({
        ...validProps,
        id: '',
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without organizationId', () => {
      const result = JournalEntry.create({
        ...validProps,
        organizationId: 0,
      });

      expect(Result.isFail(result)).toBe(true);
    });

    it('should fail without branchId', () => {
      const result = JournalEntry.create({
        ...validProps,
        branchId: 0,
      });

      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('addLine', () => {
    it('should add line to DRAFT entry', () => {
      const entryResult = JournalEntry.create(validProps);
      expect(Result.isOk(entryResult)).toBe(true);
      const entry = entryResult.value!;

      const moneyResult = Money.create(1000);
      const lineResult = JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: moneyResult.value!,
      });

      const addResult = entry.addLine(lineResult.value!);

      expect(Result.isOk(addResult)).toBe(true);
      expect(entry.lineCount).toBe(1);
      expect(entry.debitCount).toBe(1);
    });
  });

  describe('post', () => {
    it('should post balanced entry', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      // Add debit line
      const debitMoney = Money.create(1000).value!;
      const debitLine = JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: debitMoney,
      }).value!;
      entry.addLine(debitLine);

      // Add credit line
      const creditMoney = Money.create(1000).value!;
      const creditLine = JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: creditMoney,
      }).value!;
      entry.addLine(creditLine);

      const postResult = entry.post('user-001');

      expect(Result.isOk(postResult)).toBe(true);
      expect(entry.status).toBe('POSTED');
      expect(entry.postedBy).toBe('user-001');
      expect(entry.postedAt).toBeDefined();
    });

    it('should fail to post unbalanced entry', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      // Add only debit line (unbalanced)
      const debitMoney = Money.create(1000).value!;
      const debitLine = JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: debitMoney,
      }).value!;
      entry.addLine(debitLine);

      // Add credit with different amount
      const creditMoney = Money.create(500).value!;
      const creditLine = JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: creditMoney,
      }).value!;
      entry.addLine(creditLine);

      const postResult = entry.post('user-001');

      expect(Result.isFail(postResult)).toBe(true);
      if (Result.isFail(postResult)) {
        expect(postResult.error).toContain('Unbalanced');
      }
    });

    it('should fail to post empty entry', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      const postResult = entry.post('user-001');

      expect(Result.isFail(postResult)).toBe(true);
    });

    it('should fail to post already posted entry', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      // Add balanced lines
      const money = Money.create(1000).value!;
      entry.addLine(JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: money,
      }).value!);
      entry.addLine(JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: money,
      }).value!);

      // First post - should succeed
      entry.post('user-001');

      // Second post - should fail
      const secondPost = entry.post('user-001');

      expect(Result.isFail(secondPost)).toBe(true);
    });
  });

  describe('isBalanced', () => {
    it('should return true when debits equal credits', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      const money = Money.create(1000).value!;
      entry.addLine(JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: money,
      }).value!);
      entry.addLine(JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: money,
      }).value!);

      expect(entry.isBalanced).toBe(true);
    });

    it('should return false when debits do not equal credits', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      entry.addLine(JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: Money.create(1000).value!,
      }).value!);
      entry.addLine(JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: Money.create(500).value!,
      }).value!);

      expect(entry.isBalanced).toBe(false);
    });
  });

  describe('createReversal', () => {
    it('should create reversal entry with inverted lines', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!;

      // Add balanced lines
      const money = Money.create(1000).value!;
      entry.addLine(JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: entry.id,
        accountId: 'acc-001',
        accountCode: '1.1.1.01',
        entryType: 'DEBIT',
        amount: money,
      }).value!);
      entry.addLine(JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: entry.id,
        accountId: 'acc-002',
        accountCode: '2.1.1.01',
        entryType: 'CREDIT',
        amount: money,
      }).value!);

      // Post the entry
      entry.post('user-001');

      // Create reversal
      const reversalResult = JournalEntry.createReversal(entry, {
        id: 'reversal-001',
        entryNumber: 'LC-2025-000002',
        description: 'Reversal of test entry',
      });

      expect(Result.isOk(reversalResult)).toBe(true);
      if (Result.isOk(reversalResult)) {
        const reversal = reversalResult.value;
        expect(reversal.source).toBe('REVERSAL');
        expect(reversal.reversesId).toBe(entry.id);
        expect(reversal.lineCount).toBe(2);
        // Lines should be inverted
        expect(reversal.lines[0].isCredit).toBe(true); // Original was DEBIT
        expect(reversal.lines[1].isDebit).toBe(true);  // Original was CREDIT
      }
    });

    it('should fail to reverse non-posted entry', () => {
      const entryResult = JournalEntry.create(validProps);
      const entry = entryResult.value!; // DRAFT

      const reversalResult = JournalEntry.createReversal(entry, {
        id: 'reversal-001',
        entryNumber: 'LC-2025-000002',
        description: 'Reversal',
      });

      expect(Result.isFail(reversalResult)).toBe(true);
    });
  });
});

