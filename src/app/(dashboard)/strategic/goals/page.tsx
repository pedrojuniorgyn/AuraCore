"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

import 'ag-grid-community/styles/ag-theme-quartz.css';

import { Card, Title, Text, Flex, Badge } from '@tremor/react';
import { Target, Plus, RefreshCw, ArrowLeft } from 'lucide-react';

import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';

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

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/goals?pageSize=100');
      if (response.ok) {
        const result = await response.json();
        setGoals(result.items || []);
      }
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-4xl font-bold">
                  Objetivos Estratégicos
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Gestão de metas e objetivos do BSC
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={fetchGoals}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
              <RippleButton onClick={() => router.push('/strategic/map')}>
                <Target className="w-4 h-4 mr-2" />
                Ver Mapa
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

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
