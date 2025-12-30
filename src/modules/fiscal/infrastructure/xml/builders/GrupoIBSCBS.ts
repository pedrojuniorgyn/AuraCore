import { IBSCBSGroup } from '../../../domain/tax/value-objects/IBSCBSGroup';

/**
 * XML Builder: Grupo IBS/CBS (NFe/CTe)
 * 
 * Conforme Nota Técnica 2025.001 e 2025.002
 * Tags: <IBSCBS>, <vBC>, <pIBSUF>, etc.
 */
export class GrupoIBSCBS {
  /**
   * Gera XML do grupo IBS/CBS
   */
  static build(group: IBSCBSGroup): string {
    const xml: string[] = [];
    
    xml.push('  <IBSCBS>');
    
    // CST e Classificação Tributária (obrigatórios)
    xml.push(`    <CST>${group.cst.value}</CST>`);
    xml.push(`    <cClassTrib>${group.classificationCode.value}</cClassTrib>`);
    
    // Base de Cálculo (obrigatório)
    xml.push(`    <vBC>${this.formatDecimal(group.baseValue.amount)}</vBC>`);
    
    // IBS UF (obrigatório)
    xml.push(`    <pIBSUF>${this.formatDecimal(group.ibsUfRate.percentual)}</pIBSUF>`);
    xml.push(`    <vIBSUF>${this.formatDecimal(group.ibsUfValue.amount)}</vIBSUF>`);
    
    // IBS Municipal (obrigatório)
    xml.push(`    <pIBSMun>${this.formatDecimal(group.ibsMunRate.percentual)}</pIBSMun>`);
    xml.push(`    <vIBSMun>${this.formatDecimal(group.ibsMunValue.amount)}</vIBSMun>`);
    
    // CBS (obrigatório)
    xml.push(`    <pCBS>${this.formatDecimal(group.cbsRate.percentual)}</pCBS>`);
    xml.push(`    <vCBS>${this.formatDecimal(group.cbsValue.amount)}</vCBS>`);
    
    // Diferimento (opcional)
    if (group.deferral) {
      xml.push(`    <pDiferimento>${this.formatDecimal(group.deferral.deferralRate)}</pDiferimento>`);
      xml.push(`    <vDiferimentoIBS>${this.formatDecimal(group.deferral.ibsDeferredValue.amount)}</vDiferimentoIBS>`);
      xml.push(`    <vDiferimentoCBS>${this.formatDecimal(group.deferral.cbsDeferredValue.amount)}</vDiferimentoCBS>`);
    }
    
    // Devolução/Ressarcimento (opcional)
    if (group.refund) {
      xml.push(`    <vDevolucaoIBS>${this.formatDecimal(group.refund.ibsRefundValue.amount)}</vDevolucaoIBS>`);
      xml.push(`    <vDevolucaoCBS>${this.formatDecimal(group.refund.cbsRefundValue.amount)}</vDevolucaoCBS>`);
    }
    
    // Redução (opcional)
    if (group.reduction) {
      xml.push(`    <pReducaoIBS>${this.formatDecimal(group.reduction.ibsReductionRate)}</pReducaoIBS>`);
      xml.push(`    <pReducaoCBS>${this.formatDecimal(group.reduction.cbsReductionRate)}</pReducaoCBS>`);
    }
    
    // Crédito Presumido (opcional)
    if (group.presumedCredit) {
      xml.push(`    <cCredPresumido>${group.presumedCredit.creditCode}</cCredPresumido>`);
      xml.push(`    <pCredPresumido>${this.formatDecimal(group.presumedCredit.creditRate)}</pCredPresumido>`);
      xml.push(`    <vCredPresumidoIBS>${this.formatDecimal(group.presumedCredit.ibsCreditValue.amount)}</vCredPresumidoIBS>`);
      xml.push(`    <vCredPresumidoCBS>${this.formatDecimal(group.presumedCredit.cbsCreditValue.amount)}</vCredPresumidoCBS>`);
    }
    
    // Compra Governamental (opcional)
    if (group.governmentPurchase) {
      xml.push('    <compraGov>');
      xml.push(`      <tpEnte>${group.governmentPurchase.entityType}</tpEnte>`);
      xml.push(`      <pReducao>${this.formatDecimal(group.governmentPurchase.reductionRate)}</pReducao>`);
      xml.push('    </compraGov>');
    }
    
    xml.push('  </IBSCBS>');
    
    return xml.join('\n');
  }

  /**
   * Formata número para XML (2 casas decimais)
   */
  private static formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Valida campos obrigatórios antes de gerar XML
   */
  static validate(group: IBSCBSGroup): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!group.cst || !group.cst.value) {
      errors.push('CST é obrigatório');
    }
    
    if (!group.classificationCode || !group.classificationCode.value) {
      errors.push('cClassTrib é obrigatório');
    }
    
    if (!group.baseValue || group.baseValue.amount < 0) {
      errors.push('Base de cálculo inválida');
    }
    
    if (!group.ibsUfRate || group.ibsUfRate.percentual < 0) {
      errors.push('Alíquota IBS UF inválida');
    }
    
    if (!group.ibsUfValue || group.ibsUfValue.amount < 0) {
      errors.push('Valor IBS UF inválido');
    }
    
    if (!group.ibsMunRate || group.ibsMunRate.percentual < 0) {
      errors.push('Alíquota IBS Municipal inválida');
    }
    
    if (!group.ibsMunValue || group.ibsMunValue.amount < 0) {
      errors.push('Valor IBS Municipal inválido');
    }
    
    if (!group.cbsRate || group.cbsRate.percentual < 0) {
      errors.push('Alíquota CBS inválida');
    }
    
    if (!group.cbsValue || group.cbsValue.amount < 0) {
      errors.push('Valor CBS inválido');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

