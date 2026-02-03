import type { ICellRendererParams } from 'ag-grid-community';

export interface ProgressBarCellParams extends ICellRendererParams {
  value: number; // 0-100
}

export function ProgressBarCell(params: ProgressBarCellParams) {
  const value = params.value ?? 0;
  const clamped = Math.max(0, Math.min(100, value));

  const getColor = (progress: number): string => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 50) return 'bg-blue-600';
    if (progress >= 30) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${getColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{clamped}%</span>
    </div>
  );
}
