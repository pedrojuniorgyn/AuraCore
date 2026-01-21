/**
 * API: POST /api/strategic/search
 * Busca global no módulo Strategic
 *
 * @module app/api/strategic/search
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchFacets,
  SearchEntityType,
} from '@/lib/search/search-types';

export const dynamic = 'force-dynamic';

// Mock data for development
const MOCK_KPIS = [
  {
    id: 'kpi-1',
    type: 'kpi' as const,
    title: 'Taxa de Entrega (OTD)',
    subtitle: 'Perspectiva: Cliente | Código: KPI-CLI-001',
    value: '92%',
    status: 'on_track',
    url: '/strategic/kpis/kpi-1',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 'kpi-2',
    type: 'kpi' as const,
    title: 'OTD Região Sul',
    subtitle: 'Perspectiva: Cliente | Código: KPI-CLI-012',
    value: '85%',
    status: 'warning',
    url: '/strategic/kpis/kpi-2',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 'kpi-3',
    type: 'kpi' as const,
    title: 'Margem Bruta',
    subtitle: 'Perspectiva: Financeira | Código: KPI-FIN-001',
    value: '35%',
    status: 'on_track',
    url: '/strategic/kpis/kpi-3',
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: 'kpi-4',
    type: 'kpi' as const,
    title: 'NPS - Satisfação do Cliente',
    subtitle: 'Perspectiva: Cliente | Código: KPI-CLI-002',
    value: '72',
    status: 'warning',
    url: '/strategic/kpis/kpi-4',
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
];

const MOCK_ACTION_PLANS = [
  {
    id: 'plan-1',
    type: 'action_plan' as const,
    title: 'Melhorar OTD na Região Sul',
    subtitle: 'Responsável: João Silva | Prazo: 15/02/2026',
    status: 'critical',
    url: '/strategic/action-plans/plan-1',
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: 'plan-2',
    type: 'action_plan' as const,
    title: 'Implementar NPS automatizado',
    subtitle: 'Responsável: Maria Santos | Prazo: 01/03/2026',
    status: 'in_progress',
    url: '/strategic/action-plans/plan-2',
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  },
];

const MOCK_PDCA = [
  {
    id: 'pdca-1',
    type: 'pdca_cycle' as const,
    title: 'Ciclo PDCA - Qualidade',
    subtitle: 'Fase: DO | Progresso: 45%',
    status: 'in_progress',
    url: '/strategic/pdca/pdca-1',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
];

const MOCK_GOALS = [
  {
    id: 'goal-1',
    type: 'goal' as const,
    title: 'Aumentar receita em 20%',
    subtitle: 'Perspectiva: Financeira | Progresso: 65%',
    status: 'on_track',
    url: '/strategic/goals/goal-1',
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
];

const ALL_ITEMS = [...MOCK_KPIS, ...MOCK_ACTION_PLANS, ...MOCK_PDCA, ...MOCK_GOALS];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const body: SearchQuery = await request.json();
    const { query, filters, sortBy = 'relevance', page = 1, pageSize = 20 } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const searchTerm = query.toLowerCase().trim();

    // Filter by search term
    let results: SearchResult[] = ALL_ITEMS.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(searchTerm);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(searchTerm);
      return titleMatch || subtitleMatch;
    }).map((item) => ({
      ...item,
      metadata: {},
      score: item.title.toLowerCase().includes(searchTerm) ? 1.0 : 0.5,
    }));

    // Filter by entity types
    if (filters?.entityTypes && filters.entityTypes.length > 0) {
      results = results.filter((r) => filters.entityTypes!.includes(r.type));
    }

    // Filter by status
    if (filters?.status && filters.status.length > 0) {
      results = results.filter((r) => r.status && filters.status!.includes(r.status));
    }

    // Sort
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

    // Calculate facets
    const facets: SearchFacets = {
      entityTypes: ['kpi', 'action_plan', 'pdca_cycle', 'goal', 'comment'].map((type) => ({
        type: type as SearchEntityType,
        count: results.filter((r) => r.type === type).length,
      })),
      status: ['critical', 'warning', 'on_track', 'completed', 'in_progress'].map((status) => ({
        status,
        count: results.filter((r) => r.status === status).length,
      })),
      perspectives: [],
      responsible: [],
    };

    // Pagination
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
    console.error('POST /api/strategic/search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
