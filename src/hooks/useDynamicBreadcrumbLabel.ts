/**
 * Hook: useDynamicBreadcrumbLabel
 * Resolve nomes amigáveis para UUIDs em breadcrumbs
 *
 * @module hooks/useDynamicBreadcrumbLabel
 */
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api/fetch-client';

// Cache em memória para evitar múltiplas requisições
const labelCache = new Map<string, string>();

/**
 * Detecta se o segmento é um UUID válido
 */
function isUUID(segment: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(segment);
}

/**
 * Trunca UUID para exibição como fallback
 */
function truncateUUID(uuid: string): string {
  return `${uuid.slice(0, 8)}…`;
}

/**
 * Identifica o tipo de recurso e a API baseado no pathname
 */
function getResourceInfo(pathname: string, segment: string): {
  type: 'goal' | 'kpi' | 'action-plan' | 'okr' | 'idea' | null;
  apiUrl: string | null;
} {
  // Analisar o pathname para determinar o tipo de recurso
  if (pathname.includes('/strategic/goals/')) {
    return {
      type: 'goal',
      apiUrl: `/api/strategic/goals/${segment}`,
    };
  }

  if (pathname.includes('/strategic/kpis/')) {
    return {
      type: 'kpi',
      apiUrl: `/api/strategic/kpis/${segment}`,
    };
  }

  if (pathname.includes('/strategic/action-plans/')) {
    return {
      type: 'action-plan',
      apiUrl: `/api/strategic/action-plans/${segment}`,
    };
  }

  if (pathname.includes('/strategic/okrs/')) {
    return {
      type: 'okr',
      apiUrl: `/api/strategic/okrs/${segment}`,
    };
  }

  if (pathname.includes('/strategic/ideas/')) {
    return {
      type: 'idea',
      apiUrl: `/api/strategic/ideas/${segment}`,
    };
  }

  return { type: null, apiUrl: null };
}

/**
 * Extrai o label apropriado do response da API
 */
function extractLabel(data: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'goal':
      // Goals usam 'description' como label principal
      return data.description || data.code || 'Objetivo';

    case 'kpi':
      // KPIs mostram código + nome
      if (data.code && data.name) {
        return `${data.code} - ${data.name}`;
      }
      return data.name || data.code || 'KPI';

    case 'action-plan':
      // Action Plans usam 'what' (o que será feito)
      return data.what || data.title || 'Plano de Ação';

    case 'okr':
      return data.name || data.title || 'OKR';

    case 'idea':
      return data.title || 'Ideia';

    default:
      return 'Item';
  }
}

interface UseDynamicBreadcrumbLabelResult {
  label: string;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook que resolve o label de um segmento de breadcrumb dinamicamente
 *
 * @param segment - O segmento do pathname (pode ser UUID ou string normal)
 * @param pathname - O pathname completo para contexto
 * @returns Label resolvido, estado de loading e erro
 *
 * @example
 * ```tsx
 * const { label, isLoading } = useDynamicBreadcrumbLabel(
 *   '6d8f1234-...',
 *   '/strategic/goals/6d8f1234-...'
 * );
 * // label será o nome do objetivo quando carregar
 * ```
 */
export function useDynamicBreadcrumbLabel(
  segment: string,
  pathname: string
): UseDynamicBreadcrumbLabelResult {
  // Calcular estado inicial baseado em verificações síncronas
  const getInitialState = () => {
    // Se não é UUID, usar o segmento direto
    if (!isUUID(segment)) {
      return { label: segment, isLoading: false, isError: false };
    }

    // Verificar cache
    const cacheKey = `${pathname}::${segment}`;
    const cachedLabel = labelCache.get(cacheKey);
    if (cachedLabel) {
      return { label: cachedLabel, isLoading: false, isError: false };
    }

    // Identificar recurso
    const { type, apiUrl } = getResourceInfo(pathname, segment);
    if (!type || !apiUrl) {
      return { label: truncateUUID(segment), isLoading: false, isError: false };
    }

    // Caso padrão: vai fazer fetch
    return { label: truncateUUID(segment), isLoading: true, isError: false };
  };

  const initial = getInitialState();
  const [label, setLabel] = useState<string>(initial.label);
  const [isLoading, setIsLoading] = useState<boolean>(initial.isLoading);
  const [isError, setIsError] = useState<boolean>(initial.isError);

  useEffect(() => {
    // Só fazer fetch se for UUID e não estiver em cache
    if (!isUUID(segment)) return;

    const cacheKey = `${pathname}::${segment}`;
    if (labelCache.get(cacheKey)) return;

    const { type, apiUrl } = getResourceInfo(pathname, segment);
    if (!type || !apiUrl) return;

    // Fetch assíncrono
    const fetchLabel = async () => {
      try {
        const data = await fetchAPI<Record<string, unknown>>(apiUrl);
        const resolvedLabel = extractLabel(data, type);

        labelCache.set(cacheKey, resolvedLabel);
        setLabel(resolvedLabel);
        setIsLoading(false);
      } catch (error) {
        console.error(`Failed to resolve breadcrumb label for ${segment}:`, error);

        const fallback = truncateUUID(segment);
        labelCache.set(cacheKey, fallback);
        setLabel(fallback);
        setIsLoading(false);
        setIsError(true);
      }
    };

    void fetchLabel();
  }, [segment, pathname]);

  return { label, isLoading, isError };
}
