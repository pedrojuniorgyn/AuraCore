"use client";

/**
 * WarRoomHeader - Header premium para War Room com LIVE indicator
 * 
 * @module components/strategic
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Maximize2, Radio } from 'lucide-react';

interface Props {
  lastUpdate: Date;
  autoRefresh: boolean;
  refreshInterval?: number;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onFullscreen?: () => void;
}

export function WarRoomHeader({ 
  lastUpdate, 
  autoRefresh, 
  refreshInterval = 30,
  onToggleAutoRefresh, 
  onRefresh, 
  onFullscreen 
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-6"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <Shield className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            War Room
            <motion.span 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-normal"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </motion.span>
          </h1>
          <p className="text-white/60">
            Central de Comando Estratégico • Atualizado há {secondsAgo}s
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Auto Refresh Toggle */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleAutoRefresh}
          className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all
            ${autoRefresh 
              ? 'bg-green-500/20 border-green-500/50 text-green-400' 
              : 'bg-white/10 border-white/10 text-white/60 hover:bg-white/20'
            }`}
        >
          <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? `${refreshInterval}s` : 'Auto'}
        </motion.button>

        {/* Manual Refresh */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
            text-white flex items-center gap-2 hover:bg-white/20 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </motion.button>

        {/* Fullscreen */}
        {onFullscreen && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onFullscreen}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white 
              flex items-center gap-2 hover:bg-purple-600 transition-all"
          >
            <Maximize2 className="w-4 h-4" /> Expandir
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
