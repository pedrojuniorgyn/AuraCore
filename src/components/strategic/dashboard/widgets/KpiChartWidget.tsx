'use client';

import { motion } from 'framer-motion';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_DATA = [
  { month: 'Jan', value: 85 },
  { month: 'Fev', value: 88 },
  { month: 'Mar', value: 82 },
  { month: 'Abr', value: 90 },
  { month: 'Mai', value: 87 },
  { month: 'Jun', value: 92 },
  { month: 'Jul', value: 91 },
  { month: 'Ago', value: 94 },
];

export function KpiChartWidget(_props: Props) {
  const data = MOCK_DATA;
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // Generate SVG path for area chart
  const width = 100;
  const height = 60;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d.value - minValue) / range) * height,
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="h-full flex flex-col">
      {/* Chart */}
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.1)" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.1)" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.1)" />

          {/* Area */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            d={areaPath}
            fill="url(#gradient)"
          />

          {/* Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            d={linePath}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
          />

          {/* Dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 * i }}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#a855f7"
            />
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span key={i} className="text-white/40 text-xs">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}
