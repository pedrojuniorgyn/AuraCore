/**
 * Tests for process_document - bank_statement type
 * D6 Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { processDocument } from '../../src/tools/process-document.js';

// Mock OFX content (Itaú format)
const MOCK_OFX_ITAU = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260115120000[-3:BRT]
<LANGUAGE>POR
<FI>
<ORG>Itau
<FID>341
</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101120000[-3:BRT]
<DTEND>20260115120000[-3:BRT]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260105120000[-3:BRT]
<TRNAMT>1500.00
<FITID>20260105001
<MEMO>TED RECEBIDA - CLIENTE ABC LTDA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260106120000[-3:BRT]
<TRNAMT>-250.00
<FITID>20260106001
<MEMO>PAGTO BOLETO - FORNECEDOR XYZ
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260110120000[-3:BRT]
<TRNAMT>-89.90
<FITID>20260110001
<MEMO>COMPRA CARTAO - POSTO SHELL
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>5160.10
<DTASOF>20260115120000[-3:BRT]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

// Mock CSV content (Itaú format)
const MOCK_CSV_ITAU = `data;lancamento;ag./origem;valor;
05/01/2026;TED RECEBIDA - CLIENTE ABC LTDA;0001;1500,00;
06/01/2026;PAGTO BOLETO - FORNECEDOR XYZ;0001;-250,00;
10/01/2026;COMPRA CARTAO - POSTO SHELL;0001;-89,90;
`;

// Mock CSV with separate credit/debit columns (Bradesco format)
const MOCK_CSV_BRADESCO = `Data;Histórico;Docto.;Crédito;Débito;Saldo
05/01/2026;TED RECEBIDA;123456;1500,00;;6500,00
06/01/2026;PAGAMENTO;789012;;250,00;6250,00
10/01/2026;COMPRA DÉBITO;345678;;89,90;6160,10
`;

describe('process_document - bank_statement', () => {
  describe('OFX parsing', () => {
    it('deve processar arquivo OFX com sucesso', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      expect(result.document_type).toBe('bank_statement');
      expect(result.data.bank_statement).toBeDefined();
    });

    it('deve extrair informações da conta corretamente do OFX', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.account.bankCode).toBe('341');
      expect(data.account.bankName).toBe('Itau');
      expect(data.account.accountNumber).toBe('12345-6');
      expect(data.account.accountType).toBe('CHECKING');
      expect(data.account.currency).toBe('BRL');
    });

    it('deve extrair transações corretamente do OFX', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.transactions.length).toBe(3);
      
      // First transaction: TED credit
      expect(data.transactions[0].amount).toBe(1500);
      expect(data.transactions[0].type).toBe('CREDIT');
      expect(data.transactions[0].description).toContain('TED RECEBIDA');
      
      // Second transaction: Boleto debit
      expect(data.transactions[1].amount).toBe(-250);
      expect(data.transactions[1].type).toBe('DEBIT');
      
      // Third transaction: Gas station
      expect(data.transactions[2].amount).toBe(-89.90);
      expect(data.transactions[2].type).toBe('DEBIT');
      expect(data.transactions[2].category).toBe('FUEL'); // Should be categorized
    });

    it('deve calcular estatísticas corretamente do OFX', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.statistics.transactionCount).toBe(3);
      expect(data.statistics.creditCount).toBe(1);
      expect(data.statistics.debitCount).toBe(2);
      expect(data.statistics.totalCredits).toBe(1500);
      expect(data.statistics.totalDebits).toBeCloseTo(339.90, 2);
      expect(data.statistics.netMovement).toBeCloseTo(1160.10, 2);
    });

    it('deve extrair saldo do OFX', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.balance.closing).toBe(5160.10);
    });

    it('deve identificar parser utilizado como OFX', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.parserUsed).toBe('OFX');
      expect(data.format).toBe('OFX');
    });
  });

  describe('CSV parsing', () => {
    it('deve processar arquivo CSV com sucesso', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.csv',
        file_base64: Buffer.from(MOCK_CSV_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      expect(result.document_type).toBe('bank_statement');
      expect(result.data.bank_statement).toBeDefined();
    });

    it('deve extrair transações do CSV com valor único', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.csv',
        file_base64: Buffer.from(MOCK_CSV_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.transactions.length).toBe(3);
      expect(data.transactions[0].amount).toBe(1500);
      expect(data.transactions[0].type).toBe('CREDIT');
    });

    it('deve processar CSV com colunas separadas de crédito/débito', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.csv',
        file_base64: Buffer.from(MOCK_CSV_BRADESCO).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.transactions.length).toBe(3);
      expect(data.transactions[0].amount).toBe(1500);
      expect(data.transactions[0].type).toBe('CREDIT');
      expect(data.transactions[1].amount).toBe(-250);
      expect(data.transactions[1].type).toBe('DEBIT');
    });

    it('deve identificar parser utilizado como CSV', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.csv',
        file_base64: Buffer.from(MOCK_CSV_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.parserUsed).toBe('CSV');
      expect(data.format).toBe('CSV');
    });
  });

  describe('Transaction categorization', () => {
    it('deve categorizar transações de combustível', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      // Find the Shell gas station transaction
      const fuelTx = data.transactions.find(t => 
        t.description.includes('SHELL') || t.description.includes('POSTO')
      );
      
      expect(fuelTx).toBeDefined();
      expect(fuelTx!.category).toBe('FUEL');
      expect(fuelTx!.categoryConfidence).toBeGreaterThan(0.5);
    });

    it('deve categorizar transferências', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      // Find TED transaction
      const tedTx = data.transactions.find(t => 
        t.description.includes('TED')
      );
      
      expect(tedTx).toBeDefined();
      expect(tedTx!.category).toBe('TRANSFER');
    });

    it('deve normalizar descrições', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      const hasNormalized = data.transactions.every(t => 
        t.normalizedDescription !== undefined
      );
      
      expect(hasNormalized).toBe(true);
    });
  });

  describe('Validation', () => {
    it('deve retornar erro para formato não suportado', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.pdf',
        file_base64: Buffer.from('conteudo pdf').toString('base64'),
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Formato não suportado');
    });

    it('deve retornar erro para OFX inválido', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from('conteudo invalido sem tags OFX').toString('base64'),
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve retornar erro para arquivo vazio', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from('').toString('base64'),
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve retornar sucesso com warnings para OFX sem transações', async () => {
      const emptyOFX = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20260101
<DTEND>20260115
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(emptyOFX).toString('base64'),
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('Nenhuma transação'))).toBe(true);
    });

    it('deve incluir isValid no output', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.success).toBe(true);
      const data = result.data.bank_statement!;
      
      expect(data.validation).toBeDefined();
      expect(data.validation.isValid).toBe(true);
      expect(data.validation.errors).toEqual([]);
    });
  });

  describe('Processing time', () => {
    it('deve retornar tempo de processamento', async () => {
      const result = await processDocument({
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(MOCK_OFX_ITAU).toString('base64'),
      });

      expect(result.processing_time_ms).toBeDefined();
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
