/**
 * TAX CALCULATOR SERVICE
 * 
 * Calcula ICMS, CFOP e outras informações fiscais automaticamente
 * baseado na Matriz Tributária (tax_matrix)
 */

import { db } from "@/lib/db";
import { taxMatrix } from "@/lib/db/schema";
import { eq, and, isNull, lte, gte, or } from "drizzle-orm";

export interface TaxCalculationParams {
  organizationId: number;
  originUf: string;
  destinationUf: string;
  regime?: string; // NORMAL, SIMPLES_NACIONAL
  date?: Date;
}

export interface TaxCalculationResult {
  icmsRate: number;
  icmsStRate?: number;
  icmsReduction: number;
  fcpRate: number;
  cfop: string;
  cst: string;
  validFrom: Date;
  validTo: Date | null;
}

/**
 * Calcula as informações fiscais para uma rota específica
 */
export async function calculateTax(
  params: TaxCalculationParams
): Promise<TaxCalculationResult> {
  const {
    organizationId,
    originUf,
    destinationUf,
    regime = "NORMAL",
    date = new Date(),
  } = params;

  // Buscar regra na matriz tributária
  const rules = await db
    .select()
    .from(taxMatrix)
    .where(
      and(
        eq(taxMatrix.organizationId, organizationId),
        eq(taxMatrix.originUf, originUf.toUpperCase()),
        eq(taxMatrix.destinationUf, destinationUf.toUpperCase()),
        eq(taxMatrix.regime, regime),
        lte(taxMatrix.validFrom, date),
        or(
          gte(taxMatrix.validTo, date),
          isNull(taxMatrix.validTo)
        ),
        eq(taxMatrix.status, "ACTIVE"),
        isNull(taxMatrix.deletedAt)
      )
    );

  if (rules.length === 0) {
    throw new Error(
      `Matriz tributária não configurada para ${originUf} → ${destinationUf} (Regime: ${regime})`
    );
  }

  const rule = rules[0];

  // Determinar CFOP correto
  const isIntrastate = originUf.toUpperCase() === destinationUf.toUpperCase();
  const cfop = isIntrastate
    ? (rule.cfopInternal || "5353")
    : (rule.cfopInterstate || "6353");

  return {
    icmsRate: parseFloat(rule.icmsRate?.toString() || "0"),
    icmsStRate: rule.icmsStRate ? parseFloat(rule.icmsStRate.toString()) : undefined,
    icmsReduction: parseFloat(rule.icmsReduction?.toString() || "0"),
    fcpRate: parseFloat(rule.fcpRate?.toString() || "0"),
    cfop,
    cst: rule.cst || "00",
    validFrom: rule.validFrom,
    validTo: rule.validTo || null,
  };
}

/**
 * Calcula o valor do ICMS baseado no valor do serviço
 */
export function calculateIcmsValue(
  serviceValue: number,
  taxInfo: TaxCalculationResult
): {
  base: number;
  value: number;
  effectiveRate: number;
} {
  // Aplicar redução de base se houver
  const base = serviceValue * (1 - taxInfo.icmsReduction / 100);
  
  // Calcular ICMS
  const value = base * (taxInfo.icmsRate / 100);
  
  // Taxa efetiva (considerando redução)
  const effectiveRate = (value / serviceValue) * 100;

  return {
    base: parseFloat(base.toFixed(2)),
    value: parseFloat(value.toFixed(2)),
    effectiveRate: parseFloat(effectiveRate.toFixed(2)),
  };
}

/**
 * Valida se existe regra fiscal configurada
 */
export async function hasTaxRule(
  organizationId: number,
  originUf: string,
  destinationUf: string,
  regime: string = "NORMAL"
): Promise<boolean> {
  const rules = await db
    .select({ id: taxMatrix.id })
    .from(taxMatrix)
    .where(
      and(
        eq(taxMatrix.organizationId, organizationId),
        eq(taxMatrix.originUf, originUf.toUpperCase()),
        eq(taxMatrix.destinationUf, destinationUf.toUpperCase()),
        eq(taxMatrix.regime, regime),
        eq(taxMatrix.status, "ACTIVE"),
        isNull(taxMatrix.deletedAt)
      )
    );

  return rules.length > 0;
}










