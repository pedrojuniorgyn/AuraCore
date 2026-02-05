"use client";

/**
 * Página: Action Plans Kanban (por Status)
 * Gerenciamento de planos de ação 5W2H
 * 
 * @module app/(dashboard)/strategic/action-plans
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  Text, 
  Title,
  Flex, 
  Select,
  SelectItem,
} from '@tremor/react';
import { RefreshCw } from 'lucide-react';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  ClipboardList,
  Plus,
  Filter,
  Layers,
  Download,
  TrendingUp,
  LayoutGrid,
} from 'lucide-react';

import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';
import { 
  ActionPlanKanban, 
  type StatusColumn, 
  type ActionPlanItem 
} from '@/components/strategic/ActionPlanKanban';
import type { ActionPlanStatus } from '@/components/strategic/ActionPlanCard';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

// Tipos compartilhados (Single Source of Truth)
import type { 
  ActionPlanApiItem, 
  ActionPlansApiResponse,
} from '@/types/strategic';

export default function ActionPlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ActionPlanItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [pdcaFilter, setPdcaFilter] = useState<string>('all');

  // fetchActionPlans é estável (sem dependencies que mudam)
  // Isso garante que handleStatusChange também seja estável
  const fetchActionPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI<ActionPlansApiResponse>('/api/strategic/action-plans?pageSize=100');
      // Filtrar DRAFT (não exibido no Kanban) e mapear para ActionPlanItem
      const kanbanStatuses: ActionPlanStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'];
      const mapped: ActionPlanItem[] = data.items
        .filter((item) => kanbanStatuses.includes(item.status as ActionPlanStatus))
        .map((item: ActionPlanApiItem) => {
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
            pdcaCycle: item.pdcaCycle as ActionPlanItem['pdcaCycle'],
            completionPercent: item.completionPercent,
            priority: item.priority as ActionPlanItem['priority'],
            status: item.status as ActionPlanStatus, // Garantido pelo filter acima
            isOverdue: item.isOverdue,
            daysUntilDue,
            followUpCount: 0, // Contagem de follow-ups (aguardando endpoint dedicado)
          };
        });
      setPlans(mapped);
    } catch (error) {
      console.error('Failed to load action plans:', error);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Estável - sem dependencies

  useEffect(() => {
    fetchActionPlans();
  }, [fetchActionPlans]);

  // Filtrar planos
  const filteredPlans = plans.filter(plan => {
    if (priorityFilter !== 'all' && plan.priority !== priorityFilter) return false;
    if (pdcaFilter !== 'all' && plan.pdcaCycle !== pdcaFilter) return false;
    return true;
  });

  // Agrupar por status para o Kanban
  const columns: StatusColumn[] = [
    {
      id: 'PENDING',
      title: 'Pendente',
      items: filteredPlans.filter(p => p.status === 'PENDING'),
    },
    {
      id: 'IN_PROGRESS',
      title: 'Em Andamento',
      items: filteredPlans.filter(p => p.status === 'IN_PROGRESS'),
    },
    {
      id: 'COMPLETED',
      title: 'Concluído',
      items: filteredPlans.filter(p => p.status === 'COMPLETED'),
    },
  ];

  // handleStatusChange depende apenas de fetchActionPlans (estável)
  const handleStatusChange = useCallback(async (
    planId: string,
    newStatus: ActionPlanStatus
  ) => {
    try {
      await fetchAPI(`/api/strategic/action-plans/${planId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      
      await fetchActionPlans();
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  }, [fetchActionPlans]); // ✅ fetchActionPlans é estável, então isso também é

  const handleCardClick = useCallback((planId: string) => {
    router.push(`/strategic/action-plans/${planId}`);
  }, [router]);

  // Stats
  const stats = {
    total: plans.length,
    pending: plans.filter(p => p.status === 'PENDING').length,
    inProgress: plans.filter(p => p.status === 'IN_PROGRESS').length,
    completed: plans.filter(p => p.status === 'COMPLETED').length,
    overdue: plans.filter(p => p.isOverdue && p.status !== 'COMPLETED').length,
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-2">
        {/* Header */}
        <PageHeader
          icon="📋"
          title="Planos de Ação 5W2H"
          description="Gerencie planos de ação com metodologia 5W2H"
          recordCount={stats.total}
          showBack
          onRefresh={fetchActionPlans}
          isLoading={loading}
          actions={
            <>
              <Link href="/strategic/action-plans/grid">
                <RippleButton
                  className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Grid
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
              <RippleButton
                onClick={() => toast.info('Exportação em desenvolvimento', {
                  description: 'A funcionalidade de exportação Excel/CSV para Planos de Ação estará disponível em breve'
                })}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </RippleButton>
              <Link href="/strategic/action-plans/new">
                <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Plano
                </RippleButton>
              </Link>
            </>
          }
        />

        {/* Stats Cards - Enterprise Pattern */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <EnterpriseMetricCard
              icon={<ClipboardList className="h-6 w-6 text-purple-400" />}
              badge="Total"
              title="Total de Planos"
              value={stats.total}
              subtitle="planos cadastrados"
              variant="purple"
              delay={0.2}
            />
            <EnterpriseMetricCard
              icon={<Clock className="h-6 w-6 text-gray-400" />}
              badge="Pendente"
              badgeEmoji="⏳"
              title="Pendentes"
              value={stats.pending}
              subtitle="aguardando início"
              variant="blue"
              delay={0.3}
            />
            <EnterpriseMetricCard
              icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
              badge="Ativo"
              badgeEmoji="🔄"
              title="Em Andamento"
              value={stats.inProgress}
              subtitle="em execução"
              variant="blue"
              delay={0.4}
            />
            <EnterpriseMetricCard
              icon={<CheckCircle className="h-6 w-6 text-green-400" />}
              badge="Concluído"
              badgeEmoji="✅"
              title="Concluídos"
              value={stats.completed}
              subtitle="finalizados"
              variant="green"
              delay={0.5}
            />
            <EnterpriseMetricCard
              icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
              badge="Atrasado"
              badgeEmoji="❌"
              title="Atrasados"
              value={stats.overdue}
              subtitle="ação urgente"
              variant="red"
              delay={0.6}
              isUrgent={stats.overdue > 0}
            />
          </div>
        </StaggerContainer>

        {/* Filters */}
        <FadeIn delay={0.15}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Flex justifyContent="between" alignItems="center">
              <Flex className="gap-2" alignItems="center">
                <Filter className="w-4 h-4 text-gray-500" />
                <Text className="text-gray-400">Filtros</Text>
              </Flex>
              <Flex className="gap-3">
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                  className="w-40"
                >
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="LOW">Baixa</SelectItem>
                </Select>

                <Select
                  value={pdcaFilter}
                  onValueChange={setPdcaFilter}
                  className="w-36"
                >
                  <SelectItem value="all">Todas Fases</SelectItem>
                  <SelectItem value="PLAN">PLAN</SelectItem>
                  <SelectItem value="DO">DO</SelectItem>
                  <SelectItem value="CHECK">CHECK</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                </Select>
              </Flex>
            </Flex>
          </Card>
        </FadeIn>

        {/* Kanban Board */}
        <FadeIn delay={0.2}>
          <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="mb-4">
              <Title className="text-white">Quadro por Status</Title>
              <Text className="text-gray-400">
                Arraste os cards para alterar o status dos planos de ação
              </Text>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                  <Text className="text-gray-400">Carregando planos de ação...</Text>
                </div>
              </div>
            ) : filteredPlans.length > 0 ? (
              <ActionPlanKanban
                columns={columns}
                onStatusChange={handleStatusChange}
                onCardClick={handleCardClick}
                onRefresh={fetchActionPlans}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <Title className="text-gray-400">Nenhum plano de ação</Title>
                  <Text className="text-gray-500 mt-2">
                    {priorityFilter !== 'all' || pdcaFilter !== 'all'
                      ? 'Nenhum plano encontrado com os filtros selecionados.'
                      : 'Crie planos de ação para gerenciá-los aqui.'}
                  </Text>
                  <RippleButton 
                    className="mt-4"
                    onClick={() => router.push('/strategic/action-plans/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Plano de Ação
                  </RippleButton>
                </div>
              </div>
            )}
          </Card>
        </FadeIn>

        {/* 5W2H Legend */}
        <FadeIn delay={0.3}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Title className="text-white text-sm mb-3">Metodologia 5W2H</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-400 font-medium">WHAT</span>
                <Text className="text-gray-500 text-xs">O que será feito</Text>
              </div>
              <div>
                <span className="text-blue-400 font-medium">WHY</span>
                <Text className="text-gray-500 text-xs">Por que será feito</Text>
              </div>
              <div>
                <span className="text-blue-400 font-medium">WHERE</span>
                <Text className="text-gray-500 text-xs">Onde será feito</Text>
              </div>
              <div>
                <span className="text-blue-400 font-medium">WHEN</span>
                <Text className="text-gray-500 text-xs">Quando será feito</Text>
              </div>
              <div>
                <span className="text-emerald-400 font-medium">WHO</span>
                <Text className="text-gray-500 text-xs">Quem fará</Text>
              </div>
              <div>
                <span className="text-emerald-400 font-medium">HOW</span>
                <Text className="text-gray-500 text-xs">Como será feito</Text>
              </div>
              <div>
                <span className="text-amber-400 font-medium">HOW MUCH</span>
                <Text className="text-gray-500 text-xs">Quanto custará</Text>
              </div>
            </div>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
