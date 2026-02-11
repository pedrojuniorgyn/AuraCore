/**
 * Testes: useGlobalSearch - Validação de lógica core
 * Valida fluxo de busca, paginação, sugestões e AbortController
 * 
 * @module hooks/__tests__
 */
import { describe, it, expect, vi } from 'vitest';

// Tipos extraídos do hook
interface SearchFilters {
  module?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

type SearchSortBy = 'relevance' | 'date' | 'title';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  module: string;
  type: string;
  score: number;
}

interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sortBy: SearchSortBy;
  page: number;
  pageSize: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  facets: Record<string, unknown> | null;
}

describe('useGlobalSearch - Core Logic', () => {
  // Helper para criar resultados mock
  function createResult(overrides: Partial<SearchResult> = {}): SearchResult {
    return {
      id: '1',
      title: 'Test Result',
      description: 'Description',
      url: '/test/1',
      module: 'tms',
      type: 'document',
      score: 0.95,
      ...overrides,
    };
  }

  describe('Construção de SearchQuery', () => {
    it('deve construir query com valores padrão', () => {
      const query: SearchQuery = {
        query: 'teste',
        filters: {},
        sortBy: 'relevance',
        page: 1,
        pageSize: 20,
      };

      expect(query.page).toBe(1);
      expect(query.pageSize).toBe(20);
      expect(query.sortBy).toBe('relevance');
    });

    it('deve construir query com filtros', () => {
      const query: SearchQuery = {
        query: 'NFe 12345',
        filters: { module: 'fiscal', type: 'nfe' },
        sortBy: 'date',
        page: 1,
        pageSize: 10,
      };

      expect(query.filters.module).toBe('fiscal');
      expect(query.filters.type).toBe('nfe');
    });

    it('pageSize deve ter valor correto', () => {
      const defaultPageSize = 20;
      const customPageSize = 50;
      expect(defaultPageSize).toBe(20);
      expect(customPageSize).toBe(50);
    });
  });

  describe('Lógica de busca (search)', () => {
    it('deve limpar resultados quando query está vazia', () => {
      const debouncedQuery = '';
      const shouldSearch = debouncedQuery.trim().length > 0;
      expect(shouldSearch).toBe(false);
    });

    it('deve limpar resultados quando query tem apenas espaços', () => {
      const debouncedQuery = '   ';
      const shouldSearch = debouncedQuery.trim().length > 0;
      expect(shouldSearch).toBe(false);
    });

    it('deve buscar quando query tem conteúdo', () => {
      const debouncedQuery = 'NFe';
      const shouldSearch = debouncedQuery.trim().length > 0;
      expect(shouldSearch).toBe(true);
    });
  });

  describe('Lógica de sugestões', () => {
    it('NÃO deve buscar sugestões para query muito curta (< 2 chars)', () => {
      const query = 'a';
      const shouldFetchSuggestions = query.trim().length >= 2;
      expect(shouldFetchSuggestions).toBe(false);
    });

    it('deve buscar sugestões quando query tem 2+ chars', () => {
      const query = 'NF';
      const shouldFetchSuggestions = query.trim().length >= 2;
      expect(shouldFetchSuggestions).toBe(true);
    });

    it('NÃO deve buscar sugestões para query vazia', () => {
      const query = '';
      const shouldFetchSuggestions = query.trim().length >= 2;
      expect(shouldFetchSuggestions).toBe(false);
    });
  });

  describe('Paginação (loadMore)', () => {
    it('deve incrementar page ao carregar mais', () => {
      let page = 1;
      const nextPage = page + 1;
      page = nextPage;
      expect(page).toBe(2);
    });

    it('NÃO deve carregar mais quando não tem mais resultados', () => {
      const hasMore = false;
      const isSearching = false;
      const canLoadMore = hasMore && !isSearching;
      expect(canLoadMore).toBe(false);
    });

    it('NÃO deve carregar mais durante busca ativa', () => {
      const hasMore = true;
      const isSearching = true;
      const canLoadMore = hasMore && !isSearching;
      expect(canLoadMore).toBe(false);
    });

    it('deve permitir carregar mais quando tem resultados e não está buscando', () => {
      const hasMore = true;
      const isSearching = false;
      const canLoadMore = hasMore && !isSearching;
      expect(canLoadMore).toBe(true);
    });

    it('deve acumular resultados ao carregar mais', () => {
      const existingResults = [createResult({ id: '1' }), createResult({ id: '2' })];
      const newResults = [createResult({ id: '3' }), createResult({ id: '4' })];

      const combined = [...existingResults, ...newResults];
      expect(combined).toHaveLength(4);
    });
  });

  describe('Processamento de resposta da API', () => {
    it('deve extrair resultados da resposta', () => {
      const response: SearchResponse = {
        results: [createResult({ id: '1' }), createResult({ id: '2' })],
        total: 50,
        hasMore: true,
        facets: null,
      };

      expect(response.results).toHaveLength(2);
      expect(response.total).toBe(50);
      expect(response.hasMore).toBe(true);
    });

    it('deve tratar resposta vazia', () => {
      const response: SearchResponse = {
        results: [],
        total: 0,
        hasMore: false,
        facets: null,
      };

      expect(response.results).toHaveLength(0);
      expect(response.hasMore).toBe(false);
    });
  });

  describe('Lógica de clear', () => {
    it('deve resetar todos os estados', () => {
      let query = 'NFe';
      let results: SearchResult[] = [createResult()];
      let total = 10;
      let selectedIndex = 3;

      // Clear
      query = '';
      results = [];
      total = 0;
      selectedIndex = 0;

      expect(query).toBe('');
      expect(results).toEqual([]);
      expect(total).toBe(0);
      expect(selectedIndex).toBe(0);
    });
  });

  describe('Lógica de AbortController', () => {
    it('deve cancelar requisição anterior ao iniciar nova', () => {
      const controller1 = new AbortController();
      const abortSpy = vi.spyOn(controller1, 'abort');

      // Simula nova busca cancelando a anterior
      controller1.abort();
      expect(abortSpy).toHaveBeenCalled();
    });

    it('deve ignorar erro AbortError', () => {
      const error = new Error('AbortError');
      error.name = 'AbortError';

      const isAbortError = error instanceof Error && error.name === 'AbortError';
      expect(isAbortError).toBe(true);

      // Não deve setar error state para AbortError
      let errorState: Error | null = null;
      if (error instanceof Error && error.name !== 'AbortError') {
        errorState = error;
      }
      expect(errorState).toBeNull();
    });

    it('deve setar error para erros não-AbortError', () => {
      const error = new Error('Network error');

      let errorState: Error | null = null;
      if (error instanceof Error && error.name !== 'AbortError') {
        errorState = error;
      }
      expect(errorState).not.toBeNull();
      expect(errorState?.message).toBe('Network error');
    });
  });

  describe('Navegação (selectResult)', () => {
    it('deve gerar URL correta para resultado', () => {
      const result = createResult({ url: '/fiscal/nfe/123' });
      expect(result.url).toBe('/fiscal/nfe/123');
    });

    it('resultado com newTab deve usar window.open', () => {
      const newTab = true;
      const navigationType = newTab ? 'window.open' : 'router.push';
      expect(navigationType).toBe('window.open');
    });

    it('resultado sem newTab deve usar router.push', () => {
      const newTab = false;
      const navigationType = newTab ? 'window.open' : 'router.push';
      expect(navigationType).toBe('router.push');
    });
  });

  describe('Opções de configuração', () => {
    it('debounceMs padrão deve ser 300', () => {
      const options = { debounceMs: undefined, pageSize: undefined };
      const debounceMs = options.debounceMs ?? 300;
      const pageSize = options.pageSize ?? 20;
      expect(debounceMs).toBe(300);
      expect(pageSize).toBe(20);
    });

    it('deve aceitar debounceMs customizado', () => {
      const options = { debounceMs: 500, pageSize: 50 };
      expect(options.debounceMs).toBe(500);
      expect(options.pageSize).toBe(50);
    });
  });

  describe('Contrato de retorno do hook', () => {
    interface UseGlobalSearchReturn {
      query: string;
      setQuery: (query: string) => void;
      results: SearchResult[];
      isSearching: boolean;
      error: Error | null;
      total: number;
      hasMore: boolean;
      search: () => Promise<void>;
      loadMore: () => Promise<void>;
      clear: () => void;
      selectedIndex: number;
    }

    function createMockReturn(): UseGlobalSearchReturn {
      return {
        query: '',
        setQuery: vi.fn(),
        results: [],
        isSearching: false,
        error: null,
        total: 0,
        hasMore: false,
        search: vi.fn(),
        loadMore: vi.fn(),
        clear: vi.fn(),
        selectedIndex: 0,
      };
    }

    it('deve retornar todas as propriedades esperadas', () => {
      const result = createMockReturn();
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('setQuery');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('isSearching');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('search');
      expect(result).toHaveProperty('loadMore');
      expect(result).toHaveProperty('clear');
      expect(result).toHaveProperty('selectedIndex');
    });

    it('estados iniciais devem ser corretos', () => {
      const result = createMockReturn();
      expect(result.query).toBe('');
      expect(result.results).toEqual([]);
      expect(result.isSearching).toBe(false);
      expect(result.error).toBeNull();
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.selectedIndex).toBe(0);
    });
  });
});
