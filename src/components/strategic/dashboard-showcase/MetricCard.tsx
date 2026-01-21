'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: number;
  badge?: string;
  badgeColor?: string;
  subtitle?: string;
  href?: string;
  isUrgent?: boolean;
  delay?: number;
}

export function MetricCard({ 
  icon, 
  iconBg, 
  label, 
  value, 
  badge, 
  badgeColor, 
  subtitle, 
  href, 
  isUrgent,
  delay = 0 
}: Props) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-all cursor-pointer h-full",
        "bg-white/[0.03] border border-white/10 hover:border-white/20",
        "hover:bg-white/[0.05]",
        isUrgent && "ring-2 ring-red-500/50 border-red-500/30"
      )}
    >
      {isUrgent && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-2 right-2"
        >
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </motion.div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        {badge && (
          <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold",
            badgeColor || "bg-white/10 text-white/70"
          )}>
            {badge}
          </span>
        )}
      </div>
      
      <p className="text-white/50 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="text-white/40 text-xs mt-1">{subtitle}</p>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
