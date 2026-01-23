/**
 * FreightContractParser - Domain Service
 *
 * Faz parsing de PDFs de contratos de frete para estrutura tipada.
 * 100% Stateless.
 *
 * @module contracts/domain/services
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D5
 */

import { Result } from '@/shared/domain';
import type { DocumentExtractionResult } from '@/shared/domain';
import type {
  FreightContractData,
  ContractIdentification,
  ContractParties,
  ContractParty,
  ContractObject,
  ContractFinancial,
  ContractTerms,
  ContractPenalties,
  ContractInsurance,
  ContractResponsibilities,
  ContractTermination,
  ContractType,
  ServiceType,
  ExtractionMetadata,
  RiskAnalysis,
} from '../types';
import { ClauseExtractor } from './ClauseExtractor';

// ============================================================================
// PATTERNS
// ============================================================================

const CONTRACT_TYPE_KEYWORDS: Record<ContractType, string[]> = {
  FRETE_SPOT: ['frete avulso', 'frete spot', 'transporte eventual'],
  FRETE_DEDICADO: ['frota dedicada', 'frete dedicado', 'exclusividade'],
  AGREGAMENTO: ['agregamento', 'agregado', 'agregação'],
  SUBCONTRATACAO: ['subcontratação', 'subcontrat', 'terceirização'],
  ARMAZENAGEM: ['armazenagem', 'armazém', 'estocagem', 'guarda'],
  OPERACAO_LOGISTICA: ['operação logística', 'operador logístico', '3pl', '4pl'],
  OUTROS: [],
};

const SERVICE_TYPE_KEYWORDS: Record<ServiceType, string[]> = {
  COLETA: ['coleta', 'retirada', 'pickup'],
  ENTREGA: ['entrega', 'delivery', 'destinação'],
  TRANSFERENCIA: ['transferência', 'transfer', 'movimentação'],
  DISTRIBUICAO: ['distribuição', 'distribution'],
  CROSS_DOCKING: ['cross docking', 'crossdocking', 'transbordo'],
  MILK_RUN: ['milk run', 'milkrun', 'rota leiteira'],
  ARMAZENAGEM: ['armazenagem', 'armazém', 'storage'],
  PICKING: ['picking', 'separação', 'segregação'],
  PACKING: ['packing', 'embalagem', 'empacotamento'],
};

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

export class FreightContractParser {
  private constructor() {}

  // ==========================================================================
  // MAIN PARSING METHOD
  // ==========================================================================

  /**
   * Converte resultado do Docling em dados estruturados de contrato.
   */
  static parseFromDoclingResult(
    extraction: DocumentExtractionResult,
    fileName: string
  ): Result<Omit<FreightContractData, 'riskAnalysis'>, string> {
    if (!extraction || !extraction.text) {
      return Result.fail('Extração inválida ou texto vazio');
    }

    const text = extraction.text;
    const tables = extraction.tables ?? [];

    // 1. Extrair identificação
    const identification = this.extractIdentification(text);

    // 2. Extrair partes (obrigatório)
    const partiesResult = this.extractParties(text);
    if (Result.isFail(partiesResult)) {
      return Result.fail(`Erro ao extrair partes: ${partiesResult.error}`);
    }

    // 3. Extrair objeto
    const object = this.extractObject(text);

    // 4. Extrair informações financeiras
    const financial = this.extractFinancial(text, tables);

    // 5. Extrair prazos
    const terms = this.extractTerms(text);

    // 6. Extrair penalidades
    const penalties = this.extractPenalties(text);

    // 7. Extrair seguro
    const insurance = this.extractInsurance(text);

    // 8. Extrair responsabilidades
    const responsibilities = this.extractResponsibilities(text);

    // 9. Extrair condições de rescisão
    const termination = this.extractTermination(text);

    // 10. Montar metadados
    const extractionMetadata: ExtractionMetadata = {
      processingTimeMs: extraction.processingTimeMs,
      pageCount: extraction.metadata.pageCount,
      confidence: this.calculateConfidence(extraction),
      extractedClauses: ClauseExtractor.countClauses(text),
      warnings: [],
    };

    return Result.ok({
      id: globalThis.crypto.randomUUID(),
      fileName,
      analyzedAt: new Date(),
      identification,
      parties: partiesResult.value,
      object,
      financial,
      terms,
      penalties,
      insurance,
      responsibilities,
      termination,
      extractionMetadata,
    });
  }

