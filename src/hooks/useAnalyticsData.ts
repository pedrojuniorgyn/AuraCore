'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AnalyticsData, TimeRangeKey } from '@/lib/analytics/analytics-types';

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para buscar dados de analytics
 *
 * @param timeRange - Período de tempo ('7d', '30d', '90d', 'ytd')
 */
export function useAnalyticsData(timeRange: TimeRangeKey | string): UseAnalyticsDataReturn {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/strategic/analytics?timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
