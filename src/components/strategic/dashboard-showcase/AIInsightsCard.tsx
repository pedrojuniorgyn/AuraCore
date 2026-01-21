'use client';

import { motion } from 'framer-motion';
import { Sparkles, FileText, TrendingUp } from 'lucide-react';

interface Props {
  insight: string;
  onAnalyze?: () => void;
  onReport?: () => void;
}

export function AIInsightsCard({ insight, onAnalyze, onReport }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.1) 100%)',
        border: '1px solid rgba(147,51,234,0.2)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
            animate={{ 
              boxShadow: [
                '0 0 0 0 rgba(147, 51, 234, 0)',
                '0 0 20px 5px rgba(147, 51, 234, 0.3)',
                '0 0 0 0 rgba(147, 51, 234, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles size={20} className="text-white" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-white">Aurora AI</h3>
            <p className="text-white/40 text-xs">Análise inteligente em tempo real</p>
          </div>
        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-white/80 leading-relaxed text-sm lg:text-base"
        >
          &ldquo;{insight}&rdquo;
        </motion.p>
        
        <div className="flex flex-wrap gap-3 mt-4">
          <button 
            onClick={onAnalyze}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-sm transition-colors border border-white/10"
          >
            <TrendingUp size={14} />
            Ver análise completa
          </button>
          <button 
            onClick={onReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-sm transition-colors border border-white/10"
          >
            <FileText size={14} />
            Gerar relatório
          </button>
        </div>
      </div>
    </motion.div>
  );
}
