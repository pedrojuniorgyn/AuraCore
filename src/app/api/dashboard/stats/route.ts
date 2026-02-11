import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * API de Estatísticas do Dashboard Principal
 * 
 * Retorna KPIs agregados para o dashboard principal:
 * - Receita total do mês
 * - Quantidade de parceiros ativos
 * - Quantidade de produtos cadastrados
 * - Quantidade de NFes processadas
 * - Contas em aberto
 * - Novos parceiros do mês
 * 
 * @endpoint GET /api/dashboard/stats
 */

interface DashboardStats {
  receita: number;
  parceiros: number;
  produtos: number;
  nfes: number;
  contasAberto: number;
  novosParceiros: number;
}

export const GET = withDI(async () => {
  try {
    const session = await auth();
    const organizationId = (session?.user as { organizationId?: number })?.organizationId ?? 1;
    const branchId = (session?.user as { branchId?: number })?.branchId ?? 1;

    // Query para buscar estatísticas agregadas
    // NOTA: Cada subquery filtra por organization_id E branch_id (multi-tenancy obrigatório)
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM business_partners WHERE organization_id = @orgId AND branch_id = @branchId AND status = 'ACTIVE' AND deleted_at IS NULL) as parceiros,
        (SELECT COUNT(*) FROM products WHERE organization_id = @orgId AND branch_id = @branchId AND deleted_at IS NULL) as produtos,
        (SELECT COUNT(*) FROM fiscal_documents WHERE organization_id = @orgId AND branch_id = @branchId AND document_type IN ('NFE', 'NFCE') AND status NOT IN ('CANCELLED', 'REJECTED') AND created_at >= DATEADD(day, -30, GETDATE())) as nfes,
        (SELECT COUNT(*) FROM accounts_payable WHERE organization_id = @orgId AND branch_id = @branchId AND status = 'OPEN' AND deleted_at IS NULL) as contas_aberto,
        (SELECT COUNT(*) FROM business_partners WHERE organization_id = @orgId AND branch_id = @branchId AND status = 'ACTIVE' AND deleted_at IS NULL AND created_at >= DATEADD(month, -1, GETDATE())) as novos_parceiros
    `;

    // Query para receita do mês (fiscal_documents usa total_value e status, não tem deleted_at)
    const receitaQuery = `
      SELECT ISNULL(SUM(total_value), 0) as receita
      FROM fiscal_documents 
      WHERE organization_id = @orgId 
        AND branch_id = @branchId
        AND document_type IN ('NFE', 'NFCE') 
        AND status = 'AUTHORIZED'
        AND created_at >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
    `;

    const stats: DashboardStats = {
      receita: 0,
      parceiros: 0,
      produtos: 0,
      nfes: 0,
      contasAberto: 0,
      novosParceiros: 0
    };

    try {
      // Substituir parâmetros de multi-tenancy (organizationId + branchId)
      const replaceParams = (query: string) => 
        query.replace(/@orgId/g, String(organizationId)).replace(/@branchId/g, String(branchId));

      // Buscar estatísticas agregadas
      const statsResult = await pool.query(replaceParams(statsQuery));
      const statsData = (statsResult.recordset || statsResult) as Array<Record<string, number>>;
      
      if (statsData[0]) {
        stats.parceiros = statsData[0].parceiros ?? 0;
        stats.produtos = statsData[0].produtos ?? 0;
        stats.nfes = statsData[0].nfes ?? 0;
        stats.contasAberto = statsData[0].contas_aberto ?? 0;
        stats.novosParceiros = statsData[0].novos_parceiros ?? 0;
      }

      // Buscar receita do mês
      const receitaResult = await pool.query(replaceParams(receitaQuery));
      const receitaData = (receitaResult.recordset || receitaResult) as Array<Record<string, number>>;
      
      if (receitaData[0]) {
        stats.receita = receitaData[0].receita ?? 0;
      }
    } catch (dbError) {
      // Se tabelas não existirem, retornar zeros
      logger.error("Erro ao buscar estatísticas:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
});
