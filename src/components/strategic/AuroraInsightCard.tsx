"use client";

/**
 * AuroraInsightCard - Card de insight AI para War Room
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Bot, Sparkles, MessageCircle } from 'lucide-react';

interface Props {
  insight: string;
  onChat?: () => void;
  loading?: boolean;
}

export function AuroraInsightCard({ insight, onChat, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 
        border border-purple-500/20 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <motion.div 
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.3)',
              '0 0 40px rgba(236, 72, 153, 0.3)',
              '0 0 20px rgba(168, 85, 247, 0.3)',
            ]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 
            flex items-center justify-center flex-shrink-0"
        >
          <Bot className="w-6 h-6 text-white" />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-bold">Aurora AI</h3>
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
            </motion.div>
            <span className="text-xs text-white/40">Insight automático</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <p className="text-white/80 text-sm leading-relaxed italic">
              &ldquo;{insight}&rdquo;
            </p>
          )}

          {onChat && !loading && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onChat}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30
                text-purple-300 flex items-center gap-2 hover:bg-purple-500/30 transition-all"
            >
              <MessageCircle className="w-4 h-4" /> Conversar com Aurora
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
