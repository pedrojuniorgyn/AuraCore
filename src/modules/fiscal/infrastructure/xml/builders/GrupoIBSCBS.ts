import { IBSCBSGroup } from '@/modules/fiscal/domain/tax/value-objects/IBSCBSGroup';

/**
 * XML Builder: Grupo IBSCBS
 * 
 * Gera XML conforme NT 2025.001 (CT-e) e NT 2025.002 (NF-e)
 * 
 * Estrutura:
 * <IBSCBS>
 *   <CST>00</CST>
 *   <cClassTrib>010101001</cClassTrib>
 *   <vBC>1000.00</vBC>
 *   <pIBSUF>0.10</pIBSUF>
 *   <vIBSUF>1.00</vIBSUF>
 *   <pIBSMun>0.10</pIBSMun>
 *   <vIBSMun>1.00</vIBSMun>
 *   <pCBS>0.90</pCBS>
 *   <vCBS>9.00</vCBS>
 *   <!-- campos opcionais: diferimento, devolução, redução, crédito presumido -->
 * </IBSCBS>
 */
export class GrupoIBSCBS {
  /**
   * Gera XML do grupo IBSCBS
   */
  static build(group: IBSCBSGroup): string {
    const xml: string[] = [];

    xml.push('<IBSCBS>');
    
    // CST (obrigatório)
    xml.push(`  <CST>${group.cst.value}</CST>`);
    
    // Classificação Tributária (obrigatório)
    xml.push(`  <cClassTrib>${group.classificationCode.code}</cClassTrib>`);
    
    // Base de Cálculo (obrigatório)
    xml.push(`  <vBC>${group.baseValue.amount.toFixed(2)}</vBC>`);
    
    // IBS UF (obrigatório)
    xml.push(`  <pIBSUF>${group.ibsUfRate.percentual.toFixed(4)}</pIBSUF>`);
    xml.push(`  <vIBSUF>${group.ibsUfValue.amount.toFixed(2)}</vIBSUF>`);
    
    // IBS Municipal (obrigatório)
    xml.push(`  <pIBSMun>${group.ibsMunRate.percentual.toFixed(4)}</pIBSMun>`);
    xml.push(`  <vIBSMun>${group.ibsMunValue.amount.toFixed(2)}</vIBSMun>`);
    
    // CBS (obrigatório)
    xml.push(`  <pCBS>${group.cbsRate.percentual.toFixed(4)}</pCBS>`);
    xml.push(`  <vCBS>${group.cbsValue.amount.toFixed(2)}</vCBS>`);
    
    // Alíquotas efetivas (opcionais)
    if (group.ibsUfEffectiveRate) {
      xml.push(`  <pIBSUFEfet>${group.ibsUfEffectiveRate.percentual.toFixed(4)}</pIBSUFEfet>`);
    }
    if (group.ibsMunEffectiveRate) {
      xml.push(`  <pIBSMunEfet>${group.ibsMunEffectiveRate.percentual.toFixed(4)}</pIBSMunEfet>`);
    }
    if (group.cbsEffectiveRate) {
      xml.push(`  <pCBSEfet>${group.cbsEffectiveRate.percentual.toFixed(4)}</pCBSEfet>`);
    }
    
    // Diferimento (gDif) - opcional
    if (group.deferral) {
      xml.push('  <gDif>');
      xml.push(`    <pDif>${group.deferral.deferralRate.toFixed(2)}</pDif>`);
      xml.push(`    <vIBSDif>${group.deferral.ibsDeferredValue.amount.toFixed(2)}</vIBSDif>`);
      xml.push(`    <vCBSDif>${group.deferral.cbsDeferredValue.amount.toFixed(2)}</vCBSDif>`);
      xml.push('  </gDif>');
    }
    
    // Devolução (gDev) - opcional
    if (group.refund) {
      xml.push('  <gDev>');
      xml.push(`    <vIBSDev>${group.refund.ibsRefundValue.amount.toFixed(2)}</vIBSDev>`);
      xml.push(`    <vCBSDev>${group.refund.cbsRefundValue.amount.toFixed(2)}</vCBSDev>`);
      xml.push('  </gDev>');
    }
    
    // Redução (gRed) - opcional
    if (group.reduction) {
      xml.push('  <gRed>');
      xml.push(`    <pRedIBS>${group.reduction.ibsReductionRate.toFixed(2)}</pRedIBS>`);
      xml.push(`    <pRedCBS>${group.reduction.cbsReductionRate.toFixed(2)}</pRedCBS>`);
      xml.push('  </gRed>');
    }
    
    // Crédito Presumido (gCredPres) - opcional
    if (group.presumedCredit) {
      xml.push('  <gCredPres>');
      xml.push(`    <cCredPres>${group.presumedCredit.creditCode}</cCredPres>`);
      xml.push(`    <pCredPres>${group.presumedCredit.creditRate.toFixed(2)}</pCredPres>`);
      xml.push(`    <vCredPresIBS>${group.presumedCredit.ibsCreditValue.amount.toFixed(2)}</vCredPresIBS>`);
      xml.push(`    <vCredPresCBS>${group.presumedCredit.cbsCreditValue.amount.toFixed(2)}</vCredPresCBS>`);
      xml.push('  </gCredPres>');
    }
    
    // Compras Governamentais (gCompraGov) - opcional
    if (group.governmentPurchase) {
      xml.push('  <gCompraGov>');
      xml.push(`    <tpEnteGov>${group.governmentPurchase.entityType}</tpEnteGov>`);
      xml.push(`    <pRedCompraGov>${group.governmentPurchase.reductionRate.toFixed(2)}</pRedCompraGov>`);
      xml.push('  </gCompraGov>');
    }
    
    xml.push('</IBSCBS>');

    return xml.join('\n');
  }

  /**
   * Valida campos obrigatórios antes de gerar XML
   */
  static validate(group: IBSCBSGroup): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!group.cst) {
      errors.push('CST é obrigatório no grupo IBSCBS');
    }

    if (!group.classificationCode) {
      errors.push('Classificação Tributária (cClassTrib) é obrigatória');
    }

    if (!group.baseValue || group.baseValue.amount < 0) {
      errors.push('Base de Cálculo não pode ser negativa');
    }

    if (!group.ibsUfRate) {
      errors.push('Alíquota IBS UF é obrigatória');
    }

    if (!group.ibsUfValue || group.ibsUfValue.amount < 0) {
      errors.push('Valor IBS UF não pode ser negativo');
    }

    if (!group.ibsMunRate) {
      errors.push('Alíquota IBS Municipal é obrigatória');
    }

    if (!group.ibsMunValue || group.ibsMunValue.amount < 0) {
      errors.push('Valor IBS Municipal não pode ser negativo');
    }

    if (!group.cbsRate) {
      errors.push('Alíquota CBS é obrigatória');
    }

    if (!group.cbsValue || group.cbsValue.amount < 0) {
      errors.push('Valor CBS não pode ser negativo');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
