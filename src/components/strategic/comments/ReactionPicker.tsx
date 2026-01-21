'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import { REACTIONS, type Reaction } from '@/lib/comments/comment-types';

interface ReactionPickerProps {
  reactions?: Reaction[];
  onToggle: (emoji: string) => void;
  compact?: boolean;
}

function ReactionPickerInner({ reactions = [], onToggle, compact = false }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Agrupar reações existentes
  const existingReactions = reactions.filter((r) => r.count > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Reações existentes */}
      {existingReactions.map((reaction) => (
        <motion.button
          key={reaction.emoji}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(reaction.emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
            transition-all cursor-pointer
            ${
              reaction.hasReacted
                ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }
          `}
          title={`${reaction.count} pessoa${reaction.count > 1 ? 's' : ''}`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </motion.button>
      ))}

      {/* Botão para adicionar reação */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPicker(!showPicker)}
          className={`
            p-1.5 rounded-full transition-all
            ${compact ? 'text-white/40 hover:text-white/70' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70'}
          `}
          title="Adicionar reação"
        >
          <Smile size={compact ? 14 : 16} />
        </motion.button>

        {/* Picker popup */}
        <AnimatePresence>
          {showPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute bottom-full left-0 mb-2 z-50
                  bg-gray-800/95 backdrop-blur-xl rounded-xl 
                  border border-white/10 shadow-xl p-2"
              >
                <div className="flex gap-1">
                  {REACTIONS.map((r) => (
                    <motion.button
                      key={r.emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onToggle(r.emoji);
                        setShowPicker(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white/10 
                        transition-all text-lg"
                      title={r.label}
                    >
                      {r.emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const ReactionPicker = memo(ReactionPickerInner);
