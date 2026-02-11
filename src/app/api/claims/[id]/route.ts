import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const PUT = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const claimId = parseInt(resolvedParams.id, 10);
    
    if (isNaN(claimId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }
    
    // Validação multi-tenancy obrigatória (REPO-005)
    const { organizationId, branchId } = await getTenantContext();
    
    const body = await request.json();
    const { estimatedDamage, notes } = body;

    // IMPORTANTE: Filtrar por organizationId E branchId para garantir isolamento de tenant (REPO-005)
    await db.execute(sql`
      UPDATE claims_management 
      SET estimated_damage = ${estimatedDamage},
          notes = ${notes || ''}
      WHERE id = ${claimId}
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro atualizado"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const claimId = parseInt(resolvedParams.id, 10);
    
    if (isNaN(claimId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }
    
    // Validação multi-tenancy obrigatória (REPO-005)
    const { organizationId, branchId } = await getTenantContext();
    
    // IMPORTANTE: Filtrar por organizationId E branchId para garantir isolamento de tenant (REPO-005)
    await db.execute(sql`
      DELETE FROM claims_management 
      WHERE id = ${claimId}
        AND organization_id = ${organizationId}
        AND branch_id = ${branchId}
        AND claim_status = 'OPENED'
    `);

    return NextResponse.json({
      success: true,
      message: "Sinistro excluído"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});

/**
 * GET /api/claims/[id]
 * Busca detalhes completos de um sinistro
 */
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const claimId = parseInt(resolvedParams.id, 10);
    
    if (isNaN(claimId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }
    
    // Validação multi-tenancy obrigatória (REPO-005)
    const { organizationId, branchId } = await getTenantContext();
    
    // Query com join apenas para veículo (única relação existente)
    // IMPORTANTE: Filtrar por organizationId E branchId para garantir isolamento de tenant (REPO-005)
    const result = await db.execute(sql`
      SELECT 
        cm.*,
        v.plate as vehicle_plate,
        v.model as vehicle_model,
        v.brand as vehicle_brand,
        v.type as vehicle_type
      FROM claims_management cm
      LEFT JOIN vehicles v ON v.id = cm.vehicle_id
      WHERE cm.id = ${claimId}
        AND cm.organization_id = ${organizationId}
        AND cm.branch_id = ${branchId}
    `);

    // PC-006: Usar padrão de cast explícito para array antes de acessar índice
    const resultData = (result.recordset || result) as Array<Record<string, unknown>>;
    const claim = resultData[0];

    if (!claim) {
      return NextResponse.json(
        { success: false, error: "Sinistro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: claim,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao buscar sinistro:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
});






























