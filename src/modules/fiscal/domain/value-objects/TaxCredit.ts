/**
 * Tax Credit Value Object
 * 
 * Representa um crédito tributário de PIS/COFINS
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { Result } from "@/shared/domain";
import { Money } from "@/shared/domain";

export interface TaxCreditProps {
  fiscalDocumentId?: bigint;
  purchaseAmount: Money;
  pisCredit: Money;
  cofinsCredit: Money;
  accountCode: string;
  accountName: string;
}

export class TaxCredit {
  private constructor(
    public readonly fiscalDocumentId: bigint | undefined,
    public readonly purchaseAmount: Money,
    public readonly pisCredit: Money,
    public readonly cofinsCredit: Money,
    public readonly accountCode: string,
    public readonly accountName: string
  ) {}

  static create(props: TaxCreditProps): Result<TaxCredit, Error> {
    // Validações
    if (props.purchaseAmount.amount < 0) {
      return Result.fail(new Error("Valor de compra não pode ser negativo"));
    }

    if (props.pisCredit.amount < 0) {
      return Result.fail(new Error("Crédito PIS não pode ser negativo"));
    }

    if (props.cofinsCredit.amount < 0) {
      return Result.fail(new Error("Crédito COFINS não pode ser negativo"));
    }

    if (!props.accountCode || props.accountCode.trim() === "") {
      return Result.fail(new Error("Código da conta é obrigatório"));
    }

    if (!props.accountName || props.accountName.trim() === "") {
      return Result.fail(new Error("Nome da conta é obrigatório"));
    }

    return Result.ok(
      new TaxCredit(
        props.fiscalDocumentId,
        props.purchaseAmount,
        props.pisCredit,
        props.cofinsCredit,
        props.accountCode,
        props.accountName
      )
    );
  }

  get totalCredit(): Money {
    const result = Money.create(
      this.pisCredit.amount + this.cofinsCredit.amount,
      this.pisCredit.currency
    );
    
    if (Result.isFail(result)) {
      // Não deveria acontecer se pisCredit e cofinsCredit são válidos
      throw new Error(`Erro ao calcular crédito total: ${result.error}`);
    }
    
    return result.value;
  }

  hasCredit(): boolean {
    return this.totalCredit.amount > 0;
  }
}

