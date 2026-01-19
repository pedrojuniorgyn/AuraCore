/**
 * FreightContractAnalyzer - Domain Service
 *
 * Analisa contratos de frete e gera score de risco + alertas.
 * 100% Stateless.
 *
 * @module contracts/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D5
 */

import { Result } from '@/shared/domain';
import type {
  FreightContractData,
  RiskAnalysis,
  ContractAlert,
  ComplianceItem,
  AlertCategory,
  AlertSeverity,
  ContractFinancial,
  ContractTerms,
  ContractPenalties,
  ContractInsurance,
  ContractResponsibilities,
  ContractTermination,
} from '../types';

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

export class FreightContractAnalyzer {
  private constructor() {}

  // ==========================================================================
  // MAIN ANALYSIS METHOD
  // ==========================================================================

  /**
   * Analisa contrato e gera score de risco + alertas.
   */
  static analyze(
    contract: Omit<FreightContractData, 'riskAnalysis'>
  ): Result<RiskAnalysis, string> {
    if (!contract) {
      return Result.fail('Contrato não pode ser nulo');
    }

    const alerts: ContractAlert[] = [];

    // 1. Verificar cláusulas financeiras
    alerts.push(...this.analyzeFinancialRisks(contract.financial));

    // 2. Verificar prazos
    alerts.push(...this.analyzeTermsRisks(contract.terms));

    // 3. Verificar penalidades
    alerts.push(...this.analyzePenaltyRisks(contract.penalties));

    // 4. Verificar seguro
    alerts.push(...this.analyzeInsuranceRisks(contract.insurance));

    // 5. Verificar responsabilidades
    alerts.push(...this.analyzeResponsibilityRisks(contract.responsibilities));

    // 6. Verificar rescisão
    alerts.push(...this.analyzeTerminationRisks(contract.termination, contract.terms));

    // 7. Calcular score geral
    const overallScore = this.calculateOverallScore(alerts);
    const riskLevel = this.determineRiskLevel(overallScore);

    // 8. Gerar checklist de compliance
    const complianceChecklist = this.generateComplianceChecklist(contract);

    // 9. Gerar recomendações
    const recommendations = this.generateRecommendations(alerts, contract);

    return Result.ok({
      overallScore,
      riskLevel,
      alerts,
      recommendations,
      complianceChecklist,
    });
  }

  // ==========================================================================
  // FINANCIAL RISKS
  // ==========================================================================

