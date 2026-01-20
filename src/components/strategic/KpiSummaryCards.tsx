"use client";

/**
 * KpiSummaryCards - Cards de resumo para filtrar KPIs por status
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';

interface Summary {
  total: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  noData: number;
}

interface Props {
  summary: Summary;
  onFilterChange?: (status: string | null) => void;
  activeFilter?: string | null;
}

const CARD_CONFIG = [
  { 
    key: null, 
    label: 'Total', 
    icon: '📊', 
    getValue: (s: Summary) => s.total,
    bgActive: 'bg-purple-500/20',
    borderActive: 'border-purple-500/50',
  },
  { 
    key: 'ON_TRACK', 
    label: 'No Prazo', 
    icon: '🟢', 
    getValue: (s: Summary) => s.onTrack,
    bgActive: 'bg-green-500/20',
    borderActive: 'border-green-500/50',
  },
  { 
    key: 'AT_RISK', 
    label: 'Em Risco', 
    icon: '🟡', 
    getValue: (s: Summary) => s.atRisk,
    bgActive: 'bg-yellow-500/20',
    borderActive: 'border-yellow-500/50',
  },
  { 
    key: 'CRITICAL', 
    label: 'Crítico', 
    icon: '🔴', 
    getValue: (s: Summary) => s.critical,
    bgActive: 'bg-red-500/20',
    borderActive: 'border-red-500/50',
  },
  { 
    key: 'NO_DATA', 
    label: 'Sem Dados', 
    icon: '⚪', 
    getValue: (s: Summary) => s.noData,
    bgActive: 'bg-gray-500/20',
    borderActive: 'border-gray-500/50',
  },
];

export function KpiSummaryCards({ summary, onFilterChange, activeFilter }: Props) {
  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {CARD_CONFIG.map((card, i) => {
        const isActive = activeFilter === card.key;
        const value = card.getValue(summary);
        
        return (
          <motion.button
            key={card.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFilterChange?.(isActive ? null : card.key)}
            className={`
              p-4 rounded-xl border transition-all text-left backdrop-blur-sm
              ${isActive 
                ? `${card.bgActive} ${card.borderActive}` 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{card.icon}</span>
              <span className="text-white/60 text-sm">{card.label}</span>
            </div>
            <motion.span 
              key={value}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-white"
            >
              {value}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
