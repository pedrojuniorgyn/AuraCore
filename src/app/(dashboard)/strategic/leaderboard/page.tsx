'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users } from 'lucide-react';
import { gamificationService } from '@/lib/gamification/gamification-service';
import { Leaderboard, UserStats } from '@/components/strategic/gamification';
import { useUserPoints } from '@/hooks/useUserPoints';
import type { LeaderboardEntry, LeaderboardFilters } from '@/lib/gamification/gamification-types';

type Period = LeaderboardFilters['period'];

export default function LeaderboardPage() {
  const { points } = useUserPoints();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [department] = useState<string>('');

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const data = await gamificationService.getLeaderboard({
          period,
          department: department || undefined,
        });
        setEntries(data);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [period, department]);

  const periodLabels: Record<Period, string> = {
    week: 'Esta Semana',
    month: 'Este Mês',
    quarter: 'Este Trimestre',
    year: 'Este Ano',
    all_time: 'Todos os Tempos',
  };

  const currentUserRank = entries.find((e) => e.isCurrentUser)?.rank;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="text-yellow-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ranking</h1>
              <p className="text-white/60">Veja os melhores do módulo Strategic</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl
                  text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                {(Object.keys(periodLabels) as Period[]).map((p) => (
                  <option key={p} value={p} className="bg-gray-900">
                    {periodLabels[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Current User Position */}
        {currentUserRank && points && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 
              rounded-2xl border border-purple-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500
                  flex items-center justify-center"
                >
                  <span className="text-2xl font-bold text-white">#{currentUserRank}</span>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Sua Posição</p>
                  <p className="text-white text-xl font-bold">
                    Nível {points.level} - {points.levelName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm">Total XP</p>
                <p className="text-2xl font-bold text-purple-400">
                  {points.totalXp.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* User Stats */}
        {points && (
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-4">Suas Estatísticas</h2>
            <UserStats points={points} />
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-white/60" />
            Ranking - {periodLabels[period]}
          </h2>
          <Leaderboard entries={entries} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
