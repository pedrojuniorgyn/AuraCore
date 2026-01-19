/**
 * ContractParser - Domain Service
 * 
 * Serviço stateless para parsing e análise de contratos de frete.
 * Extrai partes, cláusulas, valores, datas e identifica riscos.
 * 
 * @module contracts/domain/services
 * @see DOMAIN-SVC-001 to DOMAIN-SVC-010
 */

import { Result } from '@/shared/domain';
import type {
  ContractAnalysisResult,
  ParsedContractParty,
  ContractClause,
  ParsedContractType,
  ClauseType,
  ParsedPaymentTerms,
  PricingInfo,
  ParsedInsuranceInfo,
  ContractValidity,
  ContractRisk,
  ParsedPartyRole,
  PaymentMethod,
  ParsedInsuranceType,
} from '../types';

// ============================================================================
// PATTERNS
// ============================================================================

const PATTERNS = {
  cnpj: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  date: /\d{1,2}\s*(?:de\s*)?(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?\d{4}|\d{2}\/\d{2}\/\d{4}/gi,
  currency: /R\$\s*[\d.,]+|[\d.,]+\s*(?:reais|BRL)/gi,
  percentage: /\d+(?:[.,]\d+)?%/g,
  days: /(\d+)\s*(?:dias?|dia\s*úteis?|dias?\s*corridos?)/gi,
} as const;

const CLAUSE_KEYWORDS: Readonly<Record<ClauseType, readonly string[]>> = {
  PAYMENT_TERMS: ['pagamento', 'fatura', 'vencimento', 'prazo de pagamento', 'condições de pagamento'],
  PRICING: ['preço', 'valor', 'tarifa', 'frete', 'tabela', 'custo'],
  PENALTY: ['multa', 'penalidade', 'inadimplemento', 'atraso', 'descumprimento'],
  INSURANCE: ['seguro', 'apólice', 'cobertura', 'sinistro', 'rcf', 'rctr'],
  LIABILITY: ['responsabilidade', 'obrigação', 'dever', 'incumbe'],
  TERMINATION: ['rescisão', 'resolução', 'término', 'denúncia', 'cancelamento'],
  VALIDITY: ['vigência', 'prazo', 'duração', 'validade', 'período'],
  JURISDICTION: ['foro', 'comarca', 'jurisdição', 'competência'],
  CONFIDENTIALITY: ['confidencial', 'sigilo', 'segredo', 'privacidade'],
  FORCE_MAJEURE: ['força maior', 'caso fortuito', 'imprevisível'],
  OBJECT: ['objeto', 'finalidade', 'propósito'],
  OTHER: [],
} as const;

const MONTHS: Readonly<Record<string, number>> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
} as const;

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Domain Service para parsing de contratos de frete
 * 100% stateless, métodos estáticos (DOMAIN-SVC-001)
 */
export class ContractParser {
  // Constructor privado (DOMAIN-SVC-002)
  private constructor() {}

  /**
   * Analisa texto de contrato e extrai dados estruturados
   * 
   * @param text - Texto do contrato
   * @returns Resultado da análise ou erro
   */
  static analyzeContract(text: string): Result<ContractAnalysisResult, string> {
    if (!text || text.trim().length < 100) {
      return Result.fail('Texto do contrato muito curto ou vazio');
    }

    const normalizedText = this.normalizeText(text);

    // 1. Identificar tipo de contrato
    const contractType = this.identifyContractType(normalizedText);

    // 2. Extrair partes
    const parties = this.extractParties(normalizedText);

    // 3. Extrair cláusulas
    const clauses = this.extractClauses(normalizedText);

    // 4. Extrair condições de pagamento
    const paymentTerms = this.extractPaymentTerms(normalizedText, clauses);

    // 5. Extrair preços
    const pricing = this.extractPricing(normalizedText, clauses);

    // 6. Extrair datas de vigência
    const validity = this.extractValidity(normalizedText, clauses);

    // 7. Extrair informações de seguro
    const insurance = this.extractInsurance(clauses);

    // 8. Extrair jurisdição
    const jurisdiction = this.extractJurisdiction(clauses);

    // 9. Extrair valor total
    const totalValue = this.extractTotalValue(normalizedText);

    // 10. Identificar riscos
    const risks = this.identifyRisks(clauses, paymentTerms, validity, insurance);

    // 11. Calcular confiança geral
    const confidence = this.calculateConfidence(parties, clauses, validity);

    return Result.ok({
      contractType,
      parties,
      clauses,
      validity,
      paymentTerms,
      pricing,
      insurance,
      jurisdiction,
      totalValue,
      risks,
      confidence,
      rawText: text,
      extractedAt: new Date(),
    });
  }

