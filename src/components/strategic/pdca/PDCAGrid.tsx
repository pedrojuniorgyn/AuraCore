'use client';

import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { BaseGrid } from '@/components/strategic/shared/BaseGrid';
import { StatusBadgeCell } from '@/lib/aggrid/customCells/StatusBadgeCell';
import { ActionsCell } from '@/lib/aggrid/customCells/ActionsCell';
import { PDCADetailPanel } from './PDCADetailPanel';
import { useRouter } from 'next/navigation';

interface PDCACycle {
  id: string;
  code: string;
  title: string;
  description: string;
  currentPhase: string;
  status: string;
  responsible: string;
  responsibleUserId: string | null;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  effectiveness: number | null;
  isOverdue: boolean;
  daysUntilDue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PDCAGridProps {
  data: PDCACycle[];
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

const PHASE_LABELS: Record<string, string> = {
  PLAN: 'Planejar',
  DO: 'Executar',
  CHECK: 'Verificar',
  ACT: 'Agir',
};

// Cell Renderer para Fase PDCA com badges coloridos
function PhaseCellRenderer(params: { value: string }) {
  const COLORS: Record<string, string> = {
    PLAN: 'bg-blue-100 text-blue-800 border-blue-300',
    DO: 'bg-purple-100 text-purple-800 border-purple-300',
    CHECK: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ACT: 'bg-green-100 text-green-800 border-green-300',
  };

  const label = PHASE_LABELS[params.value] || params.value;
  const colorClass = COLORS[params.value] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border-2 ${colorClass}`}>
      {label}
    </span>
  );
}

// Cell Renderer para Efetividade (%) na fase Act
function EffectivenessCellRenderer(params: { value: number | null; data: PDCACycle }) {
  // Fix: Verificar se é linha de grupo (params.data undefined)
  if (!params.data) return null;
  
  if (params.value === null || params.data.currentPhase !== 'ACT') {
    return (
      <span className="text-xs text-gray-400 italic">
        N/A
      </span>
    );
  }

  const value = params.value;
  let colorClass = 'text-gray-600';
  let label = 'Baixa';

  if (value >= 80) {
    colorClass = 'text-green-600 font-semibold';
    label = 'Alta';
  } else if (value >= 50) {
    colorClass = 'text-yellow-600 font-semibold';
    label = 'Média';
  } else {
    colorClass = 'text-red-600 font-semibold';
    label = 'Baixa';
  }

  return (
    <div className="flex flex-col">
      <span className={`text-sm ${colorClass}`}>{value}%</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export function PDCAGrid({ data, loading }: PDCAGridProps) {
  const router = useRouter();

  const columnDefs = useMemo<ColDef<PDCACycle>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Código',
        width: 120,
        pinned: 'left',
        cellClass: 'font-mono text-sm font-semibold',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'title',
        headerName: 'Título',
        flex: 2,
        minWidth: 250,
        filter: 'agTextColumnFilter',
        cellClass: 'font-medium',
      },
      {
        field: 'currentPhase',
        headerName: 'Fase Atual',
        width: 130,
        cellRenderer: PhaseCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: Object.keys(PHASE_LABELS),
          valueFormatter: (params: { value: string }) => PHASE_LABELS[params.value] || params.value,
        },
        enableRowGroup: true,
        rowGroup: true, // Agrupar por padrão
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[params.value] || params.value,
        cellRenderer: (params: { value: string }) => {
          // Mapear status para cores do StatusBadgeCell
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
        field: 'progress',
        headerName: 'Progresso',
        width: 120,
        valueFormatter: (params) => `${params.value}%`,
        cellStyle: (params) => {
          const value = params.value || 0;
          if (value >= 80) return { color: '#10b981', fontWeight: 'bold' }; // green
          if (value >= 50) return { color: '#f59e0b', fontWeight: 'bold' }; // yellow
          return { color: '#ef4444', fontWeight: 'bold' }; // red
        },
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'effectiveness',
        headerName: 'Efetividade',
        width: 130,
        cellRenderer: EffectivenessCellRenderer,
        filter: 'agNumberColumnFilter',
        filterParams: {
          filterOptions: ['greaterThan', 'lessThan', 'equals'],
        },
      },
      {
        field: 'responsible',
        headerName: 'Responsável',
        width: 180,
        filter: 'agTextColumnFilter',
        enableRowGroup: true,
      },
      {
        field: 'startDate',
        headerName: 'Data Início',
        valueFormatter: (params) => {
          if (!params.value) return '-';
          const date = params.value instanceof Date ? params.value : new Date(params.value);
          return date.toLocaleDateString('pt-BR');
        },
        width: 120,
        filter: 'agDateColumnFilter',
      },
      {
        field: 'endDate',
        headerName: 'Data Fim',
        valueFormatter: (params) => {
          if (!params.value) return '-';
          const date = params.value instanceof Date ? params.value : new Date(params.value);
          return date.toLocaleDateString('pt-BR');
        },
        width: 120,
        filter: 'agDateColumnFilter',
      },
      {
        colId: 'actions', // Necessário para mobileColumns filter no BaseGrid
        headerName: 'Ações',
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onView: (data: PDCACycle) => router.push(`/strategic/pdca/${data.id}`),
          onEdit: (data: PDCACycle) => router.push(`/strategic/pdca/${data.id}/edit`),
        },
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
      },
    ],
    [router]
  );

  return (
    <BaseGrid<PDCACycle>
      rowData={data}
      columnDefs={columnDefs}
      loading={loading}
      masterDetail
      detailCellRenderer={PDCADetailPanel}
      paginationPageSize={50}
      enableExport
      enableCharts
      moduleName="Ciclos PDCA"
      mobileColumns={['code', 'title', 'currentPhase', 'progress', 'actions']}
    />
  );
}
