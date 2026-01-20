"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Grid, 
  Flex,
  Select,
  SelectItem,
  TextInput,
} from '@tremor/react';
import { 
  Gauge, 
  Plus, 
  RefreshCw, 
  ArrowLeft,
  Search,
  Filter,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { KpiGauge } from '@/components/strategic/KpiGauge';

type KpiStatus = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

interface Kpi {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  status: KpiStatus;
  achievementPercent: number;
  deviationPercent: number;
  goalId: string | null;
  ownerUserId: string;
}

export default function KpisPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strategic/kpis?pageSize=100');
      if (response.ok) {
        const result = await response.json();
        setKpis(result.items || []);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKpiClick = (id: string) => {
    router.push(`/strategic/kpis/${id}`);
  };

  const filteredKpis = kpis.filter((kpi) => {
    const matchesSearch = 
      kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || kpi.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    green: kpis.filter(k => k.status === 'GREEN').length,
    yellow: kpis.filter(k => k.status === 'YELLOW').length,
    red: kpis.filter(k => k.status === 'RED').length,
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
                  Indicadores (KPIs)
                </GradientText>
              </Flex>
              <Text className="text-gray-400 ml-12">
                Monitoramento de indicadores-chave de desempenho
              </Text>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={fetchKpis}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {/* Summary */}
        <FadeIn delay={0.1}>
          <Card className="bg-gray-900/50 border-gray-800">
            <Flex justifyContent="between" alignItems="center">
              <Flex className="gap-6">
                <div className="text-center">
                  <Text className="text-emerald-400 text-2xl font-bold">{statusCounts.green}</Text>
                  <Text className="text-gray-500 text-sm">No Prazo</Text>
                </div>
                <div className="text-center">
                  <Text className="text-amber-400 text-2xl font-bold">{statusCounts.yellow}</Text>
                  <Text className="text-gray-500 text-sm">Atenção</Text>
                </div>
                <div className="text-center">
                  <Text className="text-red-400 text-2xl font-bold">{statusCounts.red}</Text>
                  <Text className="text-gray-500 text-sm">Crítico</Text>
                </div>
                <div className="text-center">
                  <Text className="text-gray-300 text-2xl font-bold">{kpis.length}</Text>
                  <Text className="text-gray-500 text-sm">Total</Text>
                </div>
              </Flex>

              <Flex className="gap-3">
                <TextInput
                  icon={Search}
                  placeholder="Buscar KPI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  className="w-40"
                  icon={Filter}
                >
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="GREEN">No Prazo</SelectItem>
                  <SelectItem value="YELLOW">Atenção</SelectItem>
                  <SelectItem value="RED">Crítico</SelectItem>
                </Select>
              </Flex>
            </Flex>
          </Card>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredKpis.length > 0 ? (
            <Grid numItemsSm={2} numItemsMd={3} numItemsLg={4} className="gap-4">
              {filteredKpis.map((kpi) => (
                <KpiGauge
                  key={kpi.id}
                  id={kpi.id}
                  code={kpi.code}
                  name={kpi.name}
                  currentValue={kpi.currentValue}
                  targetValue={kpi.targetValue}
                  unit={kpi.unit}
                  status={kpi.status}
                  deviationPercent={kpi.deviationPercent}
                  onClick={handleKpiClick}
                />
              ))}
            </Grid>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800">
              <div className="flex flex-col items-center justify-center py-12">
                <Gauge className="w-12 h-12 text-gray-600 mb-4" />
                <Title className="text-gray-400">Nenhum KPI encontrado</Title>
                <Text className="text-gray-500 mt-2">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros'
                    : 'Crie KPIs para monitorar seus objetivos'}
                </Text>
              </div>
            </Card>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
