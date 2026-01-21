'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LayoutDashboard, Plus, Lock, Unlock, RotateCcw, Save, Loader2, RefreshCw } from 'lucide-react';
import { DashboardGrid, type DashboardData } from '@/components/strategic/DashboardGrid';
import { WidgetPicker } from '@/components/strategic/WidgetPicker';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // FIX Bug 3: Refs para proteção de unmount em callbacks manuais
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    widgets,
    isEditing,
    isSaving,
    isLoading: isLoadingLayout,
    activeWidgetTypes,
    setIsEditing,
    handleLayoutChange,
    removeWidget,
    toggleWidget,
    resetLayout,
    saveLayout,
  } = useDashboardLayout();

  // FIX Bug 3: fetchData com proteção de cleanup para uso em callbacks
  const fetchData = useCallback(async () => {
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Criar novo AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoadingData(true);
      const response = await fetch('/api/strategic/dashboard/data', {
        signal: controller.signal,
      });
      
      // FIX Bug 3: Só atualizar se ainda montado
      if (response.ok && isMountedRef.current) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      // Ignorar erro de abort (navegação intencional)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      if (isMountedRef.current) {
        console.error('Failed to fetch dashboard data:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingData(false);
      }
    }
  }, []);

  // FIX Bug 3 + 4: Initial fetch + cleanup unificado
  useEffect(() => {
    isMountedRef.current = true;
    
    // Fetch inicial
    fetchData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      // Cancelar request pendente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Auto-refresh with cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      // Só faz refresh se montado
      if (isMountedRef.current) {
        fetchData();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchData]);

  // Handle container resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSave = async () => {
    const success = await saveLayout();
    if (success) {
      setIsEditing(false);
      toast.success('Layout salvo com sucesso!');
    } else {
      toast.error('Erro ao salvar layout');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Could reset to last saved state if needed
  };

  const isLoading = isLoadingData || isLoadingLayout;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="text-purple-400" />
            Dashboard
          </h1>
          <p className="text-white/60 mt-1 text-sm lg:text-base">
            {isEditing ? 'Arraste e redimensione os widgets' : 'Personalize sua visualização'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/strategic/dashboard/showcase"
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 
              text-purple-300 flex items-center gap-2 hover:from-purple-500/30 hover:to-pink-500/30 transition-all text-sm"
          >
            ✨ Visão Premium
          </Link>
          {isEditing ? (
            <>
              <button
                onClick={() => setShowPicker(true)}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
              >
                <Plus size={16} /> Widget
              </button>
              <button
                onClick={resetLayout}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white hover:bg-white/20 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                  flex items-center gap-2 hover:bg-purple-600 disabled:opacity-50 transition-colors text-sm"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={fetchData}
                disabled={isLoadingData}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
              >
                <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
                Atualizar
              </button>
              <button
                onClick={() => setIsEditing(true)}
                data-tour="customize"
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
                  text-white flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
              >
                <Lock size={16} />
                Editar
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Editing Mode Banner */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 
            flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Unlock size={16} className="text-yellow-400" />
            <span className="text-yellow-300 text-sm">
              Modo edição ativo - Arraste widgets pelo ícone ⋮⋮ ou redimensione pelos cantos
            </span>
          </div>
        </motion.div>
      )}

      {/* Grid Container */}
      <div ref={containerRef} className="w-full">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl bg-white/5 animate-pulse ${
                  i <= 3 ? 'h-[300px]' : i === 6 ? 'col-span-3 h-[150px]' : 'h-[300px]'
                }`}
              />
            ))}
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets}
            data={data}
            isEditing={isEditing}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={removeWidget}
            containerWidth={containerWidth}
          />
        )}
      </div>

      {/* Widget Picker Modal */}
      <WidgetPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        activeWidgets={activeWidgetTypes}
        onToggleWidget={toggleWidget}
      />
    </div>
  );
}