  // ==========================================================================
  // IDENTIFICATION EXTRACTION
  // ==========================================================================

  static extractIdentification(text: string): ContractIdentification {
    const lowerText = text.toLowerCase();

    // Detectar tipo de contrato
    let contractType: ContractType = 'OUTROS';
    for (const [type, keywords] of Object.entries(CONTRACT_TYPE_KEYWORDS)) {
      if (keywords.some((kw) => lowerText.includes(kw))) {
        contractType = type as ContractType;
        break;
      }
    }

    // Extrair número do contrato
    const contractNumberMatch = text.match(/contrato\s*(?:n[º°]?|número)?\s*[:.]?\s*(\d+[\d\-\/\.]*)/i);
    const contractNumber = contractNumberMatch?.[1];

    // Extrair datas
    const dates = ClauseExtractor.extractDates(text);
    const signatureDate = dates[0];
    const effectiveDate = dates.length > 1 ? dates[1] : dates[0];
    const expirationDate = dates.length > 2 ? dates[2] : undefined;

    // Verificar renovação automática
    const autoRenewal =
      lowerText.includes('renovação automática') ||
      lowerText.includes('renovado automaticamente') ||
      lowerText.includes('prorrogado automaticamente');

    // Extrair período de renovação
    let renewalPeriodDays: number | undefined;
    const renewalMatch = text.match(/renovação\s*(?:automática)?\s*(?:por|de)\s*(\d+)\s*(?:dias|meses)/i);
    if (renewalMatch) {
      const value = parseInt(renewalMatch[1], 10);
      renewalPeriodDays = text.toLowerCase().includes('meses') ? value * 30 : value;
    }

    return {
      contractNumber,
      contractType,
      signatureDate,
      effectiveDate,
      expirationDate,
      autoRenewal,
      renewalPeriodDays,
    };
  }

  // ==========================================================================
  // PARTIES EXTRACTION
  // ==========================================================================

  static extractParties(text: string): Result<ContractParties, string> {
    const cnpjs = ClauseExtractor.extractCNPJs(text);
    const cpfs = ClauseExtractor.extractCPFs(text);

    // Precisamos de pelo menos 2 partes (contratante e contratado)
    const allDocs = [...cnpjs, ...cpfs];
    if (allDocs.length < 2) {
      // Tentar criar partes mínimas mesmo sem documentos válidos
      return Result.ok({
        contractor: this.createDefaultParty('CONTRATANTE'),
        contracted: this.createDefaultParty('CONTRATADO'),
        witnesses: [],
      });
    }

    // Extrair nomes associados aos CNPJs/CPFs
    const contractor = this.extractPartyByRole(text, 'contratante', cnpjs, cpfs);
    const contracted = this.extractPartyByRole(text, 'contratad', cnpjs, cpfs);

    return Result.ok({
      contractor: contractor ?? this.createDefaultParty('CONTRATANTE'),
      contracted: contracted ?? this.createDefaultParty('CONTRATADO'),
      witnesses: this.extractWitnesses(text, cpfs),
    });
  }

  private static extractPartyByRole(
    text: string,
    roleKeyword: string,
    cnpjs: string[],
    cpfs: string[]
  ): ContractParty | null {
    const lowerText = text.toLowerCase();
    const roleIndex = lowerText.indexOf(roleKeyword);

    if (roleIndex === -1) return null;

    // Procurar documento próximo ao papel
    const nearbyText = text.slice(roleIndex, roleIndex + 500);
    const nearbyCnpj = nearbyText.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    const nearbyCpf = nearbyText.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);

    const document = nearbyCnpj?.[0] ?? nearbyCpf?.[0] ?? cnpjs[0] ?? cpfs[0] ?? '';
    const documentType = document.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF';

