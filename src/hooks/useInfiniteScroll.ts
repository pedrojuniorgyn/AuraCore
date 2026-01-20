'use client';

/**
 * useInfiniteScroll Hook
 * 
 * Hook para implementar scroll infinito com carregamento progressivo.
 * Usa IntersectionObserver para detectar quando carregar mais dados.
 * 
 * @module hooks/useInfiniteScroll
 * @since E9 - Performance Optimizations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

interface FetchResult<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}

interface UseInfiniteScrollOptions<T> {
  /** Dados iniciais (opcional) */
  initialData?: T[];
  /** Tamanho da página */
  pageSize?: number;
  /** Função para buscar dados */
  fetchFn: (page: number, pageSize: number) => Promise<FetchResult<T>>;
  /** Se true, não faz fetch inicial automaticamente */
  manual?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  /** Dados carregados */
  data: T[];
  /** Se está carregando dados iniciais */
  isLoading: boolean;
  /** Se está carregando mais dados */
  isLoadingMore: boolean;
  /** Erro ocorrido */
  error: Error | null;
  /** Se há mais dados para carregar */
  hasMore: boolean;
  /** Total de itens (se disponível) */
  total: number | null;
  /** Ref para o elemento sentinela de load more */
  loadMoreRef: (node: Element | null) => void;
  /** Função para recarregar dados */
  refresh: () => Promise<void>;
  /** Função para carregar mais manualmente */
  loadMore: () => Promise<void>;
}

/**
 * Hook para scroll infinito
 * 
 * @example
 * ```tsx
 * const { data, isLoading, loadMoreRef, hasMore } = useInfiniteScroll({
 *   pageSize: 20,
 *   fetchFn: async (page, pageSize) => {
 *     const res = await fetch(`/api/items?page=${page}&limit=${pageSize}`);
 *     return res.json();
 *   },
 * });
 * 
 * return (
 *   <div>
 *     {data.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={loadMoreRef}>{hasMore && 'Carregando...'}</div>
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll<T>({
  initialData = [],
  pageSize = 20,
  fetchFn,
  manual = false,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(!manual);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  
  const isMountedRef = useRef(true);
  const isInitialFetchDoneRef = useRef(false);

  // Intersection observer para o trigger de load more
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '200px',
    threshold: 0,
  });

  // Fetch inicial
  const fetchInitial = useCallback(async () => {
    if (isInitialFetchDoneRef.current && manual) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn(1, pageSize);
      
      if (isMountedRef.current) {
        setData(result.data);
        setHasMore(result.hasMore);
        setTotal(result.total ?? null);
        setPage(1);
        isInitialFetchDoneRef.current = true;
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Erro ao carregar dados'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, pageSize, manual]);

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    
    setIsLoadingMore(true);
    setError(null);
    
    try {
      const nextPage = page + 1;
      const result = await fetchFn(nextPage, pageSize);
      
      if (isMountedRef.current) {
        setData(prev => [...prev, ...result.data]);
        setHasMore(result.hasMore);
        setTotal(result.total ?? null);
        setPage(nextPage);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Erro ao carregar mais dados'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [fetchFn, pageSize, page, isLoadingMore, hasMore, isLoading]);

  // Trigger load more quando sentinela fica visível
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoadingMore && !isLoading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, isLoadingMore, isLoading, loadMore]);

  // Initial load
  useEffect(() => {
    if (!manual) {
      fetchInitial();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchInitial, manual]);

  // Refresh function
  const refresh = useCallback(async () => {
    isInitialFetchDoneRef.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    loadMoreRef,
    refresh,
    loadMore,
  };
}
