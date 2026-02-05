'use client';

import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { BaseGrid } from '@/components/strategic/shared/BaseGrid';
import { StatusBadgeCell } from '@/lib/aggrid/customCells/StatusBadgeCell';
import { ActionsCell } from '@/lib/aggrid/customCells/ActionsCell';
import { useRouter } from 'next/navigation';

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

interface ActionPlanGridProps {
  data: ActionPlanGridItem[];
  loading?: boolean;
}

// Mapeamentos para labels pt-BR
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Planejado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const PDCA_LABELS: Record<string, string> = {
  PLAN: 'Planejar',
  DO: 'Executar',
  CHECK: 'Verificar',
  ACT: 'Agir',
};

// Cell Renderer para Prioridade com badges coloridos
function PriorityCellRenderer(params: { value: string }) {
  const COLORS: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800 border-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300',
    HIGH: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  };

  const label = PRIORITY_LABELS[params.value] || params.value;
  const colorClass = COLORS[params.value] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border-2 ${colorClass}`}>
      {label}
    </span>
  );
}

// Cell Renderer para Ciclo PDCA com badges coloridos
function PDCACellRenderer(params: { value: string }) {
  const COLORS: Record<string, string> = {
    PLAN: 'bg-blue-100 text-blue-800 border-blue-300',
    DO: 'bg-purple-100 text-purple-800 border-purple-300',
    CHECK: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ACT: 'bg-green-100 text-green-800 border-green-300',
  };

  const label = PDCA_LABELS[params.value] || params.value;
  const colorClass = COLORS[params.value] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border-2 ${colorClass}`}>
      {label}
    </span>
  );
}

// Cell Renderer para Progresso com barra
function ProgressCellRenderer(params: { value: number; data: ActionPlanGridItem }) {
  if (!params.data) return null;

  const percent = params.value;
  const color = percent >= 100 ? 'bg-green-500' : 
                percent >= 70 ? 'bg-blue-500' : 
                percent >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 min-w-[40px] text-right">
        {percent}%
      </span>
    </div>
  );
}

// Cell Renderer para Data com indicador de atraso
function DateCellRenderer(params: { value: string; data: ActionPlanGridItem }) {
  if (!params.data || !params.value) return null;

  const date = new Date(params.value);
  const formatted = date.toLocaleDateString('pt-BR');
  const isOverdue = params.data.isOverdue;

  if (isOverdue && params.data.status !== 'COMPLETED') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-600 font-medium">{formatted}</span>
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 border border-red-300">
          Atrasado
        </span>
      </div>
    );
  }

  return <span>{formatted}</span>;
}

// Cell Renderer para Custo
function CostCellRenderer(params: { data: ActionPlanGridItem }) {
  if (!params.data) return null;

  const amount = params.data.howMuchAmount;
  const currency = params.data.howMuchCurrency;
  
  if (amount === 0 || amount === null || amount === undefined) {
    return <span className="text-gray-400 text-xs italic">N/A</span>;
  }

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(amount);

  return <span className="font-medium">{formatted}</span>;
}

export function ActionPlanGrid({ data, loading = false }: ActionPlanGridProps) {
  const router = useRouter();

  const columnDefs = useMemo<ColDef<ActionPlanGridItem>[]>(
    () => [
      { 
        field: 'code', 
        headerName: 'Código',
        width: 120,
        pinned: 'left',
        cellClass: 'font-mono text-sm font-semibold text-blue-600 cursor-pointer',
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { data: ActionPlanGridItem; value: string }) => {
          if (!params.data) return null;
          return (
            <button
              onClick={() => router.push(`/strategic/action-plans/${params.data.id}`)}
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {params.value}
            </button>
          );
        },
      },
      { 
        field: 'what', 
        headerName: 'O que fazer',
        flex: 2,
        minWidth: 200,
        filter: 'agTextColumnFilter',
        cellClass: 'font-medium',
      },
      { 
        field: 'who', 
        headerName: 'Responsável',
        width: 150,
        filter: 'agTextColumnFilter',
        enableRowGroup: true,
      },
      { 
        field: 'status', 
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[params.value] || params.value,
        cellRenderer: (params: { value: string }) => {
          const statusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
            COMPLETED: 'success',
            IN_PROGRESS: 'warning',
            PENDING: 'neutral',
            BLOCKED: 'error',
            CANCELLED: 'error',
            DRAFT: 'neutral',
          };
          return StatusBadgeCell({
            value: statusMap[params.value] || 'neutral',
          } as Parameters<typeof StatusBadgeCell>[0]);
        },
        filter: 'agSetColumnFilter',
        filterParams: {
          values: Object.keys(STATUS_LABELS),
          valueFormatter: (params: { value: string }) => STATUS_LABELS[params.value] || params.value,
        },
        enableRowGroup: true,
      },
      { 
        field: 'priority', 
        headerName: 'Prioridade',
        width: 130,
        cellRenderer: PriorityCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: Object.keys(PRIORITY_LABELS),
          valueFormatter: (params: { value: string }) => PRIORITY_LABELS[params.value] || params.value,
        },
        enableRowGroup: true,
      },
      { 
        field: 'pdcaCycle', 
        headerName: 'Ciclo PDCA',
        width: 130,
        cellRenderer: PDCACellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: Object.keys(PDCA_LABELS),
          valueFormatter: (params: { value: string }) => PDCA_LABELS[params.value] || params.value,
        },
        enableRowGroup: true,
      },
      { 
        field: 'completionPercent', 
        headerName: 'Progresso',
        width: 180,
        cellRenderer: ProgressCellRenderer,
        filter: 'agNumberColumnFilter',
      },
      { 
        field: 'whenEnd', 
        headerName: 'Prazo',
        width: 180,
        cellRenderer: DateCellRenderer,
        sort: 'asc',
        filter: 'agDateColumnFilter',
      },
      { 
        headerName: 'Custo',
        width: 150,
        cellRenderer: CostCellRenderer,
        valueGetter: (params) => params.data?.howMuchAmount || 0,
        filter: 'agNumberColumnFilter',
      },
      { 
        field: 'whereLocation', 
        headerName: 'Onde',
        width: 150,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'actions', // Necessário para mobileColumns filter no BaseGrid
        headerName: 'Ações',
        width: 120,
        pinned: 'right',
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onView: (data: ActionPlanGridItem) => router.push(`/strategic/action-plans/${data.id}`),
          onEdit: (data: ActionPlanGridItem) => router.push(`/strategic/action-plans/${data.id}/edit`),
        },
        sortable: false,
        filter: false,
        suppressMenu: true,
      },
    ],
    [router]
  );

  return (
    <BaseGrid<ActionPlanGridItem>
      rowData={data}
      columnDefs={columnDefs}
      loading={loading}
      paginationPageSize={20}
      enableExport
      moduleName="Planos de Ação"
      mobileColumns={['code', 'what', 'status', 'priority', 'actions']}
    />
  );
}
