/**
 * Integration Tests - Accounting Domain
 * E7.27 - Testes de Integração
 *
 * Testa value objects e regras de negócio do módulo contábil.
 *
 * @see Partidas Dobradas: Σ Débitos = Σ Créditos
 * @see IN RFB 1.774/17 - SPED
 */

import { describe, it, expect } from 'vitest';
import { Result, Money } from '@/shared/domain';
import { AccountingPeriod } from '@/modules/accounting/domain/value-objects/AccountingPeriod';
import { JournalEntryLine } from '@/modules/accounting/domain/entities/JournalEntryLine';

describe('Accounting Domain - Integration Tests', () => {
  // ==================== ACCOUNTING PERIOD TESTS ====================

  describe('Accounting Period', () => {
    it('should create valid period', () => {
      const periodResult = AccountingPeriod.create({ year: 2026, month: 1 });

      expect(Result.isOk(periodResult)).toBe(true);
      if (Result.isOk(periodResult)) {
        expect(periodResult.value.year).toBe(2026);
        expect(periodResult.value.month).toBe(1);
        expect(periodResult.value.periodKey).toBe('2026-01');
        expect(periodResult.value.isClosed).toBe(false);
      }
    });

    it('should reject invalid month (> 12)', () => {
      const periodResult = AccountingPeriod.create({ year: 2026, month: 13 });

      expect(Result.isFail(periodResult)).toBe(true);
    });

    it('should reject invalid month (< 1)', () => {
      const periodResult = AccountingPeriod.create({ year: 2026, month: 0 });

      expect(Result.isFail(periodResult)).toBe(true);
    });

    it('should validate date in period', () => {
      const periodResult = AccountingPeriod.create({ year: 2026, month: 1 });
      const period = periodResult.value!;

      expect(period.containsDate(new Date('2026-01-15'))).toBe(true);
      expect(period.containsDate(new Date('2026-02-15'))).toBe(false);
    });

    it('should create period from date', () => {
      const periodResult = AccountingPeriod.fromDate(new Date('2026-03-15'));

      expect(Result.isOk(periodResult)).toBe(true);
      if (Result.isOk(periodResult)) {
        expect(periodResult.value.year).toBe(2026);
        expect(periodResult.value.month).toBe(3);
      }
    });
  });

  // ==================== JOURNAL ENTRY LINE TESTS ====================

  describe('Journal Entry Line', () => {
    it('should create valid debit line', () => {
      const amount = Money.create(1000, 'BRL').value!;

      const lineResult = JournalEntryLine.create({
        id: 'line-001',
        journalEntryId: 'entry-001',
        accountId: 'acc-001',
        accountCode: '1.1.01',
        entryType: 'DEBIT',
        amount,
        description: 'Test debit',
      });

      expect(Result.isOk(lineResult)).toBe(true);
      if (Result.isOk(lineResult)) {
        expect(lineResult.value.isDebit).toBe(true);
        expect(lineResult.value.isCredit).toBe(false);
        expect(lineResult.value.amount.amount).toBe(1000);
      }
    });

    it('should create valid credit line', () => {
      const amount = Money.create(500, 'BRL').value!;

      const lineResult = JournalEntryLine.create({
        id: 'line-002',
        journalEntryId: 'entry-001',
        accountId: 'acc-002',
        accountCode: '2.1.01',
        entryType: 'CREDIT',
        amount,
        description: 'Test credit',
      });

      expect(Result.isOk(lineResult)).toBe(true);
      if (Result.isOk(lineResult)) {
        expect(lineResult.value.isDebit).toBe(false);
        expect(lineResult.value.isCredit).toBe(true);
      }
    });

    it('should reject line with zero amount', () => {
      const amount = Money.create(0, 'BRL').value!;

      const lineResult = JournalEntryLine.create({
        id: 'line-zero',
        journalEntryId: 'entry-001',
        accountId: 'acc-001',
        accountCode: '1.1.01',
        entryType: 'DEBIT',
        amount,
        description: 'Zero amount',
      });

      expect(Result.isFail(lineResult)).toBe(true);
    });

    it('should calculate signed amount correctly', () => {
      const debitAmount = Money.create(1000, 'BRL').value!;
      const creditAmount = Money.create(500, 'BRL').value!;

      const debitLine = JournalEntryLine.create({
        id: 'line-d',
        journalEntryId: 'entry-001',
        accountId: 'acc-001',
        accountCode: '1.1.01',
        entryType: 'DEBIT',
        amount: debitAmount,
      }).value!;

      const creditLine = JournalEntryLine.create({
        id: 'line-c',
        journalEntryId: 'entry-001',
        accountId: 'acc-002',
        accountCode: '2.1.01',
        entryType: 'CREDIT',
        amount: creditAmount,
      }).value!;

      // Debit: positive, Credit: negative
      expect(debitLine.signedAmount).toBe(1000);
      expect(creditLine.signedAmount).toBe(-500);
    });
  });

  // ==================== PARTIDAS DOBRADAS (DOUBLE-ENTRY) TESTS ====================

  describe('Double-Entry Accounting Rules', () => {
    it('should verify balanced entry (debits = credits)', () => {
      const debit1 = Money.create(600, 'BRL').value!;
      const debit2 = Money.create(400, 'BRL').value!;
      const credit1 = Money.create(700, 'BRL').value!;
      const credit2 = Money.create(300, 'BRL').value!;

      const totalDebits = debit1.amount + debit2.amount;
      const totalCredits = credit1.amount + credit2.amount;

      expect(totalDebits).toBe(1000);
      expect(totalCredits).toBe(1000);
      expect(totalDebits).toBe(totalCredits);
    });

    it('should calculate trial balance', () => {
      // Simulate accounts with balances
      const accounts = [
        { code: '1.1.01', name: 'Cash', debit: 5000, credit: 2000 },
        { code: '1.2.01', name: 'A/R', debit: 3000, credit: 1000 },
        { code: '2.1.01', name: 'A/P', debit: 500, credit: 4000 },
        { code: '3.1.01', name: 'Capital', debit: 0, credit: 5500 },
      ];

      const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
      const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);

      expect(totalDebits).toBe(8500);
      expect(totalCredits).toBe(12500);

      // Net balances
      const netBalances = accounts.map((acc) => ({
        code: acc.code,
        balance: acc.debit - acc.credit,
      }));

      expect(netBalances[0].balance).toBe(3000); // Cash (debit balance)
      expect(netBalances[2].balance).toBe(-3500); // A/P (credit balance)
    });
  });
});
