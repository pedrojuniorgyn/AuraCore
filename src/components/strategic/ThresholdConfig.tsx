"use client";

/**
 * ThresholdConfig - Configuração de thresholds de KPIs
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';

interface Thresholds {
  onTrack: number;
  atRisk: number;
}

interface Props {
  thresholds: Thresholds;
  onChange: (thresholds: Thresholds) => void;
}

export function ThresholdConfig({ thresholds, onChange }: Props) {
  const updateThreshold = (key: keyof Thresholds, value: number) => {
    const newThresholds = { ...thresholds, [key]: value };
    
    // Garantir que onTrack > atRisk
    if (key === 'onTrack' && value <= thresholds.atRisk) {
      newThresholds.atRisk = Math.max(0, value - 10);
    }
    if (key === 'atRisk' && value >= thresholds.onTrack) {
      newThresholds.onTrack = Math.min(100, value + 10);
    }
    
    onChange(newThresholds);
  };

  return (
    <div className="space-y-6">
      {/* On Track */}
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-green-400 font-medium">No Prazo</span>
          </div>
          <span className="text-white/70 text-sm font-mono">
            ≥ {thresholds.onTrack}%
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          value={thresholds.onTrack}
          onChange={(e) => updateThreshold('onTrack', Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* At Risk */}
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-yellow-400 font-medium">Em Risco</span>
          </div>
          <span className="text-white/70 text-sm font-mono">
            {thresholds.atRisk}% - {thresholds.onTrack - 1}%
          </span>
        </div>
        <input
          type="range"
          min="10"
          max={thresholds.onTrack - 10}
          value={thresholds.atRisk}
          onChange={(e) => updateThreshold('atRisk', Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Critical */}
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-red-400 font-medium">Crítico</span>
          </div>
          <span className="text-white/70 text-sm font-mono">
            &lt; {thresholds.atRisk}%
          </span>
        </div>
        <div className="h-2 bg-red-500/30 rounded-full" />
      </div>

      {/* Preview Bar */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/60 text-sm mb-3">Visualização:</p>
        <div className="h-4 rounded-full overflow-hidden flex">
          <motion.div 
            animate={{ width: `${100 - thresholds.onTrack}%` }}
            transition={{ duration: 0.3 }}
            className="bg-green-500 h-full" 
          />
          <motion.div 
            animate={{ width: `${thresholds.onTrack - thresholds.atRisk}%` }}
            transition={{ duration: 0.3 }}
            className="bg-yellow-500 h-full" 
          />
          <motion.div 
            animate={{ width: `${thresholds.atRisk}%` }}
            transition={{ duration: 0.3 }}
            className="bg-red-500 h-full" 
          />
        </div>
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>0%</span>
          <span>{thresholds.atRisk}%</span>
          <span>{thresholds.onTrack}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
