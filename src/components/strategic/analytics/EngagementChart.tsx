'use client';

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EngagementData } from '@/lib/analytics/analytics-types';

interface EngagementChartProps {
  data?: EngagementData[] | null;
  isLoading?: boolean;
}

function EngagementChartInner({ data, isLoading }: EngagementChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      ...item,
      dateLabel: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    }));
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-64 animate-pulse bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-white font-semibold mb-6">Engajamento ao Longo do Tempo</h3>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

          <XAxis
            dataKey="dateLabel"
            stroke="rgba(255,255,255,0.4)"
            fontSize={12}
            tickLine={false}
          />

          <YAxis
            stroke="rgba(255,255,255,0.4)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 13, 26, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: 'white',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
          />

          <Area
            type="monotone"
            dataKey="sessions"
            name="Sessões"
            stroke="#a855f7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSessions)"
          />

          <Area
            type="monotone"
            dataKey="interactions"
            name="Interações"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInteractions)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-white/60 text-sm">Sessões</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-white/60 text-sm">Interações</span>
        </div>
      </div>
    </div>
  );
}

export const EngagementChart = memo(EngagementChartInner);
