import { Result } from '@/shared/domain';

/**
 * WithholdingTaxCalculator - Domain Service (Stateless)
 * 
 * Calcula retenções na fonte para serviços de transporte (frete).
 * Implementa legislação brasileira vigente.
 * 
 * Base Legal:
 * - IRRF 1.5%: Art. 724 RIR/2018 (Decreto 9.580/2018), Art. 64 Lei 9.430/96
 *   Limite mínimo: R$ 10,00 (Art. 724 §6 RIR/2018)
 * - PIS 0.65%: Art. 30 Lei 10.833/03
 * - COFINS 3.0%: Art. 30 Lei 10.833/03
 * - CSLL 1.0%: Art. 30 Lei 10.833/03
 *   PIS/COFINS/CSLL retidos em conjunto quando > R$ 5.000,00 (Art. 31 §3 Lei 10.833/03)
 * - ISS 2-5%: LC 116/03 (depende do município)
 *   Retido quando serviço prestado de outro município
 * 
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */

export interface WithholdingTaxResult {
  irrf: number;
  pis: number;
  cofins: number;
  csll: number;
  iss: number;
  inss: number;
  totalWithholding: number;
  netAmount: number;
  details: WithholdingDetail[];
}

export interface WithholdingDetail {
  tax: string;
  rate: number;
  base: number;
  amount: number;
  legalBasis: string;
  applied: boolean;
  reason?: string;
}

export interface WithholdingTaxInput {
  grossAmount: number;
  /** Tipo de serviço: 'FREIGHT' para frete, 'SERVICE' genérico */
  serviceType: 'FREIGHT' | 'SERVICE';
  /** Se o prestador é PJ (true) ou PF (false). Retenção só aplica para PJ */
  isLegalEntity: boolean;
  /** Se o prestador é optante do Simples Nacional — dispensa PIS/COFINS/CSLL */
  isSimplesNacional: boolean;
  /** Alíquota ISS do município (2-5%). Se undefined, não calcula ISS */
  issRate?: number;
  /** Se o ISS deve ser retido (serviço de fora do município) */
  retainIss?: boolean;
  /** Se deve reter INSS (cessão de mão de obra / empreitada) */
  retainInss?: boolean;
  /** Alíquota INSS customizada (default 11%). Para cooperativas = 15% */
  inssRate?: number;
}

// Constantes de alíquotas (legislação vigente)
const IRRF_RATE = 0.015;        // 1.5%
const PIS_RATE = 0.0065;        // 0.65%
const COFINS_RATE = 0.03;       // 3.0%
const CSLL_RATE = 0.01;         // 1.0%
const INSS_RATE = 0.11;         // 11% — Art. 31 Lei 8.212/91
const INSS_COOP_RATE = 0.15;    // 15% — Cooperativas (Art. 22 §1 Lei 8.212/91)

// Limites mínimos
const IRRF_MIN_AMOUNT = 10.00;  // R$ 10,00 — abaixo, não retém
const PCS_MIN_BASE = 5000.00;   // R$ 5.000,00 — PIS/COFINS/CSLL só retém acima
const INSS_TETO_2026 = 908.86;  // Teto máximo de retenção INSS (atualizado anualmente)

export class WithholdingTaxCalculator {
  private constructor() {} // DOMAIN-SVC-002: Impede instanciação

