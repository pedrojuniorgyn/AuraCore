'use client';

/**
 * VirtualizedKpiList Component
 * 
 * Lista virtualizada de KPIs para performance com grandes volumes.
 * Usa @tanstack/react-virtual para renderizar apenas itens visíveis.
 * 
 * @module components/strategic/VirtualizedKpiList
 * @since E9 - Performance Optimizations
 */

import React, { useCallback, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Kpi {
  id: string;
  name: string;
  code: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  perspective: 'financial' | 'customer' | 'internal' | 'learning';
  status: 'critical' | 'warning' | 'on-track' | 'achieved';
  trend: 'up' | 'down' | 'stable';
  lastUpdate?: string;
}

interface VirtualizedKpiListProps {
  kpis: Kpi[];
  onKpiClick?: (kpi: Kpi) => void;
  onKpiEdit?: (kpi: Kpi) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  height?: number;
  estimatedItemHeight?: number;
}

// ============================================================================
// Helpers
// ============================================================================

const perspectiveColors: Record<Kpi['perspective'], string> = {
  financial: 'from-green-500/20 to-green-600/10 border-green-500/30',
  customer: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  internal: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  learning: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
};

const perspectiveLabels: Record<Kpi['perspective'], string> = {
  financial: 'Financeiro',
  customer: 'Cliente',
  internal: 'Processos',
  learning: 'Aprendizado',
};

const statusIcons: Record<Kpi['status'], React.ReactElement> = {
  critical: <AlertCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  'on-track': <CheckCircle2 className="w-4 h-4 text-blue-400" />,
  achieved: <CheckCircle2 className="w-4 h-4 text-green-400" />,
};

const trendIcons: Record<Kpi['trend'], React.ReactElement> = {
  up: <TrendingUp className="w-4 h-4 text-green-400" />,
  down: <TrendingDown className="w-4 h-4 text-red-400" />,
  stable: <Minus className="w-4 h-4 text-gray-400" />,
};

// ============================================================================
// KPI Card (memoizado)
// ============================================================================

interface KpiCardProps {
  kpi: Kpi;
  onClick?: () => void;
  onEdit?: () => void;
}

const KpiCard = memo(function KpiCard({ kpi, onClick, onEdit }: KpiCardProps) {
  const progress = Math.min((kpi.currentValue / kpi.targetValue) * 100, 100);
  
  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border cursor-pointer
        bg-gradient-to-br ${perspectiveColors[kpi.perspective]}
        hover:scale-[1.02] transition-transform duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
              {kpi.code}
            </span>
            <span className="text-xs text-white/40">
              {perspectiveLabels[kpi.perspective]}
            </span>
          </div>
          <h3 className="text-sm font-medium text-white mt-1 line-clamp-1">
            {kpi.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {statusIcons[kpi.status]}
          {trendIcons[kpi.trend]}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white">
          {kpi.currentValue.toLocaleString('pt-BR')}
        </span>
        <span className="text-sm text-white/60">{kpi.unit}</span>
        <span className="text-xs text-white/40">
          / {kpi.targetValue.toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            kpi.status === 'achieved' ? 'bg-green-400' :
            kpi.status === 'on-track' ? 'bg-blue-400' :
            kpi.status === 'warning' ? 'bg-yellow-400' :
            'bg-red-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 
            hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Editar KPI"
        >
          <span className="text-xs">✏️</span>
        </button>
      )}
    </div>
  );
});

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-28 bg-white/5 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-white/40">
      <span className="text-4xl mb-4">📊</span>
      <p>{message}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function VirtualizedKpiListInner({
  kpis,
  onKpiClick,
  onKpiEdit,
  isLoading = false,
  emptyMessage = 'Nenhum KPI encontrado',
  height = 600,
  estimatedItemHeight = 120,
}: VirtualizedKpiListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer configuration
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is safe for this use case
  const rowVirtualizer = useVirtualizer({
    count: kpis.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5, // Renderizar 5 itens extras acima/abaixo
  });

  // Handlers memoizados
  const handleKpiClick = useCallback((kpi: Kpi) => {
    onKpiClick?.(kpi);
  }, [onKpiClick]);

  const handleKpiEdit = useCallback((kpi: Kpi) => {
    onKpiEdit?.(kpi);
  }, [onKpiEdit]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (kpis.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="overflow-auto scrollbar-thin scrollbar-thumb-white/10"
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const kpi = kpis[virtualItem.index];
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(virtualItem.index * 0.02, 0.2) }}
                className="p-2 group"
              >
                <KpiCard
                  kpi={kpi}
                  onClick={() => handleKpiClick(kpi)}
                  onEdit={onKpiEdit ? () => handleKpiEdit(kpi) : undefined}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoize para evitar re-renders desnecessários
export const VirtualizedKpiList = memo(VirtualizedKpiListInner);