  /**
   * Identifica o tipo de contrato baseado no texto
   */
  static identifyContractType(text: string): ParsedContractType {
    const textLower = text.toLowerCase();

    if (textLower.includes('tabela de frete') || textLower.includes('acordo de frete')) {
      return 'FREIGHT_AGREEMENT';
    }
    if (textLower.includes('subcontrat') || textLower.includes('terceiriz')) {
      return 'SUBCONTRACTING';
    }
    if (textLower.includes('viagem única') || textLower.includes('viagem específica') || textLower.includes('spot')) {
      return 'SPOT';
    }
    if (textLower.includes('parceria') || textLower.includes('cooperação')) {
      return 'PARTNERSHIP';
    }

    return 'TRANSPORT_SERVICE';
  }

  /**
   * Extrai partes envolvidas no contrato
   */
  static extractParties(text: string): ParsedContractParty[] {
    const parties: ParsedContractParty[] = [];
    const cnpjs = text.match(PATTERNS.cnpj) ?? [];
    const cpfs = text.match(PATTERNS.cpf) ?? [];

    // Padrões para identificação de partes
    const contractorPatterns = [
      /contratante[:\s]+([^,\n]+)/gi,
      /tomador[a]?[:\s]+([^,\n]+)/gi,
      /embarcador[a]?[:\s]+([^,\n]+)/gi,
    ];

    const contractedPatterns = [
      /contratad[oa][:\s]+([^,\n]+)/gi,
      /transportador[a]?[:\s]+([^,\n]+)/gi,
      /prestador[a]?[:\s]+([^,\n]+)/gi,
    ];

    // Extrair contratante
    for (const pattern of contractorPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const name = match[1].trim().substring(0, 100);
        const doc = this.findNearestDocument(text, match.index, cnpjs, cpfs);
        if (name.length > 2) {
          parties.push({
            role: 'CONTRACTOR' as ParsedPartyRole,
            name,
            document: doc?.value ?? '',
            documentType: doc?.type ?? 'CNPJ',
          });
          break;
        }
      }
    }

