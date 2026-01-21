'use client';

/**
 * Hook para gerenciar OKRs
 * @module hooks/useOKRs
 */

import { useState, useCallback, useEffect } from 'react';
import { okrService } from '@/lib/okrs/okr-service';
import type { OKR, KeyResult, OKRFilters, OKRTreeNode } from '@/lib/okrs/okr-types';

interface UseOKRsReturn {
  okrs: OKR[];
  tree: OKRTreeNode[];
  isLoading: boolean;
  error: Error | null;

  filters: OKRFilters;
  setFilters: (filters: OKRFilters) => void;

  createOKR: (okr: Partial<OKR>) => Promise<OKR>;
  updateOKR: (id: string, updates: Partial<OKR>) => Promise<void>;
  deleteOKR: (id: string) => Promise<void>;

  addKeyResult: (okrId: string, kr: Partial<KeyResult>) => Promise<KeyResult>;
  updateKeyResult: (okrId: string, krId: string, updates: Partial<KeyResult>) => Promise<void>;
  updateKeyResultValue: (
    okrId: string,
    krId: string,
    value: number,
    comment?: string
  ) => Promise<void>;
  deleteKeyResult: (okrId: string, krId: string) => Promise<void>;

  refresh: () => Promise<void>;
  refreshTree: () => Promise<void>;
}

export function useOKRs(initialFilters?: OKRFilters): UseOKRsReturn {
  const [okrs, setOKRs] = useState<OKR[]>([]);
  const [tree, setTree] = useState<OKRTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<OKRFilters>(initialFilters || {});

  const fetchOKRs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await okrService.getOKRs(filters);
      setOKRs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch OKRs'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchTree = useCallback(async () => {
    try {
      const data = await okrService.getOKRTree();
      setTree(data);
    } catch (err) {
      console.error('Failed to fetch OKR tree:', err);
    }
  }, []);

  useEffect(() => {
    fetchOKRs();
    fetchTree();
  }, [fetchOKRs, fetchTree]);

  const setFilters = useCallback((newFilters: OKRFilters) => {
    setFiltersState(newFilters);
  }, []);

  const createOKR = useCallback(
    async (okr: Partial<OKR>) => {
      const created = await okrService.createOKR(okr);
      setOKRs((prev) => [...prev, created]);
      fetchTree();
      return created;
    },
    [fetchTree]
  );

  const updateOKR = useCallback(
    async (id: string, updates: Partial<OKR>) => {
      const updated = await okrService.updateOKR(id, updates);
      setOKRs((prev) => prev.map((o) => (o.id === id ? updated : o)));
      fetchTree();
    },
    [fetchTree]
  );

  const deleteOKR = useCallback(
    async (id: string) => {
      await okrService.deleteOKR(id);
      setOKRs((prev) => prev.filter((o) => o.id !== id));
      fetchTree();
    },
    [fetchTree]
  );

  const addKeyResult = useCallback(async (okrId: string, kr: Partial<KeyResult>) => {
    const created = await okrService.addKeyResult(okrId, kr);
    setOKRs((prev) =>
      prev.map((o) => {
        if (o.id === okrId) {
          return { ...o, keyResults: [...o.keyResults, created] };
        }
        return o;
      })
    );
    return created;
  }, []);

  const updateKeyResult = useCallback(
    async (okrId: string, krId: string, updates: Partial<KeyResult>) => {
      const updated = await okrService.updateKeyResult(okrId, krId, updates);
      setOKRs((prev) =>
        prev.map((o) => {
          if (o.id === okrId) {
            return {
              ...o,
              keyResults: o.keyResults.map((kr) => (kr.id === krId ? updated : kr)),
            };
          }
          return o;
        })
      );
    },
    []
  );

  const updateKeyResultValue = useCallback(
    async (okrId: string, krId: string, value: number, comment?: string) => {
      const updated = await okrService.updateKeyResultValue(okrId, krId, value, comment);
      setOKRs((prev) =>
        prev.map((o) => {
          if (o.id === okrId) {
            return {
              ...o,
              keyResults: o.keyResults.map((kr) => (kr.id === krId ? updated : kr)),
              progress: okrService.calculateProgress(
                o.keyResults.map((kr) => (kr.id === krId ? updated : kr))
              ),
            };
          }
          return o;
        })
      );
      fetchTree();
    },
    [fetchTree]
  );

  const deleteKeyResult = useCallback(async (okrId: string, krId: string) => {
    await okrService.deleteKeyResult(okrId, krId);
    setOKRs((prev) =>
      prev.map((o) => {
        if (o.id === okrId) {
          return {
            ...o,
            keyResults: o.keyResults.filter((kr) => kr.id !== krId),
          };
        }
        return o;
      })
    );
  }, []);

  return {
    okrs,
    tree,
    isLoading,
    error,
    filters,
    setFilters,
    createOKR,
    updateOKR,
    deleteOKR,
    addKeyResult,
    updateKeyResult,
    updateKeyResultValue,
    deleteKeyResult,
    refresh: fetchOKRs,
    refreshTree: fetchTree,
  };
}
