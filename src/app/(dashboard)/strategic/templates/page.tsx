"use client";

/**
 * Página de Templates de Planos de Ação
 * 
 * @module app/(dashboard)/strategic/templates
 */
import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Plus, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TemplateCard, type Template } from '@/components/strategic/TemplateCard';
import { TemplatePreview, type TemplateDetail } from '@/components/strategic/TemplatePreview';
import { TemplateEditor, type TemplateData } from '@/components/strategic/TemplateEditor';
import { toast } from 'sonner';

interface TemplateWithFlags extends TemplateDetail {
  isSystem?: boolean;
  isOwner?: boolean;
}

const categoryLabels: Record<string, string> = {
  logistics: '📦 Logística & Operações',
  financial: '💼 Financeiro',
  commercial: '🛒 Comercial',
  hr: '👥 RH',
  quality: '✅ Qualidade',
  general: '📋 Geral',
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateWithFlags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/strategic/templates');
      if (!response.ok) throw new Error('Erro ao carregar templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const mutate = fetchTemplates;

  const myTemplates = templates.filter((t: TemplateWithFlags) => t.isOwner);
  const systemTemplates = templates.filter((t: TemplateWithFlags) => t.isSystem);

  const filteredTemplates = templates.filter((t: TemplateWithFlags) => {
    const matchesSearch = !search || 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || t.category === category;
    return matchesSearch && matchesCategory;
  });

  const popularTemplates = [...systemTemplates]
    .sort((a: TemplateWithFlags, b: TemplateWithFlags) => b.usageCount - a.usageCount)
    .slice(0, 3);

  const groupedByCategory = filteredTemplates.reduce((groups: Record<string, TemplateWithFlags[]>, t: TemplateWithFlags) => {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
    return groups;
  }, {} as Record<string, TemplateWithFlags[]>);

  const handleUseTemplate = useCallback((id: string) => {
    router.push(`/strategic/action-plans/new?templateId=${id}`);
  }, [router]);

  const handlePreview = useCallback((id: string) => {
    setPreviewId(id);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const template = templates.find((t: TemplateWithFlags) => t.id === id);
    if (template) {
      setEditingTemplate(template as unknown as TemplateData);
      setShowEditor(true);
    }
  }, [templates]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    
    try {
      const response = await fetch(`/api/strategic/templates/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir');
      mutate();
      toast.success('Template excluído');
    } catch {
      toast.error('Erro ao excluir template');
    }
  }, [mutate]);

  const handleSave = useCallback(async (template: TemplateData) => {
    const method = template.id ? 'PUT' : 'POST';
    const url = template.id 
      ? `/api/strategic/templates/${template.id}` 
      : '/api/strategic/templates';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    
    if (!response.ok) throw new Error('Erro ao salvar');
    
    mutate();
    toast.success(template.id ? 'Template atualizado' : 'Template criado');
  }, [mutate]);

  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setEditingTemplate(null);
  }, []);

  const handleOpenNewEditor = useCallback(() => {
    setEditingTemplate(null);
    setShowEditor(true);
  }, []);

  const previewTemplate = templates.find((t: TemplateWithFlags) => t.id === previewId) || null;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar</h2>
            <p className="text-white/60 mb-6">Não foi possível carregar os templates</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => mutate()}
              className="px-6 py-3 rounded-xl bg-purple-500 text-white flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutTemplate className="text-purple-400" />
            Templates de Planos de Ação
          </h1>
          <p className="text-white/60 mt-1">
            Acelere a criação de planos com modelos pré-definidos
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenNewEditor}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white 
            hover:bg-purple-600 flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> Criar Novo
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-8"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 
              text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 
            text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="" className="bg-gray-900">Todas as categorias</option>
          <option value="logistics" className="bg-gray-900">🚚 Logística</option>
          <option value="financial" className="bg-gray-900">💰 Financeiro</option>
          <option value="commercial" className="bg-gray-900">👥 Comercial</option>
          <option value="hr" className="bg-gray-900">🧑‍💼 RH</option>
          <option value="quality" className="bg-gray-900">✅ Qualidade</option>
        </select>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Popular */}
          {popularTemplates.length > 0 && !search && !category && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                ⭐ Templates Populares
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t as Template}
                    onUse={handleUseTemplate}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* My Templates */}
          {myTemplates.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🏢 Meus Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t as Template}
                    onUse={handleUseTemplate}
                    onPreview={handlePreview}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                <button
                  onClick={handleOpenNewEditor}
                  className="h-48 rounded-2xl border-2 border-dashed border-white/20 
                    flex flex-col items-center justify-center gap-2 text-white/40
                    hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                >
                  <Plus size={32} />
                  <span>Criar Novo</span>
                </button>
              </div>
            </motion.section>
          )}

          {/* By Category */}
          {Object.entries(groupedByCategory).map(([cat, items], index) => (
            <motion.section
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <h2 className="text-xl font-bold text-white mb-4">
                {categoryLabels[cat] || cat}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(items as TemplateWithFlags[]).map((t: TemplateWithFlags) => (
                  <TemplateCard
                    key={t.id}
                    template={t as Template}
                    onUse={handleUseTemplate}
                    onPreview={handlePreview}
                    onEdit={t.isOwner ? handleEdit : undefined}
                    onDelete={t.isOwner ? handleDelete : undefined}
                  />
                ))}
              </div>
            </motion.section>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-16">
              <LayoutTemplate className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Nenhum template encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <TemplatePreview
        template={previewTemplate}
        isOpen={!!previewId}
        onClose={() => setPreviewId(null)}
        onUse={handleUseTemplate}
      />

      {/* Editor Modal */}
      <TemplateEditor
        template={editingTemplate}
        isOpen={showEditor}
        onClose={handleCloseEditor}
        onSave={handleSave}
      />
    </div>
  );
}
