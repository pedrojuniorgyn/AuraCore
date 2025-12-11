/**
 * Intercompany Allocation Engine
 * Motor de rateio de custos entre filiais sem gerar CT-e
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface AllocationRule {
  ruleName: string;
  sourceBranchId: number;
  sourceAccountId: number;
  allocationMethod: 'EQUAL' | 'REVENUE' | 'HEADCOUNT' | 'PERCENTAGE';
  targets: AllocationTarget[];
}

export interface AllocationTarget {
  targetBranchId: number;
  targetCostCenterId: number;
  percentage?: number;
}

export class IntercompanyAllocationEngine {
  
  /**
   * Executar rateio intercompany
   */
  static async executeAllocation(
    organizationId: number, 
    period: string, 
    totalAmount: number,
    rule: AllocationRule
  ): Promise<any> {
    
    // 1. Calcular percentuais conforme método
    const targets = await this.calculateTargetPercentages(organizationId, rule);
    
    // 2. Criar registro de alocação
    const allocationResult = await db.execute(sql`
      INSERT INTO intercompany_allocations 
        (organization_id, allocation_period, allocation_date, source_branch_id, 
         source_account_id, total_amount, allocation_method, status)
      OUTPUT INSERTED.id
      VALUES 
        (${organizationId}, ${period}, GETDATE(), ${rule.sourceBranchId},
         ${rule.sourceAccountId}, ${totalAmount}, ${rule.allocationMethod}, 'POSTED')
    `);
    
    const allocationId = allocationResult.recordset?.[0]?.id || 0;
    
    // 3. Criar detalhes para cada filial
    let totalAllocated = 0;
    
    for (const target of targets) {
      const allocatedAmount = totalAmount * (target.percentage / 100);
      totalAllocated += allocatedAmount;
      
      await db.execute(sql`
        INSERT INTO intercompany_allocation_details 
          (allocation_id, target_branch_id, target_cost_center_id, 
           allocated_amount, allocation_percentage, accounting_posted)
        VALUES 
          (${allocationId}, ${target.targetBranchId}, ${target.targetCostCenterId},
           ${allocatedAmount}, ${target.percentage}, 0)
      `);
      
      // 4. Gerar lançamentos contábeis
      await this.generateAccountingEntries(
        organizationId, 
        rule.sourceBranchId, 
        target.targetBranchId, 
        allocatedAmount
      );
    }
    
    return {
      allocationId,
      totalAmount,
      totalAllocated,
      targetsProcessed: targets.length
    };
  }
  
  /**
   * Calcular percentuais conforme método
   */
  private static async calculateTargetPercentages(
    organizationId: number, 
    rule: AllocationRule
  ): Promise<AllocationTarget[]> {
    
    switch (rule.allocationMethod) {
      case 'EQUAL':
        // Dividir igualmente
        const equalPercentage = 100 / rule.targets.length;
        return rule.targets.map(t => ({ ...t, percentage: equalPercentage }));
      
      case 'PERCENTAGE':
        // Usar percentuais pré-definidos
        return rule.targets;
      
      case 'REVENUE':
        // Ratear por receita de cada filial
        return await this.calculateRevenueBasedAllocation(organizationId, rule.targets);
      
      case 'HEADCOUNT':
        // Ratear por número de funcionários
        return await this.calculateHeadcountBasedAllocation(organizationId, rule.targets);
      
      default:
        return rule.targets;
    }
  }
  
  /**
   * Rateio baseado em receita
   */
  private static async calculateRevenueBasedAllocation(
    organizationId: number, 
    targets: AllocationTarget[]
  ): Promise<AllocationTarget[]> {
    
    const revenues: Record<number, number> = {};
    let totalRevenue = 0;
    
    for (const target of targets) {
      const revenueResult = await db.execute(sql`
        SELECT SUM(total_amount) as revenue
        FROM fiscal_documents
        WHERE organization_id = ${organizationId}
          AND branch_id = ${target.targetBranchId}
          AND MONTH(issue_date) = MONTH(GETDATE())
          AND YEAR(issue_date) = YEAR(GETDATE())
      `);
      
      const revenue = revenueResult.recordset?.[0]?.revenue || revenueResult[0]?.revenue || 0;
      revenues[target.targetBranchId] = revenue;
      totalRevenue += revenue;
    }
    
    return targets.map(t => ({
      ...t,
      percentage: totalRevenue > 0 ? (revenues[t.targetBranchId] / totalRevenue) * 100 : 0
    }));
  }
  
  /**
   * Rateio baseado em headcount
   */
  private static async calculateHeadcountBasedAllocation(
    organizationId: number, 
    targets: AllocationTarget[]
  ): Promise<AllocationTarget[]> {
    
    const headcounts: Record<number, number> = {};
    let totalHeadcount = 0;
    
    for (const target of targets) {
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as employee_count
        FROM employees
        WHERE organization_id = ${organizationId}
          AND branch_id = ${target.targetBranchId}
          AND status = 'ACTIVE'
      `);
      
      const count = countResult.recordset?.[0]?.employee_count || countResult[0]?.employee_count || 0;
      headcounts[target.targetBranchId] = count;
      totalHeadcount += count;
    }
    
    return targets.map(t => ({
      ...t,
      percentage: totalHeadcount > 0 ? (headcounts[t.targetBranchId] / totalHeadcount) * 100 : 0
    }));
  }
  
  /**
   * Gerar lançamentos contábeis de intercompany
   */
  private static async generateAccountingEntries(
    organizationId: number,
    sourceBranchId: number,
    targetBranchId: number,
    amount: number
  ): Promise<void> {
    
    // Matriz: D Conta Corrente Intercompany (Ativo) / C Despesa Alocada
    // Filial: D Despesa Recebida / C Conta Corrente Intercompany (Passivo)
    
    // Lançamento na Matriz (origem)
    await db.execute(sql`
      INSERT INTO journal_entries 
        (organization_id, branch_id, description, entry_date, status)
      VALUES 
        (${organizationId}, ${sourceBranchId}, 
         CONCAT('Rateio Intercompany - Filial ', ${targetBranchId}),
         GETDATE(), 'POSTED')
    `);
    
    // Lançamento na Filial (destino)
    await db.execute(sql`
      INSERT INTO journal_entries 
        (organization_id, branch_id, description, entry_date, status)
      VALUES 
        (${organizationId}, ${targetBranchId}, 
         CONCAT('Recebimento Rateio - Matriz'),
         GETDATE(), 'POSTED')
    `);
  }
  
  /**
   * Estornar rateio
   */
  static async reverseAllocation(allocationId: number): Promise<void> {
    
    await db.execute(sql`
      UPDATE intercompany_allocations 
      SET status = 'REVERSED', reversed_at = GETDATE()
      WHERE id = ${allocationId}
    `);
    
    // Gerar lançamentos de estorno
    await db.execute(sql`
      UPDATE intercompany_allocation_details 
      SET accounting_posted = 2
      WHERE allocation_id = ${allocationId}
    `);
  }
}