  /**
   * Calcula todas as retenções aplicáveis.
   * 
   * @param input Dados para cálculo
   * @returns Result com WithholdingTaxResult
   */
  static calculate(input: WithholdingTaxInput): Result<WithholdingTaxResult, string> {
    if (input.grossAmount <= 0) {
      return Result.fail('Valor bruto deve ser maior que zero');
    }

    const details: WithholdingDetail[] = [];
    let irrf = 0;
    let pis = 0;
    let cofins = 0;
    let csll = 0;
    let iss = 0;

    // === IRRF ===
    // Retido para PJ e PF prestadores de serviço
    const irrfAmount = WithholdingTaxCalculator.roundCurrency(input.grossAmount * IRRF_RATE);
    const irrfApplied = input.isLegalEntity && irrfAmount >= IRRF_MIN_AMOUNT;
    if (irrfApplied) {
      irrf = irrfAmount;
    }
    details.push({
      tax: 'IRRF',
      rate: IRRF_RATE * 100,
      base: input.grossAmount,
      amount: irrfAmount,
      legalBasis: 'Art. 724 RIR/2018 (Decreto 9.580/2018)',
      applied: irrfApplied,
      reason: !irrfApplied
        ? (!input.isLegalEntity ? 'PF não retém IRRF neste caso' : `Valor ${irrfAmount} abaixo do mínimo R$ ${IRRF_MIN_AMOUNT}`)
        : undefined,
    });

    // === PIS/COFINS/CSLL (retidos em conjunto) ===
    // Não aplica para Simples Nacional (Art. 30 §2 Lei 10.833/03)
    const pcsApplied = input.isLegalEntity && !input.isSimplesNacional && input.grossAmount > PCS_MIN_BASE;
    
    const pisAmount = WithholdingTaxCalculator.roundCurrency(input.grossAmount * PIS_RATE);
    const cofinsAmount = WithholdingTaxCalculator.roundCurrency(input.grossAmount * COFINS_RATE);
    const csllAmount = WithholdingTaxCalculator.roundCurrency(input.grossAmount * CSLL_RATE);

    if (pcsApplied) {
      pis = pisAmount;
      cofins = cofinsAmount;
      csll = csllAmount;
    }

    const pcsReason = !input.isLegalEntity
      ? 'PF não retém PIS/COFINS/CSLL'
      : input.isSimplesNacional
        ? 'Simples Nacional: dispensado (Art. 30 §2 Lei 10.833/03)'
        : input.grossAmount <= PCS_MIN_BASE
          ? `Valor R$ ${input.grossAmount} <= limite R$ ${PCS_MIN_BASE} (Art. 31 §3 Lei 10.833/03)`
          : undefined;

    details.push({
      tax: 'PIS',
      rate: PIS_RATE * 100,
      base: input.grossAmount,
      amount: pisAmount,
      legalBasis: 'Art. 30 Lei 10.833/03',
      applied: pcsApplied,
      reason: pcsReason,
    });

    details.push({
      tax: 'COFINS',
      rate: COFINS_RATE * 100,
      base: input.grossAmount,
      amount: cofinsAmount,
      legalBasis: 'Art. 30 Lei 10.833/03',
      applied: pcsApplied,
      reason: pcsReason,
    });

    details.push({
      tax: 'CSLL',
      rate: CSLL_RATE * 100,
      base: input.grossAmount,
      amount: csllAmount,
      legalBasis: 'Art. 30 Lei 10.833/03',
      applied: pcsApplied,
      reason: pcsReason,
    });

    // === ISS ===
    // Retido quando serviço prestado de fora do município
    const issApplied = !!input.retainIss && !!input.issRate && input.issRate > 0;
    if (issApplied && input.issRate) {
      iss = WithholdingTaxCalculator.roundCurrency(input.grossAmount * (input.issRate / 100));
    }
    details.push({
      tax: 'ISS',
      rate: input.issRate ?? 0,
      base: input.grossAmount,
      amount: issApplied ? iss : 0,
      legalBasis: 'LC 116/03',
      applied: issApplied,
      reason: !issApplied
        ? (!input.retainIss ? 'ISS não retido (mesmo município)' : 'Alíquota ISS não informada')
        : undefined,
    });

    // === INSS ===
    // Retido em cessão de mão de obra e empreitada (Art. 31 Lei 8.212/91)
    // Alíquota: 11% (geral) ou 15% (cooperativas)
    let inss = 0;
    const inssRate = input.inssRate ?? INSS_RATE;
    const inssApplied = !!input.retainInss && input.isLegalEntity;
    if (inssApplied) {
      const inssCalculated = WithholdingTaxCalculator.roundCurrency(input.grossAmount * inssRate);
      // Aplicar teto INSS
      inss = Math.min(inssCalculated, INSS_TETO_2026);
    }
    details.push({
      tax: 'INSS',
      rate: inssRate * 100,
      base: input.grossAmount,
      amount: inssApplied ? inss : WithholdingTaxCalculator.roundCurrency(input.grossAmount * inssRate),
      legalBasis: 'Art. 31 Lei 8.212/91',
      applied: inssApplied,
      reason: !inssApplied
        ? (!input.retainInss ? 'INSS não retido (sem cessão de mão de obra)' : 'Prestador não é PJ')
        : inss >= INSS_TETO_2026 ? `Teto INSS aplicado: R$ ${INSS_TETO_2026}` : undefined,
    });

    const totalWithholding = WithholdingTaxCalculator.roundCurrency(irrf + pis + cofins + csll + iss + inss);
    const netAmount = WithholdingTaxCalculator.roundCurrency(input.grossAmount - totalWithholding);

    return Result.ok({
      irrf,
      pis,
      cofins,
      csll,
      iss,
      inss,
      totalWithholding,
      netAmount,
      details,
    });
  }

  /**
   * Arredonda valor monetário para 2 casas decimais (banker's rounding)
   */
  private static roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
