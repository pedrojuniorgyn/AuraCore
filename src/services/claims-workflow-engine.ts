/**
 * Claims Workflow Engine
 * Motor de workflow para gestão de sinistros
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade será migrada para o módulo DDD correspondente.
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface ClaimData {
  claimType: 'ACCIDENT' | 'THEFT' | 'DAMAGE' | 'TOTAL_LOSS';
  vehicleId: number;
  estimatedDamage: number;
  description: string;
  occurredAt: Date;
  location?: string;
}

export interface ClaimDecision {
  decision: 'FRANCHISE' | 'INSURANCE' | 'THIRD_PARTY';
  amount: number;
  notes?: string;
}

export class ClaimsWorkflowEngine {
  
  /**
   * Abrir novo sinistro
   */
  static async openClaim(organizationId: number, claim: ClaimData): Promise<string> {
    
    const claimNumber = `SIN-${Date.now().toString().slice(-6)}`;
    
    // Buscar seguro do veículo
    interface InsuranceData {
      insurance_coverage?: number;
      franchise_amount?: number;
    }
    
    const insuranceResult = await db.execute(sql`
      SELECT insurance_coverage, franchise_amount
      FROM vehicles
      WHERE id = ${claim.vehicleId}
    `) as unknown as InsuranceData[];
    
    const insurance = insuranceResult[0] || {};
    const insuranceCoverage = insurance.insurance_coverage || 0;
    const franchiseAmount = insurance.franchise_amount || 5000;
    
    await db.execute(sql`
      INSERT INTO claims_management 
        (organization_id, claim_number, claim_date, claim_type, vehicle_id,
         estimated_damage, insurance_coverage, franchise_amount, claim_status, notes)
      VALUES 
        (${organizationId}, ${claimNumber}, ${claim.occurredAt}, ${claim.claimType}, 
         ${claim.vehicleId}, ${claim.estimatedDamage}, ${insuranceCoverage}, 
         ${franchiseAmount}, 'OPENED', ${claim.description})
    `);
    
    return claimNumber;
  }
  
  /**
   * Decidir ação do sinistro (Franquia vs Seguro vs Terceiro)
   */
  static async decideAction(claimId: number, decision: ClaimDecision): Promise<void> {
    
    const newStatus = decision.decision === 'FRANCHISE' 
      ? 'FRANCHISE_PAID' 
      : decision.decision === 'INSURANCE' 
        ? 'INSURANCE_CLAIMED'
        : 'THIRD_PARTY_CLAIMED';
    
    await db.execute(sql`
      UPDATE claims_management 
      SET claim_status = ${newStatus},
          notes = CONCAT(ISNULL(notes, ''), ' | Decisão: ', ${decision.decision}, ' - R$ ', ${decision.amount}, ' - ', ${decision.notes || ''})
      WHERE id = ${claimId}
    `);
    
    // Gerar lançamento contábil conforme decisão
    await this.generateAccountingEntry(claimId, decision);
  }
  
  /**
   * Gerar lançamento contábil do sinistro
   */
  private static async generateAccountingEntry(claimId: number, decision: ClaimDecision): Promise<void> {
    
    interface ClaimInfo {
      organization_id: number;
      claim_number: string;
      vehicle_id: number;
    }
    
    const claimResult = await db.execute(sql`
      SELECT organization_id, claim_number, vehicle_id
      FROM claims_management
      WHERE id = ${claimId}
    `) as unknown as ClaimInfo[];
    
    const claim = claimResult[0];
    if (!claim) return;
    
    let debitAccount = '';
    let creditAccount = '';
    
    switch (decision.decision) {
      case 'FRANCHISE':
        // D: Despesa com Franquia de Seguro (4.3.6.03.002)
        // C: Caixa/Banco
        debitAccount = '4.3.6.03.002';
        creditAccount = '1.1.1.01.001';
        break;
      case 'INSURANCE':
        // D: Crédito com Seguradora (1.1.5.02.001)
        // C: Receita de Indenização
        debitAccount = '1.1.5.02.001';
        creditAccount = '3.3.1.01.001';
        break;
      case 'THIRD_PARTY':
        // D: Crédito com Terceiros (1.1.5.02.002)
        // C: Receita de Ressarcimento
        debitAccount = '1.1.5.02.002';
        creditAccount = '3.3.1.01.002';
        break;
    }
    
    // Criar lançamento contábil
    await db.execute(sql`
      INSERT INTO journal_entries 
        (organization_id, description, entry_date, status)
      VALUES 
        (${claim.organization_id}, 
         CONCAT('Sinistro ', ${claim.claim_number}, ' - ', ${decision.decision}),
         GETDATE(), 'DRAFT')
    `);
  }
  
  /**
   * Registrar pagamento de franquia
   */
  static async registerFranchisePayment(claimId: number, paymentAmount: number): Promise<void> {
    
    await db.execute(sql`
      UPDATE claims_management 
      SET franchise_paid = ${paymentAmount},
          franchise_paid_at = GETDATE(),
          claim_status = 'FRANCHISE_PAID'
      WHERE id = ${claimId}
    `);
  }
  
  /**
   * Registrar indenização da seguradora
   */
  static async registerInsuranceIndemnity(claimId: number, indemnityAmount: number): Promise<void> {
    
    await db.execute(sql`
      UPDATE claims_management 
      SET insurance_indemnity = ${indemnityAmount},
          insurance_paid_at = GETDATE(),
          claim_status = 'INSURANCE_PAID'
      WHERE id = ${claimId}
    `);
  }
  
  /**
   * Fechar sinistro
   */
  static async closeClaim(claimId: number, finalNotes?: string): Promise<void> {
    
    await db.execute(sql`
      UPDATE claims_management 
      SET claim_status = 'CLOSED',
          closed_at = GETDATE(),
          final_notes = ${finalNotes || ''}
      WHERE id = ${claimId}
    `);
  }
  
  /**
   * Relatório de sinistralidade
   */
  static async getSinistralityReport(organizationId: number, year: number): Promise<Record<string, unknown>> {
    
    const report = await db.execute(sql`
      SELECT 
        COUNT(*) as total_claims,
        SUM(estimated_damage) as total_damage,
        SUM(franchise_paid) as total_franchise,
        SUM(insurance_indemnity) as total_indemnity,
        AVG(DATEDIFF(day, claim_date, closed_at)) as avg_resolution_days
      FROM claims_management
      WHERE organization_id = ${organizationId}
        AND YEAR(claim_date) = ${year}
    `);
    
    const reportData = (report.recordset || report) as Array<Record<string, unknown>>;
    return reportData[0] || {};
  }
}

