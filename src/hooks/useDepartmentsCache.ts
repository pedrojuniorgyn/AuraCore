/**
 * useDepartmentsCache - Hook React Query para departments com cache
 * 
 * Estratégia de cache em camadas:
 * 1. React Query (client-side): 30min stale, 60min cache
 * 2. Redis (server-side): 30min TTL
 * 
 * @module hooks
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Department Tree Node (estrutura recursiva)
 */
export interface DepartmentTreeNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  managerUserId: number | null;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: DepartmentTreeNode[];
}

/**
 * Department Flat Item (lista plana)
 */
export interface DepartmentFlatItem {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  isActive: boolean;
}

/**
 * Tree Metadata
 */
export interface TreeMetadata {
  totalDepartments: number;
  maxDepth: number;
  rootDepartments: number;
}

/**
 * API Response completa
 */
export interface DepartmentsTreeResponse {
  success: boolean;
  tree: DepartmentTreeNode[];
  flat: DepartmentFlatItem[];
  metadata: TreeMetadata;
}

export interface UseDepartmentsCacheOptions {
  enabled?: boolean;
  staleTime?: number;
  active?: boolean | undefined; // Filtro de status
}

/**
 * Hook para buscar departments tree com cache React Query + Redis
 * 
 * @example
 * ```tsx
 * const { tree, flat, metadata, isLoading, refetch } = useDepartmentsCache();
 * 
 * // Com filtro de ativos
 * const { flat: activeDepts } = useDepartmentsCache({ active: true });
 * ```
 */
export const useDepartmentsCache = (
  options: UseDepartmentsCacheOptions = {}
) => {
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 1000 * 60 * 30, // 30 minutos
    active,
  } = options;

  // Build query params
  const queryParams = new URLSearchParams();
  if (active === true) {
    queryParams.set('active', 'true');
  } else if (active === false) {
    queryParams.set('active', 'false');
  } else {
    queryParams.set('includeInactive', 'true');
  }

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DepartmentsTreeResponse>({
    queryKey: ['departments', 'tree', active],
    queryFn: async (): Promise<DepartmentsTreeResponse> => {
      const url = `/api/departments/tree?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled,
    staleTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  /**
   * Invalida cache local (React Query)
   * Não afeta Redis server-side
   */
  const invalidateLocal = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  /**
   * Force refetch (bypassa cache local E server-side)
   */
  const forceRefetch = async () => {
    await refetch();
  };

  return {
    tree: data?.tree || [],
    flat: data?.flat || [],
    metadata: data?.metadata || {
      totalDepartments: 0,
      maxDepth: 0,
      rootDepartments: 0,
    },
    success: data?.success || false,
    isLoading,
    error,
    invalidateLocal,
    forceRefetch,
    refetch,
  };
};

/**
 * Hook otimizado para selects/dropdowns
 * Retorna apenas flat list formatada para select options
 * 
 * @example
 * ```tsx
 * const { options, isLoading } = useDepartmentsSelect();
 * 
 * <Select options={options} isLoading={isLoading} />
 * ```
 */
export const useDepartmentsSelect = (onlyActive = true) => {
  const { flat, isLoading } = useDepartmentsCache({
    active: onlyActive ? true : undefined,
  });
  
  const options = flat.map((dept: DepartmentFlatItem) => ({
    value: dept.id,
    label: `${'  '.repeat(dept.level)}${dept.code} - ${dept.name}`,
    level: dept.level,
    isActive: dept.isActive,
  }));

  return {
    options,
    isLoading,
  };
};
