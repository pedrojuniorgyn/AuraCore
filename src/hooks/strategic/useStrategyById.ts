/**
 * Hook: useStrategyById
 * Busca estratégia por ID
 * 
 * @module hooks/strategic
 */
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';

export interface Strategy {
  id: string;
  name: string;
  vision: string | null;
  mission: string | null;
  values: string[];
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'REVIEWING' | 'ARCHIVED';
  versionType: 'ACTUAL' | 'BUDGET' | 'FORECAST' | 'SCENARIO';
  versionName?: string;
  workflowStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  submittedAt?: string;
  submittedByUserId?: number;
  approvedAt?: string;
  approvedByUserId?: number;
  rejectedAt?: string;
  rejectedByUserId?: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const useStrategyById = (id: string) => {
  const [data, setData] = useState<Strategy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setIsLoading(true);
        const strategy = await fetchAPI<Strategy>(`/api/strategic/strategies/${id}`);
        setData(strategy);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch strategy'));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchStrategy();
    }
  }, [id]);

  return { data, isLoading, error };
};
