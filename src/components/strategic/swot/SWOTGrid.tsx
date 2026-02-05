'use client';

import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { BaseGrid } from '@/components/strategic/shared/BaseGrid';
import { StatusBadgeCell } from '@/lib/aggrid/customCells/StatusBadgeCell';
import { ActionsCell } from '@/lib/aggrid/customCells/ActionsCell';
import { SWOTDetailPanel } from './SWOTDetailPanel';
import { useRouter } from 'next/navigation';

interface SwotAnalysis {
  id: string;
  code: string;
  title: string;
  description: string;
  itemsCount: {
    strengths: number;
    weaknesses: number;
    opportunities: number;
    threats: number;
  };
  status: string;
  responsible: string;
  impact: string;
  probability: string;
  strategicPriority: number;
  createdAt: string | Date;
}

interface SWOTGridProps {
  data: SwotAnalysis[];
  loading?: boolean;
}

// Mapeamentos para labels pt-BR
const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: 'Identificado',
  ANALYZING: 'Analisando',
  ACTION_DEFINED: 'Ação Definida',
  MONITORING: 'Monitorando',
  RESOLVED: 'Resolvido',
};

// Cell Renderer para Items Count (5F, 3W, 7O, 2T)
function ItemsCountCellRenderer(params: { data: SwotAnalysis }) {
  // Fix: Verificar se é linha de grupo (params.data undefined)
  if (!params.data) return null;
  
  const { strengths, weaknesses, opportunities, threats } = params.data.itemsCount;
  const total = strengths + weaknesses + opportunities + threats;

  return (
    <div className="flex flex-col py-1">
      <div className="flex gap-2 text-xs font-mono">
        <span className="text-green-600 font-semibold">{strengths}F</span>
        <span className="text-red-600 font-semibold">{weaknesses}W</span>
        <span className="text-blue-600 font-semibold">{opportunities}O</span>
        <span className="text-orange-600 font-semibold">{threats}T</span>
      </div>
      <span className="text-xs text-gray-500">{total} total</span>
    </div>
  );
}

// Cell Renderer para Prioridade Estratégica (1-10)
function PriorityCellRenderer(params: { value: number }) {
  const priority = params.value;
  let colorClass = 'bg-green-100 text-green-800';
  let label = 'Baixa';

  if (priority >= 8) {
    colorClass = 'bg-red-100 text-red-800';
    label = 'Alta';
  } else if (priority >= 5) {
    colorClass = 'bg-yellow-100 text-yellow-800';
    label = 'Média';
  }

  return (
    <div className="flex flex-col items-center py-1">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
        {priority.toFixed(1)}/10
      </span>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

// Cell Renderer para Impacto
function ImpactCellRenderer(params: { value: string }) {
  const COLORS: Record<string, string> = {
    Alto: 'bg-red-100 text-red-800',
    Médio: 'bg-yellow-100 text-yellow-800',
    Baixo: 'bg-green-100 text-green-800',
  };

  const colorClass = COLORS[params.value] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {params.value}
    </span>
  );
}

// Cell Renderer para Probabilidade
function ProbabilityCellRenderer(params: { value: string }) {
  const COLORS: Record<string, string> = {
    Alta: 'bg-red-100 text-red-800',
    Média: 'bg-yellow-100 text-yellow-800',
    Baixa: 'bg-green-100 text-green-800',
  };

  const colorClass = COLORS[params.value] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {params.value}
    </span>
  );
}

export function SWOTGrid({ data, loading }: SWOTGridProps) {
  const router = useRouter();

  const columnDefs = useMemo<ColDef<SwotAnalysis>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Código',
        width: 150,
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
        field: 'itemsCount',
        headerName: 'Itens SWOT',
        width: 150,
        cellRenderer: ItemsCountCellRenderer,
        sortable: false,
        filter: false,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[params.value] || params.value,
        cellRenderer: (params: { value: string }) => {
          // Mapear status para cores do StatusBadgeCell
          const statusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
            RESOLVED: 'success',
            MONITORING: 'warning',
            ACTION_DEFINED: 'warning',
            ANALYZING: 'neutral',
            IDENTIFIED: 'neutral',
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
        field: 'impact',
        headerName: 'Impacto',
        width: 120,
        cellRenderer: ImpactCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['Alto', 'Médio', 'Baixo'],
        },
        enableRowGroup: true,
      },
      {
        field: 'probability',
        headerName: 'Probabilidade',
        width: 130,
        cellRenderer: ProbabilityCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['Alta', 'Média', 'Baixa'],
        },
        enableRowGroup: true,
      },
      {
        field: 'strategicPriority',
        headerName: 'Prioridade Estratégica',
        width: 180,
        cellRenderer: PriorityCellRenderer,
        filter: 'agNumberColumnFilter',
        filterParams: {
          filterOptions: ['greaterThan', 'lessThan', 'equals'],
        },
        sort: 'desc', // Ordenar por prioridade decrescente por padrão
      },
      {
        field: 'responsible',
        headerName: 'Responsável',
        width: 150,
        filter: 'agTextColumnFilter',
        enableRowGroup: true,
      },
      {
        field: 'createdAt',
        headerName: 'Data Criação',
        valueFormatter: (params) => {
          if (!params.value) return '-';
          const date = params.value instanceof Date ? params.value : new Date(params.value);
          return date.toLocaleDateString('pt-BR');
        },
        width: 130,
        filter: 'agDateColumnFilter',
      },
      {
        field: 'actions', // Necessário para mobileColumns filter no BaseGrid
        headerName: 'Ações',
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onView: (data: SwotAnalysis) => router.push(`/strategic/swot/${data.id}`),
          onEdit: (data: SwotAnalysis) => router.push(`/strategic/swot/${data.id}/edit`),
        },
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        suppressMenu: true,
      },
    ],
    [router]
  );

  return (
    <BaseGrid<SwotAnalysis>
      rowData={data}
      columnDefs={columnDefs}
      loading={loading}
      masterDetail
      detailCellRenderer={SWOTDetailPanel}
      paginationPageSize={50}
      enableExport
      enableCharts
      moduleName="Análises SWOT"
      mobileColumns={['code', 'title', 'itemsCount', 'strategicPriority', 'actions']}
    />
  );
}
