'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList } from 'lucide-react';

interface ViewToggleProps {
  module: string;
  currentView: 'cards' | 'grid';
  onViewChange: (view: 'cards' | 'grid') => void;
}

export function ViewToggle({ module, currentView, onViewChange }: ViewToggleProps) {
  const storageKey = `strategic.${module}.view`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, currentView);
    }
  }, [currentView, storageKey]);

  return (
    <div
      className="inline-flex rounded-md shadow-sm"
      role="group"
      aria-label="Alternar visualização"
    >
      <Button
        variant={currentView === 'cards' ? 'default' : 'outline'}
        onClick={() => onViewChange('cards')}
        className="rounded-r-none"
        aria-label="Visualizar como cards"
        aria-pressed={currentView === 'cards'}
      >
        <LayoutGrid className="mr-2 h-4 w-4" aria-hidden="true" />
        <span>Cards</span>
      </Button>
      <Button
        variant={currentView === 'grid' ? 'default' : 'outline'}
        onClick={() => onViewChange('grid')}
        className="rounded-l-none"
        aria-label="Visualizar como tabela"
        aria-pressed={currentView === 'grid'}
      >
        <LayoutList className="mr-2 h-4 w-4" aria-hidden="true" />
        <span>Grid</span>
      </Button>
    </div>
  );
}
