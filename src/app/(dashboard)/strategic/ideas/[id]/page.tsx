'use client';

/**
 * Página: Detalhe de Ideia
 * Visualiza e gerencia uma ideia específica
 * 
 * @module app/(dashboard)/strategic/ideas/[id]
 */
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  Lightbulb, ArrowLeft, Clock, CheckCircle2, XCircle,
  Target, BarChart3, RefreshCw, Loader2, Edit2, Trash2, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { PageHeader } from '@/components/ui/page-header';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { fetchAPI } from '@/lib/api';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { useClientFormattedDate, useClientFormattedDateTime } from '@/hooks/useClientFormattedTime';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface Idea {
  id: string;
  code: string;
  title: string;
  description: string;
  sourceType: string;
  urgency: string;
  importance: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'ARCHIVED';
  department: string | null;
  submittedBy: string;
  submittedByName?: string;
  createdAt: string;
  convertedTo?: string;
  convertedEntityId?: string;
  estimatedImpact?: string;
  updatedAt?: string;
}

const SOURCE_TYPES: Record<string, { label: string; icon: string }> = {
  SUGGESTION: { label: 'Sugestão', icon: '💡' },
  OBSERVATION: { label: 'Observação', icon: '👁️' },
  CLIENT_FEEDBACK: { label: 'Feedback Cliente', icon: '💬' },
  BENCHMARK: { label: 'Benchmark', icon: '📊' },
  MANUAL: { label: 'Manual', icon: '✍️' },
  MEETING: { label: 'Reunião', icon: '🤝' },
  AGENT: { label: 'Agente IA', icon: '🤖' },
  SWOT: { label: 'Análise SWOT', icon: '📋' },
  CUSTOMER_FEEDBACK: { label: 'Feedback Cliente', icon: '💬' },
  COMPLAINT: { label: 'Reclamação', icon: '⚠️' },
  AUDIT: { label: 'Auditoria', icon: '🔍' },
};

