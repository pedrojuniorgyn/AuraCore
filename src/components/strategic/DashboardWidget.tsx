'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isEditing?: boolean;
  isExpanded?: boolean;
  onRemove?: () => void;
  onToggleExpand?: () => void;
  className?: string;
}

export function DashboardWidget({
  id,
  title,
  icon,
  children,
  isEditing,
  isExpanded,
  onRemove,
  onToggleExpand,
  className = '',
}: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        h-full rounded-2xl bg-white/5 border overflow-hidden
        ${isEditing 
          ? 'border-dashed border-purple-500/50 cursor-move' 
          : 'border-white/10'
        }
        ${className}
      `}
      data-widget-id={id}
    >
      {/* Header */}
      <div className={`
        px-4 py-3 flex items-center justify-between border-b border-white/10
        ${isEditing ? 'bg-purple-500/10' : ''}
      `}>
        <div className="flex items-center gap-2">
          {isEditing && (
            <div className="drag-handle cursor-grab active:cursor-grabbing text-white/40 hover:text-white">
              <GripVertical size={16} />
            </div>
          )}
          <span className="text-lg">{icon}</span>
          <h3 className="text-white font-medium text-sm">{title}</h3>
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpand && !isEditing && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {isEditing && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-52px)] overflow-auto">
        {children}
      </div>
    </motion.div>
  );
}
