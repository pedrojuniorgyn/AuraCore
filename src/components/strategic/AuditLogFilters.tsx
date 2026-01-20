"use client";

/**
 * AuditLogFilters - Filtros avançados para o log de auditoria
 * 
 * @module components/strategic
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'COMMENT' | 'STATUS_CHANGE' | 'AUTO';
export type AuditEntityType = 'action-plan' | 'kpi' | 'pdca' | 'goal' | 'swot' | 'task';

export interface AuditFilters {
  search: string;
  actions: AuditAction[];
  entityTypes: AuditEntityType[];
  userId: string;
  dateFrom: string;
  dateTo: string;
}

interface User {
  id: string;
  name: string;
}

interface Props {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
  users: User[];
}

const ACTION_OPTIONS: { value: AuditAction; label: string; icon: string }[] = [
  { value: 'CREATE', label: 'Criação', icon: '➕' },
  { value: 'UPDATE', label: 'Edição', icon: '✏️' },
  { value: 'DELETE', label: 'Exclusão', icon: '🗑️' },
  { value: 'COMMENT', label: 'Comentário', icon: '💬' },
  { value: 'STATUS_CHANGE', label: 'Status', icon: '🔄' },
  { value: 'AUTO', label: 'Automático', icon: '🤖' },
];

const ENTITY_OPTIONS: { value: AuditEntityType; label: string }[] = [
  { value: 'action-plan', label: 'Plano de Ação' },
  { value: 'kpi', label: 'KPI' },
  { value: 'pdca', label: 'Ciclo PDCA' },
  { value: 'goal', label: 'Objetivo' },
  { value: 'swot', label: 'SWOT' },
  { value: 'task', label: 'Tarefa' },
];

export function AuditLogFilters({ filters, onChange, users }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleAction = (action: AuditAction) => {
    const newActions = filters.actions.includes(action)
      ? filters.actions.filter(a => a !== action)
      : [...filters.actions, action];
    updateFilter('actions', newActions);
  };

  const toggleEntityType = (type: AuditEntityType) => {
    const newTypes = filters.entityTypes.includes(type)
      ? filters.entityTypes.filter(t => t !== type)
      : [...filters.entityTypes, type];
    updateFilter('entityTypes', newTypes);
  };

  const clearFilters = () => {
    onChange({
      search: '',
      actions: [],
      entityTypes: [],
      userId: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.actions.length > 0 || 
    filters.entityTypes.length > 0 || 
    filters.userId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Buscar por descrição, entidade..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 
              text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-3 rounded-xl border flex items-center gap-2 transition-all
            ${showAdvanced || hasActiveFilters
              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
        >
          <Filter size={18} />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 
              text-white/70 hover:bg-white/10 flex items-center gap-2"
          >
            <X size={18} /> Limpar
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
        >
          {/* Actions */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Tipo de Ação</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => toggleAction(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all
                    ${filters.actions.includes(value)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    } border`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Types */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Tipo de Entidade</label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleEntityType(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all
                    ${filters.entityTypes.includes(value)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    } border`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* User & Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Usuário</label>
              <select
                value={filters.userId}
                onChange={(e) => updateFilter('userId', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Todos</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Data Inicial</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Data Final</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
