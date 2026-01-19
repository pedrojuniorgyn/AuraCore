/**
 * Fixtures para testes de Bank Statement - Phase D6
 */

import type { BankStatementData, BankTransaction, TransactionDirection, OFXTransactionType, ReconciliationStatus } from '@/modules/financial/domain/types';

// Mock de arquivo OFX válido (Itaú)
export const MOCK_OFX_ITAU = `
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

// Mock de CSV Itaú
export const MOCK_CSV_ITAU = `data;lancamento;ag./origem;valor;
05/01/2026;TED RECEBIDA - CLIENTE ABC LTDA;0001;1500,00;
06/01/2026;PAGTO BOLETO - FORNECEDOR XYZ;0001;-250,00;
10/01/2026;COMPRA CARTAO - POSTO SHELL;0001;-89,90;
`;

// Mock de CSV Bradesco
export const MOCK_CSV_BRADESCO = `Data;Histórico;Docto.;Crédito;Débito;Saldo
05/01/2026;TED RECEBIDA;123456;1500,00;;6500,00
06/01/2026;PAGAMENTO;789012;;250,00;6250,00
10/01/2026;COMPRA DÉBITO;345678;;89,90;6160,10
`;

// Mock de CSV Banco do Brasil
export const MOCK_CSV_BB = `Data,Dependência Origem,Histórico,Data do Balancete,Número do documento,Valor,
05/01/2026,0001-5,Crédito TED,05/01/2026,123456,1500.00,
06/01/2026,0001-5,Pagamento,06/01/2026,789012,-250.00,
10/01/2026,0001-5,Compra com Cartão,10/01/2026,345678,-89.90,
`;

// Transações esperadas após parse
export const EXPECTED_TRANSACTIONS: Array<{
  date: Date;
  description: string;
  amount: number;
  type: TransactionDirection;
}> = [
  {
    date: new Date('2026-01-05'),
    description: 'TED RECEBIDA - CLIENTE ABC LTDA',
    amount: 1500.00,
    type: 'CREDIT',
  },
  {
    date: new Date('2026-01-06'),
    description: 'PAGTO BOLETO - FORNECEDOR XYZ',
    amount: -250.00,
    type: 'DEBIT',
  },
  {
    date: new Date('2026-01-10'),
    description: 'COMPRA CARTAO - POSTO SHELL',
    amount: -89.90,
    type: 'DEBIT',
  },
];

// Mock de transação para categorização
export const CATEGORIZATION_TEST_CASES = [
  { description: 'TED RECEBIDA CLIENTE', amount: 1000, direction: 'CREDIT' as TransactionDirection, expectedCategory: 'TRANSFER' },
  { description: 'PIX RECEBIDO', amount: 500, direction: 'CREDIT' as TransactionDirection, expectedCategory: 'TRANSFER' },
  { description: 'PAGTO BOLETO', amount: -300, direction: 'DEBIT' as TransactionDirection, expectedCategory: 'OTHER' },
  { description: 'TARIFA BANCARIA', amount: -25, direction: 'DEBIT' as TransactionDirection, expectedCategory: 'BANK_FEE' },
  { description: 'IOF', amount: -5.50, direction: 'DEBIT' as TransactionDirection, expectedCategory: 'TAX' },
  { description: 'POSTO COMBUSTIVEL', amount: -200, direction: 'DEBIT' as TransactionDirection, expectedCategory: 'FUEL' },
  { description: 'COMPRA CARTAO RESTAURANTE', amount: -50, direction: 'DEBIT' as TransactionDirection, expectedCategory: 'OTHER' },
];

// Mock de statement completo
export function createMockStatement(overrides?: Partial<BankStatementData>): BankStatementData {
  return {
    format: 'OFX',
    fileName: 'extrato.ofx',
    parsedAt: new Date(),
    account: {
      bankCode: '341',
      bankName: 'Itaú',
      branchCode: '0001',
      accountNumber: '12345-6',
      accountType: 'CHECKING',
      currency: 'BRL',
    },
    period: {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-15'),
      generatedAt: new Date(),
    },
    balance: {
      openingBalance: 4000.00,
      closingBalance: 5160.10,
      currency: 'BRL',
      asOfDate: new Date('2026-01-15'),
    },
    transactions: [
      createMockTransaction({
        fitId: '20260105001',
        transactionDate: new Date('2026-01-05'),
        description: 'TED RECEBIDA - CLIENTE ABC LTDA',
        amount: 1500.00,
        direction: 'CREDIT',
        type: 'XFER',
      }),
      createMockTransaction({
        fitId: '20260106001',
        transactionDate: new Date('2026-01-06'),
        description: 'PAGTO BOLETO - FORNECEDOR XYZ',
        amount: -250.00,
        direction: 'DEBIT',
        type: 'PAYMENT',
      }),
      createMockTransaction({
        fitId: '20260110001',
        transactionDate: new Date('2026-01-10'),
        description: 'COMPRA CARTAO - POSTO SHELL',
        amount: -89.90,
        direction: 'DEBIT',
        type: 'POS',
      }),
    ],
    summary: {
      totalTransactions: 3,
      totalCredits: 1500.00,
      totalDebits: 339.90,
      creditCount: 1,
      debitCount: 2,
      netMovement: 1160.10,
      byType: {
        XFER: { count: 1, total: 1500.00 },
        PAYMENT: { count: 1, total: 250.00 },
        POS: { count: 1, total: 89.90 },
      } as BankStatementData['summary']['byType'],
      averageTransactionAmount: 613.30,
    },
    isValid: true,
    validationErrors: [],
    validationWarnings: [],
    ...overrides,
  };
}

// Helper para criar transação mock
export function createMockTransaction(overrides?: Partial<BankTransaction>): BankTransaction {
  return {
    fitId: `TXN${Date.now()}`,
    transactionDate: new Date(),
    amount: 100.00,
    direction: 'CREDIT' as TransactionDirection,
    type: 'OTHER' as OFXTransactionType,
    description: 'Test Transaction',
    reconciliationStatus: 'PENDING' as ReconciliationStatus,
    ...overrides,
  };
}

// Mock de transações duplicadas
export function createDuplicateTransactions(): BankTransaction[] {
  const base = createMockTransaction({
    fitId: 'DUP001',
    transactionDate: new Date('2026-01-05'),
    amount: 100.00,
    description: 'TRANSACAO DUPLICADA',
  });
  
  return [
    base,
    { ...base, fitId: 'DUP001' }, // Mesmo FIT ID
    createMockTransaction({
      fitId: 'DUP002',
      transactionDate: new Date('2026-01-05'),
      amount: 100.00,
      description: 'TRANSACAO DUPLICADA', // Mesma data, valor, descrição
    }),
  ];
}

// Mock de arquivo OFX inválido
export const MOCK_INVALID_OFX = `
Este não é um arquivo OFX válido.
Apenas texto comum.
`;

// Mock de CSV inválido
export const MOCK_INVALID_CSV = `
Coluna1
valor1
`;

// Mock de transação com todos os campos
export const MOCK_FULL_TRANSACTION: BankTransaction = {
  fitId: 'FULL20260115001',
  checkNumber: '001234',
  referenceNumber: 'REF001',
  transactionDate: new Date('2026-01-15'),
  postDate: new Date('2026-01-16'),
  amount: -500.00,
  direction: 'DEBIT',
  type: 'PAYMENT',
  description: 'PAGAMENTO FORNECEDOR',
  normalizedDescription: 'pagamento fornecedor',
  memo: 'Pagamento referente NF 12345',
  payee: 'Fornecedor ABC Ltda',
  payeeDocument: '12.345.678/0001-90',
  category: 'SUPPLIER_PAYMENT',
  categoryConfidence: 0.95,
  reconciliationStatus: 'PENDING',
  matchedPayableId: undefined,
  matchedReceivableId: undefined,
  rawData: { original: 'data' },
};
