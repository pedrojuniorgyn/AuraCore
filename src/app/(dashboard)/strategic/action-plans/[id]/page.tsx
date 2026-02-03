"use client";

/**
 * Página: Detalhe do Action Plan 5W2H
 * Exibe informações completas e follow-ups 3G
 * 
 * @module app/(dashboard)/strategic/action-plans/[id]
 */
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Card,
  Flex,
  ProgressBar,
  Text,
  Title,
} from '@tremor/react';
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  MapPin,
  Plus,
  RefreshCw,
  Target,
  User,
} from 'lucide-react';

import { GradientText } from '@/components/ui/magic-components';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { RippleButton } from '@/components/ui/ripple-button';
import { DeleteResourceButton } from '@/components/strategic/DeleteResourceButton';
import { FollowUpTimeline } from '@/components/strategic/FollowUpTimeline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
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

interface FollowUpItem {
  id: string;
  followUpNumber: number;
  followUpDate: string;
  gembaLocal: string;
  gembutsuObservation: string;
  genjitsuData: string;
  executionStatus: 'EXECUTED_OK' | 'EXECUTED_PARTIAL' | 'NOT_EXECUTED' | 'BLOCKED';
  executionPercent: number;
  problemsObserved?: string;
  problemSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresNewPlan?: boolean;
  childActionPlanId?: string;
  verifiedBy: string;
  verifiedAt: string | null;
  evidenceUrls?: string[];
}

