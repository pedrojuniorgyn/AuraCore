'use client';

import { useState, memo } from 'react';
import { Search, Filter, X, Download } from 'lucide-react';
import type { AuditFilter, AuditEntityType, AuditAction } from '@/lib/audit/audit-types';
import { ENTITY_TYPE_LABELS, ACTION_LABELS } from '@/lib/audit/audit-types';

interface AuditFiltersProps {
  filter: AuditFilter;
  onFilterChange: (filter: AuditFilter) => void;
  onExport: () => void;
  isExporting?: boolean;
}

const datePresets = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
  { label: 'Este ano', days: 365 },
];

function AuditFiltersInner({
  filter,
  onFilterChange,
  onExport,
  isExporting,
}: AuditFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');

  const handlePresetChange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    onFilterChange({ ...filter, startDate, endDate });
  };

  const handleSearch = () => {
    onFilterChange({ ...filter, searchQuery });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    onFilterChange({});
  };

  const hasActiveFilters =
    filter.startDate ||
    filter.endDate ||
    filter.userId ||
    filter.entityType ||
    filter.action ||
    filter.searchQuery;

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
      <div className="flex items-center gap-2 text-white font-medium">
        <Filter size={18} />
        Filtros
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Preset */}
        <div>
          <label className="text-white/60 text-sm mb-2 block">Período</label>
          <select
            onChange={(e) => handlePresetChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white focus:outline-none focus:border-purple-500"
          >
            <option value="" className="bg-gray-900">
              Selecione...
            </option>
            {datePresets.map((preset) => (
              <option key={preset.days} value={preset.days} className="bg-gray-900">
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type */}
        <div>
          <label className="text-white/60 text-sm mb-2 block">Entidade</label>
          <select
            value={filter.entityType || ''}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                entityType: (e.target.value as AuditEntityType) || undefined,
              })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white focus:outline-none focus:border-purple-500"
          >
            <option value="" className="bg-gray-900">
              Todas as entidades
            </option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-gray-900">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div>
          <label className="text-white/60 text-sm mb-2 block">Ação</label>
          <select
            value={filter.action || ''}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                action: (e.target.value as AuditAction) || undefined,
              })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white focus:outline-none focus:border-purple-500"
          >
            <option value="" className="bg-gray-900">
              Todas as ações
            </option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-gray-900">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="text-white/60 text-sm mb-2 block">Buscar</label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg 
                text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg 
              hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <Search size={16} />
            Buscar
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-white/5 text-white/70 rounded-lg 
                hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Limpar Filtros
            </button>
          )}
        </div>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="px-4 py-2 bg-white/5 text-white/70 rounded-lg 
            hover:bg-white/10 transition-colors flex items-center gap-2
            disabled:opacity-50"
        >
          <Download size={16} />
          {isExporting ? 'Exportando...' : 'Exportar'}
        </button>
      </div>
    </div>
  );
}

export const AuditFilters = memo(AuditFiltersInner);