const IMPORTANCE_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Baixa', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  MEDIUM: { label: 'Média', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  HIGH: { label: 'Alta', color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  SUBMITTED: { label: 'Pendente', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  UNDER_REVIEW: { label: 'Em Revisão', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  APPROVED: { label: 'Aprovada', bg: 'bg-green-500/20', text: 'text-green-400' },
  REJECTED: { label: 'Rejeitada', bg: 'bg-red-500/20', text: 'text-red-400' },
  CONVERTED: { label: 'Convertida', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  ARCHIVED: { label: 'Arquivada', bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

const CONVERT_OPTIONS = [
  { value: 'ACTION_PLAN', label: 'Plano de Ação', icon: Target, href: '/strategic/action-plans/new' },
  { value: 'GOAL', label: 'Objetivo', icon: Target, href: '/strategic/goals/new' },
  { value: 'KPI', label: 'KPI', icon: BarChart3, href: '/strategic/kpis/new' },
  { value: 'PDCA', label: 'Ciclo PDCA', icon: RefreshCw, href: '/strategic/pdca' },
];

function IdeaDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  // Ler query param ?edit=true para ativar modo de edição automaticamente
  const editMode = searchParams.get('edit') === 'true';
  
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(editMode);

  // Hook de delete
  const {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmDelete,
    pendingOptions,
  } = useDeleteResource('ideas');

  // Formatação de datas no cliente (evita hydration mismatch)
  // Usar epoch (new Date(0)) como fallback para evitar flickering durante loading
  const formattedCreatedAt = useClientFormattedDate(idea?.createdAt || new Date(0), 'pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  const formattedUpdatedAt = useClientFormattedDateTime(idea?.updatedAt || new Date(0), 'pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    importance: 'MEDIUM',
    estimatedImpact: '',
  });

  const fetchIdea = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAPI<Idea>(`/api/strategic/ideas/${id}`);
      setIdea(data);
      setEditForm({
        title: data.title,
        description: data.description || '',
        importance: data.importance,
        estimatedImpact: data.estimatedImpact || '',
      });
    } catch (error) {
      console.error('Erro ao carregar ideia:', error);
      toast.error('Erro ao carregar ideia');
      router.push('/strategic/ideas');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchIdea();
    }
  }, [id, fetchIdea]);

  // Efeito separado para sincronizar modo de edição com URL
  // Isso permite que ?edit=true funcione ao navegar do grid
  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode]);

  const handleConvert = async (targetType: 'ACTION_PLAN' | 'GOAL' | 'KPI' | 'PDCA') => {
    if (!idea) return;

    setIsConverting(true);
    try {
      const response = await fetchAPI<{
        success: boolean;
        id: string;
        redirectUrl: string;
        targetType: string;
      }>(`/api/strategic/ideas/${idea.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({ targetType }),
      });

      if (response.success) {
        const targetLabel = {
          ACTION_PLAN: 'Plano de Ação',
          GOAL: 'Objetivo',
          KPI: 'KPI',
          PDCA: 'PDCA',
        }[targetType];

        toast.success(`Ideia convertida em ${targetLabel}!`);
        setShowConvertModal(false);
        
        // Aguardar um pouco antes de redirecionar para o toast aparecer
        setTimeout(() => {
          router.push(response.redirectUrl);
        }, 500);
      }
    } catch (error) {
      console.error('[Convert Error]', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao converter ideia');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await fetchAPI(`/api/strategic/ideas/${id}`, {
        method: 'PUT',
        body: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          importance: editForm.importance,
          estimatedImpact: editForm.estimatedImpact.trim(),
        },
      });

      toast.success('Ideia atualizada com sucesso!');
      setIsEditing(false);
      // Limpar query param ?edit=true da URL para manter sincronização
      router.replace(`/strategic/ideas/${id}`, { scroll: false });
      fetchIdea();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      await fetchAPI(`/api/strategic/ideas/${id}/approve`, {
        method: 'POST',
      });
      toast.success('Ideia aprovada!');
      fetchIdea();
    } catch {
      toast.error('Erro ao aprovar ideia');
    }
  };

  const handleReject = async () => {
    try {
      await fetchAPI(`/api/strategic/ideas/${id}/reject`, {
        method: 'POST',
      });
      toast.success('Ideia rejeitada');
      fetchIdea();
    } catch {
      toast.error('Erro ao rejeitar ideia');
    }
  };

  // Função de delete agora usa o hook useDeleteResource

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </PageTransition>
    );
  }

  if (!idea) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Lightbulb className="w-16 h-16 text-yellow-400/30 mx-auto mb-4" />
            <h3 className="text-white/70 text-lg font-medium">Ideia não encontrada</h3>
            <Button
              onClick={() => router.push('/strategic/ideas')}
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const sourceInfo = SOURCE_TYPES[idea.sourceType] || { label: idea.sourceType, icon: '💡' };
  const importanceInfo = IMPORTANCE_LEVELS[idea.importance] || IMPORTANCE_LEVELS.MEDIUM;
  const statusInfo = STATUS_CONFIG[idea.status] || STATUS_CONFIG.SUBMITTED;

  return (
    <PageTransition>
      <div className="min-h-screen -m-6 p-8 space-y-6">
        <PageHeader
          icon="💡"
          title={idea.code}
          description={idea.title}
          showBack
          onRefresh={fetchIdea}
          isLoading={isLoading}
          actions={
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="border-white/10"
                  >
                    <Edit2 size={16} className="mr-2" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(id, {
                      itemName: idea.title,
                      resourceType: 'Ideia',
                    })}
                    disabled={isDeleting}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} className="mr-2" />
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{sourceInfo.icon}</span>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.bg} ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Título *</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Título da ideia"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Importância</label>
                      <div className="flex gap-2">
                        {Object.entries(IMPORTANCE_LEVELS).map(([value, info]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, importance: value })}
                            className={`flex-1 p-2 rounded-xl border text-sm transition-all ${
                              editForm.importance === value
                                ? `${info.bg} border-current ${info.color}`
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {info.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-2">Descrição</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Descreva a ideia em detalhes..."
                        className="bg-white/5 border-white/10 min-h-[150px]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-2">Impacto Estimado</label>
                      <Textarea
                        value={editForm.estimatedImpact}
                        onChange={(e) => setEditForm({ ...editForm, estimatedImpact: e.target.value })}
                        placeholder="Descreva o impacto esperado desta ideia..."
                        className="bg-white/5 border-white/10"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          // Limpar query param ?edit=true da URL para manter sincronização
                          router.replace(`/strategic/ideas/${id}`, { scroll: false });
                        }}
                        variant="outline"
                        className="border-white/10"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin mr-2" size={16} />
                        ) : (
                          <Save size={16} className="mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">{idea.title}</h2>
                    <p className="text-white/70 whitespace-pre-wrap">
                      {idea.description || 'Sem descrição'}
                    </p>
                    
                    {idea.estimatedImpact && (
                      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white/80 font-medium mb-2">Impacto Estimado</h4>
                        <p className="text-white/60">{idea.estimatedImpact}</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassmorphismCard>
            </FadeIn>

            {/* Ações */}
            {!isEditing && (idea.status === 'SUBMITTED' || idea.status === 'APPROVED') && (
              <FadeIn delay={0.2}>
                <GlassmorphismCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Ações</h3>
                  
                  {idea.status === 'SUBMITTED' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApprove}
                        className="flex-1 bg-green-600 hover:bg-green-500"
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={handleReject}
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle size={16} className="mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  {idea.status === 'APPROVED' && (
                    <Button
                      onClick={() => setShowConvertModal(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      <Target size={16} className="mr-2" />
                      Converter em Ação
                    </Button>
                  )}
                </GlassmorphismCard>
              </FadeIn>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Informações</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-white/50 text-sm">Código</span>
                    <p className="text-white font-medium">{idea.code}</p>
                  </div>
                  <div>
                    <span className="text-white/50 text-sm">Origem</span>
                    <p className="text-white flex items-center gap-2">
                      <span>{sourceInfo.icon}</span>
                      {sourceInfo.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/50 text-sm">Importância</span>
                    <p className={`font-medium ${importanceInfo.color}`}>
                      {importanceInfo.label}
                    </p>
                  </div>
                  {idea.department && (
                    <div>
                      <span className="text-white/50 text-sm">Departamento</span>
                      <p className="text-white">{idea.department}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-white/50 text-sm">Criado em</span>
                    <p className="text-white flex items-center gap-2">
                      <Clock size={14} className="text-white/50" />
                      {idea?.createdAt ? formattedCreatedAt : '\u00A0'}
                    </p>
                  </div>
                  {idea.updatedAt && (
                    <div>
                      <span className="text-white/50 text-sm">Atualizado em</span>
                      <p className="text-white/70 text-sm">
                        {idea.updatedAt ? formattedUpdatedAt : '\u00A0'}
                      </p>
                    </div>
                  )}
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </div>

        {/* Modal Converter */}
        <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
          <DialogContent className="bg-[#1a1a2e] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Converter Ideia em Ação</DialogTitle>
              <DialogDescription className="text-white/60">
                Escolha para onde converter a ideia
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-3 py-4">
              {CONVERT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleConvert(option.value as 'ACTION_PLAN' | 'GOAL' | 'KPI' | 'PDCA')}
                    disabled={isConverting}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all flex flex-col items-center gap-2 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConverting ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <Icon size={24} />
                    )}
                    <span className="text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Excluir */}
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          itemName={pendingOptions.itemName}
          resourceType={pendingOptions.resourceType}
          isDeleting={isDeleting}
        />
      </div>
    </PageTransition>
  );
}

// Wrapper com Suspense boundary para evitar hydration mismatch
// useSearchParams() requer Suspense no Next.js 15
export default function IdeaDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <IdeaDetailPageContent />
    </Suspense>
  );
}