    // Tentar extrair nome (texto antes do CNPJ/CPF)
    let name = 'Não identificado';
    if (document) {
      const docIndex = nearbyText.indexOf(document.slice(0, 5));
      if (docIndex > 10) {
        const beforeDoc = nearbyText.slice(0, docIndex).trim();
        const nameMatch = beforeDoc.match(/([A-Z][A-Za-záàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+(?:LTDA|S\.?A\.?|ME|EIRELI)?)/i);
        if (nameMatch) name = nameMatch[1].trim();
      }
    }

    const role = roleKeyword.includes('contratante') ? 'CONTRATANTE' : 'CONTRATADO';

    return {
      role,
      name,
      document: document.replace(/\D/g, ''),
      documentType,
    };
  }

  private static extractWitnesses(text: string, cpfs: string[]): ContractParty[] {
    const witnesses: ContractParty[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('testemunha')) {
      // Pegar últimos 2 CPFs como testemunhas
      const witnessCpfs = cpfs.slice(-2);
      for (const cpf of witnessCpfs) {
        if (ClauseExtractor.isValidCPF(cpf)) {
          witnesses.push({
            role: 'TESTEMUNHA',
            name: 'Testemunha',
            document: cpf,
            documentType: 'CPF',
          });
        }
      }
    }

    return witnesses;
  }

  private static createDefaultParty(role: 'CONTRATANTE' | 'CONTRATADO'): ContractParty {
    return {
      role,
      name: 'Não identificado',
      document: '',
      documentType: 'CNPJ',
    };
  }

  // ==========================================================================
  // OBJECT EXTRACTION
  // ==========================================================================

  static extractObject(text: string): ContractObject {
    const lowerText = text.toLowerCase();

    // Extrair tipos de serviço
    const serviceTypes: ServiceType[] = [];
    for (const [type, keywords] of Object.entries(SERVICE_TYPE_KEYWORDS)) {
      if (keywords.some((kw) => lowerText.includes(kw))) {
        serviceTypes.push(type as ServiceType);
      }
    }

    // Extrair descrição do objeto
    const objectSection = ClauseExtractor.extractSection(text, 'objeto');
    const description = Result.isOk(objectSection)
      ? objectSection.value.slice(0, 500)
      : 'Prestação de serviços de transporte rodoviário de cargas';

    return {
      description,
      serviceType: serviceTypes.length > 0 ? serviceTypes : ['COLETA', 'ENTREGA'],
    };
  }

  // ==========================================================================
  // FINANCIAL EXTRACTION
  // ==========================================================================

  static extractFinancial(
    text: string,
    tables: Array<{ headers: string[]; rows: string[][] }>
  ): ContractFinancial {
    const values = ClauseExtractor.extractCurrencyValues(text);
    const percentages = ClauseExtractor.extractPercentages(text);
    const days = ClauseExtractor.extractDaysPeriods(text);
    const indexes = ClauseExtractor.extractReajustmentIndexes(text);
    const lowerText = text.toLowerCase();

    // Determinar tipo de precificação
    let pricingType: ContractFinancial['pricing']['type'] = 'FIXO';
    if (lowerText.includes('por km') || lowerText.includes('/km')) {
      pricingType = 'POR_KM';
    } else if (lowerText.includes('por kg') || lowerText.includes('por peso')) {
      pricingType = 'POR_PESO';
    } else if (lowerText.includes('tabela') || tables.length > 0) {
      pricingType = 'TABELA';
    }

    // Extrair prazo de pagamento
    let dueDays = 30; // default
    const paymentMatch = text.match(/pagamento\s*(?:em|de|:)?\s*(\d+)\s*dias?/i);
    if (paymentMatch) {
      dueDays = parseInt(paymentMatch[1], 10);
    } else if (days.length > 0) {
      dueDays = days[0];
    }

    return {
      pricing: {
        type: pricingType,
        baseValue: values[0],
        currency: 'BRL',
        minimumCharge: values.length > 1 ? values[1] : undefined,
      },
      paymentTerms: {
        dueDays,
        paymentMethod: lowerText.includes('boleto') ? 'Boleto' : lowerText.includes('transferência') ? 'Transferência' : undefined,
        invoicingPeriod: lowerText.includes('quinzenal') ? 'Quinzenal' : lowerText.includes('mensal') ? 'Mensal' : undefined,
      },
      reajustment: indexes.length > 0
        ? {
            index: indexes[0],
            frequency: lowerText.includes('anual') ? 'Anual' : 'Semestral',
          }
        : undefined,
    };
  }

