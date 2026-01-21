'use client';

import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Package, Building2 } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import { UseTemplateModal } from './UseTemplateModal';
import { useTemplates } from '@/hooks/useTemplates';
import type {
  Template,
  TemplateType,
  TemplateCategory,
} from '@/lib/templates/template-types';
import { CATEGORY_LABELS } from '@/lib/templates/template-types';

interface TemplateGalleryProps {
  onCreateNew?: () => void;
  onEdit?: (template: Template) => void;
}

function TemplateGalleryInner({ onCreateNew, onEdit }: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | 'all'
  >('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  const {
    systemTemplates,
    organizationTemplates,
    isLoading,
    useTemplate: applyTemplate,
    duplicateTemplate,
    deleteTemplate,
  } = useTemplates();

  const filteredSystemTemplates = useMemo(() => {
    return systemTemplates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory)
        return false;
      return true;
    });
  }, [systemTemplates, search, selectedType, selectedCategory]);

  const filteredOrgTemplates = useMemo(() => {
    return organizationTemplates.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory)
        return false;
      return true;
    });
  }, [organizationTemplates, search, selectedType, selectedCategory]);

  const handleUseTemplate = async (
    template: Template,
    variables: Record<string, unknown>
  ) => {
    const result = await applyTemplate({
      templateId: template.id,
      variables,
    });

    setSelectedTemplate(null);
    return result;
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 
              rounded-xl text-white placeholder:text-white/40
              focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as TemplateType | 'all')}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl 
            text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all" className="bg-gray-900">
            Todos os tipos
          </option>
          <option value="kpi" className="bg-gray-900">
            KPIs
          </option>
          <option value="action_plan" className="bg-gray-900">
            Planos de Ação
          </option>
          <option value="pdca_cycle" className="bg-gray-900">
            Ciclos PDCA
          </option>
          <option value="goal" className="bg-gray-900">
            Metas
          </option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) =>
            setSelectedCategory(e.target.value as TemplateCategory | 'all')
          }
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl 
            text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all" className="bg-gray-900">
            Todas as categorias
          </option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-gray-900">
              {label}
            </option>
          ))}
        </select>

        {/* Create Button */}
        <button
          onClick={onCreateNew}
          className="px-4 py-2.5 bg-purple-500 text-white rounded-xl 
            hover:bg-purple-600 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Criar Template
        </button>
      </div>

      {/* System Templates */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-purple-400" />
          <h2 className="text-white font-semibold">Templates do Sistema</h2>
          <span className="text-white/40 text-sm">
            ({filteredSystemTemplates.length})
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 bg-white/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredSystemTemplates.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            Nenhum template encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredSystemTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TemplateCard
                    template={template}
                    onUse={() => setSelectedTemplate(template)}
                    onDuplicate={() => duplicateTemplate(template.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Organization Templates */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-purple-400" />
          <h2 className="text-white font-semibold">Templates da Empresa</h2>
          <span className="text-white/40 text-sm">
            ({filteredOrgTemplates.length})
          </span>
        </div>

        {filteredOrgTemplates.length === 0 ? (
          <div className="text-center py-8 text-white/40 bg-white/5 rounded-2xl">
            <Building2 size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum template da empresa ainda</p>
            <button
              onClick={onCreateNew}
              className="mt-2 text-purple-400 hover:text-purple-300"
            >
              Criar primeiro template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredOrgTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TemplateCard
                    template={template}
                    onUse={() => setSelectedTemplate(template)}
                    onEdit={() => onEdit?.(template)}
                    onDelete={() => deleteTemplate(template.id)}
                    showMenu
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Use Template Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <UseTemplateModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onUse={(variables) => handleUseTemplate(selectedTemplate, variables)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export const TemplateGallery = memo(TemplateGalleryInner);