    // Extrair contratado
    for (const pattern of contractedPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const name = match[1].trim().substring(0, 100);
        const doc = this.findNearestDocument(text, match.index, cnpjs, cpfs);
        if (name.length > 2) {
          parties.push({
            role: 'CONTRACTED' as ParsedPartyRole,
            name,
            document: doc?.value ?? '',
            documentType: doc?.type ?? 'CNPJ',
          });
          break;
        }
      }
    }

    return parties;
  }

  /**
   * Extrai cláusulas do contrato
   */
  static extractClauses(text: string): ContractClause[] {
    const clauses: ContractClause[] = [];

    // Padrão para identificar cláusulas numeradas
    const clausePattern = /(?:cláusula|artigo|item|parágrafo)\s*(?:\d+[º°ª]?|[IVXLCDM]+)[.:\s-]+([^\n]+)/gi;
    let match;

    while ((match = clausePattern.exec(text)) !== null) {
      const clauseStart = match.index;
      const clauseTitle = match[1]?.trim() ?? '';

      // Encontrar fim da cláusula (próxima cláusula ou 1500 chars)
      const nextClausePattern = /(?:cláusula|artigo)\s*(?:\d+[º°ª]?|[IVXLCDM]+)/gi;
      nextClausePattern.lastIndex = clauseStart + 20;
      const nextMatch = nextClausePattern.exec(text);
      const clauseEnd = nextMatch 
        ? nextMatch.index 
        : Math.min(clauseStart + 1500, text.length);
      
      const clauseContent = text.substring(clauseStart, clauseEnd).trim();

      // Identificar tipo da cláusula
      const clauseType = this.identifyClauseType(clauseTitle + ' ' + clauseContent);

      // Extrair número da cláusula
      const clauseNumber = match[0]?.match(/\d+/)?.[0];

      clauses.push({
        type: clauseType,
        title: clauseTitle.substring(0, 100),
        content: clauseContent.substring(0, 1000),
        clauseNumber,
        confidence: this.calculateClauseConfidence(clauseType, clauseContent),
      });
    }

    return clauses;
  }

  /**
   * Extrai condições de pagamento
   */
  static extractPaymentTerms(text: string, clauses: ContractClause[]): ParsedPaymentTerms | undefined {
    const paymentClause = clauses.find(c => c.type === 'PAYMENT_TERMS');
    const content = paymentClause?.content ?? text;
    const contentLower = content.toLowerCase();

    let method: PaymentMethod = 'OUTROS';
    let days: number | undefined;

    if (contentLower.includes('faturado') || contentLower.includes('fatura')) {
      method = 'FATURADO';
    } else if (contentLower.includes('antecipado') || contentLower.includes('adiantado')) {
      method = 'ANTECIPADO';
    } else if (contentLower.includes('contra entrega') || contentLower.includes('na entrega')) {
      method = 'CONTRA_ENTREGA';
    } else if (contentLower.includes('parcelado') || contentLower.includes('parcelas')) {
      method = 'PARCELADO';
    }

    // Extrair prazo em dias
    const daysPattern = new RegExp(PATTERNS.days.source, 'gi');
    const daysMatch = daysPattern.exec(content);
    if (daysMatch && daysMatch[1]) {
      days = parseInt(daysMatch[1], 10);
    }

    return {
      method,
      days,
      description: paymentClause?.content.substring(0, 300) ?? 'Não especificado',
    };
  }

  /**
   * Extrai informações de preço
   */
  static extractPricing(text: string, clauses: ContractClause[]): PricingInfo[] {
    const pricing: PricingInfo[] = [];
    const pricingClause = clauses.find(c => c.type === 'PRICING');
    const content = pricingClause?.content ?? text;

    // Extrair valores monetários
    const values = content.match(PATTERNS.currency) ?? [];

    for (const value of values.slice(0, 5)) {
      const cleanedValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const numericValue = parseFloat(cleanedValue);
      if (!isNaN(numericValue) && numericValue > 0) {
        pricing.push({
          type: 'FIXED',
          value: numericValue,
          currency: 'BRL',
          description: `Valor extraído: ${value}`,
        });
      }
    }

    return pricing;
  }

  /**
   * Extrai datas de vigência
   */
  static extractValidity(text: string, clauses: ContractClause[]): ContractValidity {
    const validityClause = clauses.find(c => c.type === 'VALIDITY');
    const content = validityClause?.content ?? text;
    const dates = content.match(PATTERNS.date) ?? [];

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    for (const dateStr of dates.slice(0, 2)) {
      const parsed = this.parseDate(dateStr);
      if (parsed) {
        if (!startDate) {
          startDate = parsed;
        } else if (!endDate) {
          endDate = parsed;
        }
      }
    }

    const contentLower = content.toLowerCase();
    const autoRenewal = contentLower.includes('renovação automática') ||
                        contentLower.includes('prorroga automaticamente') ||
                        contentLower.includes('prorrogação automática');

    return {
      startDate,
      endDate,
      autoRenewal,
      renewalTerms: autoRenewal ? 'Renovação automática identificada' : undefined,
    };
  }

  /**
   * Extrai informações de seguro
   */
  static extractInsurance(clauses: ContractClause[]): ParsedInsuranceInfo | undefined {
    const insuranceClause = clauses.find(c => c.type === 'INSURANCE');
    if (!insuranceClause) return undefined;

    const content = insuranceClause.content.toLowerCase();
    let type: ParsedInsuranceType = 'OUTROS';

    if (content.includes('rcf-dc') || content.includes('rcf/dc') || content.includes('rcf dc')) {
      type = 'RCF_DC';
    } else if (content.includes('rctr-c') || content.includes('rctr/c') || content.includes('rctr c')) {
      type = 'RCTR_C';
    } else if (content.includes('rcf-v') || content.includes('rcf/v') || content.includes('rcf v')) {
      type = 'RCF_V';
    }

    // Tentar extrair valor de cobertura
    const coverageMatch = insuranceClause.content.match(/R\$\s*([\d.,]+)/);
    let coverageValue: number | undefined;
    if (coverageMatch) {
      const cleanedValue = coverageMatch[1]?.replace(/\./g, '').replace(',', '.');
      if (cleanedValue) {
        coverageValue = parseFloat(cleanedValue);
      }
    }

    return {
      type,
      coverageValue: isNaN(coverageValue ?? NaN) ? undefined : coverageValue,
      description: insuranceClause.content.substring(0, 300),
    };
  }

  /**
   * Extrai foro/jurisdição
   */
  static extractJurisdiction(clauses: ContractClause[]): string | undefined {
    const jurisdictionClause = clauses.find(c => c.type === 'JURISDICTION');
    if (jurisdictionClause) {
      const match = jurisdictionClause.content.match(/(?:foro|comarca)\s+(?:de|da|do)?\s*([^.,\n]+)/i);
      return match?.[1]?.trim();
    }
    return undefined;
  }

  /**
   * Extrai valor total do contrato
   */
  static extractTotalValue(text: string): number | undefined {
    const patterns = [
      /valor\s+(?:total|global|do contrato)[:\s]+R?\$?\s*([\d.,]+)/i,
      /R?\$\s*([\d.,]+)\s*(?:mensais?|anuais?|por\s+viagem)/i,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const cleanedValue = match[1].replace(/\./g, '').replace(',', '.');
        const value = parseFloat(cleanedValue);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Identifica riscos no contrato
   */
  static identifyRisks(
    clauses: ContractClause[],
    paymentTerms?: ParsedPaymentTerms,
    validity?: ContractValidity,
    insurance?: ParsedInsuranceInfo
  ): ContractRisk[] {
    const risks: ContractRisk[] = [];

    // Risco: sem cláusula de seguro
    if (!insurance) {
      risks.push({
        type: 'HIGH',
        description: 'Contrato não possui cláusula de seguro de carga identificada',
      });
    }

    // Risco: prazo de pagamento muito longo
    if (paymentTerms?.days && paymentTerms.days > 60) {
      risks.push({
        type: 'MEDIUM',
        description: `Prazo de pagamento longo: ${paymentTerms.days} dias`,
      });
    }

    // Risco: sem data de vigência
    if (!validity?.startDate || !validity?.endDate) {
      risks.push({
        type: 'LOW',
        description: 'Datas de vigência não claramente identificadas',
      });
    }

    // Risco: sem cláusula de penalidade
    if (!clauses.some(c => c.type === 'PENALTY')) {
      risks.push({
        type: 'MEDIUM',
        description: 'Sem cláusula de penalidade por descumprimento identificada',
      });
    }

    // Risco: sem cláusula de rescisão
    if (!clauses.some(c => c.type === 'TERMINATION')) {
      risks.push({
        type: 'LOW',
        description: 'Sem cláusula de rescisão identificada',
      });
    }

    // Risco: renovação automática
    if (validity?.autoRenewal) {
      risks.push({
        type: 'LOW',
        description: 'Contrato possui renovação automática - verificar condições',
      });
    }

    return risks;
  }

  /**
   * Identifica tipo de cláusula baseado no conteúdo
   */
  private static identifyClauseType(content: string): ClauseType {
    const contentLower = content.toLowerCase();

    for (const [type, keywords] of Object.entries(CLAUSE_KEYWORDS)) {
      if (keywords.some(kw => contentLower.includes(kw))) {
        return type as ClauseType;
      }
    }

    return 'OTHER';
  }

  /**
   * Encontra documento mais próximo de uma posição
   */
  private static findNearestDocument(
    text: string,
    position: number,
    cnpjs: string[],
    cpfs: string[]
  ): { value: string; type: 'CNPJ' | 'CPF' } | undefined {
    const searchRange = 500;
    const searchText = text.substring(
      Math.max(0, position - 100),
      Math.min(text.length, position + searchRange)
    );

    for (const cnpj of cnpjs) {
      if (searchText.includes(cnpj)) {
        return { value: cnpj, type: 'CNPJ' };
      }
    }

    for (const cpf of cpfs) {
      if (searchText.includes(cpf)) {
        return { value: cpf, type: 'CPF' };
      }
    }

    return undefined;
  }

  /**
   * Parse de data em português
   */
  private static parseDate(dateStr: string): Date | undefined {
    // Tentar formato dd/mm/yyyy
    const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1] ?? '1', 10);
      const month = parseInt(slashMatch[2] ?? '1', 10) - 1;
      const year = parseInt(slashMatch[3] ?? '2000', 10);
      return new Date(year, month, day);
    }

    // Tentar formato "dd de mês de yyyy"
    const textMatch = dateStr.match(/(\d{1,2})\s*(?:de\s*)?(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(\d{4})/i);
    if (textMatch && textMatch[2]) {
      const monthIndex = MONTHS[textMatch[2].toLowerCase()];
      if (monthIndex !== undefined) {
        const day = parseInt(textMatch[1] ?? '1', 10);
        const year = parseInt(textMatch[3] ?? '2000', 10);
        return new Date(year, monthIndex, day);
      }
    }

    return undefined;
  }

  /**
   * Normaliza texto para análise
   */
  private static normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Calcula confiança de uma cláusula
   */
  private static calculateClauseConfidence(type: ClauseType, content: string): number {
    if (type === 'OTHER') return 0.3;

    const keywords = CLAUSE_KEYWORDS[type];
    const contentLower = content.toLowerCase();
    const matchCount = keywords.filter(kw => contentLower.includes(kw)).length;

    return Math.min(0.5 + (matchCount * 0.15), 0.95);
  }

  /**
   * Calcula confiança geral da extração
   */
  private static calculateConfidence(
    parties: ParsedContractParty[],
    clauses: ContractClause[],
    validity: ContractValidity
  ): number {
    let score = 0;

    // Pontuação por partes identificadas
    if (parties.length >= 2) score += 0.25;
    else if (parties.length === 1) score += 0.1;

    // Pontuação por cláusulas importantes
    const importantClauses: ClauseType[] = ['PAYMENT_TERMS', 'PRICING', 'VALIDITY', 'LIABILITY'];
    const foundImportant = clauses.filter(c => importantClauses.includes(c.type)).length;
    score += (foundImportant / importantClauses.length) * 0.35;

    // Pontuação por datas
    if (validity.startDate) score += 0.1;
    if (validity.endDate) score += 0.1;

    // Pontuação por quantidade de cláusulas
    if (clauses.length >= 5) score += 0.2;
    else if (clauses.length >= 3) score += 0.1;

    return Math.min(score, 0.95);
  }
}
