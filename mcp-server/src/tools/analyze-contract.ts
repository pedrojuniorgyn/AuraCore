/**
 * analyze_contract MCP Tool
 * 
 * Analisa contratos de frete e extrai dados estruturados:
 * partes, cláusulas, valores, datas, riscos.
 * 
 * @module mcp-server/tools/analyze-contract
 * @see Phase D9 - Contract Analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyzeContractInput {
  /** Caminho do arquivo local */
  file_path?: string;
  
  /** Conteúdo em base64 */
  file_base64?: string;
  
  /** Nome do arquivo */
  file_name: string;
  
  /** ID da organização */
  organization_id?: number;
  
  /** ID da filial */
  branch_id?: number;
}

export interface AnalyzeContractOutput {
  success: boolean;
  
  /** Tipo de contrato identificado */
  contract_type?: string;
  
  /** Partes envolvidas */
  parties?: Array<{
    role: string;
    name: string;
    document: string;
  }>;
  
  /** Condições de pagamento */
  payment_terms?: {
    method: string;
    days?: number;
    description: string;
  };
  
  /** Vigência */
  validity?: {
    start_date?: string;
    end_date?: string;
    auto_renewal?: boolean;
  };
  
  /** Preços */
  pricing?: Array<{
    value?: number;
    currency: string;
    description: string;
  }>;
  
  /** Seguro */
  insurance?: {
    type: string;
    coverage_value?: number;
    description: string;
  };
  
  /** Riscos identificados */
  risks?: Array<{
    level: string;
    description: string;
  }>;
  
  /** Resumo das cláusulas */
  clauses_summary?: Array<{
    type: string;
    title: string;
    confidence: number;
  }>;
  
  /** Jurisdição/Foro */
  jurisdiction?: string;
  
  /** Valor total */
  total_value?: number;
  
  /** Confiança geral (0-100) */
  overall_confidence?: number;
  
  /** Nível de risco geral */
  risk_level?: string;
  
  /** Erro */
  error?: string;
}

// ============================================================================
// CONTRACT TYPES
// ============================================================================

type ContractType =
  | 'FREIGHT_AGREEMENT'
  | 'TRANSPORT_SERVICE'
  | 'SPOT'
  | 'SUBCONTRACTING'
  | 'PARTNERSHIP';

type ClauseType =
  | 'PAYMENT_TERMS'
  | 'PRICING'
  | 'PENALTY'
  | 'INSURANCE'
  | 'LIABILITY'
  | 'TERMINATION'
  | 'VALIDITY'
  | 'JURISDICTION'
  | 'CONFIDENTIALITY'
  | 'FORCE_MAJEURE'
  | 'OBJECT'
  | 'OTHER';

interface ContractParty {
  role: string;
  name: string;
  document: string;
  documentType: string;
}

interface ContractClause {
  type: ClauseType;
  title: string;
  content: string;
  clauseNumber?: string;
  confidence: number;
}

interface PaymentTerms {
  method: string;
  days?: number;
  description: string;
}

interface PricingInfo {
  type: string;
  value?: number;
  currency: string;
  description: string;
}

interface InsuranceInfo {
  type: string;
  coverageValue?: number;
  description: string;
}

interface ContractRisk {
  type: string;
  description: string;
}

interface ContractValidity {
  startDate?: Date;
  endDate?: Date;
  autoRenewal?: boolean;
}

interface AnalysisResult {
  contractType: ContractType;
  parties: ContractParty[];
  clauses: ContractClause[];
  validity: ContractValidity;
  paymentTerms?: PaymentTerms;
  pricing?: PricingInfo[];
  insurance?: InsuranceInfo;
  jurisdiction?: string;
  totalValue?: number;
  risks: ContractRisk[];
  confidence: number;
}

// ============================================================================
// PATTERNS
// ============================================================================

