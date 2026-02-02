/**
 * Hook: useApprovalHistory
 * Busca histórico de aprovações de uma estratégia
 * 
 * @module hooks/strategic
 */
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';

export interface ApprovalHistoryEntry {
  id: string;
  strategyId: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'RESUBMIT';
  actorUserId: number;
  actorName?: string;
  comments?: string;
  reason?: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
}

interface ApprovalHistoryResponse {
  success: boolean;
  data: ApprovalHistoryEntry[];
}

export const useApprovalHistory = (strategyId: string) => {
  const [data, setData] = useState<ApprovalHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetchAPI<ApprovalHistoryResponse>(
          `/api/strategic/strategies/${strategyId}/workflow`
        );
        setData(response.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch approval history'));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (strategyId) {
      fetchHistory();
    }
  }, [strategyId]);

  return { data, isLoading, error, refetch: () => {} };
};
