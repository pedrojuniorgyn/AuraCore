/**
 * Fiscal Validation Engine
 * Motor de validação fiscal pré-emissão CT-e usando matriz tributária
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface CTEValidationInput {
  ufOrigin: string;
  ufDestination: string;
  cargoType: string;
  isContributor: boolean;
  baseValue: number;
  customerId?: number;
}

export interface FiscalTaxRule {
  id: number;
  cst_code: string;
  cst_description: string;
  icms_rate: number;
  fcp_rate: number;
  difal_applicable: number;
  difal_origin_percentage: number;
  difal_destination_percentage: number;
  legal_basis: string | null;
  validation_rules: string | null;
}

export interface ValidationResult {
  valid: boolean;
  rule?: FiscalTaxRule;
  calculations?: {
    icmsValue: number;
    fcpValue: number;
    difalValue?: number;
    totalTax: number;
  };
  errors?: string[];
  warnings?: string[];
}

export class FiscalValidationEngine {
  
  /**
   * Validar CT-e antes da emissão
   */
  static async validateCTE(
    organizationId: number, 
    input: CTEValidationInput
  ): Promise<ValidationResult> {
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Buscar regra na matriz tributária
    const ruleResult = await db.execute(sql`
      SELECT TOP 1
        id, cst_code, cst_description, icms_rate, fcp_rate, 
        difal_applicable, difal_origin_percentage, difal_destination_percentage,
        legal_basis, validation_rules
      FROM fiscal_tax_matrix
      WHERE organization_id = ${organizationId}
        AND uf_origin = ${input.ufOrigin}
        AND uf_destination = ${input.ufDestination}
        AND cargo_type = ${input.cargoType}
        AND is_icms_contributor = ${input.isContributor ? 1 : 0}
        AND is_active = 1
    `);
    
    const ruleData = (ruleResult.recordset || ruleResult) as unknown as Array<FiscalTaxRule>;
    const rule = ruleData[0] as FiscalTaxRule | undefined;
    
    // 2. Validar se encontrou regra
    if (!rule) {
      errors.push(`Nenhuma regra fiscal encontrada para ${input.ufOrigin} → ${input.ufDestination}`);
      errors.push(`Tipo de carga: ${input.cargoType}, Contribuinte: ${input.isContributor ? 'Sim' : 'Não'}`);
      
      await this.logValidation(organizationId, input, 'ERROR', 'RULE_NOT_FOUND', null);
      
      return {
        valid: false,
        errors
      };
    }
    
    // 3. Calcular impostos
    const icmsValue = input.baseValue * (rule.icms_rate / 100);
    const fcpValue = input.baseValue * (rule.fcp_rate / 100);
    let difalValue = 0;
    
    if (rule.difal_applicable === 1) {
      const difalOrigin = input.baseValue * (rule.difal_origin_percentage / 100);
      const difalDestination = input.baseValue * (rule.difal_destination_percentage / 100);
      difalValue = difalDestination - difalOrigin;
      
      if (difalValue > 0) {
        warnings.push(`DIFAL aplicável: R$ ${difalValue.toFixed(2)} (Partilha ICMS)`);
      }
    }
    
    const totalTax = icmsValue + fcpValue + (difalValue > 0 ? difalValue : 0);
    
    // 4. Validações específicas
    if (rule.cst_code === '40' && icmsValue > 0) {
      warnings.push('CST 40 (Isento) mas ICMS calculado. Verifique!');
    }
    
    if (rule.cst_code === '00' && icmsValue === 0) {
      errors.push('CST 00 (Tributado Integralmente) mas alíquota 0%. Configuração inválida!');
    }
    
    // 5. Log da validação
    await this.logValidation(
      organizationId, 
      input, 
      errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'SUCCESS',
      'PRE_EMISSION',
      rule.id
    );
    
    return {
      valid: errors.length === 0,
      rule,
      calculations: {
        icmsValue,
        fcpValue,
        difalValue: difalValue > 0 ? difalValue : undefined,
        totalTax
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Log de validação
   */
  private static async logValidation(
    organizationId: number,
    input: CTEValidationInput,
    status: string,
    validationType: string,
    ruleId: number | null
  ): Promise<void> {
    
    await db.execute(sql`
      INSERT INTO fiscal_validation_log 
        (organization_id, document_type, validation_type, validation_status,
         uf_origin, uf_destination, cargo_type, customer_id,
         rule_found, tax_matrix_rule_id)
      VALUES 
        (${organizationId}, 'CTE', ${validationType}, ${status},
         ${input.ufOrigin}, ${input.ufDestination}, ${input.cargoType}, ${input.customerId || null},
         ${ruleId ? 1 : 0}, ${ruleId})
    `);
  }
  
  /**
   * Validar múltiplos CT-es em lote
   */
  static async batchValidate(
    organizationId: number, 
    cteIds: number[]
  ): Promise<Record<string, unknown>> {
    
    const results = {
      total: cteIds.length,
      valid: 0,
      warnings: 0,
      errors: 0,
      details: [] as Array<Record<string, unknown>>
    };
    
    for (const cteId of cteIds) {
      // Buscar dados do CT-e
      const cteResult = await db.execute(sql`
        SELECT 
          cte.uf_origin, cte.uf_destination, cte.cargo_type,
          c.is_icms_contributor, cte.freight_value as base_value
        FROM fiscal_documents cte
        LEFT JOIN customers c ON cte.customer_id = c.id
        WHERE cte.id = ${cteId}
      `);
      
      interface CteQueryResult {
        uf_origin: string;
        uf_destination: string;
        cargo_type: string | null;
        is_icms_contributor: number | null;
        base_value: number;
      }
      
      const cteData = (cteResult.recordset || cteResult) as unknown as Array<CteQueryResult>;
      const cte = cteData[0];
      if (!cte) continue;
      
      const validation = await this.validateCTE(organizationId, {
        ufOrigin: cte.uf_origin,
        ufDestination: cte.uf_destination,
        cargoType: cte.cargo_type || 'GERAL',
        isContributor: cte.is_icms_contributor === 1,
        baseValue: cte.base_value
      });
      
      if (validation.valid && !validation.warnings) {
        results.valid++;
      } else if (validation.warnings) {
        results.warnings++;
      } else {
        results.errors++;
      }
      
      results.details.push({
        cteId,
        validation
      });
    }
    
    return results;
  }
  
  /**
   * Relatório de validações
   */
  static async getValidationReport(
    organizationId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<Array<Record<string, unknown>>> {
    
    const result = await db.execute(sql`
      SELECT 
        validation_status,
        COUNT(*) as count,
        SUM(CASE WHEN rule_found = 1 THEN 1 ELSE 0 END) as with_rule,
        SUM(CASE WHEN rule_found = 0 THEN 1 ELSE 0 END) as without_rule
      FROM fiscal_validation_log
      WHERE organization_id = ${organizationId}
        AND validation_date BETWEEN ${startDate} AND ${endDate}
      GROUP BY validation_status
    `);
    
    return (result.recordset || result) as Array<Record<string, unknown>>;
  }
}

