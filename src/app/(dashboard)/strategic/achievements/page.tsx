"use client";

/**
 * Página: Conquistas e Ranking (Gamificação)
 * Sistema de gamificação com badges, XP e leaderboard
 * 
 * @module app/(dashboard)/strategic/achievements
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Grid, Loader2 } from 'lucide-react';
import { PlayerProfile, type Player } from '@/components/strategic/PlayerProfile';
import { AchievementBadge, type Badge } from '@/components/strategic/AchievementBadge';
import { Leaderboard, type RankPlayer } from '@/components/strategic/Leaderboard';
import { ActiveChallenges, type Challenge } from '@/components/strategic/ActiveChallenges';

interface AchievementsData {
  player: Player;
  challenges: Challenge[];
  unlockedBadges: Badge[];
  allBadges: Badge[];
  leaderboard: RankPlayer[];
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'mine' | 'all'>('mine');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/strategic/achievements');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayBadges = view === 'mine' ? data?.unlockedBadges : data?.allBadges;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" />
            Conquistas e Ranking
          </h1>
          <p className="text-white/60 mt-1">
            Complete desafios, ganhe XP e suba no ranking!
          </p>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('mine')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all
              ${view === 'mine' 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
          >
            <Medal className="w-4 h-4" /> Minhas
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all
              ${view === 'all' 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
          >
            <Grid className="w-4 h-4" /> Todas
          </motion.button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">Carregando conquistas...</p>
          </div>
        </div>
      ) : data && (
        <div className="space-y-8">
          {/* Player Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PlayerProfile player={data.player} />
          </motion.div>

          {/* Active Challenges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ActiveChallenges challenges={data.challenges} />
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Medal className="w-5 h-5 text-yellow-400" />
              {view === 'mine' ? 'Minhas Conquistas' : 'Todas as Conquistas'}
              <span className="text-white/40 font-normal text-sm">
                ({displayBadges?.length || 0})
              </span>
            </h3>
            <div className="flex flex-wrap gap-4">
              {displayBadges?.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <AchievementBadge badge={badge} size="lg" />
                </motion.div>
              ))}
              {(!displayBadges || displayBadges.length === 0) && (
                <div className="w-full text-center py-8">
                  <Medal className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">Nenhuma conquista ainda</p>
                  <p className="text-white/30 text-sm">Complete desafios para ganhar badges!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Leaderboard 
              players={data.leaderboard} 
              currentUserId={data.player.id} 
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
