'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  score: number;
  trend: number;
  lastUpdate?: string;
}

export function HealthScoreCard({ score, trend, lastUpdate = 'há 2 minutos' }: Props) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl p-8"
      style={{
        background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(236,72,153,0.1) 50%, rgba(59,130,246,0.05) 100%)',
        border: '1px solid rgba(147,51,234,0.3)',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div 
        className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/15 rounded-full blur-2xl animate-pulse" 
        style={{ animationDelay: '1s' }} 
      />
      <div 
        className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse" 
        style={{ animationDelay: '2s' }} 
      />
      
      <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
              Health Score Organizacional
            </span>
          </div>
          
          <div className="flex items-baseline justify-center lg:justify-start gap-3 mb-4">
            <motion.span 
              key={score}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-6xl lg:text-7xl font-bold", getScoreColor(score))}
            >
              {score}
            </motion.span>
            <span className="text-2xl lg:text-3xl text-white/40 font-light">/100</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <div className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium",
              trend > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {trend > 0 ? '+' : ''}{trend}% vs mês anterior
            </div>
            <span className="text-white/40 text-sm">
              Atualizado {lastUpdate}
            </span>
          </div>
        </div>

        {/* Right - Circular progress */}
        <div className="relative w-36 h-36 lg:w-44 lg:h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="url(#healthGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                strokeDasharray: circumference,
              }}
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
            >
              <Activity size={24} className="text-white lg:w-7 lg:h-7" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