  // ==========================================================================
  // TERMS EXTRACTION
  // ==========================================================================

  static extractTerms(text: string): ContractTerms {
    const dates = ClauseExtractor.extractDates(text);
    const days = ClauseExtractor.extractDaysPeriods(text);
    const lowerText = text.toLowerCase();

    // Extrair duração em meses
    const durationMatch = text.match(/(?:prazo|vigência|duração)\s*(?:de)?\s*(\d+)\s*meses?/i);
    const durationMonths = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

    // Verificar renovação automática
    const autoRenewal =
      lowerText.includes('renovação automática') ||
      lowerText.includes('renovado automaticamente');

    // Extrair prazo de aviso para não renovação
    const noticeMatch = text.match(/(?:aviso|notificação|comunicação)\s*(?:prévio|prévia)?\s*(?:de)?\s*(\d+)\s*dias?/i);
    const renewalNoticeDays = noticeMatch ? parseInt(noticeMatch[1], 10) : undefined;

    return {
      effectiveDate: dates[0],
      expirationDate: dates.length > 1 ? dates[dates.length - 1] : undefined,
      durationMonths,
      autoRenewal,
      renewalNoticeDays,
    };
  }

  // ==========================================================================
  // PENALTIES EXTRACTION
  // ==========================================================================

  static extractPenalties(text: string): ContractPenalties {
    const percentages = ClauseExtractor.extractPercentages(text);
    const lowerText = text.toLowerCase();

    return {
      latePayment: lowerText.includes('atraso') || lowerText.includes('mora')
        ? {
            description: 'Multa por atraso no pagamento',
            type: 'MULTA_PERCENTUAL',
            percentage: percentages.find((p) => p <= 10) ?? 2,
          }
        : undefined,
      nonPerformance: lowerText.includes('inadimplemento') || lowerText.includes('descumprimento')
        ? {
            description: 'Multa por descumprimento contratual',
            type: 'MULTA_PERCENTUAL',
            percentage: percentages.find((p) => p > 5 && p <= 30) ?? 10,
          }
        : undefined,
      earlyTermination: lowerText.includes('rescisão') && lowerText.includes('multa')
        ? {
            description: 'Multa por rescisão antecipada',
            type: 'MULTA_PERCENTUAL',
            percentage: percentages.find((p) => p >= 10 && p <= 50) ?? 20,
          }
        : undefined,
      other: [],
    };
  }

  // ==========================================================================
  // INSURANCE EXTRACTION
  // ==========================================================================

  static extractInsurance(text: string): ContractInsurance {
    const lowerText = text.toLowerCase();
    const values = ClauseExtractor.extractCurrencyValues(text);

    const required =
      lowerText.includes('seguro obrigatório') ||
      lowerText.includes('deverá contratar seguro') ||
      lowerText.includes('rctr-c') ||
      lowerText.includes('seguro de carga');

    const types: ContractInsurance['types'] = [];

    if (lowerText.includes('rctr-c') || lowerText.includes('responsabilidade civil')) {
      types.push({ type: 'RCTR_C', description: 'Responsabilidade Civil do Transportador Rodoviário de Carga' });
    }

    if (lowerText.includes('rcf-dc') || lowerText.includes('roubo')) {
      types.push({ type: 'RCF_DC', description: 'Responsabilidade Civil Facultativa - Desaparecimento de Carga' });
    }

    if (lowerText.includes('seguro de carga') || lowerText.includes('cobertura de carga')) {
      types.push({ type: 'SEGURO_CARGA', description: 'Seguro de Carga' });
    }

    let responsibleParty: ContractInsurance['responsibleParty'] = 'CONTRATADO';
    if (lowerText.includes('contratante arcará com o seguro')) {
      responsibleParty = 'CONTRATANTE';
    } else if (lowerText.includes('ambas as partes')) {
      responsibleParty = 'AMBOS';
    }

    return {
      required,
      types,
      minCoverage: values.find((v) => v > 10000),
      responsibleParty,
      clauses: [],
    };
  }

