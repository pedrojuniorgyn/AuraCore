/**
 * API: POST /api/strategic/search
 * Busca global no módulo Strategic - busca em dados reais do banco
 *
 * @module app/api/strategic/search
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { 
  kpiTable, 
  actionPlanTable, 
  pdcaCycleTable, 
  strategicGoalTable 
} from '@/modules/strategic/infrastructure/persistence/schemas';
import { eq, and, ilike, or, isNull, desc } from 'drizzle-orm';
import type {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchFacets,
  SearchEntityType,
} from '@/lib/search/search-types';

export const dynamic = 'force-dynamic';

export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();

    const startTime = Date.now();
    const body: SearchQuery = await request.json();
    const { query, filters, sortBy = 'relevance', page = 1, pageSize = 20 } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const searchTerm = `%${query.toLowerCase().trim()}%`;
    const results: SearchResult[] = [];

    // Buscar KPIs
    if (!filters?.entityTypes || filters.entityTypes.includes('kpi')) {
      const kpiQuery = db
        .select({
          id: kpiTable.id,
          name: kpiTable.name,
          code: kpiTable.code,
          currentValue: kpiTable.currentValue,
          targetValue: kpiTable.targetValue,
          status: kpiTable.status,
          updatedAt: kpiTable.updatedAt,
        })
        .from(kpiTable)
        .where(and(
          eq(kpiTable.organizationId, ctx.organizationId),
          eq(kpiTable.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(kpiTable.deletedAt),
          or(
            ilike(kpiTable.name, searchTerm),
            ilike(kpiTable.code, searchTerm)
          )
        ))
        .orderBy(desc(kpiTable.updatedAt));
      type KpiQueryWithLimit = { limit(n: number): typeof kpiQuery };
      const kpis = await (kpiQuery as unknown as KpiQueryWithLimit).limit(pageSize);

      kpis.forEach((kpi: typeof kpis[number]) => {
        results.push({
          id: String(kpi.id),
          type: 'kpi',
          title: kpi.name,
          subtitle: `Código: ${kpi.code || 'N/A'} | Atual: ${kpi.currentValue ?? '-'} / Meta: ${kpi.targetValue ?? '-'}`,
          value: String(kpi.currentValue ?? '-'),
          status: kpi.status || 'on_track',
          url: `/strategic/kpis/${kpi.id}`,
          updatedAt: kpi.updatedAt || new Date(),
          metadata: {},
          score: 1.0,
        });
      });
    }

    // Buscar Action Plans
    if (!filters?.entityTypes || filters.entityTypes.includes('action_plan')) {
      const planQuery = db
        .select({
          id: actionPlanTable.id,
          title: actionPlanTable.what,
          status: actionPlanTable.status,
          dueDate: actionPlanTable.whenEnd,
          updatedAt: actionPlanTable.updatedAt,
        })
        .from(actionPlanTable)
        .where(and(
          eq(actionPlanTable.organizationId, ctx.organizationId),
          eq(actionPlanTable.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(actionPlanTable.deletedAt),
          ilike(actionPlanTable.what, searchTerm)
        ))
        .orderBy(desc(actionPlanTable.updatedAt));
      type PlanQueryWithLimit = { limit(n: number): typeof planQuery };
      const plans = await (planQuery as unknown as PlanQueryWithLimit).limit(pageSize);

      plans.forEach((plan: typeof plans[number]) => {
        results.push({
          id: String(plan.id),
          type: 'action_plan',
          title: plan.title || 'Sem título',
          subtitle: `Prazo: ${plan.dueDate ? new Date(plan.dueDate).toLocaleDateString('pt-BR') : 'N/A'}`,
          status: plan.status || 'in_progress',
          url: `/strategic/action-plans/${plan.id}`,
          updatedAt: plan.updatedAt || new Date(),
          metadata: {},
          score: 0.9,
        });
      });
    }

    // Buscar PDCA Cycles (histórico de transições)
    // O pdcaCycleTable é um histórico de transições, fazemos JOIN com actionPlanTable para obter o título
    if (!filters?.entityTypes || filters.entityTypes.includes('pdca_cycle')) {
      const pdcaQuery = db
        .select({
          id: pdcaCycleTable.id,
          actionPlanId: pdcaCycleTable.actionPlanId,
          fromPhase: pdcaCycleTable.fromPhase,
          toPhase: pdcaCycleTable.toPhase,
          transitionReason: pdcaCycleTable.transitionReason,
          completionPercent: pdcaCycleTable.completionPercent,
          transitionedAt: pdcaCycleTable.transitionedAt,
          // Campos do Action Plan para contexto
          actionPlanWhat: actionPlanTable.what,
          actionPlanStatus: actionPlanTable.status,
        })
        .from(pdcaCycleTable)
        .innerJoin(actionPlanTable, eq(pdcaCycleTable.actionPlanId, actionPlanTable.id))
        .where(and(
          eq(pdcaCycleTable.organizationId, ctx.organizationId),
          eq(pdcaCycleTable.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(actionPlanTable.deletedAt), // SCHEMA-006: Excluir action plans soft-deleted
          or(
            ilike(actionPlanTable.what, searchTerm),
            ilike(pdcaCycleTable.transitionReason, searchTerm)
          )
        ))
        .orderBy(desc(pdcaCycleTable.transitionedAt));
      type PdcaQueryWithLimit = { limit(n: number): typeof pdcaQuery };
      const pdcas = await (pdcaQuery as unknown as PdcaQueryWithLimit).limit(pageSize);

      pdcas.forEach((pdca: typeof pdcas[number]) => {
        results.push({
          id: String(pdca.id),
          type: 'pdca_cycle',
          title: pdca.actionPlanWhat || 'Ciclo PDCA',
          subtitle: `Transição: ${pdca.fromPhase} → ${pdca.toPhase} (${pdca.completionPercent}%)`,
          status: pdca.actionPlanStatus || 'in_progress',
          url: `/strategic/pdca/${pdca.actionPlanId}`,
          updatedAt: pdca.transitionedAt || new Date(),
          metadata: {
            fromPhase: pdca.fromPhase,
            toPhase: pdca.toPhase,
            reason: pdca.transitionReason,
          },
          score: 0.8,
        });
      });
    }

    // Buscar Goals
    if (!filters?.entityTypes || filters.entityTypes.includes('goal')) {
      const goalQuery = db
        .select({
          id: strategicGoalTable.id,
          description: strategicGoalTable.description,
          code: strategicGoalTable.code,
          currentValue: strategicGoalTable.currentValue,
          status: strategicGoalTable.status,
          updatedAt: strategicGoalTable.updatedAt,
        })
        .from(strategicGoalTable)
        .where(and(
          eq(strategicGoalTable.organizationId, ctx.organizationId),
          eq(strategicGoalTable.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(strategicGoalTable.deletedAt),
          ilike(strategicGoalTable.description, searchTerm)
        ))
        .orderBy(desc(strategicGoalTable.updatedAt));
      type GoalQueryWithLimit = { limit(n: number): typeof goalQuery };
      const goals = await (goalQuery as unknown as GoalQueryWithLimit).limit(pageSize);

      goals.forEach((goal: typeof goals[number]) => {
        results.push({
          id: String(goal.id),
          type: 'goal',
          title: goal.description || 'Meta',
          subtitle: `Código: ${goal.code} | Valor atual: ${goal.currentValue ?? 0}`,
          status: goal.status || 'on_track',
          url: `/strategic/goals/${goal.id}`,
          updatedAt: goal.updatedAt || new Date(),
          metadata: {},
          score: 0.85,
        });
      });
    }

    // Ordenar resultados
    switch (sortBy) {
      case 'recent':
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'relevance':
      default:
        results.sort((a, b) => b.score - a.score);
        break;
    }

    // Calcular facets
    const facets: SearchFacets = {
      entityTypes: (['kpi', 'action_plan', 'pdca_cycle', 'goal', 'comment'] as SearchEntityType[]).map((type) => ({
        type,
        count: results.filter((r) => r.type === type).length,
      })),
      status: ['critical', 'warning', 'on_track', 'completed', 'in_progress'].map((status) => ({
        status,
        count: results.filter((r) => r.status === status).length,
      })),
      perspectives: [],
      responsible: [],
    };

    // Paginação
    const total = results.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    const response: SearchResponse = {
      results: paginatedResults,
      total,
      page,
      pageSize,
      hasMore: endIndex < total,
      facets,
      took: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
