'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Filter, LayoutGrid, Search, Building2 } from 'lucide-react';
import { useOKRs } from '@/hooks/useOKRs';
import { OKRTree, OKRCard, OKRForm } from '@/components/strategic/okrs';
import { LEVEL_LABELS, STATUS_LABELS, PERIOD_PRESETS } from '@/lib/okrs/okr-types';
import type { OKRLevel, OKRStatus } from '@/lib/okrs/okr-types';

export default function OKRsPage() {
  const { okrs, tree, isLoading, filters, setFilters, createOKR } = useOKRs();
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [showNewOKRForm, setShowNewOKRForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Q1-2026');

  const handleCreateOKR = async (data: Parameters<typeof createOKR>[0]) => {
    await createOKR(data);
    setShowNewOKRForm(false);
  };

  const stats = {
    total: okrs.length,
    active: okrs.filter((o) => o.status === 'active').length,
    completed: okrs.filter((o) => o.status === 'completed').length,
    avgProgress: okrs.length > 0
      ? Math.round(okrs.reduce((sum, o) => sum + o.progress, 0) / okrs.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Target className="text-purple-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">OKRs</h1>
              <p className="text-white/60">Objetivos e Key Results em Cascata</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl
                text-white focus:outline-none focus:border-purple-500"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value} className="bg-gray-900">
                  {p.label}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'tree' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <Building2 size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            <button
              onClick={() => setShowNewOKRForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white
                rounded-xl hover:bg-purple-600 transition-colors"
            >
              <Plus size={18} />
              <span>Novo OKR</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/5 rounded-xl border border-white/10"
          >
            <span className="text-white/40 text-sm">Total OKRs</span>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-green-500/10 rounded-xl border border-green-500/20"
          >
            <span className="text-green-400/60 text-sm">Ativos</span>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
          >
            <span className="text-blue-400/60 text-sm">Concluídos</span>
            <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20"
          >
            <span className="text-purple-400/60 text-sm">Progresso Médio</span>
            <p className="text-2xl font-bold text-purple-400">{stats.avgProgress}%</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar OKRs..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors
              ${showFilters ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Nível</label>
                <select
                  onChange={(e) =>
                    setFilters({ ...filters, level: e.target.value as OKRLevel || undefined })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white focus:outline-none"
                >
                  <option value="" className="bg-gray-900">Todos</option>
                  {(Object.keys(LEVEL_LABELS) as OKRLevel[]).map((level) => (
                    <option key={level} value={level} className="bg-gray-900">
                      {LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Status</label>
                <select
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as OKRStatus || undefined })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white focus:outline-none"
                >
                  <option value="" className="bg-gray-900">Todos</option>
                  {(Object.keys(STATUS_LABELS) as OKRStatus[]).map((status) => (
                    <option key={status} value={status} className="bg-gray-900">
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Responsável</label>
                <input
                  type="text"
                  placeholder="ID do responsável"
                  onChange={(e) => setFilters({ ...filters, ownerId: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-lg text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* New OKR Form */}
        {showNewOKRForm && (
          <div className="mb-6">
            <OKRForm onSubmit={handleCreateOKR} onCancel={() => setShowNewOKRForm(false)} />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'tree' ? (
          <OKRTree tree={tree} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {okrs.map((okr) => (
              <OKRCard key={okr.id} okr={okr} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && okrs.length === 0 && (
          <div className="text-center py-20">
            <Target className="mx-auto mb-4 text-white/20" size={48} />
            <h3 className="text-white font-medium mb-2">Nenhum OKR encontrado</h3>
            <p className="text-white/40 mb-4">Crie seu primeiro OKR para começar</p>
            <button
              onClick={() => setShowNewOKRForm(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600"
            >
              Criar OKR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
