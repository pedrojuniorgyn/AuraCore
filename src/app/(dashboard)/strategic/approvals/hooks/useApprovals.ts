/**
 * Hook: useApprovals
 * Hook unificado para buscar aprovações pendentes, histórico e minhas submissões
 * 
 * @module app/(dashboard)/strategic/approvals/hooks
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';

export interface PendingApproval {
  id: string;
  strategyId: string;
  strategyTitle: string;
  strategyCode: string;
  versionType: string;
  submittedBy: string;
  submittedByUserId: number;
  submittedAt: string;
  daysAgo: number;
  isUrgent: boolean;
}

export interface ApprovalHistoryItem {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyCode: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | string;
  decision?: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  actorUserId: number;
  actorName?: string;
  comments?: string;
  reason?: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
}

export interface MySubmission {
  id: string;
  strategyId: string;
  strategyTitle: string;
  strategyCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

interface PendingResponse {
  success: boolean;
  total: number;
  data: Array<{
    id: string;
    name: string;
    versionType: string;
    submittedAt?: string;
    submittedByUserId?: number;
  }>;
}

interface HistoryResponse {
  success: boolean;
  total: number;
  data: ApprovalHistoryItem[];
}

interface SubmissionsResponse {
  success: boolean;
  total: number;
  data: MySubmission[];
}

export function useApprovals() {
  const [pending, setPending] = useState<PendingApproval[] | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryItem[] | null>(null);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Buscar todas as APIs em paralelo
      const [pendingRes, historyRes, submissionsRes] = await Promise.allSettled([
        fetchAPI<PendingResponse>('/api/strategic/workflow/pending'),
        fetchAPI<HistoryResponse>('/api/strategic/workflow/history'),
        fetchAPI<SubmissionsResponse>('/api/strategic/workflow/my-submissions'),
      ]);

      // Processar aprovações pendentes
      if (pendingRes.status === 'fulfilled' && pendingRes.value.success && pendingRes.value.data) {
        const now = new Date();
        const pendingData: PendingApproval[] = pendingRes.value.data.map(item => {
          const submittedDate = item.submittedAt ? new Date(item.submittedAt) : now;
          const daysAgo = Math.ceil((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: item.id,
            strategyId: item.id,
            strategyTitle: item.name,
            strategyCode: item.id.substring(0, 8).toUpperCase(),
            versionType: item.versionType,
            submittedBy: `Usuário #${item.submittedByUserId || 0}`,
            submittedByUserId: item.submittedByUserId || 0,
            submittedAt: item.submittedAt || now.toISOString(),
            daysAgo,
            isUrgent: daysAgo >= 3,
          };
        });
        setPending(pendingData);
      } else {
        setPending([]);
      }

      // Processar histórico
      if (historyRes.status === 'fulfilled' && historyRes.value.success && historyRes.value.data) {
        setHistory(historyRes.value.data);
      } else {
        setHistory([]);
      }

      // Processar minhas submissões
      if (submissionsRes.status === 'fulfilled' && submissionsRes.value.success && submissionsRes.value.data) {
        setMySubmissions(submissionsRes.value.data);
      } else {
        setMySubmissions([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar aprovações';
      setError(new Error(errorMessage));
      toast.error('Erro ao carregar aprovações', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    
    // Polling a cada 30 segundos
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    pending,
    history,
    mySubmissions,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
