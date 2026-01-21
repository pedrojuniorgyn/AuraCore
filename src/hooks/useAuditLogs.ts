'use client';

/**
 * Hook para gerenciar logs de auditoria
 * @module hooks/useAuditLogs
 */

import { useState, useCallback, useEffect } from 'react';
import { auditService } from '@/lib/audit/audit-service';
import type {
  AuditLog,
  AuditFilter,
  EntityHistory,
  VersionComparison,
  AuditEntityType,
} from '@/lib/audit/audit-types';

interface UseAuditLogsOptions {
  autoFetch?: boolean;
  initialFilter?: AuditFilter;
}

interface UseAuditLogsReturn {
  logs: AuditLog[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;

  filter: AuditFilter;
  setFilter: (filter: AuditFilter) => void;

  fetchLogs: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  getEntityHistory: (type: AuditEntityType, id: string) => Promise<EntityHistory>;
  compareVersions: (
    type: AuditEntityType,
    id: string,
    from: number,
    to: number
  ) => Promise<VersionComparison>;

  exportLogs: (format?: 'csv' | 'xlsx') => Promise<void>;
  restoreEntity: (type: AuditEntityType, id: string) => Promise<void>;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsReturn {
  const { autoFetch = true, initialFilter = {} } = options;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<AuditFilter>(initialFilter);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditService.getLogs({ ...filter, page: 1 });
      setLogs(response.logs);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    const nextPage = Math.ceil(logs.length / (filter.pageSize || 20)) + 1;

    try {
      const response = await auditService.getLogs({ ...filter, page: nextPage });
      setLogs((prev) => [...prev, ...response.logs]);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, hasMore, isLoading, logs.length]);

  const refresh = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  const getEntityHistory = useCallback(
    async (type: AuditEntityType, id: string): Promise<EntityHistory> => {
      return auditService.getEntityHistory(type, id);
    },
    []
  );

  const compareVersions = useCallback(
    async (
      type: AuditEntityType,
      id: string,
      from: number,
      to: number
    ): Promise<VersionComparison> => {
      return auditService.compareVersions(type, id, from, to);
    },
    []
  );

  const exportLogs = useCallback(
    async (format: 'csv' | 'xlsx' = 'xlsx') => {
      const blob = await auditService.exportLogs(filter, format);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [filter]
  );

  const restoreEntity = useCallback(
    async (type: AuditEntityType, id: string) => {
      await auditService.restoreEntity(type, id);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchLogs();
    }
  }, [autoFetch, fetchLogs]);

  return {
    logs,
    total,
    isLoading,
    error,
    hasMore,
    filter,
    setFilter,
    fetchLogs,
    loadMore,
    refresh,
    getEntityHistory,
    compareVersions,
    exportLogs,
    restoreEntity,
  };
}
