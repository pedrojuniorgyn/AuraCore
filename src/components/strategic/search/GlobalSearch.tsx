'use client';

import { useState, useEffect, memo } from 'react';
import { Search, Command } from 'lucide-react';
import { SearchModal } from './SearchModal';

function GlobalSearchInner() {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 
          rounded-xl border border-white/10 hover:bg-white/10 
          hover:border-white/20 transition-all group w-64"
      >
        <Search size={16} className="text-white/40 group-hover:text-white/60" />
        <span className="flex-1 text-left text-white/40 text-sm">Buscar...</span>
        <kbd
          className="px-1.5 py-0.5 text-xs text-white/30 bg-white/5 
          rounded border border-white/10 flex items-center gap-0.5"
        >
          <Command size={10} />K
        </kbd>
      </button>

      <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export const GlobalSearch = memo(GlobalSearchInner);
