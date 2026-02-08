"use client";

/**
 * Página: Detalhe do Action Plan 5W2H
 * Exibe informações completas e follow-ups 3G
 * 
 * @module app/(dashboard)/strategic/action-plans/[id]
 */
import { use, useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  List,
  Grid3x3,
  Edit,
  Save,
  X,
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
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ICellRendererParams } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { Button } from '@/components/ui/button';
import { useClientFormattedDate } from '@/hooks/useClientFormattedTime';

import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllEnterpriseModule]);

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
  DRAFT: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Rascunho' },
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

// FIX: Extrair lógica de searchParams para componente separado com Suspense
// No Next.js 15, useSearchParams() requer Suspense boundary para evitar hydration mismatch
function ActionPlanDetailPageContent({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ActionPlanDetail | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUpViewMode, setFollowUpViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [isEditing5W2H, setIsEditing5W2H] = useState(false);
  const [saving5W2H, setSaving5W2H] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [w5h2EditForm, setW5h2EditForm] = useState({
    what: '',
    why: '',
    whereLocation: '',
    whenStart: '',
    whenEnd: '',
    who: '',
    whoUserId: '',
    how: '',
    howMuchAmount: 0,
    howMuchCurrency: 'BRL',
    status: 'DRAFT',
  });
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

  // Extrair valor primitivo para evitar infinite loop (searchParams retorna nova referência a cada render)
  const editMode = searchParams.get('edit') === 'true';

  // Formatação de datas no cliente (evita hydration mismatch)
  // Chamado sempre antes de early returns (Rules of Hooks)
  // Usar epoch (new Date(0)) como fallback para evitar flickering durante loading
  const formattedWhenStart = useClientFormattedDate(plan?.whenStart || new Date(0), 'pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedWhenEnd = useClientFormattedDate(plan?.whenEnd || new Date(0), 'pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Efeito para carregar dados - NÃO depende de editMode para evitar re-fetch
  // quando router.replace() limpa a URL após save/cancel
  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true);
      try {
        const data = await fetchAPI<ActionPlanDetail>(`/api/strategic/action-plans/${id}`);
        setPlan(data);
        // Inicializar form de edição 5W2H com dados atuais
        setW5h2EditForm({
          what: data.what,
          why: data.why,
          whereLocation: data.whereLocation,
          whenStart: data.whenStart ? data.whenStart.slice(0, 10) : '',
          whenEnd: data.whenEnd ? data.whenEnd.slice(0, 10) : '',
          who: data.who,
          whoUserId: data.whoUserId || '',
          how: data.how,
          howMuchAmount: data.howMuchAmount || 0,
          howMuchCurrency: data.howMuchCurrency || 'BRL',
          status: data.status,
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router é estável, incluí-lo causa re-renders infinitos
  }, [id]);

  // Efeito separado para sincronizar modo de edição com URL
  // Isso permite que ?edit=true funcione ao navegar do grid
  useEffect(() => {
    setIsEditing5W2H(editMode);
  }, [editMode]);

  // Carregar opções de usuários para o campo WHO
  useEffect(() => {
    const loadOptions = async () => {
      setUsersLoading(true);
      try {
        const data = await fetchAPI<{
          users: Array<{ id: string; name: string }>;
          objectives: Array<{ id: string; description: string }>;
          departments: Array<{ id: string; name: string }>;
          branches: Array<{ id: string; name: string }>;
        }>('/api/strategic/action-plans/options');
        setUsers(data.users);
      } catch (error) {
        console.error('Failed to load user options:', error);
      } finally {
        setUsersLoading(false);
      }
    };
    loadOptions();
  }, []);

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

  const handle5W2HSave = async () => {
    setSaving5W2H(true);
    try {
      await fetchAPI(`/api/strategic/action-plans/${id}`, {
        method: 'PATCH',
        // NOTA: fetchAPI já faz JSON.stringify internamente — NÃO usar JSON.stringify aqui
        body: {
          // Campos string: enviar undefined se vazio para que Zod trate como "não enviado"
          // e o backend use o valor existente via fallback (??)
          what: w5h2EditForm.what || undefined,
          why: w5h2EditForm.why || undefined,
          whereLocation: w5h2EditForm.whereLocation || undefined,
          whenStart: w5h2EditForm.whenStart || undefined,
          whenEnd: w5h2EditForm.whenEnd || undefined,
          who: w5h2EditForm.who || undefined,
          whoUserId: w5h2EditForm.whoUserId || null,
          how: w5h2EditForm.how || undefined,
          // howMuchAmount: manter 0 como valor válido (não converter para undefined)
          howMuchAmount: w5h2EditForm.howMuchAmount,
          howMuchCurrency: w5h2EditForm.howMuchCurrency || undefined,
          status: w5h2EditForm.status || undefined,
        },
      });
      
      toast({
        title: 'Sucesso',
        description: '5W2H atualizado com sucesso!',
      });
      
      setIsEditing5W2H(false);
      // Limpar query param ?edit=true da URL para manter sincronização
      router.replace(`/strategic/action-plans/${id}`, { scroll: false });
      await refreshPlan();
    } catch (error) {
      console.error('Failed to save 5W2H:', error);
      const message =
        error instanceof APIResponseError
          ? error.data?.error || error.message
          : 'Erro ao salvar 5W2H';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving5W2H(false);
    }
  };

  const handle5W2HCancel = () => {
    if (!plan) return;
    // Restaurar valores originais
    setW5h2EditForm({
      what: plan.what,
      why: plan.why,
      whereLocation: plan.whereLocation,
      whenStart: plan.whenStart ? plan.whenStart.slice(0, 10) : '',
      whenEnd: plan.whenEnd ? plan.whenEnd.slice(0, 10) : '',
      who: plan.who,
      whoUserId: plan.whoUserId || '',
      how: plan.how,
      howMuchAmount: plan.howMuchAmount || 0,
      howMuchCurrency: plan.howMuchCurrency || 'BRL',
      status: plan.status,
    });
    setIsEditing5W2H(false);
    // Limpar query param ?edit=true da URL para manter sincronização
    router.replace(`/strategic/action-plans/${id}`, { scroll: false });
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
              <Flex justifyContent="between" alignItems="center" className="mb-4">
                <Title className="text-white">Detalhes 5W2H</Title>
                {!isEditing5W2H ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/strategic/action-plans/${id}?edit=true`, { scroll: false })}
                    className="text-white/70 hover:text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <Flex className="gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handle5W2HSave}
                      disabled={saving5W2H}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving5W2H ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handle5W2HCancel}
                      disabled={saving5W2H}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </Flex>
                )}
              </Flex>
              
              {isEditing5W2H ? (
                /* Editor Mode */
                <div className="space-y-4">
                  {/* WHAT */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-what" className="text-blue-400 font-medium text-sm">
                      WHAT - O que será feito
                    </Label>
                    <Textarea
                      id="edit-what"
                      value={w5h2EditForm.what}
                      onChange={(e) => setW5h2EditForm({...w5h2EditForm, what: e.target.value})}
                      className="bg-gray-800/50 border-gray-700 text-white min-h-[80px]"
                      placeholder="Descreva o que será feito"
                    />
                  </div>

                  {/* WHY */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-why" className="text-blue-400 font-medium text-sm">
                      WHY - Por que será feito
                    </Label>
                    <Textarea
                      id="edit-why"
                      value={w5h2EditForm.why}
                      onChange={(e) => setW5h2EditForm({...w5h2EditForm, why: e.target.value})}
                      className="bg-gray-800/50 border-gray-700 text-white min-h-[80px]"
                      placeholder="Explique por que será feito"
                    />
                  </div>

                  {/* WHERE */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-where" className="text-blue-400 font-medium text-sm">
                      WHERE - Onde será feito
                    </Label>
                    <Input
                      id="edit-where"
                      value={w5h2EditForm.whereLocation}
                      onChange={(e) => setW5h2EditForm({...w5h2EditForm, whereLocation: e.target.value})}
                      className="bg-gray-800/50 border-gray-700 text-white"
                      placeholder="Local de execução"
                    />
                  </div>

                  {/* WHEN */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-when-start" className="text-blue-400 font-medium text-sm">
                        WHEN - Data Início
                      </Label>
                      <Input
                        id="edit-when-start"
                        type="date"
                        value={w5h2EditForm.whenStart}
                        onChange={(e) => setW5h2EditForm({...w5h2EditForm, whenStart: e.target.value})}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-when-end" className="text-blue-400 font-medium text-sm">
                        WHEN - Data Fim
                      </Label>
                      <Input
                        id="edit-when-end"
                        type="date"
                        value={w5h2EditForm.whenEnd}
                        onChange={(e) => setW5h2EditForm({...w5h2EditForm, whenEnd: e.target.value})}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  {/* WHO */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-who" className="text-emerald-400 font-medium text-sm">
                      WHO - Quem fará
                    </Label>
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-3 bg-gray-800/50 rounded-lg">
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                        <Text className="text-sm text-gray-400">Carregando usuários...</Text>
                      </div>
                    ) : users.length > 0 ? (
                      <Select
                        value={w5h2EditForm.whoUserId || '__none__'}
                        onValueChange={(value) => {
                          if (value === '__none__') {
                            setW5h2EditForm({
                              ...w5h2EditForm,
                              whoUserId: '',
                            });
                            return;
                          }
                          const selectedUser = users.find(u => u.id === value);
                          setW5h2EditForm({
                            ...w5h2EditForm,
                            whoUserId: value,
                            who: selectedUser ? selectedUser.name : w5h2EditForm.who,
                          });
                        }}
                      >
                        <SelectTrigger id="edit-who" className="bg-gray-800/50 border-gray-700 text-white">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum selecionado</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="edit-who"
                        value={w5h2EditForm.who}
                        onChange={(e) => setW5h2EditForm({...w5h2EditForm, who: e.target.value})}
                        className="bg-gray-800/50 border-gray-700 text-white"
                        placeholder="Responsável"
                      />
                    )}
                    {w5h2EditForm.who && (
                      <Text className="text-xs text-gray-400 mt-1">
                        Responsável atual: {w5h2EditForm.who}
                      </Text>
                    )}
                  </div>

                  {/* STATUS */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-status" className="text-purple-400 font-medium text-sm">
                      STATUS - Status do Plano
                    </Label>
                    <Select
                      value={w5h2EditForm.status}
                      onValueChange={(value) => setW5h2EditForm({
                        ...w5h2EditForm,
                        status: value,
                      })}
                    >
                      <SelectTrigger id="edit-status" className="bg-gray-800/50 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                        <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* HOW */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-how" className="text-emerald-400 font-medium text-sm">
                      HOW - Como será feito
                    </Label>
                    <Textarea
                      id="edit-how"
                      value={w5h2EditForm.how}
                      onChange={(e) => setW5h2EditForm({...w5h2EditForm, how: e.target.value})}
                      className="bg-gray-800/50 border-gray-700 text-white min-h-[80px]"
                      placeholder="Método de execução"
                    />
                  </div>

                  {/* HOW MUCH */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-how-much-amount" className="text-amber-400 font-medium text-sm">
                        HOW MUCH - Valor
                      </Label>
                      <Input
                        id="edit-how-much-amount"
                        type="number"
                        step="0.01"
                        value={w5h2EditForm.howMuchAmount}
                        onChange={(e) => setW5h2EditForm({...w5h2EditForm, howMuchAmount: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800/50 border-gray-700 text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-how-much-currency" className="text-amber-400 font-medium text-sm">
                        HOW MUCH - Moeda
                      </Label>
                      <Select
                        value={w5h2EditForm.howMuchCurrency}
                        onValueChange={(value) => setW5h2EditForm({...w5h2EditForm, howMuchCurrency: value})}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">BRL (R$)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
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
                        {plan?.whenStart && plan?.whenEnd 
                          ? `${formattedWhenStart} → ${formattedWhenEnd}`
                          : '\u00A0'}
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
              )}
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
                  <Flex alignItems="center" className="gap-3">
                    <Title className="text-white">Acompanhamentos 3G</Title>
                    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFollowUpViewMode('timeline')}
                        className={`h-7 px-2 ${followUpViewMode === 'timeline' ? 'bg-purple-500/20 text-purple-400' : 'text-white/50'}`}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFollowUpViewMode('grid')}
                        className={`h-7 px-2 ${followUpViewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-white/50'}`}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Flex>
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
                ) : followUpViewMode === 'timeline' ? (
                  <FollowUpTimeline followUps={followUps} />
                ) : (
                  /* Grid View */
                  <div className="ag-theme-quartz-dark" style={{ height: '400px', width: '100%' }}>
                    <AgGridReact
                      rowData={followUps}
                      columnDefs={[
                        {
                          field: 'followUpNumber',
                          headerName: '#',
                          width: 60,
                          cellStyle: { textAlign: 'center' },
                        },
                        {
                          field: 'followUpDate',
                          headerName: 'Data',
                          width: 120,
                          valueFormatter: (params) => {
                            if (!params.value) return '-';
                            return new Date(params.value).toLocaleDateString('pt-BR');
                          },
                        },
                        {
                          field: 'gembaLocal',
                          headerName: 'GEMBA (Local)',
                          flex: 1,
                          minWidth: 150,
                        },
                        {
                          field: 'executionStatus',
                          headerName: 'Status',
                          width: 150,
                          cellRenderer: (params: ICellRendererParams) => {
                            const statusConfig = {
                              EXECUTED_OK: { label: 'Executado OK', color: 'green' },
                              EXECUTED_PARTIAL: { label: 'Parcial', color: 'blue' },
                              NOT_EXECUTED: { label: 'Não Executado', color: 'slate' },
                              BLOCKED: { label: 'Bloqueado', color: 'red' },
                            } as const;
                            
                            const config = statusConfig[params.value as keyof typeof statusConfig];
                            
                            // Always return JSX for type consistency
                            if (!config) {
                              return (
                                <Badge color="neutral" size="xs">
                                  {params.value || 'Desconhecido'}
                                </Badge>
                              );
                            }
                            
                            // Return JSX element (Badge from Tremor)
                            return (
                              <Badge color={config.color} size="xs">
                                {config.label}
                              </Badge>
                            );
                          },
                        },
                        {
                          field: 'executionPercent',
                          headerName: 'Progresso',
                          width: 120,
                          valueFormatter: (params) => `${params.value}%`,
                          cellStyle: (params) => {
                            const percent = params.value || 0;
                            return {
                              color: percent >= 80 ? '#10b981' : percent >= 50 ? '#3b82f6' : '#eab308',
                              fontWeight: 'bold',
                            };
                          },
                        },
                        {
                          field: 'verifiedBy',
                          headerName: 'Verificado Por',
                          width: 140,
                        },
                      ]}
                      defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                      }}
                      pagination={true}
                      paginationPageSize={5}
                      domLayout="autoHeight"
                      rowHeight={48}
                      headerHeight={40}
                      suppressCellFocus={true}
                      enableCellTextSelection={true}
                      className="text-sm"
                    />
                  </div>
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

// Wrapper com Suspense boundary para evitar hydration mismatch
// useSearchParams() requer Suspense no Next.js 15
export default function ActionPlanDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-white/60">Carregando plano de ação...</p>
            </div>
          </div>
        </div>
      }
    >
      <ActionPlanDetailPageContent params={params} />
    </Suspense>
  );
}
