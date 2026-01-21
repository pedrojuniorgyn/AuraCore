"use client";

/**
 * Página: SWOT Matrix
 * Análise estratégica SWOT (Forças, Fraquezas, Oportunidades, Ameaças)
 * 
 * @module app/(dashboard)/strategic/swot
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  Title, 
  Text, 
  Flex,
  Metric,
} from '@tremor/react';
import { 
  RefreshCw,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Target,
  Flame,
  Plus,
  Star,
  Edit2,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type SwotQuadrant = 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT';

interface SwotItem {
  id: string;
  quadrant: SwotQuadrant;
  title: string;
  description?: string;
  impactScore: number;
  probabilityScore: number;
  priorityScore: number;
  category?: string;
  status: string;
}

interface SwotSummary {
  strengths: { count: number; avgScore: number };
  weaknesses: { count: number; avgScore: number };
  opportunities: { count: number; avgScore: number };
  threats: { count: number; avgScore: number };
}

// Safelist pattern - classes explícitas (incluindo hover)
const QUADRANT_STYLES = {
  STRENGTH: {
    bg: 'bg-emerald-900/20',
    hoverBg: 'hover:bg-emerald-900/30',
    border: 'border-emerald-500/30',
    headerBg: 'bg-emerald-600',
    itemBg: 'bg-emerald-800/30',
    itemBorder: 'border-emerald-600/30',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    icon: Shield,
    label: 'Forças',
    subtitle: 'Interno / Positivo',
  },
  WEAKNESS: {
    bg: 'bg-red-900/20',
    hoverBg: 'hover:bg-red-900/30',
    border: 'border-red-500/30',
    headerBg: 'bg-red-600',
    itemBg: 'bg-red-800/30',
    itemBorder: 'border-red-600/30',
    text: 'text-red-400',
    badgeBg: 'bg-red-500/20',
    icon: AlertTriangle,
    label: 'Fraquezas',
    subtitle: 'Interno / Negativo',
  },
  OPPORTUNITY: {
    bg: 'bg-blue-900/20',
    hoverBg: 'hover:bg-blue-900/30',
    border: 'border-blue-500/30',
    headerBg: 'bg-blue-600',
    itemBg: 'bg-blue-800/30',
    itemBorder: 'border-blue-600/30',
    text: 'text-blue-400',
    badgeBg: 'bg-blue-500/20',
    icon: Target,
    label: 'Oportunidades',
    subtitle: 'Externo / Positivo',
  },
  THREAT: {
    bg: 'bg-amber-900/20',
    hoverBg: 'hover:bg-amber-900/30',
    border: 'border-amber-500/30',
    headerBg: 'bg-amber-600',
    itemBg: 'bg-amber-800/30',
    itemBorder: 'border-amber-600/30',
    text: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    icon: Flame,
    label: 'Ameaças',
    subtitle: 'Externo / Negativo',
  },
} as const;

// Componente de estrelas para mostrar impacto
function ImpactStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={`transition-colors ${n <= value ? 'text-yellow-400' : 'text-white/20'}`}
          fill={n <= value ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

export default function SwotMatrixPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SwotItem[]>([]);
  const [summary, setSummary] = useState<SwotSummary | null>(null);
  
  // Estado para modal de adicionar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<SwotQuadrant | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImpact, setNewItemImpact] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSwotData();
  }, []);

  // Handler para abrir modal
  const handleOpenAddModal = (quadrant: SwotQuadrant) => {
    setSelectedQuadrant(quadrant);
    setNewItemTitle('');
    setNewItemDescription('');
    setNewItemImpact(3);
    setIsAddModalOpen(true);
  };

  // Handler para salvar item
  const handleSaveItem = async () => {
    if (!selectedQuadrant || !newItemTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/strategic/swot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quadrant: selectedQuadrant,
          title: newItemTitle.trim(),
          description: newItemDescription.trim(),
          impactScore: newItemImpact,
          probabilityScore: selectedQuadrant === 'OPPORTUNITY' || selectedQuadrant === 'THREAT' ? 3 : 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar item');
      }

      toast.success('Item adicionado com sucesso!');
      setIsAddModalOpen(false);
      fetchSwotData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar item');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para deletar item
  const handleDeleteItem = async (item: SwotItem) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const response = await fetch(`/api/strategic/swot/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir item');

      toast.success('Item excluído');
      fetchSwotData();
    } catch {
      toast.error('Erro ao excluir item');
    }
  };

  const fetchSwotData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/swot?pageSize=100');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Erro ao carregar SWOT:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = useCallback((item: SwotItem) => {
    // Validar ID antes de navegar
    if (!item.id) {
      console.error('Item SWOT sem ID válido:', item);
      return;
    }
    // Navegar para página de edição do item SWOT
    router.push(`/strategic/swot/${item.id}`);
  }, [router]);

  // Agrupar items por quadrante
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.quadrant]) acc[item.quadrant] = [];
    acc[item.quadrant].push(item);
    return acc;
  }, {} as Record<SwotQuadrant, SwotItem[]>);

  // Ordenar por priority score
  Object.keys(groupedItems).forEach(key => {
    groupedItems[key as SwotQuadrant]?.sort((a, b) => b.priorityScore - a.priorityScore);
  });

  const renderQuadrant = (quadrant: SwotQuadrant, index: number) => {
    const style = QUADRANT_STYLES[quadrant];
    const quadrantItems = groupedItems[quadrant] || [];
    const Icon = style.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden 
          backdrop-blur-sm hover:shadow-lg transition-shadow`}
      >
        {/* Header */}
        <div className={`px-4 py-3 ${style.headerBg}`}>
          <Flex alignItems="center" className="gap-2">
            <Icon className="w-5 h-5 text-white" />
            <div>
              <Title className="text-white text-sm">{style.label}</Title>
              <Text className="text-white/70 text-xs">{style.subtitle}</Text>
            </div>
            <span className="ml-auto text-2xl font-bold text-white/40">
              {quadrantItems.length}
            </span>
          </Flex>
        </div>

        {/* Items */}
        <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          <AnimatePresence mode="popLayout">
            {quadrantItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleItemClick(item)}
                className={`
                  group p-3 rounded-xl border cursor-pointer
                  transition-all duration-200 hover:scale-[1.02] hover:bg-white/5
                  ${style.itemBg} ${style.itemBorder}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <Text className="text-white font-medium text-sm line-clamp-2 flex-1">
                    {item.title}
                  </Text>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-white/50" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-400/70" />
                    </button>
                  </div>
                </div>
                {item.description && (
                  <Text className="text-gray-400 text-xs mt-1 line-clamp-2">
                    {item.description}
                  </Text>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <ImpactStars value={item.impactScore} />
                  </span>
                  {(quadrant === 'OPPORTUNITY' || quadrant === 'THREAT') && (
                    <span className={`px-2 py-0.5 rounded-full ${style.badgeBg} ${style.text}`}>
                      {Math.round(item.probabilityScore * 20)}%
                    </span>
                  )}
                  <span className={`ml-auto px-2 py-0.5 rounded-full ${style.badgeBg} ${style.text}`}>
                    {item.priorityScore.toFixed(1)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {quadrantItems.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-gray-500"
            >
              <Icon className="w-8 h-8 mb-2 opacity-30" />
              <Text className="text-sm">Nenhum item</Text>
            </motion.div>
          )}

          {/* Add Button */}
          <RippleButton
            variant="ghost"
            onClick={() => handleOpenAddModal(quadrant)}
            className={`w-full border border-dashed ${style.border} ${style.text} ${style.hoverBg} rounded-xl`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </RippleButton>
        </div>
      </motion.div>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-4xl font-bold">
                  Análise SWOT
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Forças, Fraquezas, Oportunidades e Ameaças estratégicas
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={fetchSwotData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
              <RippleButton variant="default">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </RippleButton>
            </Flex>
          </motion.div>
        </FadeIn>

        {/* Summary Cards */}
        {summary && (
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-emerald-900/20 border-emerald-700">
                <Flex alignItems="center" className="gap-3">
                  <Shield className="w-8 h-8 text-emerald-400" />
                  <div>
                    <Text className="text-gray-400">Forças</Text>
                    <Metric className="text-emerald-400">{summary.strengths.count}</Metric>
                  </div>
                </Flex>
              </Card>

              <Card className="bg-red-900/20 border-red-700">
                <Flex alignItems="center" className="gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <div>
                    <Text className="text-gray-400">Fraquezas</Text>
                    <Metric className="text-red-400">{summary.weaknesses.count}</Metric>
                  </div>
                </Flex>
              </Card>

              <Card className="bg-blue-900/20 border-blue-700">
                <Flex alignItems="center" className="gap-3">
                  <Target className="w-8 h-8 text-blue-400" />
                  <div>
                    <Text className="text-gray-400">Oportunidades</Text>
                    <Metric className="text-blue-400">{summary.opportunities.count}</Metric>
                  </div>
                </Flex>
              </Card>

              <Card className="bg-amber-900/20 border-amber-700">
                <Flex alignItems="center" className="gap-3">
                  <Flame className="w-8 h-8 text-amber-400" />
                  <div>
                    <Text className="text-gray-400">Ameaças</Text>
                    <Metric className="text-amber-400">{summary.threats.count}</Metric>
                  </div>
                </Flex>
              </Card>
            </div>
          </FadeIn>
        )}

        {/* SWOT Matrix */}
        <FadeIn delay={0.2}>
          <Card className="bg-gray-900/50 border-gray-800 p-4 backdrop-blur-sm">
            <div className="mb-4">
              <Title className="text-white">Matriz SWOT</Title>
              <Text className="text-gray-400">
                Clique em um item para ver detalhes ou editar
              </Text>
            </div>

            {/* Labels */}
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="text-center text-sm text-emerald-400/70 font-medium">
                ✨ POSITIVO
              </div>
              <div className="text-center text-sm text-red-400/70 font-medium">
                ⚠️ NEGATIVO
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                  <Text className="text-gray-400">Carregando análise SWOT...</Text>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: Positivos */}
                {renderQuadrant('STRENGTH', 0)}
                {renderQuadrant('OPPORTUNITY', 1)}
                
                {/* Row 2: Negativos */}
                {renderQuadrant('WEAKNESS', 2)}
                {renderQuadrant('THREAT', 3)}
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Legend */}
        <FadeIn delay={0.3}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Title className="text-white text-sm mb-3">Como interpretar</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Text className="text-emerald-400 font-medium">Forças (S)</Text>
                <Text className="text-gray-500 text-xs">
                  Recursos e capacidades internas que dão vantagem competitiva
                </Text>
              </div>
              <div>
                <Text className="text-red-400 font-medium">Fraquezas (W)</Text>
                <Text className="text-gray-500 text-xs">
                  Limitações internas que podem prejudicar o desempenho
                </Text>
              </div>
              <div>
                <Text className="text-blue-400 font-medium">Oportunidades (O)</Text>
                <Text className="text-gray-500 text-xs">
                  Fatores externos que podem ser explorados a favor
                </Text>
              </div>
              <div>
                <Text className="text-amber-400 font-medium">Ameaças (T)</Text>
                <Text className="text-gray-500 text-xs">
                  Fatores externos que podem impactar negativamente
                </Text>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Modal Adicionar Item */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                {selectedQuadrant && (
                  <>
                    {QUADRANT_STYLES[selectedQuadrant].icon && (
                      <span className={QUADRANT_STYLES[selectedQuadrant].text}>
                        {(() => {
                          const Icon = QUADRANT_STYLES[selectedQuadrant].icon;
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </span>
                    )}
                    Adicionar {QUADRANT_STYLES[selectedQuadrant].label.slice(0, -1)}
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {selectedQuadrant === 'STRENGTH' && 'Adicione uma força interna da organização'}
                {selectedQuadrant === 'WEAKNESS' && 'Adicione uma fraqueza interna a ser melhorada'}
                {selectedQuadrant === 'OPPORTUNITY' && 'Adicione uma oportunidade externa a explorar'}
                {selectedQuadrant === 'THREAT' && 'Adicione uma ameaça externa a monitorar'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Título *</label>
                <Input
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Ex: Equipe altamente qualificada..."
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Descrição</label>
                <Textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Descreva em mais detalhes..."
                  className="bg-white/5 border-white/10 min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Impacto (1-5)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={newItemImpact}
                    onChange={(e) => setNewItemImpact(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={16}
                        className={`${n <= newItemImpact ? 'text-yellow-400' : 'text-white/20'}`}
                        fill={n <= newItemImpact ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-white/50 mt-1">
                  <span>Baixo</span>
                  <span>Alto</span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="border-white/10">
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveItem} 
                disabled={isSubmitting}
                className={`${selectedQuadrant ? QUADRANT_STYLES[selectedQuadrant].headerBg : 'bg-purple-600'}`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Plus size={16} className="mr-2" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
