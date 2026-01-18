/**
 * MCP Tool: calculate_tax_scenario
 * 
 * Calcula impostos para cenários de operação no Brasil
 * Suporta ICMS, PIS/COFINS, ISS e preview da Reforma 2026
 * 
 * @see Lei Complementar 87/96 (ICMS)
 * @see Leis 10.637/02 e 10.833/03 (PIS/COFINS)
 * @see EC 132/2023 (Reforma Tributária)
 * @see LC 116/03 (ISS)
 */

// ============================================================================
// TIPOS
// ============================================================================

export type OperationType = 'venda' | 'compra' | 'transferencia' | 'devolucao' | 'servico';

export interface CalculateTaxScenarioInput {
  operation_type: OperationType;
  origin_uf: string;
  dest_uf: string;
  product_ncm?: string;
  service_code?: string;
  value: number;
  is_simples_nacional: boolean;
  include_2026_preview?: boolean;
}

export interface TaxDetail {
  base: number;
  aliquota: number;
  valor: number;
  cst: string;
}

export interface CalculateTaxScenarioOutput {
  taxes: {
    icms: TaxDetail;
    pis: TaxDetail;
    cofins: TaxDetail;
    iss?: TaxDetail;
  };
  cfop_sugerido: string;
  natureza_operacao: string;
  observacoes: string[];
  reforma_2026_preview?: {
    ibs: number;
    cbs: number;
    total: number;
  };
}

// ============================================================================
// TABELAS DE ALÍQUOTAS (SIMPLIFICADAS - PARA REFERÊNCIA)
// ============================================================================

/**
 * Alíquotas ICMS interestaduais (LC 87/96)
 * 
 * Origem Sul/Sudeste (exceto ES) -> Norte/Nordeste/Centro-Oeste/ES: 7%
 * Demais casos interestaduais: 12%
 * Operações internas: varia por estado (17% a 22%)
 */
const ICMS_INTERESTADUAL: Record<string, Record<string, number>> = {
  // Origem Sul/Sudeste (exceto ES) - 7% para N/NE/CO/ES
  SP: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
  RJ: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
  MG: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
  PR: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
  SC: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
  RS: { AC: 7, AL: 7, AM: 7, AP: 7, BA: 7, CE: 7, DF: 7, ES: 7, GO: 7, MA: 7, MS: 7, MT: 7, PA: 7, PB: 7, PE: 7, PI: 7, RN: 7, RO: 7, RR: 7, SE: 7, TO: 7 },
};

// Alíquota padrão interestadual (12%) para casos não mapeados
const ICMS_INTERESTADUAL_DEFAULT = 12;

// Alíquotas internas por estado (simplificado)
const ICMS_INTERNO: Record<string, number> = {
  AC: 19, AL: 19, AM: 20, AP: 18, BA: 20.5, CE: 20, DF: 20, ES: 17,
  GO: 19, MA: 22, MG: 18, MS: 17, MT: 17, PA: 19, PB: 20, PE: 20.5,
  PI: 21, PR: 19.5, RJ: 22, RN: 20, RO: 19.5, RR: 20, RS: 17, SC: 17,
  SE: 19, SP: 18, TO: 20,
};

// PIS/COFINS - Regime não-cumulativo (padrão)
const PIS_ALIQUOTA_NAO_CUMULATIVO = 1.65;
const COFINS_ALIQUOTA_NAO_CUMULATIVO = 7.6;

// PIS/COFINS - Regime cumulativo
const PIS_ALIQUOTA_CUMULATIVO = 0.65;
const COFINS_ALIQUOTA_CUMULATIVO = 3.0;

// ISS - Alíquotas por tipo de serviço (simplificado)
const ISS_MINIMO = 2.0;
const ISS_MAXIMO = 5.0;
const ISS_PADRAO = 5.0; // Quando não especificado

// Reforma 2026 - Alíquotas de referência (EC 132/2023)
const IBS_ALIQUOTA_REFERENCIA = 17.7; // Estimativa para IBS (estadual+municipal)
const CBS_ALIQUOTA_REFERENCIA = 8.8; // Estimativa para CBS (federal)

// ============================================================================
// CFOP E NATUREZA DE OPERAÇÃO
// ============================================================================

interface CfopInfo {
  interno: string;
  interestadual: string;
  natureza: string;
}

const CFOP_POR_OPERACAO: Record<OperationType, CfopInfo> = {
  venda: {
    interno: '5102',
    interestadual: '6102',
    natureza: 'Venda de mercadoria adquirida ou recebida de terceiros',
  },
  compra: {
    interno: '1102',
    interestadual: '2102',
    natureza: 'Compra para comercialização',
  },
  transferencia: {
    interno: '5152',
    interestadual: '6152',
    natureza: 'Transferência de mercadoria',
  },
  devolucao: {
    interno: '5202',
    interestadual: '6202',
    natureza: 'Devolução de compra para comercialização',
  },
  servico: {
    interno: '5933',
    interestadual: '6933',
    natureza: 'Prestação de serviço tributado pelo ISS',
  },
};

