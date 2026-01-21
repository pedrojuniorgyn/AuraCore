'use client';

/**
 * Hook para histórico de buscas
 * @module hooks/useSearchHistory
 */

import { useState, useCallback } from 'react';
import { searchService } from '@/lib/search/search-service';
import type { RecentSearch } from '@/lib/search/search-types';

interface UseSearchHistoryReturn {
  recentSearches: RecentSearch[];
  clearHistory: () => void;
  removeSearch: (id: string) => void;
  refresh: () => void;
}

export function useSearchHistory(): UseSearchHistoryReturn {
  // Initialize state with a function to avoid SSR issues
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    if (typeof window === 'undefined') return [];
    return searchService.getRecentSearches();
  });

  const refresh = useCallback(() => {
    const searches = searchService.getRecentSearches();
    setRecentSearches(searches);
  }, []);

  const clearHistory = useCallback(() => {
    searchService.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const removeSearch = useCallback((id: string) => {
    searchService.removeRecentSearch(id);
    setRecentSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    recentSearches,
    clearHistory,
    removeSearch,
    refresh,
  };
}
