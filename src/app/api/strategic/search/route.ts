/**
 * API: POST /api/strategic/search
 * Busca global no módulo Strategic - busca em dados reais do banco
 *
 * @module app/api/strategic/search
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { 
  strategicKpis, 
  actionPlans, 
  pdcaCycles, 
  strategicGoals 
} from '@/modules/strategic/infrastructure/persistence/schemas';
import { eq, and, ilike, or, isNull, desc, sql } from 'drizzle-orm';
import type {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchFacets,
  SearchEntityType,
} from '@/lib/search/search-types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
      const kpis = await db
        .select({
          id: strategicKpis.id,
          name: strategicKpis.name,
          code: strategicKpis.code,
          currentValue: strategicKpis.currentValue,
          targetValue: strategicKpis.targetValue,
          status: strategicKpis.status,
          updatedAt: strategicKpis.updatedAt,
        })
        .from(strategicKpis)
        .where(and(
          eq(strategicKpis.organizationId, ctx.organizationId),
          eq(strategicKpis.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(strategicKpis.deletedAt),
          or(
            ilike(strategicKpis.name, searchTerm),
            ilike(strategicKpis.code, searchTerm)
          )
        ))
        .orderBy(desc(strategicKpis.updatedAt))
        .limit(pageSize);

      kpis.forEach(kpi => {
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
      const plans = await db
        .select({
          id: actionPlans.id,
          title: actionPlans.title,
          status: actionPlans.status,
          dueDate: actionPlans.dueDate,
          updatedAt: actionPlans.updatedAt,
        })
        .from(actionPlans)
        .where(and(
          eq(actionPlans.organizationId, ctx.organizationId),
          eq(actionPlans.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(actionPlans.deletedAt),
          ilike(actionPlans.title, searchTerm)
        ))
        .orderBy(desc(actionPlans.updatedAt))
        .limit(pageSize);

      plans.forEach(plan => {
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
      const pdcas = await db
        .select({
          id: pdcaCycles.id,
          actionPlanId: pdcaCycles.actionPlanId,
          fromPhase: pdcaCycles.fromPhase,
          toPhase: pdcaCycles.toPhase,
          transitionReason: pdcaCycles.transitionReason,
          completionPercent: pdcaCycles.completionPercent,
          transitionedAt: pdcaCycles.transitionedAt,
          // Campos do Action Plan para contexto
          actionPlanWhat: actionPlans.what,
          actionPlanStatus: actionPlans.status,
        })
        .from(pdcaCycles)
        .innerJoin(actionPlans, eq(pdcaCycles.actionPlanId, actionPlans.id))
        .where(and(
          eq(pdcaCycles.organizationId, ctx.organizationId),
          eq(pdcaCycles.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          or(
            ilike(actionPlans.what, searchTerm),
            ilike(pdcaCycles.transitionReason, searchTerm)
          )
        ))
        .orderBy(desc(pdcaCycles.transitionedAt))
        .limit(pageSize);

      pdcas.forEach(pdca => {
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
      const goals = await db
        .select({
          id: strategicGoals.id,
          name: strategicGoals.name,
          progress: strategicGoals.progress,
          status: strategicGoals.status,
          updatedAt: strategicGoals.updatedAt,
        })
        .from(strategicGoals)
        .where(and(
          eq(strategicGoals.organizationId, ctx.organizationId),
          eq(strategicGoals.branchId, ctx.branchId), // 🔐 ABAC: Data scoping por branch
          isNull(strategicGoals.deletedAt),
          ilike(strategicGoals.name, searchTerm)
        ))
        .orderBy(desc(strategicGoals.updatedAt))
        .limit(pageSize);

      goals.forEach(goal => {
        results.push({
          id: String(goal.id),
          type: 'goal',
          title: goal.name || 'Meta',
          subtitle: `Progresso: ${goal.progress ?? 0}%`,
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
    console.error('POST /api/strategic/search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
