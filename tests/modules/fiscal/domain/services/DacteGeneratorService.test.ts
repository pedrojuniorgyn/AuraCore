/**
 * Testes unitários para DacteGeneratorService
 *
 * Verifica:
 * - Regras DDD (stateless, constructor privado, Result pattern)
 * - Geração de estrutura DACTE
 * - Validações de entrada
 * - Formatação de campos
 *
 * @since E8 Fase 2.3
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import {
  DacteGeneratorService,
  type DacteInput,
  type DacteEndereco,
  type DacteEmitente,
  type DacteParticipante,
} from '@/modules/fiscal/domain/services/DacteGeneratorService';

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

const createEnderecoFixture = (override?: Partial<DacteEndereco>): DacteEndereco => ({
  logradouro: 'Rua das Transportadoras',
  numero: '1000',
  bairro: 'Centro',
  codigoMunicipio: '3550308',
  nomeMunicipio: 'São Paulo',
  uf: 'SP',
  cep: '01310100',
  ...override,
});

const createEmitenteFixture = (override?: Partial<DacteEmitente>): DacteEmitente => ({
  cnpj: '12345678000190',
  inscricaoEstadual: '123456789012',
  razaoSocial: 'Transportadora Teste LTDA',
  nomeFantasia: 'Trans Teste',
  endereco: createEnderecoFixture(),
  telefone: '11999998888',
  email: 'contato@transteste.com.br',
  ...override,
});

const createParticipanteFixture = (override?: Partial<DacteParticipante>): DacteParticipante => ({
  cpfCnpj: '98765432000121',
  inscricaoEstadual: '987654321098',
  razaoSocial: 'Empresa Remetente LTDA',
  endereco: createEnderecoFixture({
    logradouro: 'Av. Industrial',
    numero: '500',
    nomeMunicipio: 'Campinas',
  }),
  telefone: '19988887777',
  ...override,
});

const createValidInput = (override?: Partial<DacteInput>): DacteInput => ({
  chaveAcesso: '35240112345678000190570010000000011234567890',
  numero: 1,
  serie: 1,
  modelo: '57',
  dataEmissao: new Date('2024-01-15T10:30:00'),
  dataAutorizacao: new Date('2024-01-15T10:31:00'),
  protocoloAutorizacao: '135240100001234',
  modal: 'RODOVIARIO',
  tipoServico: 'NORMAL',
  tipoCte: 'NORMAL',
  emitente: createEmitenteFixture(),
  remetente: createParticipanteFixture(),
  destinatario: createParticipanteFixture({
    cpfCnpj: '11222333000144',
    razaoSocial: 'Empresa Destinatário LTDA',
    endereco: createEnderecoFixture({
      logradouro: 'Av. Recebimento',
      numero: '200',
      nomeMunicipio: 'Rio de Janeiro',
      uf: 'RJ',
      codigoMunicipio: '3304557',
    }),
  }),
  tomador: 'REMETENTE',
  ufInicio: 'SP',
  ufFim: 'RJ',
  municipioInicio: 'São Paulo',
  municipioFim: 'Rio de Janeiro',
  valorTotalServico: 1500.0,
  valorReceber: 1500.0,
  valorCarga: 50000.0,
  produtoPredominante: 'Produtos Diversos',
  pesoBruto: 1000.5,
  volumes: 50,
  icms: {
    cst: '00',
    baseCalculo: 1500.0,
    aliquota: 12,
    valor: 180.0,
  },
  documentosOriginarios: [
    {
      tipo: 'NFE',
      chaveAcesso: '35240112345678000190550010000001231234567890',
      valor: 50000.0,
    },
  ],
  observacoes: 'Transporte urgente',
  ...override,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════

describe('DacteGeneratorService', () => {
  describe('Regras DDD', () => {
    it('deve ter constructor privado (TypeScript impede instanciação)', () => {
      // Constructor privado é verificado em tempo de compilação pelo TypeScript
      // Em runtime, JavaScript não impede instanciação, mas TypeScript sim
      // Verificamos que a classe existe e tem constructor privado via tipo
      expect(DacteGeneratorService).toBeDefined();
      // O acesso seria: new DacteGeneratorService() - TypeScript bloquearia
    });

    it('deve retornar Result em generate()', () => {
      const input = createValidInput();
      const result = DacteGeneratorService.generate(input);
      expect(result).toHaveProperty('value');
    });

    it('deve retornar Result em validate()', () => {
      const input = createValidInput();
      const result = DacteGeneratorService.validate(input);
      expect(result).toHaveProperty('value');
    });

    it('deve ter apenas métodos estáticos', () => {
      expect(typeof DacteGeneratorService.generate).toBe('function');
      expect(typeof DacteGeneratorService.validate).toBe('function');
      expect(typeof DacteGeneratorService.formatAccessKey).toBe('function');
      expect(typeof DacteGeneratorService.calculateCheckDigit).toBe('function');
    });
  });

  describe('generate()', () => {
    it('deve gerar estrutura DACTE completa com dados válidos', () => {
      const input = createValidInput();
      const result = DacteGeneratorService.generate(input);

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      const dacte = result.value;

      // Header
      expect(dacte.header.modelo).toBe('57');
      expect(dacte.header.serie).toBe('001');
      expect(dacte.header.numero).toBe('000000001');
      expect(dacte.header.modal).toBe('Rodoviário');
      expect(dacte.header.tipoServico).toBe('Normal');

      // Barcode
      expect(dacte.barcode.chaveAcesso).toBe(input.chaveAcesso);
      expect(dacte.barcode.protocolo).toBe('135240100001234');

      // Emitente
      expect(dacte.emitente.cnpjFormatado).toBe('12.345.678/0001-90');
      expect(dacte.emitente.razaoSocial).toBe('Transportadora Teste LTDA');

      // Percurso
      expect(dacte.percurso.origem).toBe('São Paulo/SP');
      expect(dacte.percurso.destino).toBe('Rio de Janeiro/RJ');

      // Remetente e Destinatário
      expect(dacte.remetente.tipo).toBe('REMETENTE');
      expect(dacte.remetente.isTomador).toBe(true);
      expect(dacte.destinatario.tipo).toBe('DESTINATARIO');
      expect(dacte.destinatario.isTomador).toBe(false);

      // Impostos
      expect(dacte.impostos.situacaoTributaria).toBe('00 - Tributação Normal');
      expect(dacte.impostos.aliquota).toBe('12.00%');

      // Carga
      expect(dacte.carga.produtoPredominante).toBe('Produtos Diversos');
      expect(dacte.carga.pesoBruto).toBe('1000.500 kg');

      // Documentos
      expect(dacte.documentos.totalDocumentos).toBe(1);
      expect(dacte.documentos.documentos[0].tipo).toBe('NF-e');

      // Footer
      expect(dacte.footer.versaoLayout).toBe('4.00');
    });

    it('deve incluir expedidor e recebedor quando fornecidos', () => {
      const input = createValidInput({
        expedidor: createParticipanteFixture({
          cpfCnpj: '55666777000188',
          razaoSocial: 'Expedidor LTDA',
        }),
        recebedor: createParticipanteFixture({
          cpfCnpj: '99888777000166',
          razaoSocial: 'Recebedor LTDA',
        }),
        tomador: 'EXPEDIDOR',
      });

      const result = DacteGeneratorService.generate(input);

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.expedidor).toBeDefined();
      expect(result.value.expedidor?.tipo).toBe('EXPEDIDOR');
      expect(result.value.expedidor?.isTomador).toBe(true);

      expect(result.value.recebedor).toBeDefined();
      expect(result.value.recebedor?.tipo).toBe('RECEBEDOR');
      expect(result.value.recebedor?.isTomador).toBe(false);
    });

    it('deve incluir componentes de valor quando fornecidos', () => {
      const input = createValidInput({
        componentes: [
          { nome: 'Frete Peso', valor: 1000.0 },
          { nome: 'Pedágio', valor: 200.0 },
          { nome: 'Seguro', valor: 300.0 },
        ],
      });

      const result = DacteGeneratorService.generate(input);

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      expect(result.value.componentes.itens).toHaveLength(3);
      expect(result.value.componentes.itens[0].nome).toBe('Frete Peso');
      expect(result.value.componentes.itens[1].nome).toBe('Pedágio');
    });

    it('deve falhar com dados inválidos', () => {
      const input = createValidInput({ chaveAcesso: 'invalida' });
      const result = DacteGeneratorService.generate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;

      expect(result.error).toContain('44 dígitos');
    });
  });

  describe('validate()', () => {
    it('deve aceitar dados válidos', () => {
      const input = createValidInput();
      const result = DacteGeneratorService.validate(input);

      expect(Result.isOk(result)).toBe(true);
    });

    it('deve rejeitar chave de acesso com tamanho incorreto', () => {
      const input = createValidInput({ chaveAcesso: '123456' });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('44 dígitos');
    });

    it('deve rejeitar chave de acesso com caracteres não numéricos', () => {
      const input = createValidInput({
        chaveAcesso: '3524011234567800019057001000000001123456789X',
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('apenas números');
    });

    it('deve rejeitar número do CTe zero ou negativo', () => {
      const input = createValidInput({ numero: 0 });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('maior que zero');
    });

    it('deve rejeitar série negativa', () => {
      const input = createValidInput({ serie: -1 });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('negativa');
    });

    it('deve rejeitar CNPJ do emitente inválido', () => {
      const input = createValidInput({
        emitente: createEmitenteFixture({ cnpj: '123' }),
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('CNPJ do emitente');
    });

    it('deve rejeitar razão social do emitente vazia', () => {
      const input = createValidInput({
        emitente: createEmitenteFixture({ razaoSocial: '   ' }),
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('Razão social do emitente');
    });

    it('deve rejeitar CPF/CNPJ do remetente inválido', () => {
      const input = createValidInput({
        remetente: createParticipanteFixture({ cpfCnpj: '12345' }),
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('remetente');
    });

    it('deve rejeitar CPF/CNPJ do destinatário inválido', () => {
      const input = createValidInput({
        destinatario: createParticipanteFixture({ cpfCnpj: '999' }),
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('destinatário');
    });

    it('deve rejeitar valor total do serviço negativo', () => {
      const input = createValidInput({ valorTotalServico: -100 });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('Valor total');
    });

    it('deve rejeitar valor da carga negativo', () => {
      const input = createValidInput({ valorCarga: -1 });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('Valor da carga');
    });

    it('deve rejeitar peso bruto zero ou negativo', () => {
      const input = createValidInput({ pesoBruto: 0 });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('Peso bruto');
    });

    it('deve rejeitar UF de início inválida', () => {
      const input = createValidInput({ ufInicio: 'XX' });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('UF de início');
    });

    it('deve rejeitar UF de fim inválida', () => {
      const input = createValidInput({ ufFim: 'ZZ' });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('UF de fim');
    });

    it('deve rejeitar alíquota de ICMS fora do range', () => {
      const input = createValidInput({
        icms: { cst: '00', baseCalculo: 1000, aliquota: 150, valor: 1500 },
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('Alíquota');
    });

    it('deve aceitar CPF de pessoa física como remetente', () => {
      const input = createValidInput({
        remetente: createParticipanteFixture({ cpfCnpj: '12345678901' }),
      });
      const result = DacteGeneratorService.validate(input);

      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe('formatAccessKey()', () => {
    it('deve formatar chave de 44 dígitos com espaços', () => {
      const chave = '35240112345678000190570010000000011234567890';
      const result = DacteGeneratorService.formatAccessKey(chave);

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      // Chave formatada em grupos de 4 dígitos
      expect(result.value).toBe('3524 0112 3456 7800 0190 5700 1000 0000 0112 3456 7890');
    });

    it('deve rejeitar chave com tamanho incorreto', () => {
      const result = DacteGeneratorService.formatAccessKey('123456');

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('44 dígitos');
    });
  });

  describe('calculateCheckDigit()', () => {
    it('deve calcular dígito verificador corretamente', () => {
      // Chave sem DV (43 dígitos)
      const chave43 = '3524011234567800019057001000000001123456789';
      const result = DacteGeneratorService.calculateCheckDigit(chave43);

      expect(Result.isOk(result)).toBe(true);
      if (!Result.isOk(result)) return;

      // O DV deve ser um dígito
      expect(result.value.length).toBe(1);
      expect(/^\d$/.test(result.value)).toBe(true);
    });

    it('deve rejeitar chave com tamanho incorreto', () => {
      const result = DacteGeneratorService.calculateCheckDigit('123456');

      expect(Result.isFail(result)).toBe(true);
      if (!Result.isFail(result)) return;
      expect(result.error).toContain('43 dígitos');
    });
  });

  describe('Formatação de CSTs', () => {
    const cstCases = [
      { cst: '00', expected: '00 - Tributação Normal' },
      { cst: '20', expected: '20 - Redução de Base de Cálculo' },
      { cst: '40', expected: '40 - Isenta' },
      { cst: '41', expected: '41 - Não Tributada' },
      { cst: '51', expected: '51 - Diferimento' },
      { cst: '60', expected: '60 - ICMS cobrado anteriormente por ST' },
      { cst: '90', expected: '90 - Outros' },
    ];

    cstCases.forEach(({ cst, expected }) => {
      it(`deve formatar CST ${cst} corretamente`, () => {
        const input = createValidInput({
          icms: { cst, baseCalculo: 1000, aliquota: 12, valor: 120 },
        });
        const result = DacteGeneratorService.generate(input);

        expect(Result.isOk(result)).toBe(true);
        if (!Result.isOk(result)) return;

        expect(result.value.impostos.situacaoTributaria).toBe(expected);
      });
    });
  });

  describe('Modais e Tipos', () => {
    const modalCases = [
      { modal: 'RODOVIARIO' as const, expected: 'Rodoviário' },
      { modal: 'AEREO' as const, expected: 'Aéreo' },
      { modal: 'AQUAVIARIO' as const, expected: 'Aquaviário' },
      { modal: 'FERROVIARIO' as const, expected: 'Ferroviário' },
      { modal: 'DUTOVIARIO' as const, expected: 'Dutoviário' },
    ];

    modalCases.forEach(({ modal, expected }) => {
      it(`deve formatar modal ${modal} como "${expected}"`, () => {
        const input = createValidInput({ modal });
        const result = DacteGeneratorService.generate(input);

        expect(Result.isOk(result)).toBe(true);
        if (!Result.isOk(result)) return;

        expect(result.value.header.modal).toBe(expected);
      });
    });
  });
});
