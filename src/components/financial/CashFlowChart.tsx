'use client';

/**
 * CashFlowChart - Gráfico de Fluxo de Caixa (Entradas vs Saídas)
 * 
 * Usa Recharts para visualização de fluxo de caixa projetado.
 */
import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface CashFlowDataPoint {
  period: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  height?: number;
}

export function CashFlowChart({ data, height = 350 }: CashFlowChartProps) {
  const formattedData = useMemo(() =>
    data.map(d => ({
      ...d,
      inflowFormatted: d.inflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      outflowFormatted: d.outflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      balanceFormatted: d.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    })),
    [data]
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="period" 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis 
            tick={{ fill: '#9ca3af', fontSize: 11 }} 
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17,24,39,0.95)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '12px',
              color: '#e5e7eb',
              fontSize: 13,
            }}
            formatter={(value: number, name: string) => [
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              name === 'inflow' ? 'Entradas' : name === 'outflow' ? 'Saídas' : 'Saldo',
            ]}
          />
          <Legend 
            formatter={(value: string) => 
              value === 'inflow' ? 'Entradas' : value === 'outflow' ? 'Saídas' : 'Saldo'
            }
          />
          <Area
            type="monotone"
            dataKey="inflow"
            stroke="#22c55e"
            fill="url(#colorInflow)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="outflow"
            stroke="#ef4444"
            fill="url(#colorOutflow)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#8b5cf6"
            fill="url(#colorBalance)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
