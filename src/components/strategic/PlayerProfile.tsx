"use client";

/**
 * PlayerProfile - Perfil do jogador com XP e estatísticas
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Trophy, Medal, Flame } from 'lucide-react';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalBadges: number;
  rank: number;
  streak: number;
}

interface Props {
  player: Player;
}

export function PlayerProfile({ player }: Props) {
  const xpProgress = player.nextLevelXp > 0 
    ? (player.currentXp / player.nextLevelXp) * 100 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 
        border border-purple-500/20 backdrop-blur-sm"
    >
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <motion.div 
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(168, 85, 247, 0.3)',
                '0 0 30px rgba(236, 72, 153, 0.3)',
                '0 0 20px rgba(168, 85, 247, 0.3)',
              ]
            }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
              flex items-center justify-center text-3xl"
          >
            {player.avatar || '😎'}
          </motion.div>
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full 
            bg-yellow-500 text-yellow-900 text-xs font-bold shadow-lg">
            Lv.{player.level}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{player.name}</h2>
          <p className="text-purple-300 text-sm">{player.title}</p>

          {/* XP Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>XP: {player.currentXp.toLocaleString()}</span>
              <span>{player.nextLevelXp.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full"
              />
            </div>
            <p className="text-right text-xs text-white/40 mt-1">
              {Math.round(xpProgress)}% para Lv.{player.level + 1}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 text-yellow-400">
              <Medal className="w-5 h-5" />
              <span className="text-xl font-bold">{player.totalBadges}</span>
            </div>
            <p className="text-xs text-white/50">badges</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 text-purple-400">
              <Trophy className="w-5 h-5" />
              <span className="text-xl font-bold">#{player.rank}</span>
            </div>
            <p className="text-xs text-white/50">ranking</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 text-orange-400">
              <Flame className="w-5 h-5" />
              <span className="text-xl font-bold">{player.streak}</span>
            </div>
            <p className="text-xs text-white/50">dias</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
