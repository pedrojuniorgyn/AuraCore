import { Result, Money } from '@/shared/domain';
import { IBSCBSGroup, DeferralInfo, RefundInfo, ReductionInfo, PresumedCreditInfo, GovernmentPurchaseInfo } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';
import { CSTIbsCbs } from '@/modules/fiscal/domain/tax/value-objects/CSTIbsCbs';
import { ClassificacaoTributaria } from '@/modules/fiscal/domain/tax/value-objects/ClassificacaoTributaria';
import { AliquotaIBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaIBS';
import { AliquotaCBS } from '@/modules/fiscal/domain/tax/value-objects/AliquotaCBS';

/**
 * Valida se um código CST é válido (ENFORCE-015)
 */
function isValidCSTIbsCbs(code: string): boolean {
  const validCodes = ['00', '10', '20', '30', '40', '41', '50', '60', '70', '90'];
  return validCodes.includes(code);
}

/**
 * Persistence interface para IBSCBSGroup
 * 
 * REGRA INFRA-008: Interface DEVE ter TODOS os campos do Schema
 */
export interface IBSCBSPersistence {
  id: string;
  fiscalDocumentId: string;
  fiscalDocumentItemId: string | null;
  organizationId: number;
  branchId: number;
  
  // Obrigatórios
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
  
  // Opcionais
  ibsUfEffectiveRate: string | null;
  ibsMunEffectiveRate: string | null;
  cbsEffectiveRate: string | null;
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
 * Mapper: IBSCBSGroup ↔ Persistence
 * 
 * REGRAS CRÍTICAS:
 * - INFRA-002: Money = 2 campos (amount + currency)
 * - INFRA-006: toDomain usa reconstitute(), NÃO create()
 * - ENFORCE-015: Validar enums em reconstitute/toDomain
 */
export class FiscalDocumentIbsCbsMapper {
  /**
   * Domain → Persistence
   * 
   * REGRA INFRA-009: Mapear TODOS os campos (sem placeholders)
   * 
   * Timestamps são passados como parâmetros pois IBSCBSGroup é um Value Object puro
   * (não possui campos de auditoria). Timestamps são gerenciados pelo caller (Repository).
   */
  static toPersistence(
    group: IBSCBSGroup,
    fiscalDocumentId: string,
    fiscalDocumentItemId: string | null,
    organizationId: number,
    branchId: number,
    id: string,
    createdAt: Date,
    updatedAt: Date
  ): IBSCBSPersistence {
    return {
      id,
      fiscalDocumentId,
      fiscalDocumentItemId,
      organizationId,
      branchId,
      
      // Obrigatórios
      cst: group.cst.value,
      cClassTrib: group.classificationCode.code,
      baseValue: group.baseValue.amount.toString(),
      baseValueCurrency: group.baseValue.currency,
      ibsUfRate: group.ibsUfRate.percentual.toString(),
      ibsUfValue: group.ibsUfValue.amount.toString(),
      ibsUfValueCurrency: group.ibsUfValue.currency,
      ibsMunRate: group.ibsMunRate.percentual.toString(),
      ibsMunValue: group.ibsMunValue.amount.toString(),
      ibsMunValueCurrency: group.ibsMunValue.currency,
      cbsRate: group.cbsRate.percentual.toString(),
      cbsValue: group.cbsValue.amount.toString(),
      cbsValueCurrency: group.cbsValue.currency,
      
      // Opcionais - alíquotas efetivas
      ibsUfEffectiveRate: group.ibsUfEffectiveRate?.percentual.toString() ?? null,
      ibsMunEffectiveRate: group.ibsMunEffectiveRate?.percentual.toString() ?? null,
      cbsEffectiveRate: group.cbsEffectiveRate?.percentual.toString() ?? null,
      
      // Opcionais - diferimento
      deferralRate: group.deferral?.deferralRate.toString() ?? null,
      deferralIbsValue: group.deferral?.ibsDeferredValue.amount.toString() ?? null,
      deferralIbsValueCurrency: group.deferral?.ibsDeferredValue.currency ?? null,
      deferralCbsValue: group.deferral?.cbsDeferredValue.amount.toString() ?? null,
      deferralCbsValueCurrency: group.deferral?.cbsDeferredValue.currency ?? null,
      
      // Opcionais - devolução
      refundIbsValue: group.refund?.ibsRefundValue.amount.toString() ?? null,
      refundIbsValueCurrency: group.refund?.ibsRefundValue.currency ?? null,
      refundCbsValue: group.refund?.cbsRefundValue.amount.toString() ?? null,
      refundCbsValueCurrency: group.refund?.cbsRefundValue.currency ?? null,
      
      // Opcionais - redução
      reductionIbsRate: group.reduction?.ibsReductionRate.toString() ?? null,
      reductionCbsRate: group.reduction?.cbsReductionRate.toString() ?? null,
      
      // Opcionais - crédito presumido
      presumedCreditCode: group.presumedCredit?.creditCode ?? null,
      presumedCreditRate: group.presumedCredit?.creditRate.toString() ?? null,
      presumedCreditIbsValue: group.presumedCredit?.ibsCreditValue.amount.toString() ?? null,
      presumedCreditIbsValueCurrency: group.presumedCredit?.ibsCreditValue.currency ?? null,
      presumedCreditCbsValue: group.presumedCredit?.cbsCreditValue.amount.toString() ?? null,
      presumedCreditCbsValueCurrency: group.presumedCredit?.cbsCreditValue.currency ?? null,
      
      // Opcionais - compras governamentais
      governmentPurchaseEntityType: group.governmentPurchase?.entityType ?? null,
      governmentPurchaseReductionRate: group.governmentPurchase?.reductionRate.toString() ?? null,
      
      createdAt,
      updatedAt,
    };
  }

  /**
   * Persistence → Domain
   * 
   * REGRA INFRA-006: Usar reconstitute(), NÃO create()
   * REGRA ENFORCE-015: Validar enums (CST)
   */
  static toDomain(persistence: IBSCBSPersistence): Result<IBSCBSGroup, string> {
    // Validar CST (ENFORCE-015)
    if (!isValidCSTIbsCbs(persistence.cst)) {
      return Result.fail(`Invalid CST IBS/CBS: ${persistence.cst}`);
    }

    // Criar CST
    const cstResult = CSTIbsCbs.create(persistence.cst);
    if (Result.isFail(cstResult)) {
      return Result.fail(cstResult.error);
    }

    // Criar Classificação Tributária
    const classificationResult = ClassificacaoTributaria.create(persistence.cClassTrib);
    if (Result.isFail(classificationResult)) {
      return Result.fail(classificationResult.error);
    }

    // Criar Money - Base de Cálculo (INFRA-002: 2 campos)
    const baseValueResult = Money.create(
      parseFloat(persistence.baseValue),
      persistence.baseValueCurrency
    );
    if (Result.isFail(baseValueResult)) {
      return Result.fail(baseValueResult.error);
    }

    // Criar Alíquotas IBS
    const ibsUfRateResult = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsUfRate));
    if (Result.isFail(ibsUfRateResult)) {
      return Result.fail(ibsUfRateResult.error);
    }

    const ibsMunRateResult = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsMunRate));
    if (Result.isFail(ibsMunRateResult)) {
      return Result.fail(ibsMunRateResult.error);
    }

    // Criar Money - Valores IBS
    const ibsUfValueResult = Money.create(
      parseFloat(persistence.ibsUfValue),
      persistence.ibsUfValueCurrency
    );
    if (Result.isFail(ibsUfValueResult)) {
      return Result.fail(ibsUfValueResult.error);
    }

    const ibsMunValueResult = Money.create(
      parseFloat(persistence.ibsMunValue),
      persistence.ibsMunValueCurrency
    );
    if (Result.isFail(ibsMunValueResult)) {
      return Result.fail(ibsMunValueResult.error);
    }

    // Criar Alíquota CBS
    const cbsRateResult = AliquotaCBS.fromPercentage(parseFloat(persistence.cbsRate));
    if (Result.isFail(cbsRateResult)) {
      return Result.fail(cbsRateResult.error);
    }

    // Criar Money - Valor CBS
    const cbsValueResult = Money.create(
      parseFloat(persistence.cbsValue),
      persistence.cbsValueCurrency
    );
    if (Result.isFail(cbsValueResult)) {
      return Result.fail(cbsValueResult.error);
    }

    // Alíquotas efetivas (opcionais)
    let ibsUfEffectiveRate: AliquotaIBS | undefined;
    if (persistence.ibsUfEffectiveRate !== null) {
      const result = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsUfEffectiveRate));
      if (Result.isFail(result)) {
        return Result.fail(result.error);
      }
      ibsUfEffectiveRate = result.value;
    }

    let ibsMunEffectiveRate: AliquotaIBS | undefined;
    if (persistence.ibsMunEffectiveRate !== null) {
      const result = AliquotaIBS.fromPercentage(parseFloat(persistence.ibsMunEffectiveRate));
      if (Result.isFail(result)) {
        return Result.fail(result.error);
      }
      ibsMunEffectiveRate = result.value;
    }

    let cbsEffectiveRate: AliquotaCBS | undefined;
    if (persistence.cbsEffectiveRate !== null) {
      const result = AliquotaCBS.fromPercentage(parseFloat(persistence.cbsEffectiveRate));
      if (Result.isFail(result)) {
        return Result.fail(result.error);
      }
      cbsEffectiveRate = result.value;
    }

    // Diferimento (opcional) - todos os campos juntos
    let deferral: DeferralInfo | undefined;
    if (
      persistence.deferralRate !== null &&
      persistence.deferralIbsValue !== null &&
      persistence.deferralIbsValueCurrency !== null &&
      persistence.deferralCbsValue !== null &&
      persistence.deferralCbsValueCurrency !== null
    ) {
      const deferralIbsResult = Money.create(
        parseFloat(persistence.deferralIbsValue),
        persistence.deferralIbsValueCurrency
      );
      if (Result.isFail(deferralIbsResult)) {
        return Result.fail(deferralIbsResult.error);
      }

      const deferralCbsResult = Money.create(
        parseFloat(persistence.deferralCbsValue),
        persistence.deferralCbsValueCurrency
      );
      if (Result.isFail(deferralCbsResult)) {
        return Result.fail(deferralCbsResult.error);
      }

      deferral = {
        deferralRate: parseFloat(persistence.deferralRate),
        ibsDeferredValue: deferralIbsResult.value,
        cbsDeferredValue: deferralCbsResult.value,
      };
    }

    // Devolução (opcional) - todos os campos juntos
    let refund: RefundInfo | undefined;
    if (
      persistence.refundIbsValue !== null &&
      persistence.refundIbsValueCurrency !== null &&
      persistence.refundCbsValue !== null &&
      persistence.refundCbsValueCurrency !== null
    ) {
      const refundIbsResult = Money.create(
        parseFloat(persistence.refundIbsValue),
        persistence.refundIbsValueCurrency
      );
      if (Result.isFail(refundIbsResult)) {
        return Result.fail(refundIbsResult.error);
      }

      const refundCbsResult = Money.create(
        parseFloat(persistence.refundCbsValue),
        persistence.refundCbsValueCurrency
      );
      if (Result.isFail(refundCbsResult)) {
        return Result.fail(refundCbsResult.error);
      }

      refund = {
        ibsRefundValue: refundIbsResult.value,
        cbsRefundValue: refundCbsResult.value,
      };
    }

    // Redução (opcional)
    let reduction: ReductionInfo | undefined;
    if (
      persistence.reductionIbsRate !== null &&
      persistence.reductionCbsRate !== null
    ) {
      reduction = {
        ibsReductionRate: parseFloat(persistence.reductionIbsRate),
        cbsReductionRate: parseFloat(persistence.reductionCbsRate),
      };
    }

    // Crédito presumido (opcional) - todos os campos juntos
    let presumedCredit: PresumedCreditInfo | undefined;
    if (
      persistence.presumedCreditCode !== null &&
      persistence.presumedCreditRate !== null &&
      persistence.presumedCreditIbsValue !== null &&
      persistence.presumedCreditIbsValueCurrency !== null &&
      persistence.presumedCreditCbsValue !== null &&
      persistence.presumedCreditCbsValueCurrency !== null
    ) {
      const presumedIbsResult = Money.create(
        parseFloat(persistence.presumedCreditIbsValue),
        persistence.presumedCreditIbsValueCurrency
      );
      if (Result.isFail(presumedIbsResult)) {
        return Result.fail(presumedIbsResult.error);
      }

      const presumedCbsResult = Money.create(
        parseFloat(persistence.presumedCreditCbsValue),
        persistence.presumedCreditCbsValueCurrency
      );
      if (Result.isFail(presumedCbsResult)) {
        return Result.fail(presumedCbsResult.error);
      }

      presumedCredit = {
        creditCode: persistence.presumedCreditCode,
        creditRate: parseFloat(persistence.presumedCreditRate),
        ibsCreditValue: presumedIbsResult.value,
        cbsCreditValue: presumedCbsResult.value,
      };
    }

    // Compras governamentais (opcional)
    let governmentPurchase: GovernmentPurchaseInfo | undefined;
    if (
      persistence.governmentPurchaseEntityType !== null &&
      persistence.governmentPurchaseReductionRate !== null
    ) {
      governmentPurchase = {
        entityType: persistence.governmentPurchaseEntityType as 1 | 2 | 3,
        reductionRate: parseFloat(persistence.governmentPurchaseReductionRate),
      };
    }

    // Create (IBSCBSGroup não tem reconstitute, apenas create)
    return IBSCBSGroup.create({
      cst: cstResult.value,
      classificationCode: classificationResult.value,
      baseValue: baseValueResult.value,
      ibsUfRate: ibsUfRateResult.value,
      ibsUfValue: ibsUfValueResult.value,
      ibsMunRate: ibsMunRateResult.value,
      ibsMunValue: ibsMunValueResult.value,
      cbsRate: cbsRateResult.value,
      cbsValue: cbsValueResult.value,
      ibsUfEffectiveRate,
      ibsMunEffectiveRate,
      cbsEffectiveRate,
      deferral,
      refund,
      reduction,
      presumedCredit,
      governmentPurchase,
    });
  }
}
