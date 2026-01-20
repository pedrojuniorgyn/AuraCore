'use client';

import { motion } from 'framer-motion';
import { Minus } from 'lucide-react';

interface TrendPoint {
  day: string;
  value: number;
}

interface Props {
  data: TrendPoint[];
  currentValue?: number;
  targetValue?: number;
}

export function TrendChartWidget({ data, currentValue = 0, targetValue = 80 }: Props) {
  // FIX Bug 1 & 2: Validar dados antes de processar
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center">
          <Minus size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sem dados de tendência</p>
        </div>
      </div>
    );
  }

  // FIX Bug 1: Garantir que temos valores válidos antes de Math.max/min
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values, targetValue, 100);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  
  // Calculate points for SVG path
  const width = 280;
  const height = 100;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // FIX Bug 2: Tratar caso de data.length === 1 (evitar divisão por zero)
  const points = data.map((point, index) => {
    // Se apenas 1 ponto, centralizar no gráfico
    const xRatio = data.length === 1 ? 0.5 : index / (data.length - 1);
    const x = padding + xRatio * chartWidth;
    const y = height - padding - ((point.value - minValue) / range) * chartHeight;
    return { x, y, value: point.value, day: point.day };
  });
  
  // FIX Bug 2: Verificar points antes de criar paths
  const pathD = points.length > 0
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';
  
  // FIX Bug 2: Verificar se temos pontos suficientes antes de acessar índices
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  
  const areaD = points.length > 0 && lastPoint && firstPoint
    ? `${pathD} L ${lastPoint.x},${height - padding} L ${firstPoint.x},${height - padding} Z`
    : '';

  // Target line Y position
  const targetY = height - padding - ((targetValue - minValue) / range) * chartHeight;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-purple-400 rounded" />
            <span className="text-white/50 text-xs">Atual: {currentValue}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-green-400/50 rounded border-dashed" />
            <span className="text-white/50 text-xs">Meta: {targetValue}%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-[120px]">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = height - padding - ((val - minValue) / range) * chartHeight;
            return (
              <line
                key={val}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}

          {/* Target line */}
          <line
            x1={padding}
            y1={targetY}
            x2={width - padding}
            y2={targetY}
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Area fill - só renderiza se tiver mais de 1 ponto */}
          {points.length > 1 && areaD && (
            <motion.path
              d={areaD}
              fill="url(#areaGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Line - só renderiza se tiver mais de 1 ponto */}
          {points.length > 1 && pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="rgb(168, 85, 247)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}

          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="rgb(168, 85, 247)"
                stroke="white"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-white/40 text-xs px-4 mt-1">
        {data.map((point, index) => (
          <span key={index}>{point.day}</span>
        ))}
      </div>
    </div>
  );
}

export type { TrendPoint };
