"use client";

/**
 * Leaderboard - Ranking de jogadores
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface RankPlayer {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  badges: number;
  rankChange: number;
}

interface Props {
  players: RankPlayer[];
  currentUserId: string;
}

function getMedal(rank: number): string | number {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export function Leaderboard({ players, currentUserId }: Props) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Ranking Global
      </h3>

      <div className="space-y-2">
        {players.map((player, index) => {
          const isCurrentUser = player.id === currentUserId;
          const rank = index + 1;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                p-3 rounded-xl flex items-center gap-4 transition-all
                ${isCurrentUser 
                  ? 'bg-purple-500/20 border border-purple-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
                }
                ${rank <= 3 ? 'border border-yellow-500/20' : ''}
              `}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-bold ${rank <= 3 ? 'text-2xl' : 'text-white/50'}`}>
                {getMedal(rank)}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                flex items-center justify-center text-lg">
                {player.avatar || '👤'}
              </div>

              {/* Name */}
              <div className="flex-1">
                <p className="text-white font-medium">
                  {player.name}
                  {isCurrentUser && <span className="text-purple-400 ml-2">(você)</span>}
                </p>
                <p className="text-white/40 text-xs">Lv.{player.level}</p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="text-white font-bold">{player.xp.toLocaleString()} XP</p>
                <p className="text-white/40 text-xs">{player.badges} badges</p>
              </div>

              {/* Rank Change */}
              <div className="w-12 flex justify-center">
                {player.rankChange > 0 && (
                  <span className="flex items-center gap-0.5 text-green-400 text-xs">
                    <TrendingUp className="w-3 h-3" /> {player.rankChange}
                  </span>
                )}
                {player.rankChange < 0 && (
                  <span className="flex items-center gap-0.5 text-red-400 text-xs">
                    <TrendingDown className="w-3 h-3" /> {Math.abs(player.rankChange)}
                  </span>
                )}
                {player.rankChange === 0 && (
                  <Minus className="w-3 h-3 text-white/30" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
