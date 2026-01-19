/**
 * Testes Unitários - DACTeValidator
 *
 * Testes para validações de CNPJ, CPF, chave CTe e dados do DACTe.
 *
 * @module tests/unit/modules/fiscal/domain/services/dacte
 * @see E-Agent-Fase-D3
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DACTeValidator } from '@/modules/fiscal/domain/services/dacte';
import type { DACTeData } from '@/shared/infrastructure/docling';
import {
  VALID_CHAVE_CTE,
  VALID_CNPJ_EMITENTE,
  VALID_CNPJ_REMETENTE,
  VALID_CNPJ_DESTINATARIO,
  CNPJS_VALIDOS,
  CNPJS_INVALIDOS,
  CPFS_VALIDOS,
  CPFS_INVALIDOS,
  CHAVES_CTE_VALIDAS,
  CHAVES_NFE,
  CHAVES_INVALIDAS,
  CFOPS_TRANSPORTE_VALIDOS,
  CFOPS_TRANSPORTE_INVALIDOS,
} from './fixtures/dacte-extraction-mock';

// ============================================================================
// HELPER
// ============================================================================

function createValidDACTe(): DACTeData {
  return {
    chaveCTe: VALID_CHAVE_CTE,
    numero: 1234,
    serie: 1,
    dataEmissao: new Date('2026-01-18'),
    cfop: '5353',
    naturezaOperacao: 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE',
    modal: 'RODOVIARIO',
    tipoServico: 'NORMAL',
    emitente: {
      cnpjCpf: VALID_CNPJ_EMITENTE,
      razaoSocial: 'TRANSPORTADORA EMITENTE LTDA',
      inscricaoEstadual: '123456789',
      uf: 'SP',
    },
    remetente: {
      cnpjCpf: VALID_CNPJ_REMETENTE,
      razaoSocial: 'EMPRESA REMETENTE LTDA',
      inscricaoEstadual: '987654321',
      uf: 'MG',
    },
    destinatario: {
      cnpjCpf: VALID_CNPJ_DESTINATARIO,
      razaoSocial: 'EMPRESA DESTINATARIO LTDA',
      uf: 'RJ',
    },
    valores: {
      valorServico: 850,
      valorReceber: 850,
      valorCarga: 8000,
      icms: {
        baseCalculo: 850,
        aliquota: 12,
        valor: 102,
      },
    },
    carga: {
      valorCarga: 8000,
      produtoPredominante: 'MATERIAIS DE CONSTRUÇÃO',
      volumes: [
        {
          quantidade: 10,
          especie: 'CAIXA',
          pesoLiquido: 500,
          pesoBruto: 520,
        },
      ],
    },
    documentos: [
      {
        tipo: 'NFE',
        chaveNFe: '35260111222333000181550010000012341000000018',
        numero: '1234',
        serie: '1',
        valor: 5000,
      },
    ],
    percurso: {
      ufInicio: 'SP',
      ufFim: 'RJ',
    },
  };
}

// ============================================================================
// TESTES - CNPJ
// ============================================================================

describe('DACTeValidator - CNPJ', () => {
  it.each(CNPJS_VALIDOS)('should validate CNPJ: %s', (cnpj) => {
    expect(DACTeValidator.isValidCNPJ(cnpj)).toBe(true);
  });

  it.each(CNPJS_INVALIDOS)('should reject invalid CNPJ: %s', (cnpj) => {
    expect(DACTeValidator.isValidCNPJ(cnpj)).toBe(false);
  });

  it('should validate formatted CNPJ', () => {
    expect(DACTeValidator.isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('should reject null/undefined CNPJ', () => {
    expect(DACTeValidator.isValidCNPJ(null as unknown as string)).toBe(false);
    expect(DACTeValidator.isValidCNPJ(undefined as unknown as string)).toBe(false);
    expect(DACTeValidator.isValidCNPJ('')).toBe(false);
  });
});

// ============================================================================
// TESTES - CPF
// ============================================================================

describe('DACTeValidator - CPF', () => {
  it.each(CPFS_VALIDOS)('should validate CPF: %s', (cpf) => {
    expect(DACTeValidator.isValidCPF(cpf)).toBe(true);
  });

  it.each(CPFS_INVALIDOS)('should reject invalid CPF: %s', (cpf) => {
    expect(DACTeValidator.isValidCPF(cpf)).toBe(false);
  });

  it('should validate formatted CPF', () => {
    expect(DACTeValidator.isValidCPF('529.982.247-25')).toBe(true);
  });
});

// ============================================================================
// TESTES - CHAVE CTe
// ============================================================================

describe('DACTeValidator - Chave CTe', () => {
  it('should validate correct chave CTe', () => {
    expect(DACTeValidator.isValidChaveCTe(VALID_CHAVE_CTE)).toBe(true);
  });

  it('should validate that chave is modelo 57 (CTe)', () => {
    expect(DACTeValidator.isModeloCTe(VALID_CHAVE_CTE)).toBe(true);
  });

  it.each(CHAVES_NFE)('should reject NFe chave (modelo 55): %s', (chave) => {
    expect(DACTeValidator.isModeloCTe(chave)).toBe(false);
  });

  it.each(CHAVES_INVALIDAS)('should reject invalid chave: %s', (chave) => {
    expect(DACTeValidator.isValidChaveCTe(chave)).toBe(false);
  });

  it('should reject chave with wrong length', () => {
    expect(DACTeValidator.isValidChaveCTe('123456789012345678901234567890123456789012')).toBe(false); // 42
    expect(DACTeValidator.isValidChaveCTe('1234567890123456789012345678901234567890123456')).toBe(false); // 46
  });

  it('should reject chave with letters', () => {
    expect(DACTeValidator.isValidChaveCTe('ABCD0112345678000195570010000012341234567890')).toBe(false);
  });
});

// ============================================================================
// TESTES - CFOP TRANSPORTE
// ============================================================================

describe('DACTeValidator - CFOP Transporte', () => {
  it.each(CFOPS_TRANSPORTE_VALIDOS)('should validate CFOP transporte: %s', (cfop) => {
    expect(DACTeValidator.isValidCFOPTransporte(cfop)).toBe(true);
  });

  it.each(CFOPS_TRANSPORTE_INVALIDOS)('should reject non-transporte CFOP: %s', (cfop) => {
    expect(DACTeValidator.isValidCFOPTransporte(cfop)).toBe(false);
  });
});

// ============================================================================
// TESTES - VALIDATE PARTICIPANTE
// ============================================================================

describe('DACTeValidator - validateParticipante', () => {
  it('should validate correct participante', () => {
    const participante = {
      cnpjCpf: CNPJS_VALIDOS[0],
      razaoSocial: 'EMPRESA TESTE',
      uf: 'SP',
    };
    const result = DACTeValidator.validateParticipante(participante, 'Emitente');
    expect(Result.isOk(result)).toBe(true);
  });

  it('should reject participante without CNPJ', () => {
    const participante = {
      cnpjCpf: '',
      razaoSocial: 'EMPRESA TESTE',
      uf: 'SP',
    };
    const result = DACTeValidator.validateParticipante(participante, 'Emitente');
    expect(Result.isFail(result)).toBe(true);
  });

  it('should reject participante with invalid CNPJ', () => {
    const participante = {
      cnpjCpf: '11111111111111',
      razaoSocial: 'EMPRESA TESTE',
      uf: 'SP',
    };
    const result = DACTeValidator.validateParticipante(participante, 'Emitente');
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('inválido');
    }
  });

  it('should reject null participante', () => {
    const result = DACTeValidator.validateParticipante(undefined, 'Emitente');
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('obrigatório');
    }
  });
});

// ============================================================================
// TESTES - VALIDATE DACTE
// ============================================================================

describe('DACTeValidator - validate', () => {
  it('should validate correct DACTe', () => {
    const dacte = createValidDACTe();
    const result = DACTeValidator.validate(dacte);
    expect(Result.isOk(result)).toBe(true);
  });

  it('should reject DACTe with invalid chave', () => {
    const dacte = createValidDACTe();
    dacte.chaveCTe = '12345';
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Chave CTe');
    }
  });

  it('should reject DACTe with wrong model (NFe instead of CTe)', () => {
    const dacte = createValidDACTe();
    // Usar chave de NFe (modelo 55)
    dacte.chaveCTe = CHAVES_NFE[0];
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('modelo 57');
    }
  });

  it('should reject DACTe with invalid CFOP', () => {
    const dacte = createValidDACTe();
    dacte.cfop = '5102'; // Venda de mercadoria, não transporte
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('CFOP');
    }
  });

  it('should reject DACTe with invalid emitente CNPJ', () => {
    const dacte = createValidDACTe();
    dacte.emitente.cnpjCpf = '11111111111111';
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Emitente');
    }
  });

  it('should reject DACTe with invalid remetente CNPJ', () => {
    const dacte = createValidDACTe();
    dacte.remetente.cnpjCpf = '00000000000000';
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Remetente');
    }
  });

  it('should reject DACTe with invalid destinatario CNPJ', () => {
    const dacte = createValidDACTe();
    dacte.destinatario.cnpjCpf = '00000000000';
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Destinatário');
    }
  });

  it('should reject DACTe with zero valorServico', () => {
    const dacte = createValidDACTe();
    dacte.valores.valorServico = 0;
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Valor do serviço');
    }
  });

  it('should reject DACTe with zero numero', () => {
    const dacte = createValidDACTe();
    dacte.numero = 0;
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Número');
    }
  });

  it('should accept DACTe with destinatario CPF', () => {
    const dacte = createValidDACTe();
    dacte.destinatario.cnpjCpf = CPFS_VALIDOS[0];
    const result = DACTeValidator.validate(dacte);
    expect(Result.isOk(result)).toBe(true);
  });

  it('should validate DACTe with optional expedidor', () => {
    const dacte = createValidDACTe();
    dacte.expedidor = {
      cnpjCpf: CNPJS_VALIDOS[0],
      razaoSocial: 'EXPEDIDOR LTDA',
      uf: 'SP',
    };
    const result = DACTeValidator.validate(dacte);
    expect(Result.isOk(result)).toBe(true);
  });

  it('should reject DACTe with invalid optional expedidor', () => {
    const dacte = createValidDACTe();
    dacte.expedidor = {
      cnpjCpf: '11111111111111', // Inválido
      razaoSocial: 'EXPEDIDOR LTDA',
      uf: 'SP',
    };
    const result = DACTeValidator.validate(dacte);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Expedidor');
    }
  });
});
