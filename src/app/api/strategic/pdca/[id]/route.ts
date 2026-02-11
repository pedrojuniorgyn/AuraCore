/**
 * API: PDCA Cycle by ID
 * Histórico de transições do ciclo PDCA - auditável, não deletável
 * 
 * @module api/strategic/pdca/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

// Tipo para resultado do banco
interface PDCACycleRow {
  id: string;
  organizationId: number;
  branchId: number;
  actionPlanId: string;
  fromPhase: string;
  toPhase: string;
  transitionReason: string | null;
  evidences: string | null;
  completionPercent: number;
  transitionedBy: string;
  transitionedAt: Date;
  createdAt: Date;
}

// ID param validation
const idParamSchema = z.object({
  id: z.string().min(1, 'ID do PDCA é obrigatório'),
});

// GET - Obter ciclo PDCA específico
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    const resolvedParams = await context.params;
    
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { id } = validation.data;

    // Buscar do banco usando SQL raw para compatibilidade
    const result = await db.execute(sql`
      SELECT TOP 1
        id,
        organization_id as organizationId,
        branch_id as branchId,
        action_plan_id as actionPlanId,
        from_phase as fromPhase,
        to_phase as toPhase,
        transition_reason as transitionReason,
        evidences,
        completion_percent as completionPercent,
        transitioned_by as transitionedBy,
        transitioned_at as transitionedAt,
        created_at as createdAt
      FROM strategic_pdca_cycle
      WHERE id = ${id}
        AND organization_id = ${ctx.organizationId}
        AND branch_id = ${ctx.branchId}
    `);

    const cycles = ((result as { recordset?: unknown[] }).recordset || result) as PDCACycleRow[];
    const cycle = cycles[0];

    if (!cycle) {
      return NextResponse.json({ error: 'Ciclo PDCA não encontrado' }, { status: 404 });
    }

    // Parse evidências
    let evidencesArray: string[] = [];
    if (cycle.evidences) {
      try {
        evidencesArray = JSON.parse(cycle.evidences);
      } catch {
        // Ignorar se não for JSON válido
      }
    }

    // Formatar resposta
    return NextResponse.json({
      id: cycle.id,
      actionPlanId: cycle.actionPlanId,
      actionPlanCode: `AP-${cycle.actionPlanId.slice(0, 8)}`,
      actionPlanTitle: `Plano de Ação ${cycle.actionPlanId.slice(0, 8)}`,
      fromPhase: cycle.fromPhase as 'PLAN' | 'DO' | 'CHECK' | 'ACT',
      toPhase: cycle.toPhase as 'PLAN' | 'DO' | 'CHECK' | 'ACT',
      transitionReason: cycle.transitionReason || '',
      evidences: evidencesArray,
      completionPercent: cycle.completionPercent,
      transitionedBy: cycle.transitionedBy,
      transitionedAt: cycle.transitionedAt,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/pdca/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// DELETE - Não permitido (histórico de auditoria não pode ser deletado)
export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  // Suprimir parâmetros não usados
  void request;
  void context;
  
  return NextResponse.json(
    { error: 'Ciclos PDCA são registros de auditoria e não podem ser deletados' },
    { status: 403 }
  );
});
