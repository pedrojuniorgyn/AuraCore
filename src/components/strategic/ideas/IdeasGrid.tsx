'use client';

import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { BaseGrid } from '@/components/strategic/shared/BaseGrid';
import { StatusBadgeCell } from '@/lib/aggrid/customCells/StatusBadgeCell';
import { ActionsCell } from '@/lib/aggrid/customCells/ActionsCell';
import { IdeaDetailPanel } from './IdeaDetailPanel';
import { useRouter } from 'next/navigation';
import { ThumbsUp, MessageSquare } from 'lucide-react';

interface Idea {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: string;
  statusLabel: string;
  author: {
    id: string;
    name: string;
  };
  votesCount: number;
  commentsCount: number;
  score: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface IdeasGridProps {
  data: Idea[];
  loading?: boolean;
}

// Mapeamento de status para cores do StatusBadgeCell
const STATUS_MAP: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  APPROVED: 'success',
  CONVERTED: 'success',
  UNDER_REVIEW: 'warning',
  SUBMITTED: 'neutral',
  REJECTED: 'error',
  ARCHIVED: 'neutral',
};

// Cell Renderer para Votos (👍)
function VotesCellRenderer(params: { value: number }) {
  const votes = params.value || 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">👍</span>
      <span className="font-semibold text-gray-900">{votes}</span>
    </div>
  );
}

// Cell Renderer para Comentários (💬)
function CommentsCellRenderer(params: { value: number }) {
  const comments = params.value || 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">💬</span>
      <span className="text-gray-700">{comments}</span>
    </div>
  );
}

// Cell Renderer para Score
function ScoreCellRenderer(params: { value: number }) {
  const score = params.value || 0;
  
  let colorClass = 'text-gray-600';
  let bgClass = 'bg-gray-100';
  
  if (score >= 50) {
    colorClass = 'text-green-700';
    bgClass = 'bg-green-100';
  } else if (score >= 20) {
    colorClass = 'text-blue-700';
    bgClass = 'bg-blue-100';
  } else if (score >= 10) {
    colorClass = 'text-yellow-700';
    bgClass = 'bg-yellow-100';
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${colorClass} ${bgClass}`}>
      {score}
    </span>
  );
}

// Cell Renderer para Categoria
function CategoryCellRenderer(params: { value: string }) {
  const CATEGORY_COLORS: Record<string, string> = {
    'Sugestão': 'bg-blue-100 text-blue-800',
    'Observação': 'bg-purple-100 text-purple-800',
    'Feedback Cliente': 'bg-pink-100 text-pink-800',
    'Benchmark': 'bg-indigo-100 text-indigo-800',
    'Reclamação': 'bg-orange-100 text-orange-800',
    'Auditoria': 'bg-cyan-100 text-cyan-800',
  };

  const colorClass = CATEGORY_COLORS[params.value] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {params.value}
    </span>
  );
}

export function IdeasGrid({ data, loading }: IdeasGridProps) {
  const router = useRouter();

  const columnDefs = useMemo<ColDef<Idea>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Código',
        width: 130,
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
        field: 'category',
        headerName: 'Categoria',
        width: 150,
        cellRenderer: CategoryCellRenderer,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['Sugestão', 'Observação', 'Feedback Cliente', 'Benchmark', 'Reclamação', 'Auditoria'],
        },
        enableRowGroup: true,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        valueGetter: (params) => params.data?.statusLabel || params.data?.status || '',
        cellRenderer: (params: { data: Idea }) => {
          // Fix: Verificar se é linha de grupo (params.data undefined)
          if (!params.data) return null;
          return StatusBadgeCell({
            value: STATUS_MAP[params.data.status] || 'neutral',
          } as Parameters<typeof StatusBadgeCell>[0]);
        },
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['Submetida', 'Em Análise', 'Aprovada', 'Rejeitada', 'Convertida', 'Arquivada'],
        },
        enableRowGroup: true,
      },
      {
        field: 'author.name',
        headerName: 'Autor',
        width: 150,
        valueGetter: (params) => params.data?.author?.name || 'Anônimo',
        filter: 'agTextColumnFilter',
        enableRowGroup: true,
      },
      {
        field: 'votesCount',
        headerName: 'Votos',
        width: 110,
        type: 'numericColumn',
        cellRenderer: VotesCellRenderer,
        filter: 'agNumberColumnFilter',
        sort: 'desc', // Default sort
      },
      {
        field: 'commentsCount',
        headerName: 'Comentários',
        width: 130,
        type: 'numericColumn',
        cellRenderer: CommentsCellRenderer,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'score',
        headerName: 'Score',
        width: 110,
        type: 'numericColumn',
        cellRenderer: ScoreCellRenderer,
        filter: 'agNumberColumnFilter',
        sort: 'desc', // Default sort por score
        sortIndex: 0, // Prioridade máxima na ordenação
      },
      {
        field: 'createdAt',
        headerName: 'Criado em',
        valueFormatter: (params) => {
          if (!params.value) return '-';
          const date = params.value instanceof Date ? params.value : new Date(params.value);
          return date.toLocaleDateString('pt-BR');
        },
        width: 120,
        filter: 'agDateColumnFilter',
      },
      {
        field: 'actions', // Necessário para mobileColumns filter no BaseGrid
        headerName: 'Ações',
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onView: (data: Idea) => router.push(`/strategic/ideas/${data.id}`),
          onEdit: (data: Idea) => router.push(`/strategic/ideas/${data.id}/edit`),
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
    <BaseGrid<Idea>
      rowData={data}
      columnDefs={columnDefs}
      loading={loading}
      masterDetail
      detailCellRenderer={IdeaDetailPanel}
      paginationPageSize={50}
      enableExport
      enableCharts
      moduleName="Ideias"
      mobileColumns={['code', 'title', 'status', 'score', 'actions']}
    />
  );
}
