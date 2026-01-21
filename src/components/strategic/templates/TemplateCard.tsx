'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Eye, Trash2, Edit2, Copy, MoreVertical } from 'lucide-react';
import type { Template } from '@/lib/templates/template-types';
import { CATEGORY_LABELS, CATEGORY_CONFIG } from '@/lib/templates/template-types';

interface TemplateCardProps {
  template: Template;
  onUse: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showMenu?: boolean;
}

function TemplateCardInner({
  template,
  onUse,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  showMenu = false,
}: TemplateCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const config = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.general;
  const categoryLabel = CATEGORY_LABELS[template.category] || template.category;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10 
        hover:border-purple-500/30 transition-all group relative"
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl ${config.bgClass} 
        flex items-center justify-center text-2xl mb-4`}
      >
        {template.icon || '📋'}
      </div>

      {/* Title & Description */}
      <h3 className="text-white font-bold mb-1">{template.name}</h3>
      <p className="text-white/50 text-sm line-clamp-2 mb-4 min-h-[40px]">
        {template.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        {template.rating && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <Star size={14} className="fill-current" />
            {template.rating.toFixed(1)}
            <span className="text-white/40">({template.usageCount})</span>
          </div>
        )}
        <span
          className={`px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass} text-xs`}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Meta info */}
      {template.metadata && (
        <div className="flex items-center gap-2 mb-4 text-white/40 text-xs">
          <span>{template.metadata.itemCount} itens</span>
          {template.metadata.estimatedTime && (
            <>
              <span>•</span>
              <span>{template.metadata.estimatedTime}</span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUse}
          className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-sm 
            font-medium hover:bg-purple-600 transition-all"
        >
          Usar
        </button>
        {onPreview && (
          <button
            onClick={onPreview}
            className="p-2 rounded-xl bg-white/10 text-white/70 
              hover:bg-white/20 transition-all"
            title="Visualizar"
          >
            <Eye size={18} />
          </button>
        )}

        {/* Dropdown menu */}
        {showMenu && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-xl bg-white/10 text-white/70 
                hover:bg-white/20 transition-all"
            >
              <MoreVertical size={18} />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-36 
                      bg-gray-800 rounded-lg shadow-xl border border-white/10
                      overflow-hidden z-50"
                  >
                    {onDuplicate && (
                      <button
                        onClick={() => {
                          onDuplicate();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white/70 
                          hover:bg-white/10 flex items-center gap-2"
                      >
                        <Copy size={14} /> Duplicar
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-white/70 
                          hover:bg-white/10 flex items-center gap-2"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          onDelete();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 
                          hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Creator info */}
      {template.createdByName && template.createdByName !== 'system' && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-white/40 text-xs">
            Criado por {template.createdByName}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export const TemplateCard = memo(TemplateCardInner);
