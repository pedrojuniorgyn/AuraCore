/**
 * Fixtures para testes de DACTe Parser
 *
 * Dados mock de extração do Docling para CTe.
 *
 * @module tests/unit/modules/fiscal/domain/services/dacte/fixtures
 */

import type { DocumentExtractionResult, ExtractedTable } from '@/shared/infrastructure/docling';

// ============================================================================
// CHAVES DE ACESSO VÁLIDAS (CTe - Modelo 57)
// ============================================================================

/**
 * Chave de acesso válida de CTe (44 dígitos, modelo 57).
 * Estrutura: UF(2) + AAMM(4) + CNPJ(14) + Mod(2=57) + Série(3) + Número(9) + tpEmis(1) + cCT(8) + cDV(1)
 * Gerada com DV correto (módulo 11)
 */
export const VALID_CHAVE_CTE = '35260111222333000181570010000012341000000015';

// CNPJs válidos (algoritmo de dígito verificador correto)
export const VALID_CNPJ_EMITENTE = '11222333000181';
export const VALID_CNPJ_REMETENTE = '11444777000161';
export const VALID_CNPJ_DESTINATARIO = '22333444000181';
export const VALID_CPF_DESTINATARIO = '52998224725';

// ============================================================================
// MOCK DE EXTRAÇÃO COMPLETA
// ============================================================================

/**
 * Mock de tabela de documentos transportados.
 */
export const mockDocumentTable: ExtractedTable = {
  index: 0,
  headers: ['CHAVE NFE', 'NÚMERO', 'SÉRIE', 'VALOR'],
  rows: [
    ['35260111222333000181550010000012341000000018', '1234', '1', '5.000,00'],
    ['35260111222333000181550010000012351000000023', '1235', '1', '3.000,00'],
  ],
  pageNumber: 1,
};

/**
 * Mock de tabela de volumes.
 */
export const mockVolumeTable: ExtractedTable = {
  index: 1,
  headers: ['QUANTIDADE', 'ESPÉCIE', 'MARCA', 'NUMERAÇÃO', 'PESO LÍQ', 'PESO BRUTO'],
  rows: [
    ['10', 'CAIXA', 'MARCA A', '001-010', '500', '520'],
    ['5', 'PALETE', 'MARCA B', '011-015', '1000', '1050'],
  ],
  pageNumber: 1,
};

/**
 * Mock de texto completo de DACTe.
 * Usa CNPJs/chave válidos para passar nas validações.
 */
export const mockDACTeText = `
DACTE - DOCUMENTO AUXILIAR DO CONHECIMENTO DE TRANSPORTE ELETRÔNICO
MODAL RODOVIÁRIO

CHAVE DE ACESSO
35260111222333000181570010000012341000000015

NATUREZA DA OPERAÇÃO: PRESTAÇÃO DE SERVIÇO DE TRANSPORTE
CFOP: 5353

TIPO DE SERVIÇO: NORMAL

EMITENTE / TRANSPORTADORA
RAZÃO SOCIAL: TRANSPORTADORA EMITENTE LTDA
CNPJ: 11.222.333/0001-81
I.E.: 123456789
UF: SP

REMETENTE DAS MERCADORIAS
RAZÃO SOCIAL: EMPRESA REMETENTE LTDA
CNPJ: 11.444.777/0001-61
I.E.: 987654321
UF: MG

DESTINATÁRIO
RAZÃO SOCIAL: EMPRESA DESTINATARIO LTDA
CNPJ: 22.333.444/0001-81
I.E.: 111222333
UF: RJ

INFORMAÇÕES DA CARGA
PRODUTO PREDOMINANTE: MATERIAIS DE CONSTRUÇÃO
VALOR DA CARGA: 8.000,00
QUANTIDADE: 15
PESO BRUTO: 1.570

DATA DE EMISSÃO: 18/01/2026
NÚMERO DO CT-e: 000001234
SÉRIE: 001

VALORES DO SERVIÇO
VALOR TOTAL DO SERVIÇO: 850,00
BASE DE CÁLCULO DO ICMS: 850,00
ALÍQUOTA ICMS: 12
VALOR DO ICMS: 102,00
VALOR A RECEBER: 850,00

PERCURSO
UF INÍCIO: SP
UF FIM: RJ
`;

/**
 * Mock de extração completa do Docling para DACTe.
 */
export const mockDoclingExtraction: DocumentExtractionResult = {
  text: mockDACTeText,
  tables: [mockDocumentTable, mockVolumeTable],
  metadata: {
    pageCount: 1,
    title: 'DACTE',
    fileSize: 102400,
  },
  processingTimeMs: 1800,
};

// ============================================================================
// MOCKS INVÁLIDOS (PARA TESTES DE ERRO)
// ============================================================================

/**
 * Mock de extração sem chave CTe.
 */
export const mockExtractionNoChave: DocumentExtractionResult = {
  text: `
    DACTE - DOCUMENTO AUXILIAR
    Texto sem chave de acesso válida
    CNPJ: 11.222.333/0001-81
  `,
  tables: [],
  metadata: {
    pageCount: 1,
    fileSize: 5000,
  },
  processingTimeMs: 500,
};

/**
 * Mock com chave de NFe (modelo 55) ao invés de CTe (modelo 57).
 */
export const mockExtractionWrongModel: DocumentExtractionResult = {
  text: `
    DACTE - DOCUMENTO AUXILIAR
    CHAVE DE ACESSO: 35260111222333000181550010000012341000000018
    CNPJ: 11.222.333/0001-81
    Essa chave é de NFe (modelo 55), não CTe (modelo 57)
  `,
  tables: [],
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
  '11222333000181',
  '11444777000161',
  '22333444000181',
];

export const CNPJS_INVALIDOS = [
  '11111111111111', // Todos iguais
  '12345678000100', // Dígito errado
  '123456789001', // Menos de 14 dígitos
  'abcd1234567890', // Letras
];

// CPFs com dígitos verificadores corretos
export const CPFS_VALIDOS = [
  '52998224725',
  '39053344705',
];

export const CPFS_INVALIDOS = [
  '11111111111', // Todos iguais
  '12345678900', // Dígito errado
];

// ============================================================================
// CFOPs DE TRANSPORTE PARA TESTES
// ============================================================================

export const CFOPS_TRANSPORTE_VALIDOS = [
  '5353', // Prestação serviço transporte interestadual
  '6353', // Idem saída
  '5932', // Redespacho
  '6932', // Redespacho saída
];

export const CFOPS_TRANSPORTE_INVALIDOS = [
  '5102', // Venda de mercadoria (não é transporte)
  '6101', // Venda
  '1234', // Inválido
];

// ============================================================================
// CHAVES PARA TESTES
// ============================================================================

// Chaves com modelo 57 (CTe) e DV correto
export const CHAVES_CTE_VALIDAS = [
  '35260111222333000181570010000012341000000015',
];

// Chaves com modelo 55 (NFe) - NÃO são CTe
export const CHAVES_NFE = [
  '35260111222333000181550010000012341000000018',
];

export const CHAVES_INVALIDAS = [
  '1234567890', // Muito curta
  '12345678901234567890123456789012345678901234', // 44 dígitos mas DV errado
  'ABCD0112345678000195570010000012341234567890', // Letras
  '', // Vazia
];
