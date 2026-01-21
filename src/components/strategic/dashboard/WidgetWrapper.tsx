'use client';

import { motion } from 'framer-motion';
import { Settings, X, Copy, Lock, Unlock, GripVertical } from 'lucide-react';
import type { Widget } from '@/lib/dashboard/dashboard-types';
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry';

interface Props {
  widget: Widget;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onConfigure: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  children: React.ReactNode;
}

export function WidgetWrapper({
  widget,
  isSelected,
  isEditMode,
  onSelect,
  onRemove,
  onConfigure,
  onDuplicate,
  onToggleLock,
  children,
}: Props) {
  const definition = WIDGET_REGISTRY[widget.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={isEditMode ? onSelect : undefined}
      className={`h-full rounded-xl border transition-all overflow-hidden
        ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/10'}
        ${isEditMode && !widget.isLocked ? 'cursor-move' : ''}
        ${widget.isLocked ? 'opacity-75' : ''}
        bg-white/5 backdrop-blur-sm`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-white/10
          ${isEditMode ? 'cursor-move' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode && !widget.isLocked && (
            <GripVertical size={14} className="text-white/30 flex-shrink-0" />
          )}
          <span className="text-base flex-shrink-0">{definition?.icon}</span>
          <span className="text-white/80 text-sm font-medium truncate">{widget.title}</span>
        </div>

        {isEditMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70"
              title={widget.isLocked ? 'Desbloquear' : 'Bloquear'}
            >
              {widget.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70"
              title="Duplicar"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70"
              title="Configurar"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
              title="Remover"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 h-[calc(100%-40px)] overflow-auto">{children}</div>
    </motion.div>
  );
}
