'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, ClipboardList, RefreshCw, Flag, MessageCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SearchResult, SearchEntityType } from '@/lib/search/search-types';
import { ENTITY_LABELS, STATUS_COLORS } from '@/lib/search/search-types';

interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (result: SearchResult, newTab?: boolean) => void;
  onHover: (index: number) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  total: number;
}

const entityIcons: Record<SearchEntityType, React.ElementType> = {
  kpi: Target,
  action_plan: ClipboardList,
  pdca_cycle: RefreshCw,
  goal: Flag,
  comment: MessageCircle,
};

function SearchResultsInner({
  results,
  selectedIndex,
  onSelect,
  onHover,
  hasMore,
  onLoadMore,
  total,
}: SearchResultsProps) {
  // Group results by type
  const groupedResults = results.reduce(
    (groups, result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
      return groups;
    },
    {} as Record<SearchEntityType, SearchResult[]>
  );

  let currentIndex = 0;

  return (
    <div className="py-2">
      {Object.entries(groupedResults).map(([type, typeResults]) => {
        const Icon = entityIcons[type as SearchEntityType];
        const startIndex = currentIndex;
        currentIndex += typeResults.length;

        return (
          <div key={type} className="mb-2">
            {/* Section Header */}
            <div className="px-4 py-2 flex items-center gap-2 text-white/40 text-sm">
              <Icon size={14} />
              <span>{ENTITY_LABELS[type as SearchEntityType]}</span>
              <span>({typeResults.length})</span>
            </div>

            {/* Results */}
            {typeResults.map((result, index) => {
              const globalIndex = startIndex + index;
              const isSelected = globalIndex === selectedIndex;

              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: globalIndex * 0.02 }}
                  className={`px-4 py-3 cursor-pointer transition-colors
                    ${isSelected ? 'bg-purple-500/20' : 'hover:bg-white/5'}`}
                  onClick={(e) => onSelect(result, e.metaKey || e.ctrlKey)}
                  onMouseEnter={() => onHover(globalIndex)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/30' : 'bg-white/5'}`}
                    >
                      <Icon
                        size={16}
                        className={isSelected ? 'text-purple-300' : 'text-white/60'}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium truncate">{result.title}</h4>
                        {result.value && (
                          <span className="text-white/60 text-sm">{result.value}</span>
                        )}
                        {result.status && (
                          <span
                            className={`w-2 h-2 rounded-full 
                            ${STATUS_COLORS[result.status] || 'bg-gray-500'}`}
                          />
                        )}
                      </div>

                      {result.subtitle && (
                        <p className="text-white/40 text-sm truncate mt-0.5">{result.subtitle}</p>
                      )}

                      {/* Highlight */}
                      {result.highlight?.map((h, i) => (
                        <p
                          key={i}
                          className="text-white/50 text-sm mt-1"
                          dangerouslySetInnerHTML={{ __html: h.snippet }}
                        />
                      ))}

                      <p className="text-white/30 text-xs mt-1">
                        Atualizado{' '}
                        {formatDistanceToNow(new Date(result.updatedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(result, true);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white/40 
                          hover:text-white transition-colors"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })}

      {/* Load More */}
      {hasMore && (
        <div className="px-4 py-3 text-center">
          <button
            onClick={onLoadMore}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Carregar mais resultados ({results.length} de {total})
          </button>
        </div>
      )}
    </div>
  );
}

export const SearchResults = memo(SearchResultsInner);