const PATTERNS = {
  cnpj: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  date: /\d{1,2}\s*(?:de\s*)?(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?\d{4}|\d{2}\/\d{2}\/\d{4}/gi,
  currency: /R\$\s*[\d.,]+|[\d.,]+\s*(?:reais|BRL)/gi,
  days: /(\d+)\s*(?:dias?|dia\s*úteis?|dias?\s*corridos?)/gi,
};

const CLAUSE_KEYWORDS: Record<ClauseType, string[]> = {
  PAYMENT_TERMS: ['pagamento', 'fatura', 'vencimento', 'prazo de pagamento'],
  PRICING: ['preço', 'valor', 'tarifa', 'frete', 'tabela'],
  PENALTY: ['multa', 'penalidade', 'inadimplemento', 'atraso'],
  INSURANCE: ['seguro', 'apólice', 'cobertura', 'sinistro', 'rcf', 'rctr'],
  LIABILITY: ['responsabilidade', 'obrigação', 'dever'],
  TERMINATION: ['rescisão', 'resolução', 'término', 'cancelamento'],
  VALIDITY: ['vigência', 'prazo', 'duração', 'validade'],
  JURISDICTION: ['foro', 'comarca', 'jurisdição'],
  CONFIDENTIALITY: ['confidencial', 'sigilo', 'segredo'],
  FORCE_MAJEURE: ['força maior', 'caso fortuito'],
  OBJECT: ['objeto', 'finalidade'],
  OTHER: [],
};

const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3,
  maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

function identifyContractType(text: string): ContractType {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('tabela de frete') || textLower.includes('acordo de frete')) {
    return 'FREIGHT_AGREEMENT';
  }
  if (textLower.includes('subcontrat') || textLower.includes('terceiriz')) {
    return 'SUBCONTRACTING';
  }
  if (textLower.includes('viagem única') || textLower.includes('spot')) {
    return 'SPOT';
  }
  if (textLower.includes('parceria')) {
    return 'PARTNERSHIP';
  }
  
  return 'TRANSPORT_SERVICE';
}

function extractParties(text: string): ContractParty[] {
  const parties: ContractParty[] = [];
  const cnpjs = text.match(PATTERNS.cnpj) ?? [];
  const cpfs = text.match(PATTERNS.cpf) ?? [];

  const patterns: Array<{ role: string; patterns: RegExp[] }> = [
    {
      role: 'CONTRACTOR',
      patterns: [/contratante[:\s]+([^,\n]+)/gi, /tomador[a]?[:\s]+([^,\n]+)/gi],
    },
    {
      role: 'CONTRACTED',
      patterns: [/contratad[oa][:\s]+([^,\n]+)/gi, /transportador[a]?[:\s]+([^,\n]+)/gi],
    },
  ];

  for (const { role, patterns: rolePatterns } of patterns) {
    for (const pattern of rolePatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const name = match[1].trim().substring(0, 100);
        if (name.length > 2) {
          // Find nearest document
          let document = '';
          let documentType = 'CNPJ';
          const searchText = text.substring(
            Math.max(0, match.index - 100),
            Math.min(text.length, match.index + 500)
          );
          
          for (const cnpj of cnpjs) {
            if (searchText.includes(cnpj)) {
              document = cnpj;
              break;
            }
          }
          if (!document) {
            for (const cpf of cpfs) {
              if (searchText.includes(cpf)) {
                document = cpf;
                documentType = 'CPF';
                break;
              }
            }
          }

          parties.push({ role, name, document, documentType });
          break;
        }
      }
    }
  }

  return parties;
}

