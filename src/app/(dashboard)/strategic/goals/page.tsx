"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

import 'ag-grid-community/styles/ag-theme-quartz.css';

import { Target, Plus, Download, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface Goal {
  id: string;
  code: string;
  description: string;
  perspectiveId: string;
  cascadeLevel: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: string;
  statusColor: string;
  unit: string;
  ownerUserId: string;
  startDate: string;
  dueDate: string;
}

const StatusRenderer = (props: ICellRendererParams<Goal>) => {
  const status = props.value as string;
  const colorMap: Record<string, string> = {
    'ON_TRACK': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'AT_RISK': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'DELAYED': 'bg-red-500/20 text-red-400 border-red-500/30',
    'NOT_STARTED': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'COMPLETED': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  const labelMap: Record<string, string> = {
    'ON_TRACK': 'No Prazo',
    'AT_RISK': 'Em Risco',
    'DELAYED': 'Atrasado',
    'NOT_STARTED': 'Não Iniciado',
    'COMPLETED': 'Concluído',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${colorMap[status] || colorMap['NOT_STARTED']}`}>
      {labelMap[status] || status}
    </span>
  );
};

const ProgressRenderer = (props: ICellRendererParams<Goal>) => {
  const progress = (props.value as number) || 0;
  const color = progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 w-12 text-right">
        {progress.toFixed(0)}%
      </span>
    </div>
  );
};

export default function GoalsPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAPI<{ items: Goal[] }>('/api/strategic/goals?pageSize=100');
      setGoals(result.items || []);
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Summary calculations
  const summary = useMemo(() => ({
    total: goals.length,
    onTrack: goals.filter(g => g.status === 'ON_TRACK').length,
    atRisk: goals.filter(g => g.status === 'AT_RISK').length,
    delayed: goals.filter(g => g.status === 'DELAYED').length,
    completed: goals.filter(g => g.status === 'COMPLETED').length,
  }), [goals]);

  const columnDefs: ColDef<Goal>[] = [
    { 
      field: 'code', 
      headerName: 'Código',
      width: 120,
      pinned: 'left',
      filter: 'agTextColumnFilter',
    },
    { 
      field: 'description', 
      headerName: 'Descrição',
      flex: 2,
      filter: 'agTextColumnFilter',
    },
    { 
      field: 'cascadeLevel', 
      headerName: 'Nível',
      width: 120,
      filter: 'agSetColumnFilter',
    },
    { 
      field: 'progress', 
      headerName: 'Progresso',
      width: 180,
      cellRenderer: ProgressRenderer,
      filter: 'agNumberColumnFilter',
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      cellRenderer: StatusRenderer,
      filter: 'agSetColumnFilter',
    },
    { 
      field: 'targetValue', 
      headerName: 'Meta',
      width: 100,
      valueFormatter: (p) => `${p.value} ${p.data?.unit || ''}`,
      filter: 'agNumberColumnFilter',
    },
    { 
      field: 'currentValue', 
      headerName: 'Atual',
      width: 100,
      valueFormatter: (p) => `${p.value} ${p.data?.unit || ''}`,
      filter: 'agNumberColumnFilter',
    },
    { 
      field: 'dueDate', 
      headerName: 'Prazo',
      width: 120,
      valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString('pt-BR') : '-',
      filter: 'agDateColumnFilter',
    },
  ];

  const onRowClicked = (event: { data: Goal }) => {
    if (event.data?.id) {
      router.push(`/strategic/goals/${event.data.id}`);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-2">
        {/* Header */}
        <PageHeader
          icon="🎯"
          title="Objetivos Estratégicos"
          description="Gestão de metas e objetivos do BSC"
          recordCount={goals.length}
          showBack
          onRefresh={fetchGoals}
          isLoading={loading}
          actions={
            <>
              <RippleButton
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </RippleButton>
              <Link href="/strategic/map">
                <RippleButton
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Ver Mapa
                </RippleButton>
              </Link>
              <Link href="/strategic/goals/new">
                <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Objetivo
                </RippleButton>
              </Link>
            </>
          }
        />

        {/* Summary Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <EnterpriseMetricCard
              icon={<Target className="h-6 w-6 text-purple-400" />}
              badge="Total"
              title="Total de Objetivos"
              value={summary.total}
              subtitle="objetivos cadastrados"
              variant="purple"
              delay={0.2}
            />
            <EnterpriseMetricCard
              icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
              badge="No Prazo"
              badgeEmoji="✅"
              title="No Prazo"
              value={summary.onTrack}
              subtitle="dentro da meta"
              variant="green"
              delay={0.3}
            />
            <EnterpriseMetricCard
              icon={<Clock className="h-6 w-6 text-amber-400" />}
              badge="Em Risco"
              badgeEmoji="⚠️"
              title="Em Risco"
              value={summary.atRisk}
              subtitle="necessitam atenção"
              variant="yellow"
              delay={0.4}
            />
            <EnterpriseMetricCard
              icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
              badge="Atrasado"
              badgeEmoji="❌"
              title="Atrasados"
              value={summary.delayed}
              subtitle="ação imediata"
              variant="red"
              delay={0.5}
              isUrgent={summary.delayed > 0}
            />
            <EnterpriseMetricCard
              icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
              badge="Concluído"
              badgeEmoji="🏆"
              title="Concluídos"
              value={summary.completed}
              subtitle="objetivos alcançados"
              variant="blue"
              delay={0.6}
            />
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.1}>
          <GlassmorphismCard>
            <div 
              className="ag-theme-quartz-dark" 
              style={{ height: 'calc(100vh - 280px)', width: '100%' }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={goals}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true,
                }}
                onRowClicked={onRowClicked}
                rowSelection="single"
                animateRows={true}
                pagination={true}
                paginationPageSize={25}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
