"use client";

/**
 * TemplateCard - Card de template de plano de ação
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Star, Eye, Trash2, Edit2 } from 'lucide-react';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rating: number;
  usageCount: number;
  isSystem: boolean;
  isOwner: boolean;
  createdBy: { name: string };
}

interface Props {
  template: Template;
  onUse: (id: string) => void;
  onPreview: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const categoryConfig: Record<string, { color: string; bgClass: string; textClass: string }> = {
  logistics: { color: 'blue', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  financial: { color: 'green', bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
  commercial: { color: 'purple', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400' },
  hr: { color: 'pink', bgClass: 'bg-pink-500/20', textClass: 'text-pink-400' },
  quality: { color: 'orange', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400' },
  general: { color: 'gray', bgClass: 'bg-gray-500/20', textClass: 'text-gray-400' },
};

const categoryLabels: Record<string, string> = {
  logistics: 'Logística',
  financial: 'Financeiro',
  commercial: 'Comercial',
  hr: 'RH',
  quality: 'Qualidade',
  general: 'Geral',
};

export function TemplateCard({ template, onUse, onPreview, onEdit, onDelete }: Props) {
  const config = categoryConfig[template.category] || categoryConfig.general;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10 
        hover:border-purple-500/30 transition-all group"
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${config.bgClass} 
        flex items-center justify-center text-2xl mb-4`}>
        {template.icon}
      </div>

      {/* Title & Description */}
      <h3 className="text-white font-bold mb-1">{template.name}</h3>
      <p className="text-white/50 text-sm line-clamp-2 mb-4 min-h-[40px]">
        {template.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 text-yellow-400 text-sm">
          <Star size={14} className="fill-current" />
          {template.rating.toFixed(1)}
          <span className="text-white/40">({template.usageCount})</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass} text-xs`}>
          {categoryLabels[template.category] || template.category}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUse(template.id)}
          className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-sm 
            font-medium hover:bg-purple-600 transition-all"
        >
          Usar
        </button>
        <button
          onClick={() => onPreview(template.id)}
          className="p-2 rounded-xl bg-white/10 text-white/70 
            hover:bg-white/20 transition-all"
          title="Visualizar"
        >
          <Eye size={18} />
        </button>
        {template.isOwner && onEdit && (
          <button
            onClick={() => onEdit(template.id)}
            className="p-2 rounded-xl bg-white/10 text-white/70 
              hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
        )}
        {template.isOwner && onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="p-2 rounded-xl bg-white/10 text-red-400 
              hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
            title="Excluir"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
