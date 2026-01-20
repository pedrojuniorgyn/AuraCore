/**
 * CIAP Appropriation Engine
 * Motor de apropriação de créditos ICMS sobre Ativo Permanente (48 meses)
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Interfaces para tipagem de resultados SQL
interface CIAPInsertResult {
  id: number;
}

interface RevenueQueryResult {
  total_revenue: string | number;
  taxable_revenue: string | number;
}

interface CIAPAssetQueryResult {
  id: number;
  monthly_installment: string | number;
  installments_appropriated: number;
  total_installments: number;
}

interface CIAPAppropriationQueryResult {
  asset_id: number;
  reference_month: Date;
  appropriated_amount: number;
  appropriation_factor: number;
}

export interface CIAPAsset {
  assetId: number;
  purchaseAmount: number;
  icmsRate: number;
  purchaseDate: Date;
}

export interface AppropriationResult {
  totalRevenue: number;
  taxableRevenue: number;
  exemptRevenue: number;
  appropriationFactor: number;
  totalAppropriated: number;
  assetsProcessed: number;
}

export class CIAPEngine {
  
  /**
   * Registrar novo ativo no CIAP
   */
  static async registerAsset(organizationId: number, asset: CIAPAsset): Promise<number> {
    const icmsTotal = asset.purchaseAmount * (asset.icmsRate / 100);
    const monthlyInstallment = icmsTotal / 48;

    const result = await db.execute(sql`
      INSERT INTO ciap_control 
        (organization_id, asset_id, purchase_date, purchase_amount, icms_rate, 
         icms_total_credit, total_installments, monthly_installment, 
         appropriation_start_date, balance_to_appropriate, status)
      OUTPUT INSERTED.id
      VALUES 
        (${organizationId}, ${asset.assetId}, ${asset.purchaseDate}, ${asset.purchaseAmount}, 
         ${asset.icmsRate}, ${icmsTotal}, 48, ${monthlyInstallment},
         ${asset.purchaseDate}, ${icmsTotal}, 'ACTIVE')
    `);

    const ciapData = (result.recordset || result) as unknown as CIAPInsertResult[];
    const ciapId = ciapData[0]?.id || 0;
    return ciapId;
  }

  /**
   * Calcular fator de apropriação do mês
   */
  static async calculateAppropriationFactor(
    organizationId: number, 
    referenceMonth: Date
  ): Promise<{factor: number, totalRevenue: number, taxableRevenue: number}> {
    
    // Buscar receitas do mês
    const revenuesResult = await db.execute(sql`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN tax_exempt = 1 THEN 0 ELSE total_amount END) as taxable_revenue
      FROM fiscal_documents
      WHERE organization_id = ${organizationId}
        AND MONTH(issue_date) = MONTH(${referenceMonth})
        AND YEAR(issue_date) = YEAR(${referenceMonth})
        AND document_status = 'AUTHORIZED'
    `);

    const revenueData = (revenuesResult.recordset || revenuesResult) as unknown as RevenueQueryResult[];
    const revenues = revenueData[0] || { total_revenue: 0, taxable_revenue: 0 };
    const totalRevenue = Number(revenues.total_revenue) || 0;
    const taxableRevenue = Number(revenues.taxable_revenue) || 0;
    
    const factor = totalRevenue > 0 ? taxableRevenue / totalRevenue : 0;

    return { factor, totalRevenue, taxableRevenue };
  }

  /**
   * Apropriar crédito CIAP do mês
   */
  static async appropriateMonth(
    organizationId: number, 
    referenceMonth: Date
  ): Promise<AppropriationResult> {
    
    // 1. Calcular fator
    const { factor, totalRevenue, taxableRevenue } = await this.calculateAppropriationFactor(
      organizationId, 
      referenceMonth
    );

    const exemptRevenue = totalRevenue - taxableRevenue;

    // 2. Buscar ativos ativos
    const assetsResult = await db.execute(sql`
      SELECT id, monthly_installment, installments_appropriated, total_installments
      FROM ciap_control
      WHERE organization_id = ${organizationId}
        AND status = 'ACTIVE'
        AND installments_appropriated < total_installments
    `);

    const assets = (assetsResult.recordset || assetsResult) as unknown as CIAPAssetQueryResult[];
    let totalAppropriated = 0;

    // 3. Apropriar cada ativo
    for (const asset of assets) {
      const appropriatedAmount = Number(asset.monthly_installment) * factor;
      totalAppropriated += appropriatedAmount;

      // Registrar apropriação
      await db.execute(sql`
        INSERT INTO ciap_monthly_appropriation 
          (ciap_control_id, reference_month, total_revenue, taxable_revenue, exempt_revenue,
           appropriation_factor, installment_base, appropriated_amount, accounting_posted)
        VALUES 
          (${asset.id}, ${referenceMonth}, ${totalRevenue}, ${taxableRevenue}, ${exemptRevenue},
           ${factor}, ${asset.monthly_installment}, ${appropriatedAmount}, 0)
      `);

      // Atualizar controle
      const newInstallments = asset.installments_appropriated + 1;
      const isCompleted = newInstallments >= asset.total_installments;

      await db.execute(sql`
        UPDATE ciap_control 
        SET installments_appropriated = ${newInstallments},
            total_appropriated = total_appropriated + ${appropriatedAmount},
            balance_to_appropriate = balance_to_appropriate - ${appropriatedAmount},
            status = ${isCompleted ? 'COMPLETED' : 'ACTIVE'},
            completed_at = ${isCompleted ? sql`GETDATE()` : sql`NULL`}
        WHERE id = ${asset.id}
      `);
    }

    return {
      totalRevenue,
      taxableRevenue,
      exemptRevenue,
      appropriationFactor: factor,
      totalAppropriated,
      assetsProcessed: assets.length
    };
  }

  /**
   * Gerar arquivo SPED Fiscal Bloco G (CIAP)
   */
  static async generateSpedBlockG(
    organizationId: number, 
    period: string
  ): Promise<string[]> {
    
    const appropriations = await db.execute(sql`
      SELECT 
        cc.asset_id,
        ca.reference_month,
        ca.appropriated_amount,
        ca.appropriation_factor
      FROM ciap_monthly_appropriation ca
      JOIN ciap_control cc ON ca.ciap_control_id = cc.id
      WHERE cc.organization_id = ${organizationId}
        AND FORMAT(ca.reference_month, 'MM/yyyy') = ${period}
    `);

    const lines: string[] = [];
    lines.push('|G001|'); // Bloco G

    const appropList = (appropriations.recordset || appropriations) as unknown as CIAPAppropriationQueryResult[];
    for (const approp of appropList) {
      lines.push(`|G125|${approp.asset_id}|${Number(approp.appropriated_amount).toFixed(2)}|`);
    }

    lines.push('|G990|'); // Fim Bloco G

    return lines;
  }
}