function extractClauses(text: string): ContractClause[] {
  const clauses: ContractClause[] = [];
  const clausePattern = /(?:cláusula|artigo)\s*(?:\d+[º°ª]?|[IVXLCDM]+)[.:\s-]+([^\n]+)/gi;
  let match;

  while ((match = clausePattern.exec(text)) !== null) {
    const clauseStart = match.index;
    const clauseTitle = match[1]?.trim() ?? '';

    const nextPattern = /(?:cláusula|artigo)\s*(?:\d+[º°ª]?|[IVXLCDM]+)/gi;
    nextPattern.lastIndex = clauseStart + 20;
    const nextMatch = nextPattern.exec(text);
    const clauseEnd = nextMatch ? nextMatch.index : Math.min(clauseStart + 1500, text.length);
    
    const clauseContent = text.substring(clauseStart, clauseEnd).trim();
    const contentLower = (clauseTitle + ' ' + clauseContent).toLowerCase();

    // Identify clause type
    let clauseType: ClauseType = 'OTHER';
    for (const [type, keywords] of Object.entries(CLAUSE_KEYWORDS)) {
      if (keywords.some(kw => contentLower.includes(kw))) {
        clauseType = type as ClauseType;
        break;
      }
    }

    // Calculate confidence
    const keywords = CLAUSE_KEYWORDS[clauseType];
    const matchCount = keywords.filter(kw => contentLower.includes(kw)).length;
    const confidence = clauseType === 'OTHER' ? 0.3 : Math.min(0.5 + matchCount * 0.15, 0.95);

    clauses.push({
      type: clauseType,
      title: clauseTitle.substring(0, 100),
      content: clauseContent.substring(0, 1000),
      clauseNumber: match[0]?.match(/\d+/)?.[0],
      confidence: Math.round(confidence * 100),
    });
  }

  return clauses;
}

function extractPaymentTerms(text: string, clauses: ContractClause[]): PaymentTerms | undefined {
  const paymentClause = clauses.find(c => c.type === 'PAYMENT_TERMS');
  const content = paymentClause?.content ?? text;
  const contentLower = content.toLowerCase();

  let method = 'OUTROS';
  if (contentLower.includes('faturado') || contentLower.includes('fatura')) {
    method = 'FATURADO';
  } else if (contentLower.includes('antecipado')) {
    method = 'ANTECIPADO';
  } else if (contentLower.includes('contra entrega')) {
    method = 'CONTRA_ENTREGA';
  } else if (contentLower.includes('parcelado')) {
    method = 'PARCELADO';
  }

  let days: number | undefined;
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

function extractPricing(text: string, clauses: ContractClause[]): PricingInfo[] {
  const pricing: PricingInfo[] = [];
  const pricingClause = clauses.find(c => c.type === 'PRICING');
  const content = pricingClause?.content ?? text;

  const values = content.match(PATTERNS.currency) ?? [];
  for (const value of values.slice(0, 5)) {
    const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(numericValue) && numericValue > 0) {
      pricing.push({
        type: 'FIXED',
        value: numericValue,
        currency: 'BRL',
        description: `Valor: ${value}`,
      });
    }
  }

  return pricing;
}

function extractValidity(text: string, clauses: ContractClause[]): ContractValidity {
  const validityClause = clauses.find(c => c.type === 'VALIDITY');
  const content = validityClause?.content ?? text;
  const dates = content.match(PATTERNS.date) ?? [];

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  for (const dateStr of dates.slice(0, 2)) {
    const parsed = parseDate(dateStr);
    if (parsed) {
      if (!startDate) startDate = parsed;
      else if (!endDate) endDate = parsed;
    }
  }

  const autoRenewal = content.toLowerCase().includes('renovação automática') ||
                      content.toLowerCase().includes('prorroga automaticamente');

  return { startDate, endDate, autoRenewal };
}

function parseDate(dateStr: string): Date | undefined {
  const slashMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    return new Date(
      parseInt(slashMatch[3] ?? '2000', 10),
      parseInt(slashMatch[2] ?? '1', 10) - 1,
      parseInt(slashMatch[1] ?? '1', 10)
    );
  }

  const textMatch = dateStr.match(/(\d{1,2})\s*(?:de\s*)?(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(\d{4})/i);
  if (textMatch && textMatch[2]) {
    const month = MONTHS[textMatch[2].toLowerCase()];
    if (month !== undefined) {
      return new Date(
        parseInt(textMatch[3] ?? '2000', 10),
        month,
        parseInt(textMatch[1] ?? '1', 10)
      );
    }
  }

  return undefined;
}

