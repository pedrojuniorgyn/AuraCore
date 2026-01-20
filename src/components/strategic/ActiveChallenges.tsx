"use client";

/**
 * ActiveChallenges - Desafios ativos com progresso
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Target, Clock, Zap } from 'lucide-react';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  xpReward: number;
  daysRemaining: number;
}

interface Props {
  challenges: Challenge[];
  onChallengeClick?: (id: string) => void;
}

export function ActiveChallenges({ challenges, onChallengeClick }: Props) {
  if (challenges.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
        <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">Nenhum desafio ativo no momento</p>
        <p className="text-white/30 text-sm">Volte mais tarde para novos desafios!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Target className="w-5 h-5 text-purple-400" />
        Desafios Ativos
        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
          {challenges.length}
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map((challenge, i) => (
          <motion.button
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => onChallengeClick?.(challenge.id)}
            className="p-4 rounded-xl bg-white/5 border border-white/10 
              hover:bg-white/10 hover:border-purple-500/30 transition-all text-left"
          >
            <h4 className="text-white font-medium text-sm mb-2">{challenge.title}</h4>
            <p className="text-white/50 text-xs mb-3 line-clamp-2">{challenge.description}</p>

            {/* Progress */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${challenge.progress}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              />
            </div>
            <p className="text-white/40 text-xs text-right">{challenge.progress}%</p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1 text-yellow-400 text-xs">
                <Zap className="w-3 h-3" /> +{challenge.xpReward} XP
              </span>
              <span className="flex items-center gap-1 text-white/40 text-xs">
                <Clock className="w-3 h-3" /> {challenge.daysRemaining}d
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
