"use client";

/**
 * SettingsToggle - Toggle switch para configurações
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({ enabled, onChange, disabled }: Props) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-12 h-6 rounded-full transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${enabled ? 'bg-purple-500' : 'bg-white/20'}
      `}
    >
      <motion.div
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
      />
    </button>
  );
}
