import { Result, Money } from '@/shared/domain';
import { IBSCBSGroup } from '../../domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '../../domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '../../domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '../../domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '../../domain/tax/value-objects/AliquotaCBS';
import { BaseCalculo } from '../../domain/tax/value-objects/BaseCalculo';
import { TaxAmount } from '../../domain/tax/value-objects/TaxAmount';

/**
 * Persistence model para IBSCBSGroup
 */
export interface IBSCBSGroupPersistence {
  id: string;
  fiscalDocumentId: string;
  fiscalDocumentItemId: string | null;
  
  cst: string;
  cClassTrib: string;
  
  baseValue: string;
  baseValueCurrency: string;
  
  ibsUfRate: string;
  ibsUfValue: string;
  ibsUfValueCurrency: string;
  
  ibsMunRate: string;
  ibsMunValue: string;
  ibsMunValueCurrency: string;
  
  cbsRate: string;
  cbsValue: string;
  cbsValueCurrency: string;
  
  deferralRate: string | null;
  deferralIbsValue: string | null;
  deferralIbsValueCurrency: string | null;
  deferralCbsValue: string | null;
  deferralCbsValueCurrency: string | null;
  
  refundIbsValue: string | null;
  refundIbsValueCurrency: string | null;
  refundCbsValue: string | null;
  refundCbsValueCurrency: string | null;
  
  reductionIbsRate: string | null;
  reductionCbsRate: string | null;
  
  presumedCreditCode: string | null;
  presumedCreditRate: string | null;
  presumedCreditIbsValue: string | null;
  presumedCreditIbsValueCurrency: string | null;
  presumedCreditCbsValue: string | null;
  presumedCreditCbsValueCurrency: string | null;
  
  governmentPurchaseEntityType: number | null;
  governmentPurchaseReductionRate: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapper: IBSCBSGroup Domain ↔ Persistence
 */
export class FiscalDocumentIbsCbsMapper {
  /**
   * Domain → Persistence
   */
  static toPersistence(
    group: IBSCBSGroup,
    fiscalDocumentId: string,
    fiscalDocumentItemId?: string
  ): Omit<IBSCBSGroupPersistence, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      fiscalDocumentId,
      fiscalDocumentItemId: fiscalDocumentItemId ?? null,
      
      cst: group.cst.value,
      cClassTrib: group.classificationCode.value,
      
      baseValue: String(group.baseValue.amount),
      baseValueCurrency: group.baseValue.currency,
      
      ibsUfRate: String(group.ibsUfRate.percentual),
      ibsUfValue: String(group.ibsUfValue.amount),
      ibsUfValueCurrency: group.ibsUfValue.currency,
      
      ibsMunRate: String(group.ibsMunRate.percentual),
      ibsMunValue: String(group.ibsMunValue.amount),
      ibsMunValueCurrency: group.ibsMunValue.currency,
      
      cbsRate: String(group.cbsRate.percentual),
      cbsValue: String(group.cbsValue.amount),
      cbsValueCurrency: group.cbsValue.currency,
      
      deferralRate: group.deferral ? String(group.deferral.deferralRate) : null,
      deferralIbsValue: group.deferral ? String(group.deferral.ibsDeferredValue.amount) : null,
      deferralIbsValueCurrency: group.deferral?.ibsDeferredValue.currency ?? null,
      deferralCbsValue: group.deferral ? String(group.deferral.cbsDeferredValue.amount) : null,
      deferralCbsValueCurrency: group.deferral?.cbsDeferredValue.currency ?? null,
      
      refundIbsValue: group.refund ? String(group.refund.ibsRefundValue.amount) : null,
      refundIbsValueCurrency: group.refund?.ibsRefundValue.currency ?? null,
      refundCbsValue: group.refund ? String(group.refund.cbsRefundValue.amount) : null,
      refundCbsValueCurrency: group.refund?.cbsRefundValue.currency ?? null,
      
      reductionIbsRate: group.reduction ? String(group.reduction.ibsReductionRate) : null,
      reductionCbsRate: group.reduction ? String(group.reduction.cbsReductionRate) : null,
      
