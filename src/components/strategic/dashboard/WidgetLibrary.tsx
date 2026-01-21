'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from '@/lib/dashboard/widget-registry';
import type { WidgetType } from '@/lib/dashboard/dashboard-types';

interface Props {
  onAddWidget: (type: WidgetType) => void;
}

export function WidgetLibrary({ onAddWidget }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(WIDGET_CATEGORIES)
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleDragStart = (e: React.DragEvent, type: WidgetType) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-white/5 border-r border-white/10 overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-medium">Widgets</h3>
        <p className="text-white/40 text-sm mt-1">Arraste para o canvas</p>
      </div>

      <div className="p-2">
        {Object.entries(WIDGET_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey} className="mb-2">
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center gap-2 p-2 rounded-lg 
                hover:bg-white/5 transition-colors text-left"
            >
              {expandedCategories.includes(categoryKey) ? (
                <ChevronDown size={16} className="text-white/40" />
              ) : (
                <ChevronRight size={16} className="text-white/40" />
              )}
              <span className="text-lg">{category.icon}</span>
              <span className="text-white/80 text-sm font-medium">{category.name}</span>
            </button>

            <AnimatePresence>
              {expandedCategories.includes(categoryKey) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 space-y-1 overflow-hidden"
                >
                  {category.widgets.map((widgetType) => {
                    const widget = WIDGET_REGISTRY[widgetType as WidgetType];
                    if (!widget) return null;

                    return (
                      <div
                        key={widgetType}
                        draggable
                        onDragStart={(e) => handleDragStart(e, widgetType as WidgetType)}
                        onClick={() => onAddWidget(widgetType as WidgetType)}
                        className="flex items-center gap-2 p-2 rounded-lg 
                          bg-white/5 hover:bg-white/10 cursor-grab 
                          active:cursor-grabbing transition-colors group"
                      >
                        <GripVertical
                          size={14}
                          className="text-white/20 group-hover:text-white/40"
                        />
                        <span className="text-base">{widget.icon}</span>
                        <span className="text-white/70 text-sm truncate">{widget.name}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