  // ==========================================================================
  // RESPONSIBILITIES EXTRACTION
  // ==========================================================================

  static extractResponsibilities(text: string): ContractResponsibilities {
    const lowerText = text.toLowerCase();

    const contractor: string[] = [];
    const contracted: string[] = [];

    // Obrigações típicas do contratante
    if (lowerText.includes('disponibilizar carga')) contractor.push('Disponibilizar carga para transporte');
    if (lowerText.includes('emitir nota fiscal')) contractor.push('Emitir nota fiscal');
    if (lowerText.includes('informar dados')) contractor.push('Informar dados da carga');
    if (lowerText.includes('efetuar pagamento')) contractor.push('Efetuar pagamento nos prazos');

    // Obrigações típicas do contratado
    if (lowerText.includes('transportar') || lowerText.includes('transporte')) contracted.push('Realizar o transporte');
    if (lowerText.includes('emitir ct-e') || lowerText.includes('conhecimento')) contracted.push('Emitir CT-e');
    if (lowerText.includes('entregar no prazo')) contracted.push('Entregar no prazo acordado');
    if (lowerText.includes('manter veículo')) contracted.push('Manter veículos em boas condições');
    if (lowerText.includes('seguro')) contracted.push('Manter seguro em dia');

    return {
      contractor: contractor.length > 0 ? contractor : ['Disponibilizar carga para transporte'],
      contracted: contracted.length > 0 ? contracted : ['Realizar o transporte'],
      shared: [],
    };
  }

  // ==========================================================================
  // TERMINATION EXTRACTION
  // ==========================================================================

  static extractTermination(text: string): ContractTermination {
    const lowerText = text.toLowerCase();
    const days = ClauseExtractor.extractDaysPeriods(text);
    const percentages = ClauseExtractor.extractPercentages(text);

    // Extrair prazo de aviso prévio
    const noticeMatch = text.match(/(?:aviso|notificação)\s*prévio?\s*(?:de)?\s*(\d+)\s*dias?/i);
    const noticePeriodDays = noticeMatch ? parseInt(noticeMatch[1], 10) : days.find((d) => d === 30 || d === 60);

    // Identificar causas de rescisão
    const terminationCauses: ContractTermination['terminationCauses'] = [];

    if (lowerText.includes('inadimplemento') || lowerText.includes('descumprimento')) {
      terminationCauses.push({
        cause: 'Inadimplemento contratual',
        type: 'COM_JUSTA_CAUSA',
        curePeriodDays: days.find((d) => d <= 15) ?? 10,
      });
    }

    if (lowerText.includes('falência') || lowerText.includes('recuperação judicial')) {
      terminationCauses.push({
        cause: 'Falência ou recuperação judicial',
        type: 'RESCISAO_AUTOMATICA',
      });
    }

    if (lowerText.includes('sem justa causa') || lowerText.includes('por conveniência')) {
      terminationCauses.push({
        cause: 'Rescisão por conveniência',
        type: 'SEM_JUSTA_CAUSA',
      });
    }

    return {
      noticePeriodDays,
      terminationCauses,
      earlyTerminationPenalty: percentages.length > 0
        ? {
            description: 'Multa por rescisão antecipada',
            type: 'MULTA_PERCENTUAL',
            percentage: percentages.find((p) => p >= 10 && p <= 50) ?? 20,
          }
        : undefined,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private static calculateConfidence(extraction: DocumentExtractionResult): number {
    const text = extraction.text;
    const cnpjs = ClauseExtractor.extractCNPJs(text);
    const clauses = ClauseExtractor.countClauses(text);

    let confidence = 0.5; // base

    // Bonus por CNPJs encontrados
    if (cnpjs.length >= 2) confidence += 0.2;
    else if (cnpjs.length === 1) confidence += 0.1;

    // Bonus por cláusulas identificadas
    if (clauses >= 10) confidence += 0.2;
    else if (clauses >= 5) confidence += 0.1;

    // Bonus se tiver tabelas
    if (extraction.tables && extraction.tables.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }
}
