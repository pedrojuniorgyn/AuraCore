'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Building2, Users, User } from 'lucide-react';
import Link from 'next/link';
import type { OKRTreeNode, OKRLevel } from '@/lib/okrs/okr-types';
import { LEVEL_LABELS } from '@/lib/okrs/okr-types';

interface Props {
  tree: OKRTreeNode[];
}

const levelIcons: Record<OKRLevel, React.ElementType> = {
  corporate: Building2,
  department: Building2,
  team: Users,
  individual: User,
};

const levelColors: Record<OKRLevel, string> = {
  corporate: 'border-purple-500 bg-purple-500/10',
  department: 'border-blue-500 bg-blue-500/10',
  team: 'border-green-500 bg-green-500/10',
  individual: 'border-yellow-500 bg-yellow-500/10',
};

export function OKRTree({ tree }: Props) {
  return (
    <div className="space-y-8">
      {(['corporate', 'department', 'team', 'individual'] as OKRLevel[]).map((level) => {
        const levelNodes = tree.filter((node) => node.level === level);
        if (levelNodes.length === 0) return null;

        const Icon = levelIcons[level];

        return (
          <div key={level}>
            <div className="flex items-center gap-2 mb-4 text-white/60">
              <Icon size={18} />
              <span className="text-sm font-medium uppercase tracking-wide">
                {LEVEL_LABELS[level]}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levelNodes.map((node) => (
                <OKRTreeCard key={node.id} node={node} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OKRTreeCard({ node }: { node: OKRTreeNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-l-4 ${levelColors[node.level]}`}
    >
      <Link href={`/strategic/okrs/${node.id}`}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-medium line-clamp-2">{node.title}</h3>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded hover:bg-white/10 text-white/60"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </Link>

      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white/60">Progresso</span>
          <span className="text-white font-medium">{node.progress}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${node.progress}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-white/40">
        <span>{node.keyResults.length} Key Results</span>
        <span>👤 {node.ownerName}</span>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-white/10 space-y-2"
          >
            {node.children.map((child) => (
              <Link
                key={child.id}
                href={`/strategic/okrs/${child.id}`}
                className="flex items-center justify-between p-2 rounded-lg 
                  bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-white/80 text-sm truncate">{child.title}</span>
                <span className="text-white/40 text-xs">{child.progress}%</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
