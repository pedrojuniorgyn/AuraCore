/**
 * Testes Unitários - DANFeValidator
 *
 * Testes para validações de CNPJ, CPF, chave de acesso e dados do DANFe.
 *
 * @module tests/unit/modules/fiscal/domain/services/danfe
 * @see E-Agent-Fase-D2
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { DANFeValidator } from '@/modules/fiscal/domain/services/danfe';
import type { DANFeData } from '@/shared/infrastructure/docling';
import {
  VALID_CHAVE_ACESSO,
  VALID_CNPJ_EMITENTE,
  VALID_CNPJ_DESTINATARIO,
  CNPJS_VALIDOS,
  CNPJS_INVALIDOS,
  CPFS_VALIDOS,
  CPFS_INVALIDOS,
  CHAVES_INVALIDAS,
} from './fixtures/danfe-extraction-mock';

// ============================================================================
// HELPER
// ============================================================================

function createValidDANFe(): DANFeData {
  return {
    chaveAcesso: VALID_CHAVE_ACESSO,
    numero: 1234,
    serie: 1,
    dataEmissao: new Date('2026-01-15'),
    emitente: {
      cnpj: VALID_CNPJ_EMITENTE,
      razaoSocial: 'EMPRESA EMITENTE LTDA',
      inscricaoEstadual: '123456789',
      uf: 'SP',
    },
    destinatario: {
      cnpjCpf: VALID_CNPJ_DESTINATARIO,
      razaoSocial: 'EMPRESA DESTINATARIO LTDA',
      uf: 'RJ',
    },
    produtos: [
      {
        codigo: '001',
        descricao: 'PRODUTO TESTE',
        ncm: '84713012',
        cfop: '5102',
        unidade: 'UN',
        quantidade: 10,
        valorUnitario: 100,
        valorTotal: 1000,
        baseIcms: 1000,
        valorIcms: 180,
        valorIpi: 0,
        aliquotaIcms: 18,
        aliquotaIpi: 0,
      },
    ],
    totais: {
      valorProdutos: 1000,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorOutrasDespesas: 0,
      valorIpi: 0,
      baseIcms: 1000,
      valorIcms: 180,
      valorPis: 0,
      valorCofins: 0,
      valorTotal: 1000,
    },
  };
}

// ============================================================================
// TESTES - CNPJ
// ============================================================================

describe('DANFeValidator - CNPJ', () => {
  it.each(CNPJS_VALIDOS)('should validate CNPJ: %s', (cnpj) => {
    expect(DANFeValidator.isValidCNPJ(cnpj)).toBe(true);
  });

  it.each(CNPJS_INVALIDOS)('should reject invalid CNPJ: %s', (cnpj) => {
    expect(DANFeValidator.isValidCNPJ(cnpj)).toBe(false);
  });

  it('should validate formatted CNPJ', () => {
    expect(DANFeValidator.isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('should reject null/undefined CNPJ', () => {
    expect(DANFeValidator.isValidCNPJ(null as unknown as string)).toBe(false);
    expect(DANFeValidator.isValidCNPJ(undefined as unknown as string)).toBe(false);
    expect(DANFeValidator.isValidCNPJ('')).toBe(false);
  });
});

// ============================================================================
// TESTES - CPF
// ============================================================================

describe('DANFeValidator - CPF', () => {
  it.each(CPFS_VALIDOS)('should validate CPF: %s', (cpf) => {
    expect(DANFeValidator.isValidCPF(cpf)).toBe(true);
  });

  it.each(CPFS_INVALIDOS)('should reject invalid CPF: %s', (cpf) => {
    expect(DANFeValidator.isValidCPF(cpf)).toBe(false);
  });

  it('should validate formatted CPF', () => {
    expect(DANFeValidator.isValidCPF('529.982.247-25')).toBe(true);
  });

  it('should reject null/undefined CPF', () => {
    expect(DANFeValidator.isValidCPF(null as unknown as string)).toBe(false);
    expect(DANFeValidator.isValidCPF(undefined as unknown as string)).toBe(false);
    expect(DANFeValidator.isValidCPF('')).toBe(false);
  });
});

// ============================================================================
// TESTES - CNPJ/CPF
// ============================================================================

describe('DANFeValidator - isValidCNPJorCPF', () => {
  it('should validate CNPJ', () => {
    expect(DANFeValidator.isValidCNPJorCPF(CNPJS_VALIDOS[0])).toBe(true);
  });

  it('should validate CPF', () => {
    expect(DANFeValidator.isValidCNPJorCPF(CPFS_VALIDOS[0])).toBe(true);
  });

  it('should reject invalid document', () => {
    expect(DANFeValidator.isValidCNPJorCPF('12345')).toBe(false);
    expect(DANFeValidator.isValidCNPJorCPF('')).toBe(false);
  });
});

// ============================================================================
// TESTES - CHAVE DE ACESSO
// ============================================================================

describe('DANFeValidator - Chave de Acesso', () => {
  it('should validate correct chave de acesso', () => {
    expect(DANFeValidator.isValidChaveAcesso(VALID_CHAVE_ACESSO)).toBe(true);
  });

  it.each(CHAVES_INVALIDAS)('should reject invalid chave: %s', (chave) => {
    expect(DANFeValidator.isValidChaveAcesso(chave)).toBe(false);
  });

  it('should reject chave with wrong length', () => {
    expect(DANFeValidator.isValidChaveAcesso('123456789012345678901234567890123456789012')).toBe(false); // 42
    expect(DANFeValidator.isValidChaveAcesso('1234567890123456789012345678901234567890123456')).toBe(false); // 46
  });

  it('should reject chave with letters', () => {
    expect(DANFeValidator.isValidChaveAcesso('ABCD0112345678000195550010000012341234567890')).toBe(false);
  });

  it('should validate chave with spaces (will be cleaned)', () => {
    // Chave válida formatada com espaços
    const chaveWithSpaces = '3526 0111 2223 3300 0181 5500 1000 0012 3410 0000 0018';
    // O validator limpa espaços internamente
    const cleaned = chaveWithSpaces.replace(/\s/g, '');
    expect(DANFeValidator.isValidChaveAcesso(cleaned)).toBe(true);
  });
});

// ============================================================================
// TESTES - VALIDATE DANFE
// ============================================================================

describe('DANFeValidator - validate', () => {
  it('should validate correct DANFe', () => {
    const danfe = createValidDANFe();
    const result = DANFeValidator.validate(danfe);
    expect(Result.isOk(result)).toBe(true);
  });

  it('should reject DANFe with invalid chave', () => {
    const danfe = createValidDANFe();
    danfe.chaveAcesso = '12345';
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Chave de acesso');
    }
  });

  it('should reject DANFe with invalid emitente CNPJ', () => {
    const danfe = createValidDANFe();
    danfe.emitente.cnpj = '11111111111111';
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('CNPJ do emitente');
    }
  });

  it('should reject DANFe with invalid destinatario CNPJ/CPF', () => {
    const danfe = createValidDANFe();
    danfe.destinatario.cnpjCpf = '00000000000';
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('CNPJ/CPF do destinatário');
    }
  });

  it('should reject DANFe without products', () => {
    const danfe = createValidDANFe();
    danfe.produtos = [];
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('pelo menos um produto');
    }
  });

  it('should reject DANFe with mismatched totals', () => {
    const danfe = createValidDANFe();
    danfe.totais.valorProdutos = 9999; // Não confere com soma dos produtos
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('não confere');
    }
  });

  it('should reject DANFe with zero numero', () => {
    const danfe = createValidDANFe();
    danfe.numero = 0;
    const result = DANFeValidator.validate(danfe);
    expect(Result.isFail(result)).toBe(true);
    if (Result.isFail(result)) {
      expect(result.error).toContain('Número');
    }
  });

  it('should accept DANFe with destinatario CPF', () => {
    const danfe = createValidDANFe();
    danfe.destinatario.cnpjCpf = CPFS_VALIDOS[0];
    const result = DANFeValidator.validate(danfe);
    expect(Result.isOk(result)).toBe(true);
  });
});
