'use client';

/**
 * Página: Action Plans Grid View
 * Visualização em tabela AG-Grid dos planos de ação 5W2H
 * 
 * @module app/(dashboard)/strategic/action-plans/grid
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutList,
  Plus,
  Layers,
} from 'lucide-react';

import { PageTransition } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { ActionPlanGrid } from '@/components/strategic/ActionPlanGrid';
import type { ActionPlanApiItem, ActionPlansApiResponse } from '@/types/strategic';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

interface ActionPlanGridItem {
  id: string;
  code: string;
  what: string;
  who: string;
  whereLocation: string;
  whenStart: string;
  whenEnd: string;
  how: string;
  howMuchAmount?: number | null;
  howMuchCurrency?: string | null;
  pdcaCycle: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
  completionPercent: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  isOverdue: boolean;
  daysUntilDue: number;
}

export default function ActionPlansGridPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ActionPlanGridItem[]>([]);

  const fetchActionPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI<ActionPlansApiResponse>('/api/strategic/action-plans?pageSize=100');
      
      const mapped: ActionPlanGridItem[] = data.items.map((item: ActionPlanApiItem) => {
        const daysUntilDue = Math.ceil(
          (new Date(item.whenEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: item.id,
          code: item.code,
          what: item.what,
          who: item.who,
          whereLocation: item.whereLocation,
          whenStart: item.whenStart,
          whenEnd: item.whenEnd,
          how: item.how,
          howMuchAmount: item.howMuchAmount,
          howMuchCurrency: item.howMuchCurrency,
          pdcaCycle: item.pdcaCycle as ActionPlanGridItem['pdcaCycle'],
          completionPercent: item.completionPercent,
          priority: item.priority as ActionPlanGridItem['priority'],
          status: item.status as ActionPlanGridItem['status'],
          isOverdue: item.isOverdue,
          daysUntilDue,
        };
      });
      
      setPlans(mapped);
    } catch (error) {
      console.error('Failed to load action plans:', error);
      toast.error('Erro ao carregar planos de ação');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionPlans();
  }, [fetchActionPlans]);

  return (
    <PageTransition>
      <div className="space-y-6 p-2">
        {/* Header */}
        <PageHeader
          icon="📋"
          title="Planos de Ação 5W2H"
          description="Visualização em grid com filtros e ordenação avançados"
          recordCount={plans.length}
          showBack
          onRefresh={fetchActionPlans}
          isLoading={loading}
          actions={
            <>
              <Link href="/strategic/action-plans">
                <RippleButton
                  className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400"
                >
                  <LayoutList className="w-4 h-4 mr-2" />
                  Kanban
                </RippleButton>
              </Link>
              <Link href="/strategic/pdca">
                <RippleButton
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Ver por PDCA
                </RippleButton>
              </Link>
              <Link href="/strategic/action-plans/new">
                <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Plano
                </RippleButton>
              </Link>
            </>
          }
        />

        {/* Grid */}
        <ActionPlanGrid data={plans} loading={loading} />
      </div>
    </PageTransition>
  );
}
