import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfxParserAdapter } from '../../infrastructure/adapters/ofx/OfxParserAdapter';
import { Result } from '@/shared/domain';

// Mock da biblioteca ofx-parser
vi.mock('ofx-parser', () => ({
  parse: vi.fn((content: string) => ({
    OFX: {
      BANKMSGSRSV1: {
        STMTTRNRS: [
          {
            STMTRS: {
              BANKACCTFROM: {
                ACCTID: '123456',
                BANKID: '001',
              },
              LEDGERBAL: {
                BALAMT: '1000.00',
              },
              AVAILBAL: {
                BALAMT: '1000.00',
              },
              BANKTRANLIST: {
                DTSTART: '20240101000000',
                DTEND: '20240131235959',
                STMTTRN: [
                  {
                    FITID: 'TX-001',
                    DTPOSTED: '20240115120000',
                    TRNAMT: '100.00',
                    NAME: 'Deposit',
                    MEMO: 'Salary deposit',
                  },
                  {
                    FITID: 'TX-002',
                    DTPOSTED: '20240120140000',
                    TRNAMT: '-50.00',
                    NAME: 'Payment',
                    MEMO: 'Grocery store',
                    CHECKNUM: '001',
                  },
                ],
              },
            },
          },
        ],
      },
    },
  })),
}));

describe('OfxParserAdapter Integration', () => {
  let adapter: OfxParserAdapter;

  beforeEach(() => {
    adapter = new OfxParserAdapter();
    vi.clearAllMocks();
  });

  describe('parseOFX', () => {
    it('should parse OFX content successfully', async () => {
      // GIVEN
      const ofxContent = `
        OFXHEADER:100
        DATA:OFXSGML
        ... (OFX content)
      `;

      // WHEN
      const result = await adapter.parseOFX(ofxContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.accountNumber).toBe('123456');
      expect(result.value.bankCode).toBe('001');
      expect(result.value.transactions).toHaveLength(2);
    });

    it('should parse transactions with correct types', async () => {
      // GIVEN
      const ofxContent = 'mock-ofx-content';

      // WHEN
      const result = await adapter.parseOFX(ofxContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      const transactions = result.value.transactions;
      expect(transactions[0].type).toBe('CREDIT'); // Positive amount
      expect(transactions[1].type).toBe('DEBIT'); // Negative amount
    });

    it('should preserve transaction metadata', async () => {
      // GIVEN
      const ofxContent = 'mock-ofx-content';

      // WHEN
      const result = await adapter.parseOFX(ofxContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      const tx1 = result.value.transactions[0];
      expect(tx1.fitId).toBe('TX-001');
      expect(tx1.memo).toBe('Salary deposit');

      const tx2 = result.value.transactions[1];
      expect(tx2.checkNumber).toBe('001');
    });

    it('should handle invalid OFX format', async () => {
      // GIVEN - Mock retornando formato inválido
      const { parse } = await import('ofx-parser');
      vi.mocked(parse).mockResolvedValueOnce(null as never);

      const ofxContent = 'invalid-ofx';

      // WHEN
      const result = await adapter.parseOFX(ofxContent);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('OFX_INVALID_FORMAT');
    });

    it('should handle OFX without transactions', async () => {
      // GIVEN - Mock sem transações
      const { parse } = await import('ofx-parser');
      vi.mocked(parse).mockResolvedValueOnce({
        OFX: {
          BANKMSGSRSV1: {
            STMTTRNRS: [
              {
                STMTRS: {
                  BANKACCTFROM: {
                    ACCTID: '123456',
                    BANKID: '001',
                  },
                  LEDGERBAL: {
                    BALAMT: '1000.00',
                  },
                  AVAILBAL: {
                    BALAMT: '1000.00',
                  },
                  BANKTRANLIST: {
                    DTSTART: '20240101000000',
                    DTEND: '20240131235959',
                    STMTTRN: [],
                  },
                },
              },
            ],
          },
        },
      } as never);

      const ofxContent = 'ofx-without-transactions';

      // WHEN
      const result = await adapter.parseOFX(ofxContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.transactions).toHaveLength(0);
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV content successfully', async () => {
      // GIVEN
      const csvContent = `Data,Descrição,Valor,Saldo
01/01/2024,Depósito,100.00,1000.00
15/01/2024,Pagamento,-50.00,950.00`;

      // WHEN
      const result = await adapter.parseCSV(csvContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.transactions).toHaveLength(2);
      expect(result.value.accountNumber).toBe('CSV-IMPORT');
    });

    it('should handle CSV with quoted fields', async () => {
      // GIVEN
      const csvContent = `Data,Descrição,Valor,Saldo
"01/01/2024","Depósito, com vírgula","100,00","1000,00"`;

      // WHEN
      const result = await adapter.parseCSV(csvContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.transactions).toHaveLength(1);
      expect(result.value.transactions[0].description).toContain('vírgula');
    });

    it('should handle empty CSV', async () => {
      // GIVEN
      const csvContent = '';

      // WHEN
      const result = await adapter.parseCSV(csvContent);

      // THEN
      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('CSV_EMPTY');
    });

    it('should parse money strings correctly', async () => {
      // GIVEN - Formato brasileiro
      const csvContent = `Data,Descrição,Valor,Saldo
01/01/2024,Teste,"R$ 1.500,00","R$ 10.000,00"`;

      // WHEN
      const result = await adapter.parseCSV(csvContent);

      // THEN
      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      const tx = result.value.transactions[0];
      expect(tx.amount.amount).toBe(1500);
    });

    it('should handle parsing errors gracefully', async () => {
      // GIVEN - CSV mal formado
      const csvContent = `Data,Descrição,Valor
01/01/2024,Incomplete`; // Linha incompleta

      // WHEN
      const result = await adapter.parseCSV(csvContent);

      // THEN - Deve retornar sucesso mas ignorar linha inválida
      expect(Result.isOk(result)).toBe(true);
    });
  });
});

