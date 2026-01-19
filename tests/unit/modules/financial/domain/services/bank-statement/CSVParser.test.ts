import { describe, it, expect } from 'vitest';
import { CSVParser } from '@/modules/financial/domain/services/bank-statement/CSVParser';
import { Result } from '@/shared/domain';
import { 
  MOCK_CSV_ITAU, 
  MOCK_CSV_BRADESCO,
  MOCK_CSV_BB,
  MOCK_INVALID_CSV,
} from '../../../../../../fixtures/financial/bank-statement-fixtures';

describe('CSVParser', () => {
  describe('parse', () => {
    it('deve fazer parse de CSV Itaú', async () => {
      const result = await CSVParser.parse(MOCK_CSV_ITAU, 'extrato_itau.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.format).toBe('CSV');
        expect(result.value.transactions.length).toBeGreaterThan(0);
      }
    });

    it('deve fazer parse de CSV Bradesco', async () => {
      const result = await CSVParser.parse(MOCK_CSV_BRADESCO, 'extrato_bradesco.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.transactions.length).toBeGreaterThan(0);
      }
    });

    it('deve fazer parse de CSV Banco do Brasil', async () => {
      const result = await CSVParser.parse(MOCK_CSV_BB, 'extrato_bb.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.transactions.length).toBeGreaterThan(0);
      }
    });

    it('deve falhar com CSV sem transações válidas', async () => {
      const result = await CSVParser.parse(MOCK_INVALID_CSV, 'invalid.csv');
      
      expect(Result.isFail(result)).toBe(true);
    });

    it('deve calcular período a partir das transações', async () => {
      const result = await CSVParser.parse(MOCK_CSV_ITAU, 'extrato.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.period.startDate).toBeDefined();
        expect(result.value.period.endDate).toBeDefined();
        expect(result.value.period.startDate.getTime()).toBeLessThanOrEqual(
          result.value.period.endDate.getTime()
        );
      }
    });

    it('deve calcular saldo a partir das transações', async () => {
      const result = await CSVParser.parse(MOCK_CSV_ITAU, 'extrato.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(typeof result.value.balance.closingBalance).toBe('number');
      }
    });

    it('deve calcular sumário das transações', async () => {
      const result = await CSVParser.parse(MOCK_CSV_ITAU, 'extrato.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.summary.totalTransactions).toBeGreaterThan(0);
        expect(result.value.summary.creditCount + result.value.summary.debitCount).toBe(
          result.value.summary.totalTransactions
        );
      }
    });
  });

  describe('detectDelimiter', () => {
    it('deve detectar delimitador ponto-e-vírgula', () => {
      const delimiter = CSVParser.detectDelimiter(MOCK_CSV_ITAU);
      expect(delimiter).toBe(';');
    });

    it('deve detectar delimitador vírgula', () => {
      const delimiter = CSVParser.detectDelimiter(MOCK_CSV_BB);
      expect(delimiter).toBe(',');
    });

    it('deve detectar tab como delimitador', () => {
      const content = 'col1\tcol2\tcol3\nval1\tval2\tval3';
      const delimiter = CSVParser.detectDelimiter(content);
      expect(delimiter).toBe('\t');
    });
  });

  describe('isValidCSV', () => {
    it('deve validar CSV com estrutura correta', () => {
      expect(CSVParser.isValidCSV(MOCK_CSV_ITAU)).toBe(true);
    });

    it('deve rejeitar arquivo com poucas linhas', () => {
      expect(CSVParser.isValidCSV('apenas uma linha')).toBe(false);
    });

    it('deve rejeitar arquivo com poucas colunas', () => {
      expect(CSVParser.isValidCSV('col1\nval1')).toBe(false);
    });
  });

  describe('parse with config', () => {
    it('deve usar delimitador customizado', async () => {
      const customCSV = 'data|descricao|valor\n01/01/2026|TESTE|100,00';
      const result = await CSVParser.parse(customCSV, 'custom.csv', {
        csvDelimiter: '|',
      });
      
      expect(Result.isOk(result)).toBe(true);
    });

    it('deve usar formato de data customizado', async () => {
      const result = await CSVParser.parse(MOCK_CSV_ITAU, 'extrato.csv', {
        csvDateFormat: 'DD/MM/YYYY',
      });
      
      expect(Result.isOk(result)).toBe(true);
    });
  });
});