function extractInsurance(clauses: ContractClause[]): InsuranceInfo | undefined {
  const insuranceClause = clauses.find(c => c.type === 'INSURANCE');
  if (!insuranceClause) return undefined;

  const content = insuranceClause.content.toLowerCase();
  let type = 'OUTROS';
  if (content.includes('rcf-dc') || content.includes('rcf/dc')) type = 'RCF_DC';
  else if (content.includes('rctr-c') || content.includes('rctr/c')) type = 'RCTR_C';
  else if (content.includes('rcf-v') || content.includes('rcf/v')) type = 'RCF_V';

  let coverageValue: number | undefined;
  const coverageMatch = insuranceClause.content.match(/R\$\s*([\d.,]+)/);
  if (coverageMatch && coverageMatch[1]) {
    coverageValue = parseFloat(coverageMatch[1].replace(/\./g, '').replace(',', '.'));
    if (isNaN(coverageValue)) coverageValue = undefined;
  }

  return {
    type,
    coverageValue,
    description: insuranceClause.content.substring(0, 300),
  };
}

function identifyRisks(
  clauses: ContractClause[],
  paymentTerms?: PaymentTerms,
  validity?: ContractValidity,
  insurance?: InsuranceInfo
): ContractRisk[] {
  const risks: ContractRisk[] = [];

  if (!insurance) {
    risks.push({ type: 'HIGH', description: 'Sem cláusula de seguro identificada' });
  }

  if (paymentTerms?.days && paymentTerms.days > 60) {
    risks.push({ type: 'MEDIUM', description: `Prazo de pagamento longo: ${paymentTerms.days} dias` });
  }

  if (!validity?.startDate || !validity?.endDate) {
    risks.push({ type: 'LOW', description: 'Datas de vigência não identificadas' });
  }

  if (!clauses.some(c => c.type === 'PENALTY')) {
    risks.push({ type: 'MEDIUM', description: 'Sem cláusula de penalidade' });
  }

  if (validity?.autoRenewal) {
    risks.push({ type: 'LOW', description: 'Contrato com renovação automática' });
  }

  return risks;
}

