/**
 * Strategic Module Cache
 * 
 * Cache layer para o módulo Strategic usando Next.js unstable_cache.
 * Implementa cache granular com tags para invalidação precisa.
 * 
 * @module lib/cache/strategic-cache
 * @since E9 - Performance Optimizations
 */

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

// ============================================================================
// Cache Tags
// ============================================================================

/**
 * Tags de cache para invalidação granular
 * Cada tag representa uma área funcional que pode ser invalidada independentemente
 */
export const CACHE_TAGS = {
  /** Dashboard principal e widgets */
  DASHBOARD: 'strategic-dashboard',
  /** Lista e detalhes de KPIs */
  KPIS: 'strategic-kpis',
  /** Medições de KPIs */
  MEASUREMENTS: 'strategic-measurements',
  /** Planos de ação */
  ACTION_PLANS: 'strategic-action-plans',
  /** Objetivos estratégicos */
  GOALS: 'strategic-goals',
  /** Ciclos PDCA */
  PDCA: 'strategic-pdca',
  /** Relatórios */
  REPORTS: 'strategic-reports',
  /** Layout customizado do usuário */
  USER_LAYOUT: 'strategic-user-layout',
  /** Insights do Aurora AI */
  AURORA_INSIGHTS: 'strategic-aurora-insights',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// ============================================================================
// Revalidation Times (em segundos)
// ============================================================================

/**
 * Tempos de revalidação por tipo de dado
 * Dados mais dinâmicos têm cache mais curto
 */
export const REVALIDATE_TIMES = {
  /** Dashboard: 1 minuto (dados agregados mudam frequentemente) */
  DASHBOARD: 60,
  /** KPIs: 5 minutos (lista não muda muito) */
  KPIS: 300,
  /** Medições: 2 minutos (pode haver novas medições) */
  MEASUREMENTS: 120,
  /** Planos de ação: 5 minutos */
  ACTION_PLANS: 300,
  /** Objetivos: 10 minutos (raramente mudam) */
  GOALS: 600,
  /** PDCA: 5 minutos */
  PDCA: 300,
  /** Relatórios: 10 minutos */
  REPORTS: 600,
  /** Layout do usuário: 1 hora (muda muito raramente) */
  USER_LAYOUT: 3600,
  /** Insights Aurora: 30 segundos (real-time feel) */
  AURORA_INSIGHTS: 30,
} as const;

// ============================================================================
// Cache Key Generators
// ============================================================================

/**
 * Gera chave de cache para dados específicos de tenant
 */
export function getCacheKey(
  prefix: string,
  organizationId: number,
  branchId: number,
  ...params: (string | number)[]
): string {
  return [prefix, organizationId, branchId, ...params].join(':');
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Dashboard data com cache
 * 
 * @example
 * ```ts
 * const data = await getCachedDashboardData(1, 1);
 * ```
 */
export const getCachedDashboardData = unstable_cache(
  async (organizationId: number, branchId: number) => {
    // TODO: Implementar query real quando módulo strategic tiver queries
    // Por enquanto retorna dados mockados para evitar erros de schema
    void organizationId;
    void branchId;
    
    return {
      healthScore: 75,
      totalKpis: 0,
      criticalPlans: 0,
      avgProgress: 0,
      lastUpdate: new Date().toISOString(),
    };
  },
  ['dashboard-data'],
  {
    tags: [CACHE_TAGS.DASHBOARD],
    revalidate: REVALIDATE_TIMES.DASHBOARD,
  }
);

/**
 * KPIs list com cache
 */
export const getCachedKpis = unstable_cache(
  async (
    organizationId: number, 
    branchId: number
  ) => {
    // TODO: Implementar query real quando módulo strategic tiver queries
    void organizationId;
    void branchId;
    
    return {
      items: [],
      total: 0,
    };
  },
  ['kpis-list'],
  {
    tags: [CACHE_TAGS.KPIS],
    revalidate: REVALIDATE_TIMES.KPIS,
  }
);

/**
 * User layout com cache
 */
export const getCachedUserLayout = unstable_cache(
  async (userId: string, organizationId: number, branchId: number) => {
    // TODO: Implementar query real quando tabela strategic_user_layouts existir
    void userId;
    void organizationId;
    void branchId;
    
    // Retornar layout padrão
    return {
      widgets: [
        { i: 'health-score', type: 'health-score', x: 0, y: 0, w: 1, h: 2 },
        { i: 'alerts', type: 'alerts', x: 1, y: 0, w: 1, h: 2 },
        { i: 'kpi-summary', type: 'kpi-summary', x: 2, y: 0, w: 1, h: 2 },
        { i: 'trend-chart', type: 'trend-chart', x: 0, y: 2, w: 2, h: 2 },
        { i: 'actions', type: 'actions', x: 2, y: 2, w: 1, h: 2 },
      ],
    };
  },
  ['user-layout'],
  {
    tags: [CACHE_TAGS.USER_LAYOUT],
    revalidate: REVALIDATE_TIMES.USER_LAYOUT,
  }
);

// ============================================================================
// Cache Invalidation Functions
// ============================================================================

/**
 * Invalida cache do dashboard
 * Chamar após mutações que afetam o dashboard
 */
export async function invalidateDashboardCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de KPIs
 * Também invalida dashboard pois depende de KPIs
 */
export async function invalidateKpisCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.KPIS, { expire: 0 });
  revalidateTag(CACHE_TAGS.MEASUREMENTS, { expire: 0 });
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de medições
 */
export async function invalidateMeasurementsCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.MEASUREMENTS, { expire: 0 });
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de planos de ação
 */
export async function invalidateActionPlansCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.ACTION_PLANS, { expire: 0 });
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de objetivos
 */
export async function invalidateGoalsCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.GOALS, { expire: 0 });
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de PDCA
 */
export async function invalidatePdcaCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.PDCA, { expire: 0 });
  revalidateTag(CACHE_TAGS.DASHBOARD, { expire: 0 });
}

/**
 * Invalida cache de layout do usuário
 */
export async function invalidateUserLayoutCache(): Promise<void> {
  revalidateTag(CACHE_TAGS.USER_LAYOUT, { expire: 0 });
}

/**
 * Invalida todos os caches do módulo strategic
 * Usar com cuidado - prefira invalidações granulares
 */
export async function invalidateAllStrategicCache(): Promise<void> {
  Object.values(CACHE_TAGS).forEach(tag => {
    revalidateTag(tag, { expire: 0 });
  });
}

// ============================================================================
// Cache Headers Helpers
// ============================================================================

/**
 * Headers de cache para respostas de API
 * @param maxAge - Tempo máximo de cache em segundos
 * @param staleWhileRevalidate - Tempo para servir stale enquanto revalida
 */
export function getCacheHeaders(
  maxAge: number = 60,
  staleWhileRevalidate: number = 300
): Record<string, string> {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'CDN-Cache-Control': `public, s-maxage=${maxAge}`,
    'Vercel-CDN-Cache-Control': `public, s-maxage=${maxAge}`,
  };
}

/**
 * Headers para dados que não devem ser cacheados
 */
export function getNoCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}

/**
 * Headers para dados privados (específicos do usuário)
 */
export function getPrivateCacheHeaders(
  maxAge: number = 60
): Record<string, string> {
  return {
    'Cache-Control': `private, max-age=${maxAge}`,
  };
}
