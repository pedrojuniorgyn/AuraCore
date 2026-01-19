/**
 * Fixtures para testes de DANFe Parser
 *
 * Dados mock de extração do Docling.
 *
 * @module tests/unit/modules/fiscal/domain/services/danfe/fixtures
 */

import type { DocumentExtractionResult, ExtractedTable } from '@/shared/infrastructure/docling';

// ============================================================================
// CHAVES DE ACESSO VÁLIDAS
// ============================================================================

/**
 * Chave de acesso válida (44 dígitos).
 * Estrutura: UF(2) + AAMM(4) + CNPJ(14) + Mod(2) + Série(3) + Número(9) + tpEmis(1) + cNF(8) + cDV(1)
 * Gerada com algoritmo de dígito verificador correto
 */
export const VALID_CHAVE_ACESSO = '35260111222333000181550010000012341000000018';

// CNPJs válidos (algoritmo de dígito verificador correto)
export const VALID_CNPJ_EMITENTE = '11222333000181';
export const VALID_CNPJ_DESTINATARIO = '11444777000161';
export const VALID_CPF_DESTINATARIO = '52998224725';

// ============================================================================
// MOCK DE EXTRAÇÃO COMPLETA
// ============================================================================

/**
 * Mock de tabela de produtos.
 */
export const mockProductTable: ExtractedTable = {
  index: 0,
  headers: ['CÓDIGO', 'DESCRIÇÃO', 'NCM', 'CFOP', 'UN', 'QTD', 'VL UNIT', 'VL TOTAL'],
  rows: [
    ['001', 'PRODUTO TESTE A', '84713012', '5102', 'UN', '10', '100,00', '1.000,00'],
    ['002', 'PRODUTO TESTE B', '84713012', '5102', 'PC', '5', '200,00', '1.000,00'],
  ],
  pageNumber: 1,
};

/**
 * Mock de texto completo de DANFe.
 * Usa CNPJs/chave válidos para passar nas validações.
 */
export const mockDANFeText = `
DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
NATUREZA DA OPERAÇÃO: VENDA DE MERCADORIA

CHAVE DE ACESSO
35260111222333000181550010000012341000000018

EMITENTE
RAZÃO SOCIAL: EMPRESA EMITENTE LTDA
CNPJ: 11.222.333/0001-81
I.E.: 123456789
UF: SP

DESTINATÁRIO / REMETENTE
RAZÃO SOCIAL: EMPRESA DESTINATARIO LTDA
CNPJ: 11.444.777/0001-61
I.E.: 987654321
UF: RJ

DATA DE EMISSÃO: 15/01/2026
NÚMERO DA NF-e: 000001234
SÉRIE: 001

CÁLCULO DO IMPOSTO
BASE DE CÁLCULO DO ICMS: 2.000,00
VALOR DO ICMS: 360,00
VALOR DO IPI: 0,00
VALOR DO FRETE: 50,00
VALOR DO SEGURO: 0,00
DESCONTO: 0,00
OUTRAS DESPESAS: 0,00
VALOR TOTAL DOS PRODUTOS: 2.000,00
VALOR TOTAL DA NOTA: 2.050,00
`;

/**
 * Mock de extração completa do Docling.
 */
export const mockDoclingExtraction: DocumentExtractionResult = {
  text: mockDANFeText,
  tables: [mockProductTable],
  metadata: {
    pageCount: 1,
    title: 'DANFE',
    fileSize: 102400,
  },
  processingTimeMs: 1500,
};

// ============================================================================
// MOCKS INVÁLIDOS (PARA TESTES DE ERRO)
// ============================================================================

/**
 * Mock de extração sem chave de acesso.
 */
export const mockExtractionNoChave: DocumentExtractionResult = {
  text: `
    DANFE - DOCUMENTO AUXILIAR
    Texto sem chave de acesso válida
    CNPJ: 12.345.678/0001-95
  `,
  tables: [],
  metadata: {
    pageCount: 1,
    fileSize: 5000,
  },
  processingTimeMs: 500,
};

/**
 * Mock de extração sem tabela de produtos.
 */
export const mockExtractionNoProducts: DocumentExtractionResult = {
  text: mockDANFeText,
  tables: [], // Sem tabelas
  metadata: {
    pageCount: 1,
    fileSize: 5000,
  },
  processingTimeMs: 500,
};

/**
 * Mock de extração vazia.
 */
export const mockExtractionEmpty: DocumentExtractionResult = {
  text: '',
  tables: [],
  metadata: {
    pageCount: 0,
    fileSize: 0,
  },
  processingTimeMs: 100,
};

// ============================================================================
// CNPJs/CPFs PARA TESTES
// ============================================================================

// CNPJs com dígitos verificadores corretos
export const CNPJS_VALIDOS = [
  '11222333000181', // Válido
  '11444777000161', // Válido
];

export const CNPJS_INVALIDOS = [
  '11111111111111', // Todos iguais
  '12345678000100', // Dígito errado
  '123456789001', // Menos de 14 dígitos
  'abcd1234567890', // Letras
];

// CPFs com dígitos verificadores corretos
export const CPFS_VALIDOS = [
  '52998224725', // Válido
  '39053344705', // Válido
];

export const CPFS_INVALIDOS = [
  '11111111111', // Todos iguais
  '12345678900', // Dígito errado
  '1234567890', // Menos de 11 dígitos
  'abcdefghijk', // Letras
];

// ============================================================================
// CHAVES DE ACESSO PARA TESTES
// ============================================================================

// Chaves com DV calculado corretamente
export const CHAVES_VALIDAS = [
  '35260111222333000181550010000012341000000018',
];

export const CHAVES_INVALIDAS = [
  '1234567890', // Muito curta
  '12345678901234567890123456789012345678901234', // 44 dígitos mas DV errado
  'ABCD0112345678000195550010000012341234567890', // Letras
  '', // Vazia
];
