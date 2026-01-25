"use client";

/**
 * Página: Detalhe do Action Plan 5W2H
 * Exibe informações completas e follow-ups 3G
 * 
 * @module app/(dashboard)/strategic/action-plans/[id]
 */
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Text, 
  Flex, 
  Badge,
  ProgressBar,
} from '@tremor/react';
import { 
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Plus,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { fetchAPI, APIResponseError } from '@/lib/api';

interface ActionPlanDetail {
  id: string;
  code: string;
  what: string;
  why: string;
  whereLocation: string;
  whenStart: string;
  whenEnd: string;
  who: string;
  whoUserId: string;
  how: string;
  howMuchAmount: number | null;
  howMuchCurrency: string | null;
  pdcaCycle: string;
  completionPercent: number;
  priority: string;
  status: string;
  isOverdue: boolean;
  goalId: string | null;
  parentActionPlanId: string | null;
  repropositionNumber: number;
  repropositionReason: string | null;
  evidenceUrls: string[];
  nextFollowUpDate: string | null;
  canRepropose: boolean;
  createdBy: string;
}

// Safelist pattern
const STATUS_STYLES = {
  PENDING: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Pendente' },
  IN_PROGRESS: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Em Andamento' },
  COMPLETED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Concluído' },
  BLOCKED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Bloqueado' },
  CANCELLED: { bg: 'bg-gray-600/20', text: 'text-gray-500', label: 'Cancelado' },
} as const;

const PDCA_STYLES = {
  PLAN: { bg: 'bg-blue-500', text: 'text-white' },
  DO: { bg: 'bg-amber-500', text: 'text-white' },
  CHECK: { bg: 'bg-purple-500', text: 'text-white' },
  ACT: { bg: 'bg-emerald-500', text: 'text-white' },
} as const;

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Baixa' },
  MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Média' },
  HIGH: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Alta' },
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Crítica' },
} as const;

