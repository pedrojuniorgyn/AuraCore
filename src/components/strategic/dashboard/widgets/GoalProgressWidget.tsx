'use client';

import { motion } from 'framer-motion';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_GOALS = [
  { id: '1', name: 'Q1 2026', progress: 75, color: 'bg-purple-500' },
  { id: '2', name: 'Q2 2026', progress: 50, color: 'bg-blue-500' },
  { id: '3', name: 'Q3 2026', progress: 20, color: 'bg-green-500' },
  { id: '4', name: 'Q4 2026', progress: 5, color: 'bg-yellow-500' },
];

export function GoalProgressWidget({ widget }: Props) {
  const config = widget.config as { showPercentage?: boolean; showValue?: boolean };
  const goals = MOCK_GOALS;

  if (widget.type === 'goal_progress') {
    // Circle progress
    const totalProgress = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (totalProgress / 100) * circumference;

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{totalProgress}%</span>
          </div>
        </div>
        <p className="text-white/60 text-sm mt-4">Progresso Geral</p>
      </div>
    );
  }

  // Bar progress
  return (
    <div className="h-full flex flex-col justify-center space-y-3">
      {goals.map((goal, index) => (
        <div key={goal.id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 text-sm">{goal.name}</span>
            {config.showPercentage && (
              <span className="text-white/50 text-sm">{goal.progress}%</span>
            )}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
              className={`h-full rounded-full ${goal.color}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
