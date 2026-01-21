'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';

interface Props {
  widget: Widget;
}

// Mock data
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'João Silva', xp: 5230, isCurrentUser: false },
  { rank: 2, name: 'Maria Santos', xp: 4850, isCurrentUser: false },
  { rank: 3, name: 'Pedro Alves', xp: 4420, isCurrentUser: false },
  { rank: 4, name: 'Você', xp: 2450, isCurrentUser: true },
  { rank: 5, name: 'Carlos Lima', xp: 2100, isCurrentUser: false },
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardWidget({ widget }: Props) {
  const config = widget.config as Record<string, unknown>;
  const entries = MOCK_LEADERBOARD.slice(0, (config.limit as number) || 5);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} className="text-yellow-400" />
        <span className="text-white/60 text-sm">Ranking</span>
      </div>

      <div className="flex-1 space-y-2 overflow-auto">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.rank}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-2 rounded-lg 
              ${entry.isCurrentUser ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'}`}
          >
            <span className="text-lg w-6 text-center">
              {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : entry.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm truncate block ${entry.isCurrentUser ? 'text-purple-300 font-medium' : 'text-white/70'}`}
              >
                {entry.isCurrentUser && '★ '}
                {entry.name}
              </span>
            </div>
            <span className="text-white/50 text-sm">{entry.xp.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
