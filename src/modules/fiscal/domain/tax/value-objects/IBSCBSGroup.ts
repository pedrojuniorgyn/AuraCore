import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain';
import { CSTIbsCbs } from './CSTIbsCbs';
import { ClassificacaoTributaria } from './ClassificacaoTributaria';
import { AliquotaIBS } from './AliquotaIBS';
import { AliquotaCBS } from './AliquotaCBS';

/**
 * Value Object: Grupo IBSCBS
 * 
 * Representa o grupo completo de tributação IBS/CBS conforme
 * NT 2025.001 (CT-e) e NT 2025.002 (NF-e).
 * 
 * Campos obrigatórios:
 * - CST IBS/CBS
 * - Classificação Tributária (cClassTrib)
 * - Base de Cálculo
 * - IBS UF (alíquota + valor)
 * - IBS Municipal (alíquota + valor)
 * - CBS (alíquota + valor)
 * 
 * Campos opcionais:
 * - Diferimento (gDif)
 * - Devolução (gDev)
 * - Redução de alíquota (gRed)
 * - Crédito presumido (gCredPres)
 * - Compras governamentais (gCompraGov)
 * 
 * Base Legal: LC 214/2025, NT 2025.001, NT 2025.002
 */

export interface DeferralInfo {
  deferralRate: number; // Percentual de diferimento (0-100%)
  ibsDeferredValue: Money; // Valor IBS diferido
  cbsDeferredValue: Money; // Valor CBS diferido
}

export interface RefundInfo {
  ibsRefundValue: Money; // Valor IBS devolvido
  cbsRefundValue: Money; // Valor CBS devolvido
}

export interface ReductionInfo {
  ibsReductionRate: number; // Percentual de redução IBS (0-100%)
  cbsReductionRate: number; // Percentual de redução CBS (0-100%)
}

export interface PresumedCreditInfo {
  creditCode: string; // Código do crédito presumido
  creditRate: number; // Percentual do crédito (0-100%)
  ibsCreditValue: Money; // Valor crédito IBS
  cbsCreditValue: Money; // Valor crédito CBS
}

export interface GovernmentPurchaseInfo {
  entityType: 1 | 2 | 3; // 1=União, 2=Estado/DF, 3=Município
  reductionRate: number; // Percentual de redução para compras gov (0-100%)
}

export interface IBSCBSGroupProps {
  // Obrigatórios
  cst: CSTIbsCbs;
  classificationCode: ClassificacaoTributaria;
  baseValue: Money;
  ibsUfRate: AliquotaIBS;
  ibsUfValue: Money;
  ibsMunRate: AliquotaIBS;
  ibsMunValue: Money;
  cbsRate: AliquotaCBS;
  cbsValue: Money;

  // Opcionais
  ibsUfEffectiveRate?: AliquotaIBS;
  ibsMunEffectiveRate?: AliquotaIBS;
  cbsEffectiveRate?: AliquotaCBS;
  deferral?: DeferralInfo;
  refund?: RefundInfo;
  reduction?: ReductionInfo;
  presumedCredit?: PresumedCreditInfo;
  governmentPurchase?: GovernmentPurchaseInfo;
}

export class IBSCBSGroup {
  private readonly _props: IBSCBSGroupProps;

  private constructor(props: IBSCBSGroupProps) {
    this._props = Object.freeze({ ...props });
  }

  // Getters obrigatórios
  get cst(): CSTIbsCbs {
    return this._props.cst;
  }

  get classificationCode(): ClassificacaoTributaria {
    return this._props.classificationCode;
  }

  get baseValue(): Money {
    return this._props.baseValue;
  }

  get ibsUfRate(): AliquotaIBS {
    return this._props.ibsUfRate;
  }

  get ibsUfValue(): Money {
    return this._props.ibsUfValue;
  }

  get ibsMunRate(): AliquotaIBS {
    return this._props.ibsMunRate;
  }

  get ibsMunValue(): Money {
    return this._props.ibsMunValue;
  }

  get cbsRate(): AliquotaCBS {
    return this._props.cbsRate;
  }

  get cbsValue(): Money {
    return this._props.cbsValue;
  }

  // Getters opcionais
  get ibsUfEffectiveRate(): AliquotaIBS | undefined {
    return this._props.ibsUfEffectiveRate;
  }

  get ibsMunEffectiveRate(): AliquotaIBS | undefined {
    return this._props.ibsMunEffectiveRate;
  }

  get cbsEffectiveRate(): AliquotaCBS | undefined {
    return this._props.cbsEffectiveRate;
  }

  get deferral(): DeferralInfo | undefined {
    return this._props.deferral;
  }

  get refund(): RefundInfo | undefined {
    return this._props.refund;
  }

  get reduction(): ReductionInfo | undefined {
    return this._props.reduction;
  }

  get presumedCredit(): PresumedCreditInfo | undefined {
    return this._props.presumedCredit;
  }

  get governmentPurchase(): GovernmentPurchaseInfo | undefined {
    return this._props.governmentPurchase;
  }

  // Cálculos
  get totalIbs(): Money {
    const result = Money.create(
      this._props.ibsUfValue.amount + this._props.ibsMunValue.amount,
      this._props.ibsUfValue.currency
    );
    if (Result.isFail(result)) {
      throw new Error('Failed to calculate total IBS');
    }
    return result.value;
  }

  get totalTax(): Money {
    const result = Money.create(
      this.totalIbs.amount + this._props.cbsValue.amount,
      this._props.cbsValue.currency
    );
    if (Result.isFail(result)) {
      throw new Error('Failed to calculate total tax');
    }
    return result.value;
  }

