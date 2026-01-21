'use client';

import { memo } from 'react';
import { Search, Target, User, Tag } from 'lucide-react';
import type { SearchSuggestion } from '@/lib/search/search-types';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (text: string) => void;
}

const typeIcons: Record<SearchSuggestion['type'], React.ElementType> = {
  query: Search,
  entity: Target,
  user: User,
  tag: Tag,
};

function SearchSuggestionsInner({ suggestions, onSelect }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-white/40 text-sm flex items-center gap-2">
        <Search size={14} />
        <span>Sugestões</span>
      </div>

      <div className="space-y-1">
        {suggestions.map((suggestion, index) => {
          const Icon = typeIcons[suggestion.type] || Search;

          return (
            <button
              key={index}
              onClick={() => onSelect(suggestion.text)}
              className="w-full px-4 py-2 flex items-center gap-3 
                hover:bg-white/5 transition-colors text-left"
            >
              <Icon size={16} className="text-white/40" />
              <span className="text-white">
                {suggestion.highlight ? (
                  <span dangerouslySetInnerHTML={{ __html: suggestion.highlight }} />
                ) : (
                  suggestion.text
                )}
              </span>
              {suggestion.entityType && (
                <span className="text-white/30 text-xs ml-auto">{suggestion.entityType}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SearchSuggestions = memo(SearchSuggestionsInner);
