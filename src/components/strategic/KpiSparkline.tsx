"use client";

/**
 * KpiSparkline - Mini gráfico de tendência para KPIs
 * Implementação customizada com SVG para design Aurora
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';

type KpiStatus = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_DATA';

interface Props {
  data: number[];
  trend: number;
  status: KpiStatus;
  width?: number;
  height?: number;
}

const STATUS_COLORS: Record<KpiStatus, string> = {
  ON_TRACK: '#22c55e',
  AT_RISK: '#eab308',
  CRITICAL: '#ef4444',
  NO_DATA: '#6b7280',
};

export function KpiSparkline({ 
  data, 
  trend, 
  status, 
  width = 120, 
  height = 32 
}: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-white/30 text-xs">
        Sem histórico
      </div>
    );
  }

  const color = STATUS_COLORS[status];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  // Padding interno
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Gerar pontos do path
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });
  
  // Criar path SVG
  const linePath = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  
  // Área preenchida (para gradiente)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <svg 
          width={width} 
          height={height} 
          className="overflow-visible"
        >
          {/* Gradiente para área */}
          <defs>
            <linearGradient id={`sparkGradient-${status}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Área preenchida */}
          <motion.path
            d={areaPath}
            fill={`url(#sparkGradient-${status})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Linha */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Ponto final */}
          <motion.circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={3}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          />
        </svg>
      </div>
      
      {/* Trend indicator */}
      <motion.span 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`text-xs font-bold whitespace-nowrap ${
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-white/50'
        }`}
      >
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '='} {Math.abs(trend)}%
      </motion.span>
    </div>
  );
}
