'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ViewToggle } from '@/components/strategic/shared/ViewToggle';
import { PDCAGrid } from '@/components/strategic/pdca/PDCAGrid';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PDCACycle {
  id: string;
  code: string;
  title: string;
  description: string;
  currentPhase: string;
  status: string;
  responsible: string;
  responsibleUserId: string | null;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  effectiveness: number | null;
  isOverdue: boolean;
  daysUntilDue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function PDCAGridPage() {
  const router = useRouter();
  const [data, setData] = useState<PDCACycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Esta página SEMPRE mostra grid, então view é sempre 'grid'
  const view = 'grid' as const;

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/api/strategic/pdca/grid?pageSize=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const { data: cycles } = await response.json();
      setData(cycles || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error fetching PDCA Cycles:', error);
      toast.error('Erro ao carregar Ciclos PDCA', {
        description: message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewChange = (newView: 'cards' | 'grid') => {
    if (newView === 'cards') {
      router.push('/strategic/pdca');
    }
    // Se newView === 'grid', já estamos na página grid, nada a fazer
  };

  const handleExport = async () => {
    toast.info('Exportação Excel em desenvolvimento', {
      description: 'Use o botão "Export" do AG-Grid no canto superior direito da tabela',
    });
  };

  // Calcular estatísticas por fase
  const stats = {
    total: data.length,
    plan: data.filter(c => c.currentPhase === 'PLAN').length,
    do: data.filter(c => c.currentPhase === 'DO').length,
    check: data.filter(c => c.currentPhase === 'CHECK').length,
    act: data.filter(c => c.currentPhase === 'ACT').length,
  };

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      {/* Header */}
      <PageHeader
        icon="🔄"
        title="Ciclos PDCA - Visualização Grid"
        description="Gerenciamento de melhorias contínuas por fase"
        recordCount={data.length}
        onRefresh={() => fetchData(true)}
        isLoading={refreshing}
        actions={
          <>
            <RippleButton
              onClick={handleExport}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </RippleButton>

            <Link href="/strategic/action-plans/new">
              <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                <Plus className="w-4 h-4 mr-2" />
                Novo Ciclo
              </RippleButton>
            </Link>

            <ViewToggle 
              module="pdca" 
              currentView={view} 
              onViewChange={handleViewChange} 
            />
          </>
        }
      />

      {/* Quick Stats - Distribuição por Fase */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm text-blue-200">Plan (Planejar)</div>
            <div className="text-2xl font-bold text-blue-400">{stats.plan}</div>
            <div className="text-xs text-blue-300 mt-1">
              {((stats.plan / Math.max(stats.total, 1)) * 100).toFixed(0)}% do total
            </div>
          </div>

          <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
            <div className="text-sm text-purple-200">Do (Executar)</div>
            <div className="text-2xl font-bold text-purple-400">{stats.do}</div>
            <div className="text-xs text-purple-300 mt-1">
              {((stats.do / Math.max(stats.total, 1)) * 100).toFixed(0)}% do total
            </div>
          </div>

          <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-yellow-200">Check (Verificar)</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.check}</div>
            <div className="text-xs text-yellow-300 mt-1">
              {((stats.check / Math.max(stats.total, 1)) * 100).toFixed(0)}% do total
            </div>
          </div>

          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-green-200">Act (Agir)</div>
            <div className="text-2xl font-bold text-green-400">{stats.act}</div>
            <div className="text-xs text-green-300 mt-1">
              {((stats.act / Math.max(stats.total, 1)) * 100).toFixed(0)}% do total
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
        <PDCAGrid data={data} loading={loading} />
      </div>

      {/* Info Footer */}
      {!loading && data.length > 0 && (
        <div className="text-center text-sm text-white/60 space-y-2">
          <p>
            💡 Dica: Clique na seta{' '}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-white/80 text-xs mx-1">
              ▶
            </span>{' '}
            para ver timeline completa de fases e ações realizadas
          </p>
          <p>
            🔄 Por padrão, o grid já está agrupado por <strong>Fase Atual</strong>
          </p>
        </div>
      )}
    </div>
  );
}
