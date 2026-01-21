'use client';

import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Target, Building2, Users, User } from 'lucide-react';
import Link from 'next/link';
import type { OKR, OKRLevel } from '@/lib/okrs/okr-types';
import { LEVEL_LABELS } from '@/lib/okrs/okr-types';

interface Props {
  okr: OKR;
  parent?: OKR | null;
  childOKRs?: OKR[];
}

const levelIcons: Record<OKRLevel, React.ElementType> = {
  corporate: Building2,
  department: Building2,
  team: Users,
  individual: User,
};

const levelColors: Record<OKRLevel, string> = {
  corporate: 'purple',
  department: 'blue',
  team: 'green',
  individual: 'yellow',
};

export function OKRAlignment({ okr, parent, childOKRs = [] }: Props) {
  const ParentIcon = parent ? levelIcons[parent.level] : null;
  const CurrentIcon = levelIcons[okr.level];
  const color = levelColors[okr.level];

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-white/60 text-sm mb-4">Alinhamento Hierárquico</h3>

      <div className="space-y-4">
        {/* Parent OKR */}
        {parent && ParentIcon && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              href={`/strategic/okrs/${parent.id}`}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl
                hover:bg-white/10 transition-colors group"
            >
              <div
                className={`w-8 h-8 rounded-lg bg-${levelColors[parent.level]}-500/20 
                flex items-center justify-center`}
              >
                <ParentIcon className={`text-${levelColors[parent.level]}-400`} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/40 text-xs flex items-center gap-1">
                  <ArrowUp size={10} />
                  <span>{LEVEL_LABELS[parent.level]}</span>
                </div>
                <p className="text-white text-sm truncate group-hover:text-purple-400">
                  {parent.title}
                </p>
              </div>
              <div className="text-white/40 text-sm">{parent.progress}%</div>
            </Link>
          </motion.div>
        )}

        {/* Connection Line */}
        {parent && (
          <div className="flex justify-center">
            <div className="w-px h-4 bg-white/20" />
          </div>
        )}

        {/* Current OKR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 bg-${color}-500/10 rounded-xl border-2 border-${color}-500/50`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-${color}-500/20 
              flex items-center justify-center`}
            >
              <CurrentIcon className={`text-${color}-400`} size={20} />
            </div>
            <div className="flex-1">
              <div className={`text-${color}-400 text-xs font-medium`}>
                {LEVEL_LABELS[okr.level]} (Atual)
              </div>
              <p className="text-white font-medium">{okr.title}</p>
            </div>
            <div className="text-white font-bold text-lg">{okr.progress}%</div>
          </div>
        </motion.div>

        {/* Connection Lines */}
        {childOKRs.length > 0 && (
          <div className="flex justify-center">
            <div className="w-px h-4 bg-white/20" />
          </div>
        )}

        {/* Children OKRs */}
        {childOKRs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="text-white/40 text-xs flex items-center gap-1 justify-center">
              <ArrowDown size={10} />
              <span>OKRs Alinhados ({childOKRs.length})</span>
            </div>
            {childOKRs.map((child) => {
              const ChildIcon = levelIcons[child.level];
              const childColor = levelColors[child.level];

              return (
                <Link
                  key={child.id}
                  href={`/strategic/okrs/${child.id}`}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl
                    hover:bg-white/10 transition-colors group"
                >
                  <div
                    className={`w-8 h-8 rounded-lg bg-${childColor}-500/20 
                    flex items-center justify-center`}
                  >
                    <ChildIcon className={`text-${childColor}-400`} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/40 text-xs">{LEVEL_LABELS[child.level]}</div>
                    <p className="text-white text-sm truncate group-hover:text-purple-400">
                      {child.title}
                    </p>
                  </div>
                  <div className="text-white/40 text-sm">{child.progress}%</div>
                </Link>
              );
            })}
          </motion.div>
        )}

        {childOKRs.length === 0 && !parent && (
          <div className="text-center text-white/40 text-sm py-4">
            <Target className="mx-auto mb-2 opacity-50" size={24} />
            <p>Este OKR não possui alinhamentos</p>
          </div>
        )}
      </div>
    </div>
  );
}