export default function ActionPlanDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ActionPlanDetail | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true);
      try {
        const data = await fetchAPI<ActionPlanDetail>(`/api/strategic/action-plans/${id}`);
        setPlan(data);
      } catch (error) {
        // Se for 404, redirecionar
        if (error instanceof APIResponseError && error.status === 404) {
          router.push('/strategic/action-plans');
          return;
        }
        console.error('Erro ao carregar plano:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [id, router]);

  const refreshPlan = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI<ActionPlanDetail>(`/api/strategic/action-plans/${id}`);
      setPlan(data);
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatMoney = (amount: number, currency: string) => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </PageTransition>
    );
  }

  if (!plan) {
    return null;
  }

  const statusStyle = STATUS_STYLES[plan.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.PENDING;
  const pdcaStyle = PDCA_STYLES[plan.pdcaCycle as keyof typeof PDCA_STYLES] || PDCA_STYLES.PLAN;
  const priorityStyle = PRIORITY_STYLES[plan.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.MEDIUM;

  const daysUntilDue = Math.ceil(
    (new Date(plan.whenEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <PageTransition>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <FadeIn>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3 mb-2">
                <RippleButton 
                  variant="ghost" 
                  onClick={() => router.push('/strategic/action-plans')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </RippleButton>
                <GradientText className="text-3xl font-bold">
                  {plan.code}
                </GradientText>
                <span className={`text-sm px-2 py-1 rounded ${pdcaStyle.bg} ${pdcaStyle.text}`}>
                  {plan.pdcaCycle}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
              </Flex>
            </div>
            <Flex className="gap-3">
              <RippleButton 
                variant="outline" 
                onClick={refreshPlan}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </RippleButton>
            </Flex>
          </Flex>
        </FadeIn>

        {/* Alert for overdue */}
        {plan.isOverdue && plan.status !== 'COMPLETED' && (
          <FadeIn delay={0.05}>
            <Card className="bg-red-900/30 border-red-700">
              <Flex alignItems="center" className="gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <Text className="text-red-300">
                  Este plano está atrasado em {Math.abs(daysUntilDue)} dias!
                </Text>
              </Flex>
            </Card>
          </FadeIn>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 5W2H Details */}
          <FadeIn delay={0.1} className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <Title className="text-white mb-4">Detalhes 5W2H</Title>
              
              <div className="space-y-4">
                {/* WHAT */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-blue-400 font-medium text-sm">WHAT - O que será feito</Text>
                      <Text className="text-white mt-1">{plan.what}</Text>
                    </div>
                  </Flex>
                </div>

                {/* WHY */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-blue-400 font-medium text-sm">WHY - Por que será feito</Text>
                      <Text className="text-gray-300 mt-1">{plan.why}</Text>
                    </div>
                  </Flex>
                </div>

                {/* WHERE */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-blue-400 font-medium text-sm">WHERE - Onde será feito</Text>
                      <Text className="text-gray-300 mt-1">{plan.whereLocation}</Text>
                    </div>
                  </Flex>
                </div>

                {/* WHEN */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-blue-400 font-medium text-sm">WHEN - Quando será feito</Text>
                      <Text className="text-gray-300 mt-1">
                        {formatDate(plan.whenStart)} → {formatDate(plan.whenEnd)}
                      </Text>
                      {!plan.isOverdue && daysUntilDue > 0 && (
                        <Text className="text-gray-500 text-sm mt-1">
                          {daysUntilDue} dias restantes
                        </Text>
                      )}
                    </div>
                  </Flex>
                </div>

                {/* WHO */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <User className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-emerald-400 font-medium text-sm">WHO - Quem fará</Text>
                      <Text className="text-gray-300 mt-1">{plan.who}</Text>
                    </div>
                  </Flex>
                </div>

                {/* HOW */}
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Flex alignItems="start" className="gap-3">
                    <FileText className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-emerald-400 font-medium text-sm">HOW - Como será feito</Text>
                      <Text className="text-gray-300 mt-1">{plan.how}</Text>
                    </div>
                  </Flex>
                </div>

                {/* HOW MUCH */}
                {plan.howMuchAmount && plan.howMuchAmount > 0 && (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <Flex alignItems="start" className="gap-3">
                      <DollarSign className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <Text className="text-amber-400 font-medium text-sm">HOW MUCH - Quanto custará</Text>
                        <Text className="text-white text-lg font-semibold mt-1">
                          {formatMoney(plan.howMuchAmount, plan.howMuchCurrency || 'BRL')}
                        </Text>
                      </div>
                    </Flex>
                  </div>
                )}
              </div>
            </Card>
          </FadeIn>

          {/* Sidebar */}
          <FadeIn delay={0.15}>
            <div className="space-y-4">
              {/* Progress Card */}
              <Card className="bg-gray-900/50 border-gray-800">
                <Title className="text-white mb-4">Progresso</Title>
                <div className="space-y-3">
                  <Flex justifyContent="between">
                    <Text className="text-gray-400">Conclusão</Text>
                    <Text className="text-white font-semibold">{plan.completionPercent}%</Text>
                  </Flex>
                  <ProgressBar
                    value={plan.completionPercent}
                    color={plan.completionPercent >= 100 ? 'emerald' : plan.isOverdue ? 'red' : 'blue'}
                  />
                  {plan.completionPercent >= 100 && (
                    <Flex alignItems="center" className="gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <Text className="text-sm">Concluído!</Text>
                    </Flex>
                  )}
                </div>
              </Card>

              {/* Status Card */}
              <Card className="bg-gray-900/50 border-gray-800">
                <Title className="text-white mb-4">Informações</Title>
                <div className="space-y-3">
                  <Flex justifyContent="between">
                    <Text className="text-gray-400">Status</Text>
                    <span className={`px-2 py-1 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </Flex>
                  <Flex justifyContent="between">
                    <Text className="text-gray-400">Fase PDCA</Text>
                    <span className={`px-2 py-1 rounded text-xs ${pdcaStyle.bg} ${pdcaStyle.text}`}>
                      {plan.pdcaCycle}
                    </span>
                  </Flex>
                  <Flex justifyContent="between">
                    <Text className="text-gray-400">Prioridade</Text>
                    <span className={`px-2 py-1 rounded text-xs ${priorityStyle.bg} ${priorityStyle.text}`}>
                      {priorityStyle.label}
                    </span>
                  </Flex>
                  {plan.repropositionNumber > 0 && (
                    <Flex justifyContent="between">
                      <Text className="text-gray-400">Reproposições</Text>
                      <Badge color="amber">{plan.repropositionNumber}x</Badge>
                    </Flex>
                  )}
                </div>
              </Card>

              {/* Follow-ups 3G */}
              <Card className="bg-gray-900/50 border-gray-800">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <Title className="text-white">Follow-ups 3G</Title>
                  <RippleButton variant="ghost">
                    <Plus className="w-4 h-4" />
                  </RippleButton>
                </Flex>
                <div className="text-center py-6 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <Text className="text-sm">Nenhum follow-up registrado</Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    Clique em + para adicionar
                  </Text>
                </div>
              </Card>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