function analyzeContract(text: string): AnalysisResult {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  
  const contractType = identifyContractType(normalizedText);
  const parties = extractParties(normalizedText);
  const clauses = extractClauses(normalizedText);
  const paymentTerms = extractPaymentTerms(normalizedText, clauses);
  const pricing = extractPricing(normalizedText, clauses);
  const validity = extractValidity(normalizedText, clauses);
  const insurance = extractInsurance(clauses);
  const risks = identifyRisks(clauses, paymentTerms, validity, insurance);

  // Extract jurisdiction
  const jurisdictionClause = clauses.find(c => c.type === 'JURISDICTION');
  const jurisdiction = jurisdictionClause?.content.match(/(?:foro|comarca)\s+(?:de|da|do)?\s*([^.,\n]+)/i)?.[1]?.trim();

  // Extract total value
  const totalValueMatch = normalizedText.match(/valor\s+(?:total|global)[:\s]+R?\$?\s*([\d.,]+)/i);
  const totalValue = totalValueMatch ? parseFloat(totalValueMatch[1]?.replace(/\./g, '').replace(',', '.') ?? '0') : undefined;

  // Calculate confidence
  let score = 0;
  if (parties.length >= 2) score += 0.25;
  else if (parties.length === 1) score += 0.1;
  
  const importantClauses = ['PAYMENT_TERMS', 'PRICING', 'VALIDITY', 'LIABILITY'];
  const foundImportant = clauses.filter(c => importantClauses.includes(c.type)).length;
  score += (foundImportant / importantClauses.length) * 0.35;
  
  if (validity.startDate) score += 0.1;
  if (validity.endDate) score += 0.1;
  if (clauses.length >= 5) score += 0.2;
  else if (clauses.length >= 3) score += 0.1;

  return {
    contractType,
    parties,
    clauses,
    validity,
    paymentTerms,
    pricing,
    insurance,
    jurisdiction,
    totalValue: isNaN(totalValue ?? NaN) ? undefined : totalValue,
    risks,
    confidence: Math.min(score, 0.95),
  };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler do tool analyze_contract
 */
export async function analyzeContractHandler(
  input: AnalyzeContractInput
): Promise<AnalyzeContractOutput> {
  try {
    // 1. Validar input
    if (!input.file_name) {
      return { success: false, error: 'file_name é obrigatório' };
    }

    if (!input.file_path && !input.file_base64) {
      return { success: false, error: 'Forneça file_path ou file_base64' };
    }

    // 2. Obter conteúdo
    let content: string;
    
    if (input.file_base64) {
      content = Buffer.from(input.file_base64, 'base64').toString('utf-8');
    } else if (input.file_path) {
      const fs = await import('node:fs/promises');
      try {
        content = await fs.readFile(input.file_path, 'utf-8');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erro ao ler arquivo: ${msg}` };
      }
    } else {
      return { success: false, error: 'Conteúdo não fornecido' };
    }

    if (content.trim().length < 100) {
      return { success: false, error: 'Conteúdo do contrato muito curto' };
    }

    // 3. Analisar contrato
    const analysis = analyzeContract(content);

    // 4. Calcular nível de risco
    const highRisks = analysis.risks.filter(r => r.type === 'HIGH').length;
    const mediumRisks = analysis.risks.filter(r => r.type === 'MEDIUM').length;
    let riskLevel = 'LOW';
    if (highRisks > 0) riskLevel = 'HIGH';
    else if (mediumRisks > 1) riskLevel = 'MEDIUM';

    // 5. Formatar resposta
    return {
      success: true,
      contract_type: analysis.contractType,
      parties: analysis.parties.map(p => ({
        role: p.role,
        name: p.name,
        document: p.document,
      })),
      payment_terms: analysis.paymentTerms ? {
        method: analysis.paymentTerms.method,
        days: analysis.paymentTerms.days,
        description: analysis.paymentTerms.description,
      } : undefined,
      validity: {
        start_date: analysis.validity.startDate?.toISOString().split('T')[0],
        end_date: analysis.validity.endDate?.toISOString().split('T')[0],
        auto_renewal: analysis.validity.autoRenewal,
      },
      pricing: analysis.pricing?.map(p => ({
        value: p.value,
        currency: p.currency,
        description: p.description,
      })),
      insurance: analysis.insurance ? {
        type: analysis.insurance.type,
        coverage_value: analysis.insurance.coverageValue,
        description: analysis.insurance.description,
      } : undefined,
      risks: analysis.risks.map(r => ({
        level: r.type,
        description: r.description,
      })),
      clauses_summary: analysis.clauses.slice(0, 10).map(c => ({
        type: c.type,
        title: c.title,
        confidence: c.confidence,
      })),
      jurisdiction: analysis.jurisdiction,
      total_value: analysis.totalValue,
      overall_confidence: Math.round(analysis.confidence * 100),
      risk_level: riskLevel,
    };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Erro interno: ${msg}` };
  }
}

/**
 * Schema para registro no MCP Server
 */
export const ANALYZE_CONTRACT_SCHEMA = {
  name: 'analyze_contract',
  description: 'Analisa contratos de frete e extrai partes, cláusulas, valores, datas e riscos',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Caminho do arquivo local',
      },
      file_base64: {
        type: 'string',
        description: 'Conteúdo do arquivo em base64',
      },
      file_name: {
        type: 'string',
        description: 'Nome do arquivo',
      },
      organization_id: {
        type: 'number',
        description: 'ID da organização',
      },
      branch_id: {
        type: 'number',
        description: 'ID da filial',
      },
    },
    required: ['file_name'],
  },
};
