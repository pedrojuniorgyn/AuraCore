'use client';

import { memo } from 'react';
import { Target, ClipboardList, RefreshCw, Flag, LayoutGrid } from 'lucide-react';
import type { SearchFilters, SearchFacets, SearchEntityType } from '@/lib/search/search-types';

interface QuickFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  facets: SearchFacets | null;
}

const filterOptions: {
  value: SearchEntityType | 'all';
  label: string;
  icon: React.ElementType;
}[] = [
  { value: 'all', label: 'Todos', icon: LayoutGrid },
  { value: 'kpi', label: 'KPIs', icon: Target },
  { value: 'action_plan', label: 'Planos', icon: ClipboardList },
  { value: 'pdca_cycle', label: 'PDCA', icon: RefreshCw },
  { value: 'goal', label: 'Metas', icon: Flag },
];

function QuickFiltersInner({ filters, onChange, facets }: QuickFiltersProps) {
  const activeTypes = filters.entityTypes || [];
  const isAll = activeTypes.length === 0;

  const handleToggle = (type: SearchEntityType | 'all') => {
    if (type === 'all') {
      onChange({ ...filters, entityTypes: undefined });
    } else {
      onChange({ ...filters, entityTypes: [type] });
    }
  };

  const getCount = (type: SearchEntityType): number => {
    return facets?.entityTypes.find((f) => f.type === type)?.count || 0;
  };

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive =
            option.value === 'all' ? isAll : activeTypes.includes(option.value as SearchEntityType);
          const count = option.value !== 'all' ? getCount(option.value) : null;

          return (
            <button
              key={option.value}
              onClick={() => handleToggle(option.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg 
                text-sm whitespace-nowrap transition-all
                ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
                }`}
            >
              <Icon size={14} />
              <span>{option.label}</span>
              {count !== null && count > 0 && (
                <span className={`text-xs ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const QuickFilters = memo(QuickFiltersInner);
