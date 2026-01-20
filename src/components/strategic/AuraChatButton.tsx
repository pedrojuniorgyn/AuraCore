"use client";

import { motion } from 'framer-motion';
import { Bot, X, Sparkles } from 'lucide-react';

interface AuraChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasNotification?: boolean;
}

export function AuraChatButton({ isOpen, onClick, hasNotification }: AuraChatButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50"
      aria-label={isOpen ? 'Fechar Aurora AI' : 'Abrir Aurora AI'}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-lg opacity-50 animate-pulse" />
      
      {/* Button */}
      <div className="relative w-14 h-14 rounded-full bg-gray-900 border border-white/20 flex items-center justify-center shadow-2xl hover:shadow-purple-500/25 transition-shadow">
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <X className="text-white" size={24} />
          ) : (
            <Bot className="text-purple-400" size={24} />
          )}
        </motion.div>
        
        {/* Sparkle decoration */}
        {!isOpen && (
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="text-pink-400" size={12} />
          </motion.div>
        )}
        
        {/* Notification badge */}
        {hasNotification && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-bounce">
            !
          </span>
        )}
      </div>
    </motion.button>
  );
}
