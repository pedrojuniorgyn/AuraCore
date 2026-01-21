'use client';

import { memo } from 'react';
import { Clock, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface RecentSearchesProps {
  onSelect: (query: string) => void;
}

function RecentSearchesInner({ onSelect }: RecentSearchesProps) {
  const { recentSearches, clearHistory, removeSearch } = useSearchHistory();

  if (recentSearches.length === 0) {
    return (
      <div className="p-8 text-center text-white/40">
        <Clock size={32} className="mx-auto mb-2 opacity-50" />
        <p>Nenhuma busca recente</p>
        <p className="text-sm mt-1">Suas buscas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Clock size={14} />
          <span>Buscas Recentes</span>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-white/30 text-xs 
            hover:text-white/60 transition-colors"
        >
          <Trash2 size={12} />
          Limpar
        </button>
      </div>

      <div className="space-y-1">
        {recentSearches.map((search) => (
          <div
            key={search.id}
            className="px-4 py-2 flex items-center gap-3 
              hover:bg-white/5 transition-colors group"
          >
            <button
              onClick={() => onSelect(search.query)}
              className="flex-1 flex items-center gap-3 text-left"
            >
              <Clock size={14} className="text-white/40" />
              <span className="text-white">{search.query}</span>
              <span className="text-white/30 text-xs ml-auto">
                {search.resultCount} resultado{search.resultCount !== 1 ? 's' : ''}
              </span>
              <span className="text-white/20 text-xs">
                {formatDistanceToNow(new Date(search.timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSearch(search.id);
              }}
              className="p-1 rounded hover:bg-white/10 text-white/20 
                hover:text-white/60 transition-colors opacity-0 
                group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export const RecentSearches = memo(RecentSearchesInner);
