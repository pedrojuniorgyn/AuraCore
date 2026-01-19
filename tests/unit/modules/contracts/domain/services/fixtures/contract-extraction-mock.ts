/**
 * Mock Fixtures para Testes de Contrato de Frete
 *
 * @module tests/unit/modules/contracts/domain/services/fixtures
 */

import type { DocumentExtractionResult } from '@/shared/infrastructure/docling';

/**
 * Texto simplificado de contrato de frete para testes.
 */
export const mockContractText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRANSPORTE RODOVIÁRIO DE CARGAS
Contrato Nº: 2024/001

CONTRATANTE: EMPRESA LOGÍSTICA LTDA
CNPJ: 12.345.678/0001-95
Endereço: Rua das Flores, 100, São Paulo - SP

CONTRATADO: TRANSPORTADORA ABC S.A.
CNPJ: 98.765.432/0001-10
Endereço: Av. Brasil, 500, Campinas - SP

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de coleta e entrega
de cargas fracionadas entre as unidades do CONTRATANTE.

CLÁUSULA SEGUNDA - DO PREÇO E PAGAMENTO
O valor do frete será de R$ 150,00 por viagem, com pagamento em 45 dias.
O frete mínimo será de R$ 100,00 por operação.
Forma de pagamento: Boleto bancário.

CLÁUSULA TERCEIRA - DO REAJUSTE
O valor do frete será reajustado anualmente pelo índice IPCA.

CLÁUSULA QUARTA - DA VIGÊNCIA
O contrato terá vigência de 12 meses a partir da assinatura.
Data de início: 01/01/2024
Data de término: 31/12/2024
O contrato será renovado automaticamente por igual período.
O aviso de não renovação deve ser dado com 30 dias de antecedência.

CLÁUSULA QUINTA - DAS PENALIDADES
Multa por atraso no pagamento: 2% sobre o valor devido.
Multa por rescisão antecipada: 20% do valor restante do contrato.
Multa por descumprimento: 10% do valor do contrato.

CLÁUSULA SEXTA - DO SEGURO
O CONTRATADO deverá manter seguro RCTR-C com cobertura mínima de R$ 500.000,00.

CLÁUSULA SÉTIMA - DAS RESPONSABILIDADES
O CONTRATANTE deverá: disponibilizar carga para transporte e emitir nota fiscal.
O CONTRATADO deverá: transportar a carga, emitir CT-e e manter veículos em boas condições.

CLÁUSULA OITAVA - DA RESCISÃO
O contrato poderá ser rescindido por inadimplemento ou sem justa causa.
Aviso prévio de 30 dias é obrigatório.
Em caso de falência, o contrato será automaticamente rescindido.

São Paulo, 01 de janeiro de 2024.

TESTEMUNHAS:
CPF: 111.222.333-44
CPF: 555.666.777-88`;

/**
 * Mock de extração Docling para contrato de frete.
 */
export const mockContractExtraction: DocumentExtractionResult = {
  text: mockContractText,
  tables: [],
  metadata: {
    pageCount: 2,
    title: 'Contrato de Transporte',
    fileSize: 15000,
  },
  processingTimeMs: 1500,
};

/**
 * Mock com texto mínimo para testes de edge cases.
 */
export const mockMinimalExtraction: DocumentExtractionResult = {
  text: 'CONTRATO\nCNPJ: 12.345.678/0001-95\nCNPJ: 98.765.432/0001-10',
  tables: [],
  metadata: {
    pageCount: 1,
    title: 'Contrato',
    fileSize: 100,
  },
  processingTimeMs: 100,
};

/**
 * Mock com texto vazio.
 */
export const mockEmptyExtraction: DocumentExtractionResult = {
  text: '',
  tables: [],
  metadata: {
    pageCount: 0,
    title: '',
    fileSize: 0,
  },
  processingTimeMs: 50,
};