interface FollowUpFormState {
  followUpDate: string;
  gembaLocal: string;
  gembutsuObservation: string;
  genjitsuData: string;
  executionStatus: 'EXECUTED_OK' | 'EXECUTED_PARTIAL' | 'NOT_EXECUTED' | 'BLOCKED';
  executionPercent: number;
  problemsObserved: string;
  problemSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresNewPlan: boolean;
  newPlanDescription: string;
  newPlanAssignedTo: string;
  evidenceUrls: string;
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ActionPlanDetail | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState<FollowUpFormState>({
    followUpDate: new Date().toISOString().slice(0, 10),
    gembaLocal: '',
    gembutsuObservation: '',
    genjitsuData: '',
    executionStatus: 'EXECUTED_OK',
    executionPercent: 0,
    problemsObserved: '',
    problemSeverity: 'NONE',
    requiresNewPlan: false,
    newPlanDescription: '',
    newPlanAssignedTo: '',
    evidenceUrls: '',
  });

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
        console.error('Failed to load action plan:', error);
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
      console.error('Failed to load action plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUps = useCallback(async () => {
    setFollowUpsLoading(true);
    try {
      const data = await fetchAPI<{ items: FollowUpItem[]; total: number }>(
        `/api/strategic/action-plans/${id}/follow-up`
      );
      setFollowUps(data.items);
    } catch (error) {
      console.error('Failed to load follow-ups:', error);
      const message =
        error instanceof APIResponseError
          ? error.data?.error || error.message
          : 'Unexpected error while loading follow-ups';
      toast({
        title: 'Erro ao carregar acompanhamentos',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setFollowUpsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (!plan) return;
    loadFollowUps();
  }, [plan, loadFollowUps]);

  const handleFollowUpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingFollowUp(true);
    try {
      const evidenceList = followUpForm.evidenceUrls
        .split(/[\n,]/)
        .map((url) => url.trim())
        .filter(Boolean);

      const problemsObserved = followUpForm.problemsObserved.trim();
      const newPlanDescription = followUpForm.newPlanDescription.trim();
      const newPlanAssignedTo = followUpForm.newPlanAssignedTo.trim();

      const problemSeverity =
        followUpForm.problemSeverity === 'NONE'
          ? undefined
          : followUpForm.problemSeverity;

      const payload = {
        followUpDate: followUpForm.followUpDate,
        gembaLocal: followUpForm.gembaLocal.trim(),
        gembutsuObservation: followUpForm.gembutsuObservation.trim(),
        genjitsuData: followUpForm.genjitsuData.trim(),
        executionStatus: followUpForm.executionStatus,
        executionPercent: followUpForm.executionPercent,
        problemsObserved: problemsObserved || undefined,
        problemSeverity,
        requiresNewPlan: followUpForm.requiresNewPlan || undefined,
        newPlanDescription:
          followUpForm.requiresNewPlan && newPlanDescription
            ? newPlanDescription
            : undefined,
        newPlanAssignedTo:
          followUpForm.requiresNewPlan && newPlanAssignedTo
            ? newPlanAssignedTo
            : undefined,
        evidenceUrls: evidenceList.length ? evidenceList : undefined,
      };

      await fetchAPI(`/api/strategic/action-plans/${id}/follow-up`, {
        method: 'POST',
        body: payload,
      });

      toast({
        title: 'Acompanhamento salvo',
        description: 'O follow-up 3G foi registrado com sucesso.',
      });

      setIsFollowUpDialogOpen(false);
      setFollowUpForm({
        followUpDate: new Date().toISOString().slice(0, 10),
        gembaLocal: '',
        gembutsuObservation: '',
        genjitsuData: '',
        executionStatus: 'EXECUTED_OK',
        executionPercent: 0,
        problemsObserved: '',
        problemSeverity: 'NONE',
        requiresNewPlan: false,
        newPlanDescription: '',
        newPlanAssignedTo: '',
        evidenceUrls: '',
      });

      await refreshPlan();
    } catch (error) {
      const message =
        error instanceof APIResponseError
          ? error.data?.error || error.message
          : 'Unexpected error while saving follow-up';
      toast({
        title: 'Failed to save follow-up',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmittingFollowUp(false);
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
              <DeleteResourceButton
                id={plan.id}
                resourceType="action-plans"
                redirectTo="/strategic/action-plans"
                resourceName={plan.what}
              />
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
                  <Title className="text-white">Acompanhamentos 3G</Title>
                  <RippleButton
                    variant="ghost"
                    onClick={() => setIsFollowUpDialogOpen(true)}
                    disabled={submittingFollowUp}
                  >
                    <Plus className="w-4 h-4" />
                  </RippleButton>
                </Flex>
                {followUpsLoading ? (
                  <div className="text-center py-6 text-gray-500">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-gray-400" />
                    <Text className="text-sm">Carregando acompanhamentos...</Text>
                  </div>
                ) : (
                  <FollowUpTimeline followUps={followUps} />
                )}
              </Card>
            </div>
          </FadeIn>
        </div>
      </div>
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
        <DialogContent className="bg-gray-950 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Registrar Acompanhamento 3G</DialogTitle>
            <DialogDescription className="text-gray-400">
              Capture as observações GEMBA, GEMBUTSU e GENJITSU para este plano de ação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFollowUpSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="followUpDate">Data do Acompanhamento</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={followUpForm.followUpDate}
                  onChange={(event) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      followUpDate: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="executionStatus">Status de Execução</Label>
                <Select
                  value={followUpForm.executionStatus}
                  onValueChange={(value) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      executionStatus: value as FollowUpFormState['executionStatus'],
                    }))
                  }
                >
                  <SelectTrigger id="executionStatus">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXECUTED_OK">Executado OK</SelectItem>
                    <SelectItem value="EXECUTED_PARTIAL">Executado Parcialmente</SelectItem>
                    <SelectItem value="NOT_EXECUTED">Não Executado</SelectItem>
                    <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="executionPercent">Percentual de Execução (%)</Label>
                <Input
                  id="executionPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={followUpForm.executionPercent}
                  onChange={(event) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      executionPercent: Number(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="problemSeverity">Severidade do Problema</Label>
                <Select
                  value={followUpForm.problemSeverity}
                  onValueChange={(value) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      problemSeverity: value as FollowUpFormState['problemSeverity'],
                    }))
                  }
                >
                  <SelectTrigger id="problemSeverity">
                    <SelectValue placeholder="Selecione a severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Não especificado</SelectItem>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gembaLocal">GEMBA (location)</Label>
                <Input
                  id="gembaLocal"
                  value={followUpForm.gembaLocal}
                  onChange={(event) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      gembaLocal: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gembutsuObservation">GEMBUTSU (observation)</Label>
                <Input
                  id="gembutsuObservation"
                  value={followUpForm.gembutsuObservation}
                  onChange={(event) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      gembutsuObservation: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="genjitsuData">GENJITSU (data/facts)</Label>
              <Textarea
                id="genjitsuData"
                value={followUpForm.genjitsuData}
                onChange={(event) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    genjitsuData: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="problemsObserved">Problemas Observados (opcional)</Label>
              <Textarea
                id="problemsObserved"
                value={followUpForm.problemsObserved}
                onChange={(event) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    problemsObserved: event.target.value,
                  }))
                }
                placeholder="Descreva os problemas encontrados durante a execução..."
              />
            </div>

            <div className="flex items-center justify-between rounded border border-gray-800 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="requiresNewPlan">Requer Novo Plano?</Label>
                <Text className="text-xs text-gray-400">
                  Se ativado, forneça descrição e responsável.
                </Text>
              </div>
              <Switch
                id="requiresNewPlan"
                checked={followUpForm.requiresNewPlan}
                onCheckedChange={(checked) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    requiresNewPlan: checked,
                  }))
                }
              />
            </div>

            {followUpForm.requiresNewPlan && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newPlanDescription">New plan description</Label>
                  <Textarea
                    id="newPlanDescription"
                    value={followUpForm.newPlanDescription}
                    onChange={(event) =>
                      setFollowUpForm((prev) => ({
                        ...prev,
                        newPlanDescription: event.target.value,
                      }))
                    }
                    required={followUpForm.requiresNewPlan}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPlanAssignedTo">Assign to (user id)</Label>
                  <Input
                    id="newPlanAssignedTo"
                    value={followUpForm.newPlanAssignedTo}
                    onChange={(event) =>
                      setFollowUpForm((prev) => ({
                        ...prev,
                        newPlanAssignedTo: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="evidenceUrls">Evidence URLs (comma or newline separated)</Label>
              <Textarea
                id="evidenceUrls"
                value={followUpForm.evidenceUrls}
                onChange={(event) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    evidenceUrls: event.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <RippleButton
                type="button"
                variant="ghost"
                onClick={() => setIsFollowUpDialogOpen(false)}
                disabled={submittingFollowUp}
              >
                Cancel
              </RippleButton>
              <RippleButton type="submit" disabled={submittingFollowUp}>
                {submittingFollowUp ? 'Saving...' : 'Save follow-up'}
              </RippleButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