  /**
   * Factory method
   */
  static create(props: IBSCBSGroupProps): Result<IBSCBSGroup, string> {
    // Validar CST
    if (!props.cst) {
      return Result.fail('CST IBS/CBS is required');
    }

    // Validar classificação tributária
    if (!props.classificationCode) {
      return Result.fail('Classification code (cClassTrib) is required');
    }

    // Validar base de cálculo
    if (props.baseValue.amount < 0) {
      return Result.fail('Base value cannot be negative');
    }

    // Validar moedas consistentes
    const currency = props.baseValue.currency;
    if (
      props.ibsUfValue.currency !== currency ||
      props.ibsMunValue.currency !== currency ||
      props.cbsValue.currency !== currency
    ) {
      return Result.fail('All monetary values must have the same currency');
    }

    // Validar valores negativos
    if (props.ibsUfValue.amount < 0) {
      return Result.fail('IBS UF value cannot be negative');
    }
    if (props.ibsMunValue.amount < 0) {
      return Result.fail('IBS Municipal value cannot be negative');
    }
    if (props.cbsValue.amount < 0) {
      return Result.fail('CBS value cannot be negative');
    }

    // Validar consistência: valor = base * alíquota (com tolerância de 1 centavo)
    const tolerance = 0.01;

    const expectedIbsUf = props.baseValue.amount * props.ibsUfRate.decimal;
    if (Math.abs(props.ibsUfValue.amount - expectedIbsUf) > tolerance) {
      return Result.fail(
        `IBS UF value (${props.ibsUfValue.amount}) inconsistent with base (${props.baseValue.amount}) and rate (${props.ibsUfRate.percentual}%). Expected: ${expectedIbsUf.toFixed(2)}`
      );
    }

    const expectedIbsMun = props.baseValue.amount * props.ibsMunRate.decimal;
    if (Math.abs(props.ibsMunValue.amount - expectedIbsMun) > tolerance) {
      return Result.fail(
        `IBS Municipal value (${props.ibsMunValue.amount}) inconsistent with base (${props.baseValue.amount}) and rate (${props.ibsMunRate.percentual}%). Expected: ${expectedIbsMun.toFixed(2)}`
      );
    }

    const expectedCbs = props.baseValue.amount * props.cbsRate.decimal;
    if (Math.abs(props.cbsValue.amount - expectedCbs) > tolerance) {
      return Result.fail(
        `CBS value (${props.cbsValue.amount}) inconsistent with base (${props.baseValue.amount}) and rate (${props.cbsRate.percentual}%). Expected: ${expectedCbs.toFixed(2)}`
      );
    }

    // Validar deferral (se presente)
    if (props.deferral) {
      if (props.deferral.deferralRate < 0 || props.deferral.deferralRate > 100) {
        return Result.fail('Deferral rate must be between 0% and 100%');
      }
      if (props.deferral.ibsDeferredValue.amount < 0) {
        return Result.fail('IBS deferred value cannot be negative');
      }
      if (props.deferral.cbsDeferredValue.amount < 0) {
        return Result.fail('CBS deferred value cannot be negative');
      }
    }

    // Validar refund (se presente)
    if (props.refund) {
      if (props.refund.ibsRefundValue.amount < 0) {
        return Result.fail('IBS refund value cannot be negative');
      }
      if (props.refund.cbsRefundValue.amount < 0) {
        return Result.fail('CBS refund value cannot be negative');
      }
    }

    // Validar reduction (se presente)
    if (props.reduction) {
      if (props.reduction.ibsReductionRate < 0 || props.reduction.ibsReductionRate > 100) {
        return Result.fail('IBS reduction rate must be between 0% and 100%');
      }
      if (props.reduction.cbsReductionRate < 0 || props.reduction.cbsReductionRate > 100) {
        return Result.fail('CBS reduction rate must be between 0% and 100%');
      }
    }

    // Validar presumed credit (se presente)
    if (props.presumedCredit) {
      if (props.presumedCredit.creditRate < 0 || props.presumedCredit.creditRate > 100) {
        return Result.fail('Presumed credit rate must be between 0% and 100%');
      }
      if (props.presumedCredit.ibsCreditValue.amount < 0) {
        return Result.fail('IBS credit value cannot be negative');
      }
      if (props.presumedCredit.cbsCreditValue.amount < 0) {
        return Result.fail('CBS credit value cannot be negative');
      }
      if (!props.presumedCredit.creditCode || props.presumedCredit.creditCode.length === 0) {
        return Result.fail('Presumed credit code is required');
      }
    }

    // Validar government purchase (se presente)
    if (props.governmentPurchase) {
      if (![1, 2, 3].includes(props.governmentPurchase.entityType)) {
        return Result.fail('Government entity type must be 1 (União), 2 (Estado), or 3 (Município)');
      }
      if (props.governmentPurchase.reductionRate < 0 || props.governmentPurchase.reductionRate > 100) {
        return Result.fail('Government purchase reduction rate must be between 0% and 100%');
      }
    }

    return Result.ok(new IBSCBSGroup(props));
  }

  /**
   * Verifica igualdade
   */
  equals(other: IBSCBSGroup): boolean {
    return (
      this._props.cst.equals(other.cst) &&
      this._props.classificationCode.equals(other.classificationCode) &&
      this._props.baseValue.equals(other.baseValue) &&
      this._props.ibsUfRate.equals(other.ibsUfRate) &&
      this._props.ibsMunRate.equals(other.ibsMunRate) &&
      this._props.cbsRate.equals(other.cbsRate)
    );
  }
}

