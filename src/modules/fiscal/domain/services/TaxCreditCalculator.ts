/**
 * Tax Credit Calculator - Domain Service
 * 
 * Calcula créditos de PIS/COFINS (Regime Não-Cumulativo)
 * Lógica pura, sem acesso a banco de dados
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { Result } from "@/shared/domain";
import { Money } from "@/shared/domain";
import { TaxRate } from "../value-objects/TaxRate";
import { TaxCredit, type TaxCreditProps } from "../value-objects/TaxCredit";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FiscalDocumentData {
  id: bigint;
  netAmount: Money;
  cfop: string;
  documentType: string;
}

export class TaxCreditCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxCreditCalculationError";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN SERVICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class TaxCreditCalculator {
  private readonly taxRate: TaxRate;

  constructor(taxRate?: TaxRate) {
    this.taxRate = taxRate || TaxRate.nonCumulative();
  }

  /**
   * Calcula crédito de PIS/COFINS para um documento fiscal
   */
  calculate(document: FiscalDocumentData): Result<TaxCredit, TaxCreditCalculationError> {
    // 1. Verificar se é elegível para crédito
    const eligibilityResult = this.isEligibleForCredit(document.cfop);

    if (Result.isFail(eligibilityResult)) {
      return Result.fail(eligibilityResult.error);
    }

    if (!eligibilityResult.value) {
      return Result.fail(
        new TaxCreditCalculationError(
          `Documento não elegível para crédito (CFOP: ${document.cfop})`
        )
      );
    }

    // 2. Calcular créditos
    const pisCredit = this.calculatePisCredit(document.netAmount);
    const cofinsCredit = this.calculateCofinsCredit(document.netAmount);

    // 3. Criar Value Object
    const taxCreditProps: TaxCreditProps = {
      fiscalDocumentId: document.id,
      purchaseAmount: document.netAmount,
      pisCredit,
      cofinsCredit,
      accountCode: document.cfop,
      accountName: document.documentType,
    };

    return TaxCredit.create(taxCreditProps);
  }

  /**
   * Verifica se o documento é elegível para crédito
   * Regra: NFe de entrada (CFOP iniciando com 1, 2 ou 3)
   */
  private isEligibleForCredit(cfop: string): Result<boolean, TaxCreditCalculationError> {
    if (!cfop || cfop.trim() === "") {
      return Result.fail(new TaxCreditCalculationError("CFOP não informado"));
    }

    const firstDigit = cfop.charAt(0);

    // CFOPs de entrada: 1xxx (dentro do estado), 2xxx (outros estados), 3xxx (exterior)
    const isInbound = ["1", "2", "3"].includes(firstDigit);

    return Result.ok(isInbound);
  }

  /**
   * Calcula crédito de PIS
   */
  private calculatePisCredit(netAmount: Money): Money {
    const creditAmount = (netAmount.amount * this.taxRate.pis) / 100;
    const result = Money.create(creditAmount, netAmount.currency);
    
    if (Result.isFail(result)) {
      throw new Error(`Erro ao calcular crédito PIS: ${result.error}`);
    }
    
    return result.value;
  }

  /**
   * Calcula crédito de COFINS
   */
  private calculateCofinsCredit(netAmount: Money): Money {
    const creditAmount = (netAmount.amount * this.taxRate.cofins) / 100;
    const result = Money.create(creditAmount, netAmount.currency);
    
    if (Result.isFail(result)) {
      throw new Error(`Erro ao calcular crédito COFINS: ${result.error}`);
    }
    
    return result.value;
  }

  /**
   * Calcula crédito de depreciação (parcelas mensais)
   * Crédito = 9.25% do valor do ativo / número de meses
   */
  calculateDepreciationCredit(
    assetValue: Money,
    depreciationMonths: number = 48
  ): Result<Money, TaxCreditCalculationError> {
    if (depreciationMonths <= 0) {
      return Result.fail(
        new TaxCreditCalculationError("Número de meses de depreciação deve ser maior que zero")
      );
    }

    if (assetValue.amount <= 0) {
      return Result.fail(
        new TaxCreditCalculationError("Valor do ativo deve ser maior que zero")
      );
    }

    // Crédito total = assetValue * 9.25%
    const totalCredit = (assetValue.amount * this.taxRate.total) / 100;

    // Crédito mensal = totalCredit / depreciationMonths
    const monthlyCredit = totalCredit / depreciationMonths;

    const result = Money.create(monthlyCredit, assetValue.currency);
    
    if (Result.isFail(result)) {
      return Result.fail(
        new TaxCreditCalculationError(`Erro ao criar Money: ${result.error}`)
      );
    }

    return Result.ok(result.value);
  }
}

