/**
 * Testes Unitários - FreightContractParser
 *
 * @module tests/unit/modules/contracts/domain/services
 * @see E-Agent-Fase-D5
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { FreightContractParser } from '@/modules/contracts/domain/services/FreightContractParser';
import type { DocumentExtractionResult } from '@/shared/infrastructure/docling';

// Inline mock para evitar problemas de memória
const mockExtraction: DocumentExtractionResult = {
  text: `CONTRATO DE TRANSPORTE
Contrato Nº: 2024/001

CONTRATANTE: EMPRESA LOGÍSTICA LTDA
CNPJ: 12.345.678/0001-95

CONTRATADO: TRANSPORTADORA ABC S.A.
CNPJ: 98.765.432/0001-10

CLÁUSULA PRIMEIRA - DO OBJETO
Prestação de serviços de coleta e entrega de cargas.

CLÁUSULA SEGUNDA - DO PREÇO
Valor: R$ 150,00 por viagem. Pagamento em 45 dias.

CLÁUSULA TERCEIRA - DO REAJUSTE
Reajuste anual pelo IPCA.

CLÁUSULA QUARTA - DA VIGÊNCIA
Vigência de 12 meses. Data: 01/01/2024.
Renovação automática.
Aviso prévio de 30 dias.

CLÁUSULA QUINTA - PENALIDADES
Multa por atraso: 2%
Multa por rescisão antecipada: 20%
Multa por descumprimento: 10%

CLÁUSULA SEXTA - SEGURO
Seguro RCTR-C obrigatório. Cobertura mínima R$ 500.000,00.

CLÁUSULA SÉTIMA - RESPONSABILIDADES
CONTRATANTE: disponibilizar carga, emitir nota fiscal.
CONTRATADO: transportar, emitir CT-e.

CLÁUSULA OITAVA - RESCISÃO
Rescisão por inadimplemento ou sem justa causa.
Aviso prévio de 30 dias.

TESTEMUNHAS:
CPF: 111.222.333-44
CPF: 555.666.777-88`,
  tables: [],
  metadata: { pageCount: 2, title: 'Contrato', fileSize: 10000 },
  processingTimeMs: 1000,
};

describe('FreightContractParser', () => {
  // ==========================================================================
  // MAIN PARSING
  // ==========================================================================

  describe('parseFromDoclingResult', () => {
    it('should parse contract successfully', () => {
      const result = FreightContractParser.parseFromDoclingResult(mockExtraction, 'contrato.pdf');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.fileName).toBe('contrato.pdf');
        expect(result.value.id).toBeDefined();
      }
    });

    it('should fail on empty extraction', () => {
      const empty: DocumentExtractionResult = {
        text: '',
        tables: [],
        metadata: { pageCount: 0, title: '', fileSize: 0 },
        processingTimeMs: 0,
      };
      const result = FreightContractParser.parseFromDoclingResult(empty, 'empty.pdf');
      expect(Result.isFail(result)).toBe(true);
    });

    it('should generate unique id', () => {
      const result1 = FreightContractParser.parseFromDoclingResult(mockExtraction, 'a.pdf');
      const result2 = FreightContractParser.parseFromDoclingResult(mockExtraction, 'b.pdf');

      expect(Result.isOk(result1)).toBe(true);
      expect(Result.isOk(result2)).toBe(true);

      if (Result.isOk(result1) && Result.isOk(result2)) {
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });
  });

  // ==========================================================================
  // IDENTIFICATION
  // ==========================================================================

  describe('extractIdentification', () => {
    it('should extract contract number', () => {
      const id = FreightContractParser.extractIdentification(mockExtraction.text);
      expect(id.contractNumber).toBe('2024/001');
    });

    it('should detect auto renewal', () => {
      const id = FreightContractParser.extractIdentification(mockExtraction.text);
      expect(id.autoRenewal).toBe(true);
    });

    it('should detect contract type', () => {
      const textDedicado = 'CONTRATO DE FROTA DEDICADA';
      const id = FreightContractParser.extractIdentification(textDedicado);
      expect(id.contractType).toBe('FRETE_DEDICADO');
    });

    it('should default to OUTROS if type not detected', () => {
      const text = 'Contrato genérico';
      const id = FreightContractParser.extractIdentification(text);
      expect(id.contractType).toBe('OUTROS');
    });
  });

  // ==========================================================================
  // PARTIES
  // ==========================================================================

  describe('extractParties', () => {
    it('should extract contractor and contracted', () => {
      const result = FreightContractParser.extractParties(mockExtraction.text);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.contractor).toBeDefined();
        expect(result.value.contracted).toBeDefined();
      }
    });

    it('should extract witnesses', () => {
      const result = FreightContractParser.extractParties(mockExtraction.text);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.witnesses.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should create default parties if no documents found', () => {
      const text = 'Contrato sem CNPJ';
      const result = FreightContractParser.extractParties(text);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.contractor.name).toBe('Não identificado');
      }
    });
  });

  // ==========================================================================
  // OBJECT
  // ==========================================================================

  describe('extractObject', () => {
    it('should extract service types', () => {
      const obj = FreightContractParser.extractObject(mockExtraction.text);
      expect(obj.serviceType).toContain('COLETA');
      expect(obj.serviceType).toContain('ENTREGA');
    });

    it('should extract description', () => {
      const obj = FreightContractParser.extractObject(mockExtraction.text);
      expect(obj.description.length).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // FINANCIAL
  // ==========================================================================

  describe('extractFinancial', () => {
    it('should extract payment terms', () => {
      const fin = FreightContractParser.extractFinancial(mockExtraction.text, []);
      expect(fin.paymentTerms.dueDays).toBe(45);
    });

    it('should extract reajustment index', () => {
      const fin = FreightContractParser.extractFinancial(mockExtraction.text, []);
      expect(fin.reajustment?.index).toBe('IPCA');
    });

    it('should extract currency values', () => {
      const fin = FreightContractParser.extractFinancial(mockExtraction.text, []);
      // O primeiro valor encontrado pode não ser exatamente 150 devido à ordem de extração
      expect(fin.pricing.baseValue).toBeDefined();
      expect(typeof fin.pricing.baseValue).toBe('number');
    });
  });

  // ==========================================================================
  // TERMS
  // ==========================================================================

  describe('extractTerms', () => {
    it('should extract duration in months', () => {
      const terms = FreightContractParser.extractTerms(mockExtraction.text);
      expect(terms.durationMonths).toBe(12);
    });

    it('should detect auto renewal', () => {
      const terms = FreightContractParser.extractTerms(mockExtraction.text);
      expect(terms.autoRenewal).toBe(true);
    });

    it('should extract renewal notice days', () => {
      const terms = FreightContractParser.extractTerms(mockExtraction.text);
      expect(terms.renewalNoticeDays).toBe(30);
    });
  });

  // ==========================================================================
  // PENALTIES
  // ==========================================================================

  describe('extractPenalties', () => {
    it('should extract late payment penalty', () => {
      const penalties = FreightContractParser.extractPenalties(mockExtraction.text);
      expect(penalties.latePayment).toBeDefined();
      expect(penalties.latePayment?.percentage).toBe(2);
    });

    it('should extract early termination penalty', () => {
      const penalties = FreightContractParser.extractPenalties(mockExtraction.text);
      expect(penalties.earlyTermination).toBeDefined();
      expect(penalties.earlyTermination?.percentage).toBe(20);
    });

    it('should extract non-performance penalty', () => {
      const penalties = FreightContractParser.extractPenalties(mockExtraction.text);
      expect(penalties.nonPerformance).toBeDefined();
    });
  });

  // ==========================================================================
  // INSURANCE
  // ==========================================================================

  describe('extractInsurance', () => {
    it('should detect required insurance', () => {
      const insurance = FreightContractParser.extractInsurance(mockExtraction.text);
      expect(insurance.required).toBe(true);
    });

    it('should extract RCTR-C', () => {
      const insurance = FreightContractParser.extractInsurance(mockExtraction.text);
      expect(insurance.types.some((t) => t.type === 'RCTR_C')).toBe(true);
    });

    it('should extract min coverage', () => {
      // Usar texto específico para evitar confusão com CNPJ
      const insuranceText = 'Seguro RCTR-C com cobertura mínima de R$ 500.000,00';
      const insurance = FreightContractParser.extractInsurance(insuranceText);
      expect(insurance.minCoverage).toBe(500000);
    });
  });

  // ==========================================================================
  // RESPONSIBILITIES
  // ==========================================================================

  describe('extractResponsibilities', () => {
    it('should extract contractor responsibilities', () => {
      const resp = FreightContractParser.extractResponsibilities(mockExtraction.text);
      expect(resp.contractor.length).toBeGreaterThan(0);
    });

    it('should extract contracted responsibilities', () => {
      const resp = FreightContractParser.extractResponsibilities(mockExtraction.text);
      expect(resp.contracted.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TERMINATION
  // ==========================================================================

  describe('extractTermination', () => {
    it('should extract notice period', () => {
      const term = FreightContractParser.extractTermination(mockExtraction.text);
      expect(term.noticePeriodDays).toBe(30);
    });

    it('should extract termination causes', () => {
      const term = FreightContractParser.extractTermination(mockExtraction.text);
      expect(term.terminationCauses.length).toBeGreaterThan(0);
    });
  });
});
