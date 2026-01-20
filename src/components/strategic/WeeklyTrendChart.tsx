"use client";

/**
 * WeeklyTrendChart - Gráfico de tendência semanal simples para War Room
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface TrendPoint {
  day: string;
  score: number;
}

interface Props {
  data: TrendPoint[];
  title?: string;
}

export function WeeklyTrendChart({ data, title = '📈 Tendência Semanal' }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 h-full flex items-center justify-center">
        <p className="text-white/40">Sem dados de tendência</p>
      </div>
    );
  }

  const min = Math.min(...data.map(d => d.score));
  const max = Math.max(...data.map(d => d.score));
  const range = max - min || 1;
  
  // Normalizar para altura do gráfico
  const chartHeight = 120;
  const normalizedData = data.map(d => ({
    ...d,
    height: ((d.score - min) / range) * chartHeight + 20, // min 20px
  }));

  const currentScore = data[data.length - 1]?.score || 0;
  const previousScore = data[data.length - 2]?.score || currentScore;
  const trend = currentScore - previousScore;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">{currentScore}%</span>
          {trend !== 0 && (
            <span className={`flex items-center gap-1 text-sm ${
              trend > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-[140px] px-2">
        {normalizedData.map((point, i) => (
          <motion.div
            key={point.day}
            initial={{ height: 0 }}
            animate={{ height: point.height }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="flex-1 flex flex-col items-center"
          >
            <div 
              className="w-full rounded-t-lg bg-gradient-to-t from-purple-500/50 to-purple-400/80
                relative group cursor-pointer hover:from-purple-500/70 hover:to-purple-400 transition-colors"
              style={{ height: point.height }}
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white/10 
                backdrop-blur-sm text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {point.score}%
              </div>
            </div>
            <span className="text-white/50 text-xs mt-2">{point.day}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
