"use client";

/**
 * SettingsRadioGroup - Grupo de opções radio
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export function SettingsRadioGroup({ options, value, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex-1 min-w-[100px] py-2 px-4 rounded-xl text-sm font-medium transition-all
            ${value === option.value
              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            } border
          `}
        >
          {value === option.value && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-block mr-2"
            >
              ●
            </motion.span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
