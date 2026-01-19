/**
 * Testes Unitários - FreightContractAnalyzer
 *
 * @module tests/unit/modules/contracts/domain/services
 * @see E-Agent-Fase-D5
 */

import { describe, it, expect } from 'vitest';
import { Result } from '@/shared/domain';
import { FreightContractAnalyzer } from '@/modules/contracts/domain/services/FreightContractAnalyzer';
import type { FreightContractData } from '@/modules/contracts/domain/types';

// Helper para criar contrato mock
function createMockContract(overrides: Partial<Omit<FreightContractData, 'riskAnalysis'>> = {}): Omit<FreightContractData, 'riskAnalysis'> {
  return {
    id: 'test-123',
    fileName: 'contrato.pdf',
    analyzedAt: new Date(),
    identification: {
      contractType: 'FRETE_SPOT',
      autoRenewal: false,
    },
    parties: {
      contractor: { role: 'CONTRATANTE', name: 'Empresa A', document: '12345678000195', documentType: 'CNPJ' },
      contracted: { role: 'CONTRATADO', name: 'Empresa B', document: '98765432000110', documentType: 'CNPJ' },
      witnesses: [],
    },
    object: {
      description: 'Transporte de cargas',
      serviceType: ['COLETA', 'ENTREGA'],
    },
    financial: {
      pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
      paymentTerms: { dueDays: 30 },
      reajustment: { index: 'IPCA', frequency: 'Anual' },
    },
    terms: {
      durationMonths: 12,
      autoRenewal: false,
    },
    penalties: {
      latePayment: { description: 'Multa por atraso', type: 'MULTA_PERCENTUAL', percentage: 2 },
      other: [],
    },
    insurance: {
      required: true,
      types: [{ type: 'RCTR_C', description: 'RCTR-C' }],
      responsibleParty: 'CONTRATADO',
      clauses: [],
    },
    responsibilities: {
      contractor: ['Disponibilizar carga'],
      contracted: ['Transportar'],
      shared: [],
    },
    termination: {
      noticePeriodDays: 30,
      terminationCauses: [{ cause: 'Inadimplemento', type: 'COM_JUSTA_CAUSA' }],
    },
    extractionMetadata: {
      processingTimeMs: 1000,
      pageCount: 2,
      confidence: 0.8,
      extractedClauses: 10,
      warnings: [],
    },
    ...overrides,
  };
}

