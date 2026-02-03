import type { ICellRendererParams } from 'ag-grid-community';

export interface StatusBadgeCellParams extends ICellRendererParams {
  value: 'success' | 'warning' | 'error' | 'neutral';
}

const STATUS_CONFIG = {
  success: { emoji: '🟢', label: 'Em meta', color: 'bg-green-100 text-green-800' },
  warning: { emoji: '🟡', label: 'Atenção', color: 'bg-yellow-100 text-yellow-800' },
  error: { emoji: '🔴', label: 'Crítico', color: 'bg-red-100 text-red-800' },
  neutral: { emoji: '⚪', label: 'Não iniciado', color: 'bg-gray-100 text-gray-800' },
} as const;

export function StatusBadgeCell(params: StatusBadgeCellParams) {
  const status = params.value;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </span>
  );
}
