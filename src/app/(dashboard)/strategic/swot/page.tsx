"use client";

/**
 * Página: SWOT Matrix
 * Análise estratégica SWOT (Forças, Fraquezas, Oportunidades, Ameaças)
 * 
 * @module app/(dashboard)/strategic/swot
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
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
  TrendingUp,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';

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

// Safelist pattern - classes explícitas
const QUADRANT_STYLES = {
  STRENGTH: {
    bg: 'bg-emerald-900/20',
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

export default function SwotMatrixPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SwotItem[]>([]);
  const [summary, setSummary] = useState<SwotSummary | null>(null);

  useEffect(() => {
    fetchSwotData();
  }, []);

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
    // TODO: Abrir modal de edição
    console.log('Item clicked:', item);
  }, []);

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

  const renderQuadrant = (quadrant: SwotQuadrant) => {
    const style = QUADRANT_STYLES[quadrant];
    const quadrantItems = groupedItems[quadrant] || [];
    const Icon = style.icon;

    return (
      <div className={`rounded-lg border-2 ${style.border} ${style.bg} overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 py-3 ${style.headerBg}`}>
          <Flex alignItems="center" className="gap-2">
            <Icon className="w-5 h-5 text-white" />
            <div>
              <Title className="text-white text-sm">{style.label}</Title>
              <Text className="text-white/70 text-xs">{style.subtitle}</Text>
            </div>
            <Badge color="gray" className="ml-auto">
              {quadrantItems.length}
            </Badge>
          </Flex>
        </div>

        {/* Items */}
        <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
          {quadrantItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`
                p-3 rounded-lg border cursor-pointer
                transition-all duration-200 hover:scale-[1.02]
                ${style.itemBg} ${style.itemBorder}
              `}
            >
              <Flex justifyContent="between" alignItems="start" className="gap-2">
                <Text className="text-white font-medium text-sm line-clamp-2">
                  {item.title}
                </Text>
                <span className={`text-xs px-2 py-1 rounded ${style.badgeBg} ${style.text} whitespace-nowrap`}>
                  {item.priorityScore.toFixed(1)}
                </span>
              </Flex>
              {item.description && (
                <Text className="text-gray-400 text-xs mt-1 line-clamp-2">
                  {item.description}
                </Text>
              )}
              <Flex className="gap-2 mt-2">
                <Text className="text-gray-500 text-xs">
                  Impacto: {item.impactScore}
                </Text>
                {(quadrant === 'OPPORTUNITY' || quadrant === 'THREAT') && (
                  <Text className="text-gray-500 text-xs">
                    Probabilidade: {item.probabilityScore}
                  </Text>
                )}
              </Flex>
            </div>
          ))}

          {quadrantItems.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Text className="text-sm">Nenhum item cadastrado</Text>
            </div>
          )}

          {/* Add Button */}
          <RippleButton
            variant="ghost"
            className={`w-full border border-dashed ${style.border} ${style.text} hover:${style.bg}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar {style.label.slice(0, -1)}
          </RippleButton>
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
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
            </Flex>
          </Flex>
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
          <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="mb-4">
              <Title className="text-white">Matriz SWOT</Title>
              <Text className="text-gray-400">
                Clique em um item para ver detalhes ou editar
              </Text>
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
                {/* Interno */}
                {renderQuadrant('STRENGTH')}
                {renderQuadrant('WEAKNESS')}
                
                {/* Externo */}
                {renderQuadrant('OPPORTUNITY')}
                {renderQuadrant('THREAT')}
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
      </div>
    </PageTransition>
  );
}
