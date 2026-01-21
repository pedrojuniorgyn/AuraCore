'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/gamification/gamification-types';

interface Props {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
}

export function Leaderboard({ entries, isLoading }: Props) {
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank) return null;
    const change = entry.previousRank - entry.rank;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'same', value: 0 };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 py-8">
        {topThree[1] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div
              className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br 
              from-gray-300 to-gray-500 p-1 mb-2"
            >
              <div
                className="w-full h-full rounded-full bg-gray-900 
                flex items-center justify-center text-2xl"
              >
                🥈
              </div>
            </div>
            <p className="text-white font-medium truncate max-w-[100px]">
              {topThree[1].userName}
            </p>
            <p className="text-white/60 text-sm">{topThree[1].totalXp.toLocaleString()} XP</p>
          </motion.div>
        )}

        {topThree[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center -mt-8"
          >
            <div
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br 
              from-yellow-400 to-yellow-600 p-1 mb-2 relative"
            >
              <div
                className="w-full h-full rounded-full bg-gray-900 
                flex items-center justify-center text-3xl"
              >
                🥇
              </div>
              <Trophy className="absolute -top-2 -right-2 text-yellow-400" size={24} />
            </div>
            <p className="text-white font-bold truncate max-w-[120px]">{topThree[0].userName}</p>
            <p className="text-yellow-400 font-medium">
              {topThree[0].totalXp.toLocaleString()} XP
            </p>
          </motion.div>
        )}

        {topThree[2] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div
              className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br 
              from-orange-400 to-orange-600 p-1 mb-2"
            >
              <div
                className="w-full h-full rounded-full bg-gray-900 
                flex items-center justify-center text-2xl"
              >
                🥉
              </div>
            </div>
            <p className="text-white font-medium truncate max-w-[100px]">
              {topThree[2].userName}
            </p>
            <p className="text-white/60 text-sm">{topThree[2].totalXp.toLocaleString()} XP</p>
          </motion.div>
        )}
      </div>

      {/* Rest of leaderboard */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">#</th>
              <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Usuário</th>
              <th className="text-center py-3 px-4 text-white/60 text-sm font-medium">Nível</th>
              <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">XP</th>
              <th className="text-center py-3 px-4 text-white/60 text-sm font-medium">🏆</th>
              <th className="text-center py-3 px-4 text-white/60 text-sm font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((entry, index) => {
              const rankChange = getRankChange(entry);

              return (
                <motion.tr
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-white/5 transition-colors
                    ${entry.isCurrentUser ? 'bg-purple-500/10' : 'hover:bg-white/5'}`}
                >
                  <td className="py-3 px-4 text-white/60">{entry.rank}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-br 
                        from-purple-500 to-pink-500 flex items-center justify-center 
                        text-white text-xs font-bold"
                      >
                        {entry.userName.charAt(0)}
                      </div>
                      <span
                        className={`font-medium ${entry.isCurrentUser ? 'text-purple-300' : 'text-white'}`}
                      >
                        {entry.isCurrentUser ? '★ ' : ''}
                        {entry.userName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-white/70">{entry.level}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {entry.totalXp.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-white/60">
                    {entry.achievementCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {rankChange && (
                      <span
                        className={`flex items-center justify-center gap-1
                        ${rankChange.direction === 'up' ? 'text-green-400' : ''}
                        ${rankChange.direction === 'down' ? 'text-red-400' : ''}
                        ${rankChange.direction === 'same' ? 'text-white/40' : ''}`}
                      >
                        {rankChange.direction === 'up' && <TrendingUp size={14} />}
                        {rankChange.direction === 'down' && <TrendingDown size={14} />}
                        {rankChange.direction === 'same' && <Minus size={14} />}
                        {rankChange.value > 0 && rankChange.value}
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
