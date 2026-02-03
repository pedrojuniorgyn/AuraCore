/**
 * Hook: usePendingApprovals
 * Busca estratégias pendentes de aprovação
 * 
 * @module hooks/strategic
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';

export interface PendingStrategy {
  id: string;
  name: string;
  versionType: 'ACTUAL' | 'BUDGET' | 'FORECAST' | 'SCENARIO';
  versionName?: string;
  workflowStatus: string;
  /**
   * Data de submissão - pode ser undefined se estratégia foi criada
   * mas nunca submetida (edge case, mas possível em dados legados)
   */
  submittedAt?: string;
  submittedByUserId?: number;
  createdAt: string;
  updatedAt: string;
}

interface PendingApprovalsResponse {
  success: boolean;
  total: number;
  data: PendingStrategy[];
}

export const usePendingApprovals = () => {
  const [data, setData] = useState<PendingStrategy[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchAPI<PendingApprovalsResponse>(
        '/api/strategic/workflow/pending'
      );
      setData(response.data || []);
      setTotal(response.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch pending approvals'));
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  return { data, total, isLoading, error, refetch: fetchPending };
};
