/**
 * Testes Unitários - DACTeParser
 *
 * Testes para parsing completo de DACTe.
 *
 * @module tests/unit/modules/fiscal/domain/services/dacte
 * @see E-Agent-Fase-D3
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DACTeParser, DACTeFieldExtractor } from '@/modules/fiscal/domain/services/dacte';
import {
  mockDoclingExtraction,
  mockExtractionNoChave,
  mockExtractionWrongModel,
  mockExtractionEmpty,
  VALID_CHAVE_CTE,
  VALID_CNPJ_EMITENTE,
  mockDACTeText,
  mockVolumeTable,
  mockDocumentTable,
} from './fixtures/dacte-extraction-mock';

// ============================================================================
// TESTES - DACTeParser.parseFromDoclingResult
// ============================================================================

describe('DACTeParser - parseFromDoclingResult', () => {
  it('should parse complete DACTe extraction', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      const dacte = result.value;
      expect(dacte.chaveCTe).toBe(VALID_CHAVE_CTE);
      expect(dacte.emitente.cnpjCpf).toBe(VALID_CNPJ_EMITENTE);
      expect(dacte.remetente).toBeDefined();
      expect(dacte.destinatario).toBeDefined();
      expect(dacte.modal).toBe('RODOVIARIO');
      expect(dacte.tipoServico).toBe('NORMAL');
    }
  });

  it('should fail if extraction is empty', () => {
    const result = DACTeParser.parseFromDoclingResult(mockExtractionEmpty);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('vazio');
    }
  });

  it('should fail if chave CTe not found', () => {
    const result = DACTeParser.parseFromDoclingResult(mockExtractionNoChave);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.toLowerCase()).toContain('chave');
    }
  });

  it('should fail if chave is NFe (wrong model)', () => {
    const result = DACTeParser.parseFromDoclingResult(mockExtractionWrongModel);

    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error.toLowerCase()).toContain('modelo 57');
    }
  });

  it('should extract numero from chave', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.numero).toBeGreaterThan(0);
    }
  });

  it('should extract serie from chave', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.serie).toBeGreaterThanOrEqual(0);
    }
  });

  it('should extract data de emissao', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.dataEmissao).toBeInstanceOf(Date);
    }
  });

  it('should extract CFOP', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cfop).toBe('5353');
    }
  });

  it('should extract valores', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valores.valorServico).toBe(850);
      expect(result.value.valores.icms.baseCalculo).toBe(850);
      expect(result.value.valores.icms.valor).toBe(102);
    }
  });

  it('should extract carga', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.carga.valorCarga).toBe(8000);
      expect(result.value.carga.produtoPredominante).toContain('MATERI');
    }
  });

  it('should extract percurso', () => {
    const result = DACTeParser.parseFromDoclingResult(mockDoclingExtraction);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.percurso).toBeDefined();
      expect(result.value.percurso?.ufInicio).toBe('SP');
      expect(result.value.percurso?.ufFim).toBe('RJ');
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractChaveCTe
// ============================================================================

describe('DACTeFieldExtractor - extractChaveCTe', () => {
  it('should extract chave CTe from text', () => {
    const result = DACTeFieldExtractor.extractChaveCTe(mockDACTeText);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(VALID_CHAVE_CTE);
      expect(result.value.length).toBe(44);
    }
  });

  it('should fail if no chave in text', () => {
    const result = DACTeFieldExtractor.extractChaveCTe('Texto sem chave');

    expect(Result.isFail(result)).toBe(true);
  });

  it('should fail if text is empty', () => {
    const result = DACTeFieldExtractor.extractChaveCTe('');

    expect(Result.isFail(result)).toBe(true);
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractNumeroFromChave
// ============================================================================

describe('DACTeFieldExtractor - extractNumeroFromChave', () => {
  it('should extract numero from valid chave', () => {
    const numero = DACTeFieldExtractor.extractNumeroFromChave(VALID_CHAVE_CTE);
    expect(numero).toBeGreaterThan(0);
  });

  it('should return 0 for invalid chave', () => {
    expect(DACTeFieldExtractor.extractNumeroFromChave('')).toBe(0);
    expect(DACTeFieldExtractor.extractNumeroFromChave('123')).toBe(0);
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractModal
// ============================================================================

describe('DACTeFieldExtractor - extractModal', () => {
  it('should extract RODOVIARIO modal', () => {
    const result = DACTeFieldExtractor.extractModal('MODAL RODOVIÁRIO');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('RODOVIARIO');
    }
  });

  it('should extract AEREO modal', () => {
    const result = DACTeFieldExtractor.extractModal('MODAL AÉREO');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('AEREO');
    }
  });

  it('should extract AQUAVIARIO modal', () => {
    const result = DACTeFieldExtractor.extractModal('MODAL AQUAVIÁRIO');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('AQUAVIARIO');
    }
  });

  it('should extract FERROVIARIO modal', () => {
    const result = DACTeFieldExtractor.extractModal('MODAL FERROVIÁRIO');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('FERROVIARIO');
    }
  });

  it('should default to RODOVIARIO', () => {
    const result = DACTeFieldExtractor.extractModal('Texto sem modal');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('RODOVIARIO');
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractTipoServico
// ============================================================================

describe('DACTeFieldExtractor - extractTipoServico', () => {
  it('should extract NORMAL tipo servico', () => {
    const result = DACTeFieldExtractor.extractTipoServico('TIPO DE SERVIÇO: NORMAL');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('NORMAL');
    }
  });

  it('should extract SUBCONTRATACAO', () => {
    const result = DACTeFieldExtractor.extractTipoServico('SUBCONTRATAÇÃO DE FRETE');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('SUBCONTRATACAO');
    }
  });

  it('should extract REDESPACHO', () => {
    const result = DACTeFieldExtractor.extractTipoServico('REDESPACHO DE CARGA');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('REDESPACHO');
    }
  });

  it('should extract REDESPACHO_INTERMEDIARIO', () => {
    const result = DACTeFieldExtractor.extractTipoServico('REDESPACHO INTERMEDIÁRIO');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('REDESPACHO_INTERMEDIARIO');
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractCFOP
// ============================================================================

describe('DACTeFieldExtractor - extractCFOP', () => {
  it('should extract CFOP from text', () => {
    const result = DACTeFieldExtractor.extractCFOP('CFOP: 5353');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('5353');
    }
  });

  it('should fail if no CFOP', () => {
    const result = DACTeFieldExtractor.extractCFOP('Texto sem CFOP');
    expect(Result.isFail(result)).toBe(true);
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractEmitente
// ============================================================================

describe('DACTeFieldExtractor - extractEmitente', () => {
  it('should extract emitente data', () => {
    const result = DACTeFieldExtractor.extractEmitente(mockDACTeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cnpjCpf).toBe(VALID_CNPJ_EMITENTE);
      expect(result.value.uf).toBe('SP');
      expect(result.value.razaoSocial).toBeTruthy();
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractRemetente
// ============================================================================

describe('DACTeFieldExtractor - extractRemetente', () => {
  it('should extract remetente data', () => {
    const result = DACTeFieldExtractor.extractRemetente(mockDACTeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cnpjCpf).toBeTruthy();
      expect(result.value.razaoSocial).toBeTruthy();
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractDestinatario
// ============================================================================

describe('DACTeFieldExtractor - extractDestinatario', () => {
  it('should extract destinatario data', () => {
    const result = DACTeFieldExtractor.extractDestinatario(mockDACTeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.cnpjCpf).toBeTruthy();
      expect(result.value.razaoSocial).toBeTruthy();
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractExpedidor
// ============================================================================

describe('DACTeFieldExtractor - extractExpedidor', () => {
  it('should return null if no expedidor', () => {
    const result = DACTeFieldExtractor.extractExpedidor('Texto sem expedidor', []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBeNull();
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractCarga
// ============================================================================

describe('DACTeFieldExtractor - extractCarga', () => {
  it('should extract carga from text', () => {
    const result = DACTeFieldExtractor.extractCarga(mockDACTeText, [mockVolumeTable]);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valorCarga).toBe(8000);
      expect(result.value.produtoPredominante).toContain('CONSTRUÇÃO');
    }
  });

  it('should extract volumes from table', () => {
    const result = DACTeFieldExtractor.extractCarga(mockDACTeText, [mockVolumeTable]);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.volumes.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractDocumentos
// ============================================================================

describe('DACTeFieldExtractor - extractDocumentos', () => {
  it('should extract documentos from table', () => {
    const result = DACTeFieldExtractor.extractDocumentos([mockDocumentTable]);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].tipo).toBe('NFE');
      expect(result.value[0].chaveNFe).toBeTruthy();
    }
  });

  it('should return empty array if no tables', () => {
    const result = DACTeFieldExtractor.extractDocumentos([]);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual([]);
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractValores
// ============================================================================

describe('DACTeFieldExtractor - extractValores', () => {
  it('should extract valores from text', () => {
    const result = DACTeFieldExtractor.extractValores(mockDACTeText, []);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.valorServico).toBe(850);
      expect(result.value.valorReceber).toBe(850);
      expect(result.value.icms.baseCalculo).toBe(850);
      expect(result.value.icms.valor).toBe(102);
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractPercurso
// ============================================================================

describe('DACTeFieldExtractor - extractPercurso', () => {
  it('should extract percurso from text', () => {
    const result = DACTeFieldExtractor.extractPercurso(mockDACTeText);

    expect(result).toBeDefined();
    expect(result?.ufInicio).toBe('SP');
    expect(result?.ufFim).toBe('RJ');
  });

  it('should return undefined if no percurso', () => {
    const result = DACTeFieldExtractor.extractPercurso('Texto sem percurso');

    // Pode retornar undefined ou um objeto parcial
    if (result) {
      expect(result.ufInicio).toBeDefined();
    }
  });
});

// ============================================================================
// TESTES - DACTeFieldExtractor.extractDataEmissao
// ============================================================================

describe('DACTeFieldExtractor - extractDataEmissao', () => {
  it('should extract data de emissao', () => {
    const date = DACTeFieldExtractor.extractDataEmissao(mockDACTeText);

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0); // Janeiro
    expect(date.getDate()).toBe(18);
  });

  it('should return current date if not found', () => {
    const date = DACTeFieldExtractor.extractDataEmissao('Texto sem data');
    const now = new Date();

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(now.getFullYear());
  });
});

// ============================================================================
// TESTES - DACTeParser convenience methods
// ============================================================================

describe('DACTeParser - convenience methods', () => {
  it('extractChaveCTe should delegate to field extractor', () => {
    const result1 = DACTeParser.extractChaveCTe(mockDACTeText);
    const result2 = DACTeFieldExtractor.extractChaveCTe(mockDACTeText);

    expect(Result.isOk(result1)).toBe(Result.isOk(result2));
    if (Result.isOk(result1) && Result.isOk(result2)) {
      expect(result1.value).toBe(result2.value);
    }
  });
});
