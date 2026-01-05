/**
 * Tax Rate Value Object
 * 
 * Representa alíquotas de impostos (PIS/COFINS)
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { Result } from "@/shared/domain";

export class TaxRate {
  private constructor(
    public readonly pis: number,
    public readonly cofins: number
  ) {}

  static create(pis: number, cofins: number): Result<TaxRate, Error> {
    if (pis < 0 || pis > 100) {
      return Result.fail(new Error(`Taxa PIS inválida: ${pis}%. Deve estar entre 0 e 100.`));
    }

    if (cofins < 0 || cofins > 100) {
      return Result.fail(new Error(`Taxa COFINS inválida: ${cofins}%. Deve estar entre 0 e 100.`));
    }

    return Result.ok(new TaxRate(pis, cofins));
  }

  /**
   * Alíquotas padrão do Regime Não-Cumulativo
   */
  static nonCumulative(): TaxRate {
    return new TaxRate(1.65, 7.6);
  }

  /**
   * Alíquotas padrão do Regime Cumulativo
   */
  static cumulative(): TaxRate {
    return new TaxRate(0.65, 3.0);
  }

  get total(): number {
    return this.pis + this.cofins;
  }

  equals(other: TaxRate): boolean {
    return this.pis === other.pis && this.cofins === other.cofins;
  }
}

