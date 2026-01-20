'use client';

import { motion } from 'framer-motion';

interface Props {
  score: number;
  previousScore: number;
  lastUpdate: string;
}

export function HealthScoreWidget({ score, previousScore, lastUpdate }: Props) {
  const diff = score - previousScore;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (circumference * score) / 100;

  const getColor = () => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 60) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Gauge */}
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="10"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${color.text}`}>{score}%</span>
        </div>
      </div>

      {/* Diff */}
      <div className={`mt-4 px-3 py-1 rounded-full ${color.bg} ${color.text} text-sm`}>
        {diff >= 0 ? '↗' : '↘'} {Math.abs(diff)}% vs anterior
      </div>

      {/* Last Update */}
      <p className="text-white/40 text-xs mt-2">
        Atualizado: {lastUpdate}
      </p>
    </div>
  );
}
