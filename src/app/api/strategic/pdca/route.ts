/**
 * API: PDCA Cycles
 * Histórico de transições do ciclo PDCA
 * 
 * @module api/strategic/pdca
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { pdcaCycleTable } from '@/modules/strategic/infrastructure/persistence/schemas';
import { eq, and, desc, sql } from 'drizzle-orm';

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

// GET - Listar ciclos PDCA
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const actionPlanId = searchParams.get('actionPlanId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Query usando SQL raw para compatibilidade MSSQL
    const result = await db.execute(sql`
      SELECT TOP ${limit}
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
      WHERE organization_id = ${ctx.organizationId}
        AND branch_id = ${ctx.branchId}
        ${actionPlanId ? sql`AND action_plan_id = ${actionPlanId}` : sql``}
      ORDER BY transitioned_at DESC
    `);

    const cycles = ((result as { recordset?: unknown[] }).recordset || result) as PDCACycleRow[];

    // Formatar para o frontend
    const data = cycles.map((cycle: PDCACycleRow) => {
      let evidencesArray: string[] = [];
      if (cycle.evidences) {
        try {
          evidencesArray = JSON.parse(cycle.evidences);
        } catch {
          // Ignorar se não for JSON válido
        }
      }

      return {
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
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/pdca error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Registrar transição PDCA
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const body = await request.json();
    const { actionPlanId, fromPhase, toPhase, transitionReason, evidences, completionPercent } = body;

    // Validação obrigatória: actionPlanId, fromPhase e toPhase são necessários para auditoria
    if (!actionPlanId || !fromPhase || !toPhase) {
      return NextResponse.json(
        { error: 'actionPlanId, fromPhase and toPhase are required for PDCA transition audit' },
        { status: 400 }
      );
    }

    // Validar que fromPhase e toPhase são valores válidos
    const validPhases = ['PLAN', 'DO', 'CHECK', 'ACT'];
    if (!validPhases.includes(fromPhase) || !validPhases.includes(toPhase)) {
      return NextResponse.json(
        { error: 'fromPhase and toPhase must be one of: PLAN, DO, CHECK, ACT' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();

    // Inserir novo ciclo PDCA
    await db.insert(pdcaCycleTable).values({
      id,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      actionPlanId,
      fromPhase,
      toPhase,
      transitionReason: transitionReason || null,
      evidences: evidences ? JSON.stringify(evidences) : null,
      completionPercent: completionPercent || 0,
      transitionedBy: ctx.userId,
      transitionedAt: now,
      createdAt: now,
    });

    // Garantir consistência: parsear evidences da mesma forma que GET
    // O banco armazena JSON string, então retornamos array parseado
    const evidencesArray = Array.isArray(evidences) ? evidences : [];

    return NextResponse.json({
      id,
      actionPlanId,
      actionPlanCode: `AP-${actionPlanId.slice(0, 8)}`,
      actionPlanTitle: `Plano de Ação ${actionPlanId.slice(0, 8)}`,
      fromPhase,
      toPhase,
      transitionReason: transitionReason || '',
      evidences: evidencesArray, // ✅ Consistente com GET (sempre array)
      completionPercent: completionPercent || 0,
      transitionedBy: ctx.userId,
      transitionedAt: now,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating PDCA transition:', error);
    return NextResponse.json({ error: 'Failed to create PDCA transition' }, { status: 500 });
  }
}