      presumedCreditCode: group.presumedCredit?.creditCode ?? null,
      presumedCreditRate: group.presumedCredit ? String(group.presumedCredit.creditRate) : null,
      presumedCreditIbsValue: group.presumedCredit ? String(group.presumedCredit.ibsCreditValue.amount) : null,
      presumedCreditIbsValueCurrency: group.presumedCredit?.ibsCreditValue.currency ?? null,
      presumedCreditCbsValue: group.presumedCredit ? String(group.presumedCredit.cbsCreditValue.amount) : null,
      presumedCreditCbsValueCurrency: group.presumedCredit?.cbsCreditValue.currency ?? null,
      
      governmentPurchaseEntityType: group.governmentPurchase?.entityType ?? null,
      governmentPurchaseReductionRate: group.governmentPurchase ? String(group.governmentPurchase.reductionRate) : null,
    };
  }

  /**
   * Persistence → Domain
   */
  static toDomain(persistence: IBSCBSGroupPersistence): Result<IBSCBSGroup, string> {
    // Parse CST
    const cstResult = CSTIbsCbs.create(persistence.cst);
    if (Result.isFail(cstResult)) {
      return Result.fail(`Invalid CST: ${cstResult.error}`);
    }

    // Parse Classificacao Tributaria
    const cClassTribResult = ClassificacaoTributaria.create(persistence.cClassTrib);
    if (Result.isFail(cClassTribResult)) {
      return Result.fail(`Invalid cClassTrib: ${cClassTribResult.error}`);
    }

    // Parse base value
    const baseValueResult = Money.create(
      parseFloat(persistence.baseValue),
      persistence.baseValueCurrency
    );
    if (Result.isFail(baseValueResult)) {
      return Result.fail(`Invalid base value: ${baseValueResult.error}`);
    }


    // Parse IBS UF
    const ibsUfRateResult = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsUfRate));
    if (Result.isFail(ibsUfRateResult)) {
      return Result.fail(`Invalid IBS UF rate: ${ibsUfRateResult.error}`);
    }

    const ibsUfMoneyResult = Money.create(
      parseFloat(persistence.ibsUfValue),
      persistence.ibsUfValueCurrency
    );
    if (Result.isFail(ibsUfMoneyResult)) {
      return Result.fail(`Invalid IBS UF value: ${ibsUfMoneyResult.error}`);
    }

    const ibsUfValueResult = ibsUfMoneyResult;
    if (Result.isFail(ibsUfValueResult)) {
      return Result.fail(`Invalid IBS UF tax amount: ${ibsUfValueResult.error}`);
    }

    // Parse IBS Mun
    const ibsMunRateResult = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsMunRate));
    if (Result.isFail(ibsMunRateResult)) {
      return Result.fail(`Invalid IBS Mun rate: ${ibsMunRateResult.error}`);
    }

    const ibsMunMoneyResult = Money.create(
      parseFloat(persistence.ibsMunValue),
      persistence.ibsMunValueCurrency
    );
    if (Result.isFail(ibsMunMoneyResult)) {
      return Result.fail(`Invalid IBS Mun value: ${ibsMunMoneyResult.error}`);
    }

    const ibsMunValueResult = ibsMunMoneyResult;
    if (Result.isFail(ibsMunValueResult)) {
      return Result.fail(`Invalid IBS Mun tax amount: ${ibsMunValueResult.error}`);
    }

    // Parse CBS
    const cbsRateResult = AliquotaCBS.fromPercentage(parseFloat(persistence.cbsRate));
    if (Result.isFail(cbsRateResult)) {
      return Result.fail(`Invalid CBS rate: ${cbsRateResult.error}`);
    }

    const cbsMoneyResult = Money.create(
      parseFloat(persistence.cbsValue),
      persistence.cbsValueCurrency
    );
    if (Result.isFail(cbsMoneyResult)) {
      return Result.fail(`Invalid CBS value: ${cbsMoneyResult.error}`);
    }

    const cbsValueResult = cbsMoneyResult;
    if (Result.isFail(cbsValueResult)) {
      return Result.fail(`Invalid CBS tax amount: ${cbsValueResult.error}`);
    }

    // Parse optional nested fields
    let deferral;
    if (
      persistence.deferralRate && 
      persistence.deferralIbsValue && persistence.deferralIbsValueCurrency &&
      persistence.deferralCbsValue && persistence.deferralCbsValueCurrency
    ) {
      const ibsDeferredResult = Money.create(
        parseFloat(persistence.deferralIbsValue),
        persistence.deferralIbsValueCurrency
      );
      const cbsDeferredResult = Money.create(
        parseFloat(persistence.deferralCbsValue),
        persistence.deferralCbsValueCurrency
      );
      
      if (Result.isFail(ibsDeferredResult)) {
        return Result.fail(`Invalid IBS deferred value: ${ibsDeferredResult.error}`);
      }
      if (Result.isFail(cbsDeferredResult)) {
        return Result.fail(`Invalid CBS deferred value: ${cbsDeferredResult.error}`);
      }
      
      deferral = {
        deferralRate: parseFloat(persistence.deferralRate),
        ibsDeferredValue: ibsDeferredResult.value,
        cbsDeferredValue: cbsDeferredResult.value,
      };
    }

    let refund;
    if (
      persistence.refundIbsValue && persistence.refundIbsValueCurrency &&
      persistence.refundCbsValue && persistence.refundCbsValueCurrency
    ) {
      const ibsRefundResult = Money.create(
        parseFloat(persistence.refundIbsValue),
        persistence.refundIbsValueCurrency
      );
      const cbsRefundResult = Money.create(
        parseFloat(persistence.refundCbsValue),
        persistence.refundCbsValueCurrency
      );
      
      if (Result.isFail(ibsRefundResult)) {
        return Result.fail(`Invalid IBS refund value: ${ibsRefundResult.error}`);
      }
      if (Result.isFail(cbsRefundResult)) {
        return Result.fail(`Invalid CBS refund value: ${cbsRefundResult.error}`);
      }
      
      refund = {
        ibsRefundValue: ibsRefundResult.value,
        cbsRefundValue: cbsRefundResult.value,
      };
    }

    let reduction;
    if (persistence.reductionIbsRate && persistence.reductionCbsRate) {
      reduction = {
        ibsReductionRate: parseFloat(persistence.reductionIbsRate),
        cbsReductionRate: parseFloat(persistence.reductionCbsRate),
      };
    }

    let presumedCredit;
    if (
      persistence.presumedCreditCode && 
      persistence.presumedCreditRate &&
      persistence.presumedCreditIbsValue && persistence.presumedCreditIbsValueCurrency &&
      persistence.presumedCreditCbsValue && persistence.presumedCreditCbsValueCurrency
    ) {
      const ibsCreditResult = Money.create(
        parseFloat(persistence.presumedCreditIbsValue),
        persistence.presumedCreditIbsValueCurrency
      );
      const cbsCreditResult = Money.create(
        parseFloat(persistence.presumedCreditCbsValue),
        persistence.presumedCreditCbsValueCurrency
      );
      
      if (Result.isFail(ibsCreditResult)) {
        return Result.fail(`Invalid presumed credit IBS value: ${ibsCreditResult.error}`);
      }
      if (Result.isFail(cbsCreditResult)) {
        return Result.fail(`Invalid presumed credit CBS value: ${cbsCreditResult.error}`);
      }
      
      presumedCredit = {
        creditCode: persistence.presumedCreditCode,
        creditRate: parseFloat(persistence.presumedCreditRate),
        ibsCreditValue: ibsCreditResult.value,
        cbsCreditValue: cbsCreditResult.value,
      };
    }

    let governmentPurchase;
    if (persistence.governmentPurchaseEntityType !== null && persistence.governmentPurchaseReductionRate !== null) {
      governmentPurchase = {
        entityType: persistence.governmentPurchaseEntityType as 1 | 2 | 3,
        reductionRate: parseFloat(persistence.governmentPurchaseReductionRate),
      };
    }

    // Create IBSCBSGroup
    return IBSCBSGroup.create({
      cst: cstResult.value,
      classificationCode: cClassTribResult.value,
      baseValue: baseValueResult.value,
      ibsUfRate: ibsUfRateResult.value,
      ibsUfValue: ibsUfMoneyResult.value,
      ibsMunRate: ibsMunRateResult.value,
      ibsMunValue: ibsMunMoneyResult.value,
      cbsRate: cbsRateResult.value,
      cbsValue: cbsMoneyResult.value,
      deferral,
      refund,
      reduction,
      presumedCredit,
      governmentPurchase,
    });
  }
}

