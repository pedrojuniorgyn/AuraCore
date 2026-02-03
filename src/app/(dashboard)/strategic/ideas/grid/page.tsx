'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ViewToggle } from '@/components/strategic/shared/ViewToggle';
import { IdeasGrid } from '@/components/strategic/ideas/IdeasGrid';
import { RippleButton } from '@/components/ui/ripple-button';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Download, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Idea {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: string;
  statusLabel: string;
  author: {
    id: string;
    name: string;
  };
  votesCount: number;
  commentsCount: number;
  score: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function IdeasGridPage() {
  const router = useRouter();
  const [data, setData] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Esta página SEMPRE mostra grid, então view é sempre 'grid'
  const view = 'grid' as const;

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/api/strategic/ideas/grid?pageSize=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const { data: ideas } = await response.json();
      setData(ideas || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error fetching Ideas:', error);
      toast.error('Erro ao carregar Ideias', {
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
      router.push('/strategic/ideas');
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
    highScore: data.filter(i => i.score >= 50).length,
    mediumScore: data.filter(i => i.score >= 20 && i.score < 50).length,
    lowScore: data.filter(i => i.score < 20).length,
    totalVotes: data.reduce((acc, i) => acc + i.votesCount, 0),
    totalComments: data.reduce((acc, i) => acc + i.commentsCount, 0),
  };

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      {/* Header */}
      <PageHeader
        icon="💡"
        title="Caixa de Ideias - Visualização Grid"
        description="Banco de ideias com votos, comentários e discussões da comunidade"
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

            <Link href="/strategic/ideas/new">
              <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                <Plus className="w-4 h-4 mr-2" />
                Nova Ideia
              </RippleButton>
            </Link>

            <ViewToggle 
              module="ideas" 
              currentView={view} 
              onViewChange={handleViewChange} 
            />
          </>
        }
      />

      {/* Quick Stats - Score e Engajamento */}
      {!loading && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-green-200">Score Alto</div>
            <div className="text-2xl font-bold text-green-400">{stats.highScore}</div>
            <div className="text-xs text-green-300 mt-1">
              Score ≥ 50
            </div>
          </div>

          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm text-blue-200">Score Médio</div>
            <div className="text-2xl font-bold text-blue-400">{stats.mediumScore}</div>
            <div className="text-xs text-blue-300 mt-1">
              Score 20-49
            </div>
          </div>

          <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-yellow-200">Score Baixo</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.lowScore}</div>
            <div className="text-xs text-yellow-300 mt-1">
              Score &lt; 20
            </div>
          </div>

          <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
            <div className="text-sm text-purple-200">Total de Votos</div>
            <div className="text-2xl font-bold text-purple-400">{stats.totalVotes}</div>
            <div className="text-xs text-purple-300 mt-1">
              👍 Engajamento
            </div>
          </div>

          <div className="bg-pink-500/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-4">
            <div className="text-sm text-pink-200">Total de Comentários</div>
            <div className="text-2xl font-bold text-pink-400">{stats.totalComments}</div>
            <div className="text-xs text-pink-300 mt-1">
              💬 Discussões
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
        <IdeasGrid data={data} loading={loading} />
      </div>

      {/* Info Footer */}
      {!loading && data.length > 0 && (
        <div className="text-center text-sm text-white/60 space-y-2">
          <p>
            💡 Dica: Clique na seta{' '}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-white/80 text-xs mx-1">
              ▶
            </span>{' '}
            para ver as <strong>discussões completas</strong> (comentários + respostas + votos + anexos)
          </p>
          <p>
            📊 <strong>Score</strong> é calculado por: Votos × 2 + Comentários
          </p>
          <p>
            🎯 <strong>Ordenação padrão:</strong> Score decrescente (ideias mais populares primeiro)
          </p>
          <p>
            👍 <strong>Votos</strong> e 💬 <strong>Comentários</strong> indicam engajamento da comunidade
          </p>
        </div>
      )}
    </div>
  );
}
