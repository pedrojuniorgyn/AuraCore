/**
 * Serviço de busca global
 * @module lib/search/search-service
 */

import type {
  SearchQuery,
  SearchResponse,
  SearchSuggestion,
  RecentSearch,
} from './search-types';

const RECENT_SEARCHES_KEY = 'strategic_recent_searches';
const MAX_RECENT_SEARCHES = 10;

class SearchService {
  async search(query: SearchQuery): Promise<SearchResponse> {
    const response = await fetch('/api/strategic/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const result = await response.json();

    // Save to recent searches
    if (query.query.trim()) {
      this.saveRecentSearch({
        id: crypto.randomUUID(),
        query: query.query,
        filters: query.filters,
        timestamp: new Date(),
        resultCount: result.total,
      });
    }

    return result;
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const response = await fetch(
      `/api/strategic/search/suggestions?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  getRecentSearches(): RecentSearch[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];

    try {
      const searches = JSON.parse(stored);
      return searches.map((s: Record<string, unknown>) => ({
        ...s,
        timestamp: new Date(s.timestamp as string),
      }));
    } catch {
      return [];
    }
  }

  saveRecentSearch(search: RecentSearch): void {
    if (typeof window === 'undefined') return;

    const recent = this.getRecentSearches();

    // Remove duplicate queries
    const filtered = recent.filter((r) => r.query !== search.query);

    // Add new search at the beginning
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }

  clearRecentSearches(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }

  removeRecentSearch(id: string): void {
    if (typeof window === 'undefined') return;

    const recent = this.getRecentSearches();
    const updated = recent.filter((r) => r.id !== id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }
}

export const searchService = new SearchService();