  private static analyzeFinancialRisks(financial: ContractFinancial): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: prazo de pagamento muito longo
    if (financial.paymentTerms.dueDays > 60) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'FINANCEIRO',
        title: 'Prazo de pagamento extenso',
        description: `Prazo de pagamento de ${financial.paymentTerms.dueDays} dias pode afetar o fluxo de caixa.`,
        recommendation: 'Negociar prazo máximo de 45-60 dias ou condições de pagamento escalonado.',
      }));
    }

    // Alerta: prazo de pagamento muito longo (crítico)
    if (financial.paymentTerms.dueDays > 90) {
      alerts.push(this.createAlert({
        severity: 'CRITICAL',
        category: 'FINANCEIRO',
        title: 'Prazo de pagamento crítico',
        description: `Prazo de ${financial.paymentTerms.dueDays} dias representa risco significativo de inadimplência.`,
        recommendation: 'Avaliar risco de crédito do contratante. Considerar garantias adicionais.',
      }));
    }

    // Alerta: sem cláusula de reajuste
    if (!financial.reajustment) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'FINANCEIRO',
        title: 'Ausência de cláusula de reajuste',
        description: 'Contrato não prevê reajuste de valores, podendo haver perda inflacionária.',
        recommendation: 'Incluir cláusula de reajuste anual por índice oficial (IPCA, IGPM ou Diesel ANP).',
      }));
    }

    // Alerta: sem valor mínimo
    if (!financial.pricing.minimumCharge && financial.pricing.type !== 'FIXO') {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'FINANCEIRO',
        title: 'Frete mínimo não definido',
        description: 'Não foi identificado valor mínimo por viagem/operação.',
        recommendation: 'Estabelecer valor mínimo para garantir cobertura de custos fixos.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // TERMS RISKS
  // ==========================================================================

  private static analyzeTermsRisks(terms: ContractTerms): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: contrato muito curto
    if (terms.durationMonths && terms.durationMonths < 6) {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'PRAZO',
        title: 'Contrato de curta duração',
        description: `Vigência de ${terms.durationMonths} meses pode não justificar investimentos.`,
        recommendation: 'Avaliar se prazo é adequado para retorno de investimentos em equipamentos.',
      }));
    }

    // Alerta: renovação automática sem aviso prévio
    if (terms.autoRenewal && !terms.renewalNoticeDays) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'PRAZO',
        title: 'Renovação automática sem prazo de aviso',
        description: 'Contrato renova automaticamente mas não define prazo para manifestação de não interesse.',
        recommendation: 'Definir prazo mínimo de 30-60 dias para aviso de não renovação.',
      }));
    }

    // Alerta: sem data de expiração
    if (!terms.expirationDate && !terms.durationMonths) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'PRAZO',
        title: 'Prazo de vigência indefinido',
        description: 'Não foi identificada data de término ou duração do contrato.',
        recommendation: 'Verificar cláusula de vigência e garantir clareza no prazo.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // PENALTY RISKS
  // ==========================================================================

  private static analyzePenaltyRisks(penalties: ContractPenalties): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: multa rescisória elevada
    if (penalties.earlyTermination?.percentage && penalties.earlyTermination.percentage > 20) {
      alerts.push(this.createAlert({
        severity: 'CRITICAL',
        category: 'PENALIDADE',
        title: 'Multa rescisória elevada',
        description: `Multa de ${penalties.earlyTermination.percentage}% por rescisão antecipada é considerada elevada.`,
        clause: 'Rescisão',
        recommendation: 'Negociar multa proporcional ao prazo restante ou limite máximo de 20%.',
      }));
    }

    // Alerta: sem penalidade por inadimplemento do contratante
    if (!penalties.latePayment) {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'PENALIDADE',
        title: 'Sem multa por atraso de pagamento',
        description: 'Contrato não prevê penalidade para atraso no pagamento.',
        recommendation: 'Incluir multa de 2% + juros de 1% a.m. para proteção contra inadimplência.',
      }));
    }

    // Alerta: multa por volume não atingido
    if (penalties.volumeShortfall) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'PENALIDADE',
        title: 'Penalidade por volume mínimo',
        description: 'Contrato prevê multa caso volume mínimo não seja atingido.',
        recommendation: 'Avaliar viabilidade do volume comprometido e negociar flexibilidade.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // INSURANCE RISKS
  // ==========================================================================

  private static analyzeInsuranceRisks(insurance: ContractInsurance): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: seguro não obrigatório
    if (!insurance.required) {
      alerts.push(this.createAlert({
        severity: 'CRITICAL',
        category: 'SEGURO',
        title: 'Seguro não obrigatório',
        description: 'Contrato não exige seguro de carga ou responsabilidade civil.',
        recommendation: 'Incluir obrigatoriedade de RCTR-C e, se aplicável, RCF-DC.',
      }));
    }

    // Alerta: sem RCTR-C
    const hasRCTRC = insurance.types.some((t) => t.type === 'RCTR_C');
    if (insurance.required && !hasRCTRC) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'SEGURO',
        title: 'RCTR-C não especificado',
        description: 'Seguro obrigatório de Responsabilidade Civil não está claramente exigido.',
        recommendation: 'Especificar exigência de RCTR-C com cobertura mínima adequada.',
      }));
    }

    // Alerta: sem valor mínimo de cobertura
    if (insurance.required && !insurance.minCoverage) {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'SEGURO',
        title: 'Cobertura mínima não definida',
        description: 'Não está definido valor mínimo de cobertura do seguro.',
        recommendation: 'Definir cobertura mínima compatível com o valor médio das cargas.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // RESPONSIBILITY RISKS
  // ==========================================================================

  private static analyzeResponsibilityRisks(
    responsibilities: ContractResponsibilities
  ): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: responsabilidades do contratado muito amplas
    if (responsibilities.contracted.length > 8) {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'RESPONSABILIDADE',
        title: 'Muitas obrigações do contratado',
        description: `Contratado tem ${responsibilities.contracted.length} obrigações listadas.`,
        recommendation: 'Verificar se todas as obrigações são razoáveis e factíveis.',
      }));
    }

    // Alerta: sem limite de responsabilidade
    if (!responsibilities.liabilityLimits || responsibilities.liabilityLimits.length === 0) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'RESPONSABILIDADE',
        title: 'Sem limite de responsabilidade',
        description: 'Contrato não define limites de responsabilidade por danos.',
        recommendation: 'Incluir cláusula limitando responsabilidade ao valor da carga ou do seguro.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // TERMINATION RISKS
  // ==========================================================================

  private static analyzeTerminationRisks(
    termination: ContractTermination,
    terms: ContractTerms
  ): ContractAlert[] {
    const alerts: ContractAlert[] = [];

    // Alerta: aviso prévio curto
    if (termination.noticePeriodDays && termination.noticePeriodDays < 30) {
      alerts.push(this.createAlert({
        severity: 'INFO',
        category: 'RESCISAO',
        title: 'Aviso prévio curto',
        description: `Prazo de ${termination.noticePeriodDays} dias para rescisão pode ser insuficiente.`,
        recommendation: 'Negociar prazo mínimo de 30-60 dias para planejamento adequado.',
      }));
    }

    // Alerta: sem causas de rescisão definidas
    if (termination.terminationCauses.length === 0) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'RESCISAO',
        title: 'Causas de rescisão não definidas',
        description: 'Contrato não especifica causas que permitem rescisão.',
        recommendation: 'Definir claramente hipóteses de rescisão com e sem justa causa.',
      }));
    }

    // Alerta: renovação automática com multa rescisória
    if (terms.autoRenewal && termination.earlyTerminationPenalty) {
      alerts.push(this.createAlert({
        severity: 'WARNING',
        category: 'RESCISAO',
        title: 'Renovação automática com multa rescisória',
        description: 'Combinação de renovação automática com multa pode dificultar saída do contrato.',
        recommendation: 'Negociar isenção de multa durante período de renovação ou prazo de saída.',
      }));
    }

    return alerts;
  }

  // ==========================================================================
  // SCORING
  // ==========================================================================

  private static calculateOverallScore(alerts: ContractAlert[]): number {
    // Score começa em 100 e reduz com cada alerta
    let score = 100;

    for (const alert of alerts) {
      switch (alert.severity) {
        case 'CRITICAL':
          score -= 15;
          break;
        case 'WARNING':
          score -= 8;
          break;
        case 'INFO':
          score -= 3;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private static determineRiskLevel(score: number): RiskAnalysis['riskLevel'] {
    if (score >= 80) return 'BAIXO';
    if (score >= 60) return 'MEDIO';
    if (score >= 40) return 'ALTO';
    return 'CRITICO';
  }

  // ==========================================================================
  // COMPLIANCE CHECKLIST
  // ==========================================================================

  private static generateComplianceChecklist(
    contract: Omit<FreightContractData, 'riskAnalysis'>
  ): ComplianceItem[] {
    const checklist: ComplianceItem[] = [];

    // 1. Identificação das partes
    checklist.push({
      item: 'Identificação das partes contratantes',
      status: contract.parties.contractor.document && contract.parties.contracted.document
        ? 'OK'
        : 'INCOMPLETE',
      details: 'CNPJ/CPF de contratante e contratado',
    });

    // 2. Objeto do contrato
    checklist.push({
      item: 'Descrição do objeto',
      status: contract.object.description.length > 20 ? 'OK' : 'INCOMPLETE',
    });

    // 3. Preço e forma de pagamento
    checklist.push({
      item: 'Preço e condições de pagamento',
      status: contract.financial.pricing.baseValue ? 'OK' : 'MISSING',
    });

    // 4. Prazo de vigência
    checklist.push({
      item: 'Prazo de vigência',
      status: contract.terms.expirationDate || contract.terms.durationMonths ? 'OK' : 'MISSING',
    });

    // 5. Seguro obrigatório
    checklist.push({
      item: 'Cláusula de seguro',
      status: contract.insurance.required ? 'OK' : 'MISSING',
    });

    // 6. Penalidades
    checklist.push({
      item: 'Cláusula de penalidades',
      status: contract.penalties.latePayment || contract.penalties.nonPerformance
        ? 'OK'
        : 'INCOMPLETE',
    });

    // 7. Foro competente (consideramos como check se tiver cláusulas suficientes)
    checklist.push({
      item: 'Foro competente',
      status: contract.extractionMetadata.extractedClauses >= 5 ? 'OK' : 'INCOMPLETE',
      details: 'Verificar se foro está definido no documento',
    });

    return checklist;
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  private static generateRecommendations(
    alerts: ContractAlert[],
    contract: Omit<FreightContractData, 'riskAnalysis'>
  ): string[] {
    const recommendations: string[] = [];

    // Recomendações baseadas nos alertas
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
    const warningAlerts = alerts.filter((a) => a.severity === 'WARNING');

    if (criticalAlerts.length > 0) {
      recommendations.push(
        `⚠️ ATENÇÃO: ${criticalAlerts.length} ponto(s) crítico(s) identificado(s) que requerem revisão imediata.`
      );
    }

    if (warningAlerts.length > 0) {
      recommendations.push(
        `📋 ${warningAlerts.length} ponto(s) de atenção para negociação.`
      );
    }

    // Recomendação geral baseada no score
    if (contract.extractionMetadata.confidence < 0.7) {
      recommendations.push(
        '📄 Baixa confiança na extração. Recomenda-se revisão manual do documento.'
      );
    }

    // Recomendações específicas
    if (!contract.insurance.required) {
      recommendations.push(
        '🛡️ Incluir obrigatoriedade de seguro RCTR-C para proteção contra perdas.'
      );
    }

    if (!contract.financial.reajustment) {
      recommendations.push(
        '📈 Negociar cláusula de reajuste anual vinculada a índice oficial.'
      );
    }

    if (contract.terms.autoRenewal && !contract.terms.renewalNoticeDays) {
      recommendations.push(
        '📅 Definir prazo mínimo para aviso de não renovação do contrato.'
      );
    }

    return recommendations;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private static createAlert(params: {
    severity: AlertSeverity;
    category: AlertCategory;
    title: string;
    description: string;
    clause?: string;
    recommendation: string;
  }): ContractAlert {
    return {
      id: globalThis.crypto.randomUUID(),
      severity: params.severity,
      category: params.category,
      title: params.title,
      description: params.description,
      clause: params.clause,
      recommendation: params.recommendation,
    };
  }
}