describe('FreightContractAnalyzer', () => {
  // ==========================================================================
  // MAIN ANALYSIS
  // ==========================================================================

  describe('analyze', () => {
    it('should analyze contract successfully', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.overallScore).toBeDefined();
        expect(result.value.riskLevel).toBeDefined();
      }
    });

    it('should generate alerts', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(Array.isArray(result.value.alerts)).toBe(true);
      }
    });

    it('should generate recommendations', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(Array.isArray(result.value.recommendations)).toBe(true);
      }
    });

    it('should generate compliance checklist', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.complianceChecklist.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // FINANCIAL RISKS
  // ==========================================================================

  describe('financial risk analysis', () => {
    it('should alert on payment terms > 60 days', () => {
      const contract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
          paymentTerms: { dueDays: 75 },
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'FINANCEIRO' && a.title.includes('extenso')
        );
        expect(hasAlert).toBe(true);
      }
    });

    it('should alert critical on payment terms > 90 days', () => {
      const contract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
          paymentTerms: { dueDays: 120 },
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const criticalAlert = result.value.alerts.find(
          (a) => a.severity === 'CRITICAL' && a.category === 'FINANCEIRO'
        );
        expect(criticalAlert).toBeDefined();
      }
    });

    it('should alert on missing reajustment clause', () => {
      const contract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
          paymentTerms: { dueDays: 30 },
          // sem reajustment
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.title.toLowerCase().includes('reajuste')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // TERMS RISKS
  // ==========================================================================

  describe('terms risk analysis', () => {
    it('should alert on auto renewal without notice period', () => {
      const contract = createMockContract({
        terms: {
          autoRenewal: true,
          // sem renewalNoticeDays
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'PRAZO' && a.title.includes('aviso')
        );
        expect(hasAlert).toBe(true);
      }
    });

    it('should alert on short contract duration', () => {
      const contract = createMockContract({
        terms: {
          durationMonths: 3,
          autoRenewal: false,
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'PRAZO' && a.title.includes('curta')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // PENALTY RISKS
  // ==========================================================================

  describe('penalty risk analysis', () => {
    it('should alert on high early termination penalty (> 20%)', () => {
      const contract = createMockContract({
        penalties: {
          earlyTermination: { description: 'Multa', type: 'MULTA_PERCENTUAL', percentage: 30 },
          other: [],
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const criticalAlert = result.value.alerts.find(
          (a) => a.severity === 'CRITICAL' && a.category === 'PENALIDADE'
        );
        expect(criticalAlert).toBeDefined();
      }
    });

    it('should alert on missing late payment penalty', () => {
      const contract = createMockContract({
        penalties: {
          // sem latePayment
          other: [],
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'PENALIDADE' && a.title.includes('atraso')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // INSURANCE RISKS
  // ==========================================================================

  describe('insurance risk analysis', () => {
    it('should alert critical on missing required insurance', () => {
      const contract = createMockContract({
        insurance: {
          required: false,
          types: [],
          responsibleParty: 'CONTRATADO',
          clauses: [],
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const criticalAlert = result.value.alerts.find(
          (a) => a.severity === 'CRITICAL' && a.category === 'SEGURO'
        );
        expect(criticalAlert).toBeDefined();
      }
    });

    it('should alert on missing RCTR-C', () => {
      const contract = createMockContract({
        insurance: {
          required: true,
          types: [], // sem RCTR_C
          responsibleParty: 'CONTRATADO',
          clauses: [],
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'SEGURO' && a.title.includes('RCTR-C')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // RESPONSIBILITY RISKS
  // ==========================================================================

  describe('responsibility risk analysis', () => {
    it('should alert on missing liability limits', () => {
      const contract = createMockContract({
        responsibilities: {
          contractor: ['Disponibilizar carga'],
          contracted: ['Transportar'],
          shared: [],
          // sem liabilityLimits
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'RESPONSABILIDADE' && a.title.includes('limite')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // TERMINATION RISKS
  // ==========================================================================

  describe('termination risk analysis', () => {
    it('should alert on missing termination causes', () => {
      const contract = createMockContract({
        termination: {
          noticePeriodDays: 30,
          terminationCauses: [],
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'RESCISAO' && (a.title.toLowerCase().includes('causas') || a.title.toLowerCase().includes('rescisão'))
        );
        expect(hasAlert).toBe(true);
      }
    });

    it('should alert on auto renewal with early termination penalty', () => {
      const contract = createMockContract({
        terms: {
          autoRenewal: true,
        },
        termination: {
          noticePeriodDays: 30,
          terminationCauses: [],
          earlyTerminationPenalty: { description: 'Multa', type: 'MULTA_PERCENTUAL', percentage: 20 },
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const hasAlert = result.value.alerts.some(
          (a) => a.category === 'RESCISAO' && a.description.includes('renovação automática')
        );
        expect(hasAlert).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SCORING
  // ==========================================================================

  describe('scoring', () => {
    it('should have high score for low-risk contract', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.overallScore).toBeGreaterThan(50);
      }
    });

    it('should reduce score for each alert', () => {
      const lowRiskContract = createMockContract();
      const highRiskContract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
          paymentTerms: { dueDays: 120 }, // critical
        },
        insurance: {
          required: false, // critical
          types: [],
          responsibleParty: 'CONTRATADO',
          clauses: [],
        },
      });

      const lowResult = FreightContractAnalyzer.analyze(lowRiskContract);
      const highResult = FreightContractAnalyzer.analyze(highRiskContract);

      expect(Result.isOk(lowResult)).toBe(true);
      expect(Result.isOk(highResult)).toBe(true);

      if (Result.isOk(lowResult) && Result.isOk(highResult)) {
        expect(highResult.value.overallScore).toBeLessThan(lowResult.value.overallScore);
      }
    });

    it('should determine risk level based on score', () => {
      const criticalContract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', baseValue: 1000, currency: 'BRL' },
          paymentTerms: { dueDays: 120 },
        },
        insurance: { required: false, types: [], responsibleParty: 'CONTRATADO', clauses: [] },
        penalties: { earlyTermination: { description: 'Multa', type: 'MULTA_PERCENTUAL', percentage: 50 }, other: [] },
      });

      const result = FreightContractAnalyzer.analyze(criticalContract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        expect(['ALTO', 'CRITICO']).toContain(result.value.riskLevel);
      }
    });
  });

  // ==========================================================================
  // COMPLIANCE CHECKLIST
  // ==========================================================================

  describe('compliance checklist', () => {
    it('should check party identification', () => {
      const contract = createMockContract();
      const result = FreightContractAnalyzer.analyze(contract);

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        const partyCheck = result.value.complianceChecklist.find(
          (c) => c.item.includes('partes')
        );
        expect(partyCheck).toBeDefined();
        expect(partyCheck?.status).toBe('OK');
      }
    });

    it('should flag missing pricing', () => {
      const contract = createMockContract({
        financial: {
          pricing: { type: 'FIXO', currency: 'BRL' }, // sem baseValue
          paymentTerms: { dueDays: 30 },
        },
      });

      const result = FreightContractAnalyzer.analyze(contract);
      expect(Result.isOk(result)).toBe(true);

      if (Result.isOk(result)) {
        const priceCheck = result.value.complianceChecklist.find(
          (c) => c.item.includes('Preço')
        );
        expect(priceCheck?.status).toBe('MISSING');
      }
    });
  });
});
