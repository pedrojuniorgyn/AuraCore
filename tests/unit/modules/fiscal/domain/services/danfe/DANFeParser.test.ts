/**
 * Testes Unitários - DANFeParser
 *
 * Testes para parsing completo de DANFe.
 *
 * @module tests/unit/modules/fiscal/domain/services/danfe
 * @see E-Agent-Fase-D2
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DANFeParser, DANFeFieldExtractor } from '@/modules/fiscal/domain/services/danfe';
import {
  mockDoclingExtraction,
  mockExtractionNoChave,
  mockExtractionNoProducts,
  mockExtractionEmpty,
  VALID_CHAVE_ACESSO,
  VALID_CNPJ_EMITENTE,
  mockDANFeText,
  mockProductTable,
} from './fixtures/danfe-extraction-mock';

// ============================================================================
// TESTES - DANFeParser.parseFromDoclingResult
// ============================================================================

describe('DANFeParser - parseFromDoclingResult', () => {
  it('should parse complete DANFe extraction', () => {
    const result = DANFeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      const danfe = result.value;
      expect(danfe.chaveAcesso).toBe(VALID_CHAVE_ACESSO);
      expect(danfe.emitente.cnpj).toBe(VALID_CNPJ_EMITENTE);
      expect(danfe.produtos.length).toBeGreaterThan(0);
      expect(danfe.totais.valorProdutos).toBeGreaterThan(0);
    }
  });

  it('should fail if extraction is empty', () => {
    const result = DANFeParser.parseFromDoclingResult(mockExtractionEmpty);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('vazio');
    }
  });

  it('should fail if chave de acesso not found', () => {
    const result = DANFeParser.parseFromDoclingResult(mockExtractionNoChave);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.toLowerCase()).toContain('chave');
    }
  });

  it('should fail if products table not found', () => {
    const result = DANFeParser.parseFromDoclingResult(mockExtractionNoProducts);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.toLowerCase()).toContain('produto');
    }
  });

  it('should extract numero from chave', () => {
    const result = DANFeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      // Número está nas posições 26-34 da chave
      expect(result.value.numero).toBeGreaterThan(0);
    }
  });

  it('should extract serie from chave', () => {
    const result = DANFeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      // Série está nas posições 23-25 da chave
      expect(result.value.serie).toBeGreaterThanOrEqual(0);
    }
  });

  it('should extract data de emissao', () => {
    const result = DANFeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.dataEmissao).toBeInstanceOf(Date);
    }
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractChaveAcesso
// ============================================================================

describe('DANFeFieldExtractor - extractChaveAcesso', () => {
  it('should extract chave from text', () => {
    const result = DANFeFieldExtractor.extractChaveAcesso(mockDANFeText);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(VALID_CHAVE_ACESSO);
      expect(result.value.length).toBe(44);
    }
  });

  it('should fail if no chave in text', () => {
    const result = DANFeFieldExtractor.extractChaveAcesso('Texto sem chave');

    expect(Result.isFail(result)).toBe(true);
  });

  it('should extract chave with spaces', () => {
    const textWithSpacedChave = `
      Chave de Acesso:
      3526 0112 3456 7800 0195 5500 1000 0012 3412 3456 7890
    `;
    const result = DANFeFieldExtractor.extractChaveAcesso(textWithSpacedChave);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.length).toBe(44);
    }
  });

  it('should fail if text is empty', () => {
    const result = DANFeFieldExtractor.extractChaveAcesso('');

    expect(Result.isFail(result)).toBe(true);
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractNumeroFromChave
// ============================================================================

describe('DANFeFieldExtractor - extractNumeroFromChave', () => {
  it('should extract numero from valid chave', () => {
    // Posições 26-34 (0-indexed: 25-33)
    const numero = DANFeFieldExtractor.extractNumeroFromChave(VALID_CHAVE_ACESSO);
    expect(numero).toBeGreaterThan(0);
  });

  it('should return 0 for invalid chave', () => {
    expect(DANFeFieldExtractor.extractNumeroFromChave('')).toBe(0);
    expect(DANFeFieldExtractor.extractNumeroFromChave('123')).toBe(0);
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractSerieFromChave
// ============================================================================

describe('DANFeFieldExtractor - extractSerieFromChave', () => {
  it('should extract serie from valid chave', () => {
    // Posições 23-25 (0-indexed: 22-24)
    const serie = DANFeFieldExtractor.extractSerieFromChave(VALID_CHAVE_ACESSO);
    expect(serie).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for invalid chave', () => {
    expect(DANFeFieldExtractor.extractSerieFromChave('')).toBe(0);
    expect(DANFeFieldExtractor.extractSerieFromChave('123')).toBe(0);
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractEmitente
// ============================================================================

describe('DANFeFieldExtractor - extractEmitente', () => {
  it('should extract emitente data', () => {
    const result = DANFeFieldExtractor.extractEmitente(mockDANFeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cnpj).toBe(VALID_CNPJ_EMITENTE);
      expect(result.value.uf).toBe('SP');
      expect(result.value.razaoSocial).toBeTruthy();
    }
  });

  it('should fail if no CNPJ found', () => {
    const result = DANFeFieldExtractor.extractEmitente('Texto sem CNPJ', []);

    expect(Result.isFail(result)).toBe(true);
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractDestinatario
// ============================================================================

describe('DANFeFieldExtractor - extractDestinatario', () => {
  it('should extract destinatario data', () => {
    const result = DANFeFieldExtractor.extractDestinatario(mockDANFeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cnpjCpf).toBeTruthy();
      expect(result.value.razaoSocial).toBeTruthy();
    }
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractProdutos
// ============================================================================

describe('DANFeFieldExtractor - extractProdutos', () => {
  it('should extract products from table', () => {
    const result = DANFeFieldExtractor.extractProdutos([mockProductTable]);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].codigo).toBe('001');
      expect(result.value[0].descricao).toBe('PRODUTO TESTE A');
      expect(result.value[0].quantidade).toBe(10);
      expect(result.value[0].valorTotal).toBe(1000);
    }
  });

  it('should fail if no tables', () => {
    const result = DANFeFieldExtractor.extractProdutos([]);

    expect(Result.isFail(result)).toBe(true);
  });

  it('should fail if table has no product columns', () => {
    const nonProductTable = {
      index: 0,
      headers: ['Col1', 'Col2'],
      rows: [['a', 'b']],
      pageNumber: 1,
    };
    const result = DANFeFieldExtractor.extractProdutos([nonProductTable]);

    expect(Result.isFail(result)).toBe(true);
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractTotais
// ============================================================================

describe('DANFeFieldExtractor - extractTotais', () => {
  it('should extract totais from text', () => {
    const result = DANFeFieldExtractor.extractTotais(mockDANFeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valorProdutos).toBe(2000);
      expect(result.value.valorTotal).toBe(2050);
      expect(result.value.baseIcms).toBe(2000);
      expect(result.value.valorIcms).toBe(360);
    }
  });

  it('should return zeros if no totais found', () => {
    const result = DANFeFieldExtractor.extractTotais('Texto sem valores', []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valorProdutos).toBe(0);
    }
  });
});

// ============================================================================
// TESTES - DANFeFieldExtractor.extractDataEmissao
// ============================================================================

describe('DANFeFieldExtractor - extractDataEmissao', () => {
  it('should extract data de emissao', () => {
    const date = DANFeFieldExtractor.extractDataEmissao(mockDANFeText);

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0); // Janeiro
    expect(date.getDate()).toBe(15);
  });

  it('should return current date if not found', () => {
    const date = DANFeFieldExtractor.extractDataEmissao('Texto sem data');
    const now = new Date();

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(now.getFullYear());
  });
});

// ============================================================================
// TESTES - DANFeParser.extractChaveAcesso (convenience method)
// ============================================================================

describe('DANFeParser - extractChaveAcesso', () => {
  it('should be a convenience method for field extractor', () => {
    const result1 = DANFeParser.extractChaveAcesso(mockDANFeText);
    const result2 = DANFeFieldExtractor.extractChaveAcesso(mockDANFeText);

    expect(Result.isOk(result1)).toBe(Result.isOk(result2));
    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(result2.value);
    }
  });
});