// CST ICMS por situação
const CST_ICMS: Record<string, string> = {
  tributado_integralmente: '00',
  tributado_com_reducao: '20',
  isento: '40',
  nao_tributado: '41',
  suspensao: '50',
  diferimento: '51',
  substituicao_tributaria: '60',
  simples_nacional: '102', // CSOSN
};

// CST PIS/COFINS
const CST_PIS_COFINS: Record<string, string> = {
  tributado: '01',
  tributado_aliquota_zero: '06',
  isento: '07',
  sem_incidencia: '08',
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function calculateTaxScenario(
  input: CalculateTaxScenarioInput
): Promise<CalculateTaxScenarioOutput> {
  // Validar input
  validateInput(input);

  const {
    operation_type,
    origin_uf,
    dest_uf,
    value,
    is_simples_nacional,
    include_2026_preview,
  } = input;

  const originUpper = origin_uf.toUpperCase();
  const destUpper = dest_uf.toUpperCase();
  const isIntrastate = originUpper === destUpper;
  const isService = operation_type === 'servico';

  // Inicializar observações
  const observacoes: string[] = [];

  // =========================================================================
  // CÁLCULO ICMS
  // =========================================================================
  
  let icmsAliquota: number;
  let icmsCst: string;
  
  if (is_simples_nacional) {
    // Simples Nacional - ICMS já incluso no DAS
    icmsAliquota = 0;
    icmsCst = CST_ICMS.simples_nacional;
    observacoes.push('Simples Nacional: ICMS recolhido via DAS, alíquota zero na NFe');
  } else if (isService) {
    // Serviço - não tem ICMS (tem ISS)
    icmsAliquota = 0;
    icmsCst = CST_ICMS.nao_tributado;
    observacoes.push('Serviço: tributado pelo ISS, sem incidência de ICMS');
  } else if (isIntrastate) {
    // Operação interna
    icmsAliquota = ICMS_INTERNO[originUpper] ?? 18;
    icmsCst = CST_ICMS.tributado_integralmente;
    observacoes.push(`Operação interna em ${originUpper}: ICMS ${icmsAliquota}%`);
  } else {
    // Operação interestadual
    const originRates = ICMS_INTERESTADUAL[originUpper];
    icmsAliquota = originRates?.[destUpper] ?? ICMS_INTERESTADUAL_DEFAULT;
    icmsCst = CST_ICMS.tributado_integralmente;
    observacoes.push(`Operação interestadual ${originUpper} → ${destUpper}: ICMS ${icmsAliquota}%`);
    
    // Verificar DIFAL (diferencial de alíquota)
    const aliquotaInternaDest = ICMS_INTERNO[destUpper] ?? 18;
    if (aliquotaInternaDest > icmsAliquota) {
      const difal = aliquotaInternaDest - icmsAliquota;
      observacoes.push(`DIFAL aplicável: ${difal}% (alíquota interna ${destUpper}: ${aliquotaInternaDest}%)`);
    }
  }

  const icmsBase = value;
  const icmsValor = roundCurrency(icmsBase * (icmsAliquota / 100));

  // =========================================================================
  // CÁLCULO PIS/COFINS
  // =========================================================================
  
  let pisAliquota: number;
  let cofinsAliquota: number;
  let pisCst: string;
  let cofinsCst: string;

  if (is_simples_nacional) {
    // Simples Nacional - PIS/COFINS já incluso no DAS
    pisAliquota = 0;
    cofinsAliquota = 0;
    pisCst = CST_PIS_COFINS.sem_incidencia;
    cofinsCst = CST_PIS_COFINS.sem_incidencia;
    observacoes.push('Simples Nacional: PIS/COFINS recolhido via DAS');
  } else {
    // Lucro Real/Presumido - regime não-cumulativo
    pisAliquota = PIS_ALIQUOTA_NAO_CUMULATIVO;
    cofinsAliquota = COFINS_ALIQUOTA_NAO_CUMULATIVO;
    pisCst = CST_PIS_COFINS.tributado;
    cofinsCst = CST_PIS_COFINS.tributado;
    observacoes.push(`PIS/COFINS regime não-cumulativo: ${pisAliquota}% / ${cofinsAliquota}%`);
  }

  const pisBase = value;
  const pisValor = roundCurrency(pisBase * (pisAliquota / 100));
  const cofinsBase = value;
  const cofinsValor = roundCurrency(cofinsBase * (cofinsAliquota / 100));

  // =========================================================================
  // CÁLCULO ISS (apenas para serviços)
  // =========================================================================
  
  let issDetail: TaxDetail | undefined;

  if (isService) {
    const issAliquota = ISS_PADRAO;
    const issBase = value;
    const issValor = roundCurrency(issBase * (issAliquota / 100));
    
    issDetail = {
      base: issBase,
      aliquota: issAliquota,
      valor: issValor,
      cst: '00', // ISS não usa CST, mas mantemos para consistência
    };
    
    observacoes.push(`ISS: ${issAliquota}% (varia de ${ISS_MINIMO}% a ${ISS_MAXIMO}% conforme município)`);
    observacoes.push('Verificar código de serviço na LC 116/03 para alíquota correta');
  }

  // =========================================================================
  // CFOP E NATUREZA
  // =========================================================================
  
  const cfopInfo = CFOP_POR_OPERACAO[operation_type];
  const cfopSugerido = isIntrastate ? cfopInfo.interno : cfopInfo.interestadual;
  const naturezaOperacao = cfopInfo.natureza;

  // =========================================================================
  // PREVIEW REFORMA 2026 (opcional)
  // =========================================================================
  
  let reforma2026Preview: { ibs: number; cbs: number; total: number } | undefined;

  if (include_2026_preview) {
    // Cálculo simplificado baseado nas alíquotas de referência
    // Na prática, IBS+CBS substituirão ICMS+ISS+PIS/COFINS
    const ibsValor = roundCurrency(value * (IBS_ALIQUOTA_REFERENCIA / 100));
    const cbsValor = roundCurrency(value * (CBS_ALIQUOTA_REFERENCIA / 100));
    
    reforma2026Preview = {
      ibs: ibsValor,
      cbs: cbsValor,
      total: roundCurrency(ibsValor + cbsValor),
    };

    observacoes.push('--- PREVIEW REFORMA TRIBUTÁRIA 2026 ---');
    observacoes.push(`IBS (substituirá ICMS+ISS): R$ ${ibsValor.toFixed(2)} (${IBS_ALIQUOTA_REFERENCIA}%)`);
    observacoes.push(`CBS (substituirá PIS/COFINS): R$ ${cbsValor.toFixed(2)} (${CBS_ALIQUOTA_REFERENCIA}%)`);
    observacoes.push('⚠️ Valores estimados - alíquotas definitivas em definição');
    observacoes.push('⚠️ Transição gradual de 2026 a 2032');
  }

  // =========================================================================
  // RESULTADO
  // =========================================================================
  
  const result: CalculateTaxScenarioOutput = {
    taxes: {
      icms: {
        base: icmsBase,
        aliquota: icmsAliquota,
        valor: icmsValor,
        cst: icmsCst,
      },
      pis: {
        base: pisBase,
        aliquota: pisAliquota,
        valor: pisValor,
        cst: pisCst,
      },
      cofins: {
        base: cofinsBase,
        aliquota: cofinsAliquota,
        valor: cofinsValor,
        cst: cofinsCst,
      },
    },
    cfop_sugerido: cfopSugerido,
    natureza_operacao: naturezaOperacao,
    observacoes,
  };

  if (issDetail) {
    result.taxes.iss = issDetail;
  }

  if (reforma2026Preview) {
    result.reforma_2026_preview = reforma2026Preview;
  }

  return result;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function validateInput(input: CalculateTaxScenarioInput): void {
  // Validar operation_type
  const validOperations: OperationType[] = ['venda', 'compra', 'transferencia', 'devolucao', 'servico'];
  if (!input.operation_type || !validOperations.includes(input.operation_type)) {
    throw new Error(
      `operation_type inválido: ${input.operation_type}. ` +
      `Valores válidos: ${validOperations.join(', ')}`
    );
  }

  // Validar UFs
  const validUFs = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
  ];

  if (!input.origin_uf || typeof input.origin_uf !== 'string') {
    throw new Error('origin_uf é obrigatório e deve ser string');
  }

  const originUpper = input.origin_uf.toUpperCase();
  if (!validUFs.includes(originUpper)) {
    throw new Error(`origin_uf inválido: ${input.origin_uf}. Deve ser UF válida (ex: SP, RJ, MG)`);
  }

  if (!input.dest_uf || typeof input.dest_uf !== 'string') {
    throw new Error('dest_uf é obrigatório e deve ser string');
  }

  const destUpper = input.dest_uf.toUpperCase();
  if (!validUFs.includes(destUpper)) {
    throw new Error(`dest_uf inválido: ${input.dest_uf}. Deve ser UF válida (ex: SP, RJ, MG)`);
  }

  // Validar value
  if (typeof input.value !== 'number' || isNaN(input.value)) {
    throw new Error('value é obrigatório e deve ser número');
  }

  if (input.value <= 0) {
    throw new Error('value deve ser maior que zero');
  }

  // Validar is_simples_nacional
  if (typeof input.is_simples_nacional !== 'boolean') {
    throw new Error('is_simples_nacional é obrigatório e deve ser boolean');
  }

  // Validar NCM (opcional)
  if (input.product_ncm !== undefined) {
    if (typeof input.product_ncm !== 'string') {
      throw new Error('product_ncm deve ser string quando fornecido');
    }
    // NCM tem 8 dígitos
    const ncmClean = input.product_ncm.replace(/\D/g, '');
    if (ncmClean.length !== 8) {
      throw new Error('product_ncm deve ter 8 dígitos (ex: 84719012)');
    }
  }

  // Validar service_code (opcional)
  if (input.service_code !== undefined) {
    if (typeof input.service_code !== 'string') {
      throw new Error('service_code deve ser string quando fornecido');
    }
  }

  // Validar coerência: serviço deve ter service_code
  if (input.operation_type === 'servico' && !input.service_code) {
    // Apenas warning, não erro
    console.warn('Operação de serviço sem service_code - usando alíquota ISS padrão');
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
