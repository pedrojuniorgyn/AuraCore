import { describe, it, expect } from 'vitest';
import { BankStatementParser } from '@/modules/financial/domain/services/bank-statement/BankStatementParser';
import { Result } from '@/shared/domain';
import { 
  MOCK_CSV_ITAU, 
  MOCK_INVALID_OFX,
  MOCK_INVALID_CSV,
} from '../../../../../../fixtures/financial/bank-statement-fixtures';

describe('BankStatementParser', () => {
  describe('detectFormat', () => {
    it('deve detectar formato OFX pela extensão', () => {
      const result = BankStatementParser.detectFormat('<OFX>', 'extrato.ofx');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('OFX');
      }
    });

    it('deve detectar formato QFX pela extensão', () => {
      const result = BankStatementParser.detectFormat('<OFX>', 'extrato.qfx');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('QFX');
      }
    });

    it('deve detectar formato CSV pela extensão', () => {
      const result = BankStatementParser.detectFormat('col1;col2;col3', 'extrato.csv');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('CSV');
      }
    });

    it('deve detectar OFX pelo conteúdo quando extensão é txt', () => {
      const result = BankStatementParser.detectFormat('<OFX>...</OFX>', 'extrato.txt');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('OFX');
      }
    });

    it('deve detectar CSV pelo conteúdo quando extensão é txt', () => {
      const result = BankStatementParser.detectFormat('col1;col2;col3\nval1;val2;val3', 'extrato.txt');
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('CSV');
      }
    });

    it('deve falhar para formato não detectável', () => {
      const result = BankStatementParser.detectFormat(MOCK_INVALID_OFX, 'arquivo.xyz');
      
      expect(Result.isFail(result)).toBe(true);
    });
  });

  describe('parse CSV', () => {
    it('deve fazer parse de arquivo CSV', async () => {
      const result = await BankStatementParser.parse(
        MOCK_CSV_ITAU,
        'extrato.csv'
      );
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.parserUsed).toBe('CSV');
        expect(result.value.statement.transactions.length).toBeGreaterThan(0);
        expect(result.value.processingTimeMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve categorizar transações automaticamente', async () => {
      const result = await BankStatementParser.parse(
        MOCK_CSV_ITAU,
        'extrato.csv',
        { autoCategorizem: true }
      );
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        // Algumas transações devem ter categoria
        const categorized = result.value.statement.transactions.filter(
          t => t.category !== undefined
        );
        expect(categorized.length).toBeGreaterThan(0);
      }
    });

    it('deve normalizar descrições quando habilitado', async () => {
      const result = await BankStatementParser.parse(
        MOCK_CSV_ITAU,
        'extrato.csv',
        { normalizeDescriptions: true }
      );
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const hasNormalized = result.value.statement.transactions.some(
          t => t.normalizedDescription !== undefined
        );
        expect(hasNormalized).toBe(true);
      }
    });

    it('deve validar statement quando habilitado', async () => {
      const result = await BankStatementParser.parse(
        MOCK_CSV_ITAU,
        'extrato.csv',
        { validateBalance: true }
      );
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(typeof result.value.statement.isValid).toBe('boolean');
      }
    });
  });

  describe('parseCSV direct', () => {
    it('deve chamar CSVParser diretamente', async () => {
      const result = await BankStatementParser.parseCSV(
        MOCK_CSV_ITAU,
        'extrato.csv'
      );
      
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.format).toBe('CSV');
      }
    });
  });

  describe('validate', () => {
    it('deve validar statement existente', async () => {
      const parseResult = await BankStatementParser.parseCSV(
        MOCK_CSV_ITAU,
        'extrato.csv'
      );
      
      expect(Result.isOk(parseResult)).toBe(true);
      if (Result.isOk(parseResult)) {
        const validationResult = BankStatementParser.validate(parseResult.value);
        
        expect(Result.isOk(validationResult)).toBe(true);
        if (Result.isOk(validationResult)) {
          expect(typeof validationResult.value.isValid).toBe('boolean');
          expect(Array.isArray(validationResult.value.validationErrors)).toBe(true);
          expect(Array.isArray(validationResult.value.validationWarnings)).toBe(true);
        }
      }
    });
  });

  describe('getSupportedFormats', () => {
    it('deve retornar lista de formatos suportados', () => {
      const formats = BankStatementParser.getSupportedFormats();
      
      expect(formats).toContain('OFX');
      expect(formats).toContain('QFX');
      expect(formats).toContain('CSV');
      expect(formats).toContain('TXT');
    });
  });

  describe('isFormatSupported', () => {
    it('deve retornar true para formato suportado', () => {
      expect(BankStatementParser.isFormatSupported('OFX')).toBe(true);
      expect(BankStatementParser.isFormatSupported('csv')).toBe(true);
      expect(BankStatementParser.isFormatSupported('CSV')).toBe(true);
    });

    it('deve retornar false para formato não suportado', () => {
      expect(BankStatementParser.isFormatSupported('PDF')).toBe(false);
      expect(BankStatementParser.isFormatSupported('XLS')).toBe(false);
    });
  });
});
