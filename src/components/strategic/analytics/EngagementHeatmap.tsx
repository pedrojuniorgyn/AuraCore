'use client';

import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import type { HeatmapCell } from '@/lib/analytics/analytics-types';

interface EngagementHeatmapProps {
  data?: HeatmapCell[] | null;
  isLoading?: boolean;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = ['6h', '9h', '12h', '15h', '18h', '21h'];

function getIntensity(value: number, max: number): string {
  if (max === 0) return 'bg-purple-500/10';
  const ratio = value / max;

  if (ratio < 0.2) return 'bg-purple-500/10';
  if (ratio < 0.4) return 'bg-purple-500/30';
  if (ratio < 0.6) return 'bg-purple-500/50';
  if (ratio < 0.8) return 'bg-purple-500/70';
  return 'bg-purple-500';
}

function EngagementHeatmapInner({ data, isLoading }: EngagementHeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
    if (!data) return { grid: {} as Record<string, number>, maxValue: 0 };

    const gridMap: Record<string, number> = {};
    let max = 0;

    data.forEach((cell) => {
      const key = `${cell.day}-${cell.hour}`;
      gridMap[key] = cell.value;
      if (cell.value > max) max = cell.value;
    });

    return { grid: gridMap, maxValue: max };
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-6">Mapa de Atividade</h3>

      <div className="flex">
        {/* Hour labels */}
        <div className="flex flex-col justify-around pr-3 text-white/40 text-xs">
          {HOURS.map((hour) => (
            <span key={hour}>{hour}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          {/* Day labels */}
          <div className="flex justify-around mb-2 text-white/40 text-xs">
            {DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Cells */}
          <div className="space-y-1">
            {[6, 9, 12, 15, 18, 21].map((hour, hourIndex) => (
              <div key={hour} className="flex justify-around gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const value = grid[`${day}-${hour}`] || 0;
                  return (
                    <motion.div
                      key={`${day}-${hour}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (hourIndex * 7 + day) * 0.01 }}
                      className={`w-8 h-8 rounded-lg ${getIntensity(value, maxValue)} 
                        cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all`}
                      title={`${DAYS[day]} ${hour}h: ${value} sessões`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-6 text-white/40 text-xs">
        <span>Menos</span>
        <div className="flex gap-1">
          {[
            'bg-purple-500/10',
            'bg-purple-500/30',
            'bg-purple-500/50',
            'bg-purple-500/70',
            'bg-purple-500',
          ].map((color, i) => (
            <div key={i} className={`w-4 h-4 rounded ${color}`} />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}

export const EngagementHeatmap = memo(EngagementHeatmapInner);
