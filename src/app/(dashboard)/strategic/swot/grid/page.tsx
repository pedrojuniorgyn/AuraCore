'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ViewToggle } from '@/components/strategic/shared/ViewToggle';
import { SWOTGrid } from '@/components/strategic/swot/SWOTGrid';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface SwotAnalysis {
  id: string;
  code: string;
  title: string;
  description: string;
  itemsCount: {
    strengths: number;
    weaknesses: number;
    opportunities: number;
    threats: number;
  };
  status: string;
  responsible: string;
  impact: string;
  probability: string;
  strategicPriority: number;
  createdAt: string | Date;
}

export default function SWOTGridPage() {
  const router = useRouter();
  const [data, setData] = useState<SwotAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Esta página SEMPRE mostra grid, então view é sempre 'grid'
  const view = 'grid' as const;

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/api/strategic/swot/grid?pageSize=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const { data: analyses } = await response.json();
      setData(analyses || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error fetching SWOT Analyses:', error);
      toast.error('Erro ao carregar Análises SWOT', {
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
      router.push('/strategic/swot');
    }
    // Se newView === 'grid', já estamos na página grid, nada a fazer
  };

  const handleExport = async () => {
    toast.info('Exportação Excel em desenvolvimento', {
      description: 'Use o botão "Export" do AG-Grid no canto superior direito da tabela',
    });
  };

  // Calcular estatísticas gerais
  const stats = {
    total: data.length,
    highPriority: data.filter(s => s.strategicPriority >= 8).length,
    mediumPriority: data.filter(s => s.strategicPriority >= 5 && s.strategicPriority < 8).length,
    lowPriority: data.filter(s => s.strategicPriority < 5).length,
    totalItems: data.reduce((acc, s) => 
      acc + s.itemsCount.strengths + s.itemsCount.weaknesses + 
      s.itemsCount.opportunities + s.itemsCount.threats, 0
    ),
  };

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      {/* Header */}
      <PageHeader
        icon="📊"
        title="Análises SWOT - Visualização Grid"
        description="Gestão estratégica com matriz de Forças, Fraquezas, Oportunidades e Ameaças"
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

            <Link href="/strategic/swot/new">
              <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                <Plus className="w-4 h-4 mr-2" />
                Nova Análise
              </RippleButton>
            </Link>

            <ViewToggle 
              module="swot" 
              currentView={view} 
              onViewChange={handleViewChange} 
            />
          </>
        }
      />

      {/* Quick Stats - Prioridade Estratégica */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4">
            <div className="text-sm text-red-200">Prioridade Alta</div>
            <div className="text-2xl font-bold text-red-400">{stats.highPriority}</div>
            <div className="text-xs text-red-300 mt-1">
              Prioridade ≥ 8/10
            </div>
          </div>

          <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-yellow-200">Prioridade Média</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.mediumPriority}</div>
            <div className="text-xs text-yellow-300 mt-1">
              Prioridade 5-7.9/10
            </div>
          </div>

          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-green-200">Prioridade Baixa</div>
            <div className="text-2xl font-bold text-green-400">{stats.lowPriority}</div>
            <div className="text-xs text-green-300 mt-1">
              Prioridade &lt; 5/10
            </div>
          </div>

          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm text-blue-200">Total de Itens</div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalItems}</div>
            <div className="text-xs text-blue-300 mt-1">
              F + W + O + T
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
        <SWOTGrid data={data} loading={loading} />
      </div>

      {/* Info Footer */}
      {!loading && data.length > 0 && (
        <div className="text-center text-sm text-white/60 space-y-2">
          <p>
            💡 Dica: Clique na seta{' '}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-white/80 text-xs mx-1">
              ▶
            </span>{' '}
            para ver a <strong>matriz SWOT completa</strong> (4 quadrantes coloridos)
          </p>
          <p>
            📊 <strong>Prioridade Estratégica</strong> é calculada por: Impacto × Probabilidade
          </p>
          <p>
            🎯 <strong>Itens SWOT</strong>: 
            <span className="text-green-400 font-semibold mx-1">F</span>orças, 
            <span className="text-red-400 font-semibold mx-1">W</span>eaknesses (Fraquezas), 
            <span className="text-blue-400 font-semibold mx-1">O</span>portunidades, 
            <span className="text-orange-400 font-semibold mx-1">T</span>hreats (Ameaças)
          </p>
        </div>
      )}
    </div>
  );
}
