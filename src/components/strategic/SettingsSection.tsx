"use client";

/**
 * SettingsSection - Seção de configurações com header
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ icon, title, description, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
          {icon}
        </div>
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          {description && (
            <p className="text-white/50 text-sm">{description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </motion.div>
  );
}
