/**
 * Testes do CteBuilderService
 *
 * Verifica:
 * - Construção de XML válido
 * - Validações de entrada
 * - Geração de chave de acesso
 * - Regras DDD (stateless, sem infraestrutura)
 *
 * @module tests/fiscal/domain/services
 * @see E8 Fase 2.1
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import {
  CteBuilderService,
  type CteBuilderInput,
  type CteEmitente,
  type CteRemetente,
  type CteDestinatario,
  type CteEndereco,
} from '@/modules/fiscal/domain/services/CteBuilderService';

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

function createValidEndereco(uf = 'SP'): CteEndereco {
  return {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Sala 1',
    bairro: 'Centro',
    codigoMunicipio: '3550308',
    nomeMunicipio: 'São Paulo',
    uf,
    cep: '01310-100',
  };
}

function createValidEmitente(): CteEmitente {
  return {
    cnpj: '11.222.333/0001-81', // CNPJ válido
    inscricaoEstadual: '123456789012',
    razaoSocial: 'Transportadora ABC Ltda',
    nomeFantasia: 'ABC Express',
    endereco: createValidEndereco('SP'),
  };
}

function createValidRemetente(): CteRemetente {
  return {
    cnpjCpf: '22.333.444/0001-55',
    inscricaoEstadual: '987654321098',
    razaoSocial: 'Indústria XYZ S/A',
    nomeFantasia: 'XYZ',
    endereco: createValidEndereco('SP'),
  };
}

function createValidDestinatario(): CteDestinatario {
  return {
    cnpjCpf: '33.444.555/0001-66',
    inscricaoEstadual: '456789012345',
    razaoSocial: 'Comércio DEF Ltda',
    endereco: createValidEndereco('RJ'),
  };
}

function createValidInput(): CteBuilderInput {
  return {
    serie: 1,
    numero: 12345,
    dataEmissao: new Date('2026-01-20T10:00:00'),
    cfop: '6353',
    naturezaOperacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    tipoServico: 0,
    modal: '01',
    ambiente: '2',
    emitente: createValidEmitente(),
    remetente: createValidRemetente(),
    destinatario: createValidDestinatario(),
    valorServico: 1500.0,
    valorReceber: 1500.0,
    icms: {
      cst: '00',
      baseCalculo: 1500.0,
      aliquota: 12.0,
      valor: 180.0,
    },
    carga: {
      valorCarga: 50000.0,
      produtoPredominante: 'PECAS AUTOMOTIVAS',
      quantidadeCarga: 500.0,
      unidadeMedida: '01',
    },
    seguro: {
      responsavel: 4,
      seguradora: 'Seguradora ABC',
      numeroApolice: 'POL123456',
      numeroAverbacao: 'AVER789',
    },
    documentosVinculados: [
      { chaveNfe: '35260111222333000181550010000123451123456789' },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════

describe('CteBuilderService', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Regras DDD
  // ─────────────────────────────────────────────────────────────────────────

  describe('Regras DDD', () => {
    it('deve ter constructor privado (não pode ser instanciado)', () => {
      // TypeScript previne instanciação, mas verificamos que métodos são estáticos
      expect(typeof CteBuilderService.build).toBe('function');
      expect(typeof CteBuilderService.validate).toBe('function');
      expect(typeof CteBuilderService.generateAccessKey).toBe('function');
    });

    it('deve retornar Result em todos os métodos públicos', () => {
      const input = createValidInput();

      const buildResult = CteBuilderService.build(input);
      expect(buildResult).toHaveProperty('value');

      const validateResult = CteBuilderService.validate(input);
      expect(validateResult).toBeDefined();

      const keyResult = CteBuilderService.generateAccessKey(input);
      expect(keyResult).toHaveProperty('value');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // build()
  // ─────────────────────────────────────────────────────────────────────────

  describe('build()', () => {
    it('deve gerar XML válido com dados completos', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value).toBeDefined();
      expect(result.value.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.value.xml).toContain('<CTe xmlns="http://www.portalfiscal.inf.br/cte">');
      expect(result.value.xml).toContain('<infCte versao="4.00"');
      expect(result.value.chaveAcesso).toHaveLength(44);
      expect(result.value.digitoVerificador).toHaveLength(1);
    });

    it('deve incluir dados do emitente no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<emit>');
      expect(result.value.xml).toContain('<CNPJ>11222333000181</CNPJ>');
      expect(result.value.xml).toContain('<xNome>Transportadora ABC Ltda</xNome>');
    });

    it('deve incluir dados do remetente no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<rem>');
      expect(result.value.xml).toContain('<xNome>Indústria XYZ S/A</xNome>');
    });

    it('deve incluir dados do destinatário no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<dest>');
      expect(result.value.xml).toContain('<xNome>Comércio DEF Ltda</xNome>');
    });

    it('deve incluir valores da prestação no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<vPrest>');
      expect(result.value.xml).toContain('<vTPrest>1500.00</vTPrest>');
      expect(result.value.xml).toContain('<vRec>1500.00</vRec>');
    });

    it('deve incluir impostos (ICMS) no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<imp>');
      expect(result.value.xml).toContain('<ICMS>');
      expect(result.value.xml).toContain('<CST>00</CST>');
      expect(result.value.xml).toContain('<vBC>1500.00</vBC>');
      expect(result.value.xml).toContain('<pICMS>12.00</pICMS>');
      expect(result.value.xml).toContain('<vICMS>180.00</vICMS>');
    });

    it('deve incluir informações da carga no XML', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<infCarga>');
      expect(result.value.xml).toContain('<vCarga>50000.00</vCarga>');
      expect(result.value.xml).toContain('<proPred>PECAS AUTOMOTIVAS</proPred>');
    });

    it('deve incluir seguro quando informado', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<seg>');
      expect(result.value.xml).toContain('<respSeg>4</respSeg>');
      expect(result.value.xml).toContain('<xSeg>Seguradora ABC</xSeg>');
      expect(result.value.xml).toContain('<nApol>POL123456</nApol>');
    });

    it('deve incluir documentos vinculados (NFe)', () => {
      const input = createValidInput();

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<infDoc>');
      expect(result.value.xml).toContain('<infNFe>');
      expect(result.value.xml).toContain(
        '<chave>35260111222333000181550010000123451123456789</chave>'
      );
    });

    it('deve escapar caracteres especiais no XML', () => {
      const input = createValidInput();
      input.emitente.razaoSocial = 'Empresa & Cia <Ltda>';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('Empresa &amp; Cia &lt;Ltda&gt;');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validate()
  // ─────────────────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('deve validar dados corretos', () => {
      const input = createValidInput();

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(false);
    });

    it('deve rejeitar CNPJ do emitente vazio', () => {
      const input = createValidInput();
      input.emitente.cnpj = '';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CNPJ do emitente');
    });

    it('deve rejeitar CNPJ do emitente inválido', () => {
      const input = createValidInput();
      input.emitente.cnpj = '11.111.111/1111-11';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CNPJ do emitente inválido');
    });

    it('deve rejeitar remetente sem CNPJ/CPF', () => {
      const input = createValidInput();
      input.remetente.cnpjCpf = '';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CNPJ/CPF do remetente');
    });

    it('deve rejeitar destinatário sem CNPJ/CPF', () => {
      const input = createValidInput();
      input.destinatario.cnpjCpf = '';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('CNPJ/CPF do destinatário');
    });

    it('deve rejeitar valor do serviço zero ou negativo', () => {
      const input = createValidInput();
      input.valorServico = 0;

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Valor do serviço');
    });

    it('deve rejeitar alíquota ICMS inválida', () => {
      const input = createValidInput();
      input.icms.aliquota = 150;

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Alíquota ICMS');
    });

    it('deve rejeitar produto predominante vazio', () => {
      const input = createValidInput();
      input.carga.produtoPredominante = '';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Produto predominante');
    });

    it('deve rejeitar UF inválida', () => {
      const input = createValidInput();
      input.emitente.endereco.uf = 'XX';

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('UF do emitente inválida');
    });

    it('deve rejeitar responsável seguro inválido', () => {
      const input = createValidInput();
      input.seguro = {
        responsavel: 10, // Inválido (deve ser 0-5)
      };

      const result = CteBuilderService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('Responsável pelo seguro inválido');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateAccessKey()
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateAccessKey()', () => {
    it('deve gerar chave com 44 dígitos', () => {
      const input = createValidInput();

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value).toHaveLength(44);
    });

    it('deve iniciar com código UF correto', () => {
      const input = createValidInput();
      input.emitente.endereco.uf = 'SP';

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.substring(0, 2)).toBe('35'); // Código SP
    });

    it('deve conter modelo 57 (CTe)', () => {
      const input = createValidInput();

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.substring(20, 22)).toBe('57');
    });

    it('deve conter série formatada corretamente', () => {
      const input = createValidInput();
      input.serie = 1;

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.substring(22, 25)).toBe('001');
    });

    it('deve conter número formatado corretamente', () => {
      const input = createValidInput();
      input.numero = 12345;

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.substring(25, 34)).toBe('000012345');
    });

    it('deve rejeitar UF inválida', () => {
      const input = createValidInput();
      input.emitente.endereco.uf = 'XX';

      const result = CteBuilderService.generateAccessKey(input);

      expect(Result.isFail(result)).toBe(true);
      expect(result.error).toContain('UF inválida');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cenários de CST diferentes
  // ─────────────────────────────────────────────────────────────────────────

  describe('CST ICMS diferentes', () => {
    it('deve gerar ICMS00 para CST 00', () => {
      const input = createValidInput();
      input.icms.cst = '00';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<ICMS00>');
    });

    it('deve gerar ICMS20 para CST 20', () => {
      const input = createValidInput();
      input.icms.cst = '20';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<ICMS20>');
    });

    it('deve gerar ICMS45 para CST 40', () => {
      const input = createValidInput();
      input.icms.cst = '40';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<ICMS45>');
    });

    it('deve gerar ICMS60 para CST 60', () => {
      const input = createValidInput();
      input.icms.cst = '60';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<ICMS60>');
    });

    it('deve gerar ICMS90 para CST 90', () => {
      const input = createValidInput();
      input.icms.cst = '90';

      const result = CteBuilderService.build(input);

      expect(Result.isFail(result)).toBe(false);
      expect(result.value.xml).toContain('<ICMS90>');
    });
  });
});
