'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Map, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Perspective {
  name: string;
  icon: string;
  progress: number;
  color: 'green' | 'blue' | 'yellow' | 'purple' | 'orange';
}

interface Props {
  perspectives: Perspective[];
}

const colorMap: Record<string, { bar: string; text: string }> = {
  green: { bar: 'bg-green-500', text: 'text-green-400' },
  blue: { bar: 'bg-blue-500', text: 'text-blue-400' },
  yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  purple: { bar: 'bg-purple-500', text: 'text-purple-400' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-400' },
};

export function PerspectivesCard({ perspectives }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Map size={18} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Perspectivas BSC</h3>
        </div>
        <Link 
          href="/strategic/map" 
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
        >
          Ver Mapa <ChevronRight size={14} />
        </Link>
      </div>
      
      <div className="space-y-5">
        {perspectives.map((p, i) => {
          const colors = colorMap[p.color] || colorMap.purple;
          return (
            <motion.div 
              key={p.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-white/80 text-sm font-medium">{p.name}</span>
                </div>
                <span className={cn("text-sm font-bold", colors.text)}>{p.progress}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${p.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                  className={cn("h-full rounded-full", colors.bar)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
