/**
 * Tipos para o sistema de busca global
 * @module lib/search/search-types
 */

export type SearchEntityType = 'kpi' | 'action_plan' | 'pdca_cycle' | 'goal' | 'comment';

export type SearchSortBy = 'relevance' | 'recent' | 'name' | 'status';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sortBy?: SearchSortBy;
  page?: number;
  pageSize?: number;
}

export interface SearchFilters {
  entityTypes?: SearchEntityType[];
  status?: string[];
  perspective?: string[];
  responsibleId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  updatedWithin?: 'today' | '7d' | '30d' | '90d' | 'all';
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  statusColor?: string;
  value?: string | number;
  metadata: Record<string, unknown>;
  url: string;
  highlight?: {
    field: string;
    snippet: string;
  }[];
  score: number;
  updatedAt: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: SearchFacets;
  took: number; // ms
}

export interface SearchFacets {
  entityTypes: { type: SearchEntityType; count: number }[];
  status: { status: string; count: number }[];
  perspectives: { perspective: string; count: number }[];
  responsible: { id: string; name: string; count: number }[];
}

export interface SearchSuggestion {
  type: 'query' | 'entity' | 'user' | 'tag';
  text: string;
  highlight?: string;
  entityType?: SearchEntityType;
  entityId?: string;
  icon?: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

// Keyboard shortcuts
export const SEARCH_SHORTCUTS = {
  open: ['Meta+k', 'Control+k'],
  close: ['Escape'],
  navigate: ['ArrowUp', 'ArrowDown'],
  select: ['Enter'],
  selectNewTab: ['Meta+Enter', 'Control+Enter'],
  clear: ['Meta+Backspace'],
};

// Entity labels
export const ENTITY_LABELS: Record<SearchEntityType, string> = {
  kpi: 'KPI',
  action_plan: 'Plano de Ação',
  pdca_cycle: 'Ciclo PDCA',
  goal: 'Meta',
  comment: 'Comentário',
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  on_track: 'bg-green-500',
  completed: 'bg-blue-500',
  not_started: 'bg-gray-500',
  in_progress: 'bg-purple-500',
};
