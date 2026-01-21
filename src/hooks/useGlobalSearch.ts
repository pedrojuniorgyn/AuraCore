'use client';

/**
 * Hook para busca global
 * @module hooks/useGlobalSearch
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchService } from '@/lib/search/search-service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type {
  SearchFilters,
  SearchSuggestion,
  SearchSortBy,
  SearchResult,
  SearchFacets,
  SearchQuery,
} from '@/lib/search/search-types';

interface UseGlobalSearchOptions {
  debounceMs?: number;
  pageSize?: number;
}

interface UseGlobalSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  sortBy: SearchSortBy;
  setSortBy: (sortBy: SearchSortBy) => void;

  results: SearchResult[];
  suggestions: SearchSuggestion[];
  facets: SearchFacets | null;

  isSearching: boolean;
  isLoadingSuggestions: boolean;
  error: Error | null;

  total: number;
  hasMore: boolean;

  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  clear: () => void;

  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectResult: (result: SearchResult, newTab?: boolean) => void;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}): UseGlobalSearchReturn {
  const { debounceMs = 300, pageSize = 20 } = options;

  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SearchSortBy>('relevance');

  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [facets, setFacets] = useState<SearchFacets | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch suggestions while typing
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const result = await searchService.getSuggestions(query);
        setSuggestions(result);
      } catch {
        // Ignore suggestion errors
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timeout);
  }, [query]);

  // Search function
  const search = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotal(0);
      setFacets(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);
    setPage(1);
    setSelectedIndex(0);

    try {
      const searchQuery: SearchQuery = {
        query: debouncedQuery,
        filters,
        sortBy,
        page: 1,
        pageSize,
      };

      const response = await searchService.search(searchQuery);

      setResults(response.results);
      setTotal(response.total);
      setHasMore(response.hasMore);
      setFacets(response.facets);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, filters, sortBy, pageSize]);

  // Search when debounced query changes
  useEffect(() => {
    search();
  }, [debouncedQuery, filters, sortBy, search]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isSearching) return;

    setIsSearching(true);
    const nextPage = page + 1;

    try {
      const searchQuery: SearchQuery = {
        query: debouncedQuery,
        filters,
        sortBy,
        page: nextPage,
        pageSize,
      };

      const response = await searchService.search(searchQuery);

      setResults((prev) => [...prev, ...response.results]);
      setPage(nextPage);
      setHasMore(response.hasMore);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, filters, sortBy, pageSize, page, hasMore, isSearching]);

  const clear = useCallback(() => {
    setQuery('');
    setFilters({});
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setFacets(null);
    setSelectedIndex(0);
  }, []);

  const selectResult = useCallback(
    (result: SearchResult, newTab = false) => {
      if (newTab) {
        window.open(result.url, '_blank');
      } else {
        router.push(result.url);
      }
    },
    [router]
  );

  return {
    query,
    setQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    results,
    suggestions,
    facets,
    isSearching,
    isLoadingSuggestions,
    error,
    total,
    hasMore,
    search,
    loadMore,
    clear,
    selectedIndex,
    setSelectedIndex,
    selectResult,
  };
}
