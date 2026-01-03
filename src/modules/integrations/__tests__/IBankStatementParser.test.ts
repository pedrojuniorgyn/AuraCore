/**
 * IBankStatementParser Tests
 * E7.9 Integrações - Semana 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockBankStatementParser } from '../infrastructure/adapters/ofx/MockBankStatementParser';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

describe('IBankStatementParser (Mock)', () => {
  let parser: MockBankStatementParser;

  beforeEach(() => {
    parser = new MockBankStatementParser();
    parser.resetFailure();
  });

  describe('parseOFX', () => {
    it('should parse OFX content successfully', async () => {
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
...
`;

      const result = await parser.parseOFX(ofxContent);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.accountNumber).toBe('12345-6');
      expect(result.value.bankCode).toBe('001');
      expect(result.value.transactions).toBeInstanceOf(Array);
      expect(result.value.transactions.length).toBeGreaterThan(0);
    });

    it('should return statement with valid Money objects', async () => {
      const ofxContent = 'mock ofx content';

      const result = await parser.parseOFX(ofxContent);

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.openingBalance).toBeInstanceOf(Money);
      expect(result.value.closingBalance).toBeInstanceOf(Money);
      expect(result.value.transactions[0].amount).toBeInstanceOf(Money);
    });

    it('should fail when configured to fail', async () => {
      parser.setFailure('Invalid OFX format');

      const result = await parser.parseOFX('invalid content');

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toBe('Invalid OFX format');
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV content successfully', async () => {
      const csvContent = `
Date,Description,Amount,Type
2024-01-15,Payment received,500.00,CREDIT
`;

      const result = await parser.parseCSV(csvContent, '001');

      expect(Result.isOk(result)).toBe(true);
      expect(result.value.bankCode).toBe('001');
      expect(result.value.transactions).toBeInstanceOf(Array);
    });
  });
});

