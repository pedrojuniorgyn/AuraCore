'use client';

import { useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Command } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { SearchResults } from './SearchResults';
import { SearchSuggestions } from './SearchSuggestions';
import { RecentSearches } from './RecentSearches';
import { QuickFilters } from './QuickFilters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SearchModalInner({ isOpen, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    suggestions,
    facets,
    isSearching,
    total,
    hasMore,
    loadMore,
    clear,
    selectedIndex,
    setSelectedIndex,
    selectResult,
  } = useGlobalSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      clear();
    }
  }, [isOpen, clear]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = results.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            selectResult(results[selectedIndex], e.metaKey || e.ctrlKey);
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [results, selectedIndex, setSelectedIndex, selectResult, onClose]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-auto mt-[15vh] bg-gray-900 
            rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-white/10">
            {isSearching ? (
              <Loader2 size={20} className="text-purple-400 animate-spin" />
            ) : (
              <Search size={20} className="text-white/40" />
            )}

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar KPIs, planos, metas..."
              className="flex-1 px-4 py-4 bg-transparent text-white 
                placeholder:text-white/40 focus:outline-none text-lg"
            />

            <div className="flex items-center gap-2">
              {query && (
                <button
                  onClick={clear}
                  className="p-1 rounded hover:bg-white/10 text-white/40 
                    hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
              <kbd
                className="px-2 py-1 text-xs text-white/40 bg-white/5 
                rounded border border-white/10"
              >
                ESC
              </kbd>
            </div>
          </div>

          {/* Quick Filters */}
          <QuickFilters filters={filters} onChange={setFilters} facets={facets} />

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto">
            {/* Suggestions while typing */}
            {query && query.length >= 2 && suggestions.length > 0 && !results.length && (
              <SearchSuggestions suggestions={suggestions} onSelect={(text) => setQuery(text)} />
            )}

            {/* Results */}
            {query && results.length > 0 && (
              <SearchResults
                results={results}
                selectedIndex={selectedIndex}
                onSelect={(result, newTab) => {
                  selectResult(result, newTab);
                  onClose();
                }}
                onHover={setSelectedIndex}
                hasMore={hasMore}
                onLoadMore={loadMore}
                total={total}
              />
            )}

            {/* No results */}
            {query && !isSearching && results.length === 0 && (
              <div className="p-8 text-center text-white/40">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado para &quot;{query}&quot;</p>
                <p className="text-sm mt-1">Tente usar termos diferentes ou menos filtros</p>
              </div>
            )}

            {/* Recent searches (when no query) */}
            {!query && <RecentSearches onSelect={setQuery} />}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 border-t border-white/10 flex items-center 
            justify-between text-white/40 text-xs"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↓</kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↵</kbd>
                Abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded flex items-center">
                  <Command size={10} />↵
                </kbd>
                Nova aba
              </span>
            </div>

            {total > 0 && <span>{total} resultado{total !== 1 ? 's' : ''}</span>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export const SearchModal = memo(SearchModalInner);
