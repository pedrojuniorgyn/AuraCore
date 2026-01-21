'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Sparkles } from 'lucide-react';
import type { Achievement } from '@/lib/gamification/gamification-types';
import { RARITY_COLORS } from '@/lib/gamification/gamification-types';

interface Props {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementUnlock({ achievement, onClose }: Props) {
  const confettiTriggeredRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Trigger confetti and auto-close timer when achievement changes
  useEffect(() => {
    if (achievement && confettiTriggeredRef.current !== achievement.id) {
      confettiTriggeredRef.current = achievement.id;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#6366f1', '#ec4899'],
      });

      timerRef.current = setTimeout(() => {
        handleClose();
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [achievement, handleClose]);

  // Reset confetti ref when achievement is cleared
  useEffect(() => {
    if (!achievement) {
      confettiTriggeredRef.current = null;
    }
  }, [achievement]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={achievement.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 
          flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 rounded-3xl border border-white/10 p-8 
            max-w-md w-full text-center relative overflow-hidden"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full 
              bg-white/5 hover:bg-white/10 text-white/40 
              hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 opacity-20 pointer-events-none"
          >
            <Sparkles className="absolute top-10 left-10 text-purple-400" size={24} />
            <Sparkles className="absolute top-20 right-16 text-pink-400" size={16} />
            <Sparkles className="absolute bottom-16 left-20 text-blue-400" size={20} />
            <Sparkles className="absolute bottom-10 right-10 text-yellow-400" size={18} />
          </motion.div>

          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-2xl font-bold text-transparent bg-clip-text 
              bg-gradient-to-r from-purple-400 to-pink-400 mb-6"
          >
            ✨ CONQUISTA DESBLOQUEADA! ✨
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br 
              ${RARITY_COLORS[achievement.rarity]} p-1 mb-6`}
          >
            <div
              className="w-full h-full rounded-3xl bg-gray-900 
              flex items-center justify-center text-6xl"
            >
              {achievement.icon}
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            {achievement.name}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/60 mb-6"
          >
            {achievement.description}
          </motion.p>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl 
              bg-gradient-to-r from-purple-500/20 to-pink-500/20 
              border border-purple-500/30"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-xl font-bold text-white">+{achievement.xpReward} XP</span>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleClose}
            className="mt-6 px-8 py-3 rounded-2xl bg-gradient-to-r 
              from-purple-500 to-pink-500 text-white font-bold
              hover:from-purple-600 hover:to-pink-600 transition-all
              w-full"
          >
            🎉 Celebrar!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
