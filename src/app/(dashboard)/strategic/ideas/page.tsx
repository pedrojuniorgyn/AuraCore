'use client';

/**
 * Página: Caixa de Ideias (IdeaBox)
 * Capture e gerencie ideias, notas e oportunidades
 * 
 * @module app/(dashboard)/strategic/ideas
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, Plus, ArrowRight, Clock, CheckCircle2, XCircle,
  Target, BarChart3, RefreshCw, Loader2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseMetricCard } from '@/components/ui/enterprise-metric-card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { fetchAPI } from '@/lib/api';

interface Idea {
  id: string;
  code: string;
  title: string;
  description: string; // Schema usa 'description', não 'content'
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
}

const SOURCE_TYPES = [
  { value: 'SUGGESTION', label: 'Sugestão', icon: '💡' },
  { value: 'OBSERVATION', label: 'Observação', icon: '👁️' },
  { value: 'CLIENT_FEEDBACK', label: 'Feedback Cliente', icon: '💬' },
  { value: 'BENCHMARK', label: 'Benchmark', icon: '📊' },
];

const IMPORTANCE_LEVELS = [
  { value: 'LOW', label: 'Baixa', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  { value: 'MEDIUM', label: 'Média', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { value: 'HIGH', label: 'Alta', color: 'text-amber-400', bg: 'bg-amber-500/20' },
];

const CONVERT_OPTIONS = [
  { value: 'ACTION_PLAN', label: 'Plano de Ação', icon: Target, href: '/strategic/action-plans/new' },
  { value: 'GOAL', label: 'Objetivo', icon: Target, href: '/strategic/goals/new' },
  { value: 'KPI', label: 'KPI', icon: BarChart3, href: '/strategic/kpis/new' },
  { value: 'PDCA', label: 'Ciclo PDCA', icon: RefreshCw, href: '/strategic/pdca' },
];

export default function IdeasPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    sourceType: 'SUGGESTION',
    importance: 'MEDIUM',
    department: '',
  });

  const fetchIdeas = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filterStatus === 'all' 
        ? '/api/strategic/ideas?pageSize=100'
        : `/api/strategic/ideas?pageSize=100&status=${filterStatus}`;
      const data = await fetchAPI<{ items: Idea[] }>(url);
      setIdeas(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar ideias:', error);
      toast.error('Erro ao carregar ideias');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleSubmitIdea = async () => {
    if (!newIdea.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchAPI('/api/strategic/ideas', {
        method: 'POST',
        body: {
          title: newIdea.title.trim(),
          description: newIdea.description.trim(),
          sourceType: newIdea.sourceType,
          importance: newIdea.importance,
          department: newIdea.department,
        },
      });

      toast.success('Ideia submetida com sucesso!');
      setIsModalOpen(false);
      setNewIdea({ title: '', description: '', sourceType: 'SUGGESTION', importance: 'MEDIUM', department: '' });
      fetchIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao submeter ideia');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (idea: Idea) => {
    try {
      await fetchAPI(`/api/strategic/ideas/${idea.id}/approve`, {
        method: 'POST',
      });

      toast.success('Ideia aprovada!');
      fetchIdeas();
    } catch {
      toast.error('Erro ao aprovar ideia');
    }
  };

  const handleReject = async (idea: Idea) => {
    try {
      await fetchAPI(`/api/strategic/ideas/${idea.id}/reject`, {
        method: 'POST',
      });

      toast.success('Ideia rejeitada');
      fetchIdeas();
    } catch {
      toast.error('Erro ao rejeitar ideia');
    }
  };

  const stats = {
    total: ideas.length,
    submitted: ideas.filter(i => i.status === 'SUBMITTED').length,
    underReview: ideas.filter(i => i.status === 'UNDER_REVIEW').length,
    approved: ideas.filter(i => i.status === 'APPROVED').length,
    converted: ideas.filter(i => i.status === 'CONVERTED').length,
  };

  const getStatusBadge = (status: Idea['status']) => {
    const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
      SUBMITTED: { label: 'Pendente', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      UNDER_REVIEW: { label: 'Em Revisão', bg: 'bg-blue-500/20', text: 'text-blue-400' },
      APPROVED: { label: 'Aprovada', bg: 'bg-green-500/20', text: 'text-green-400' },
      REJECTED: { label: 'Rejeitada', bg: 'bg-red-500/20', text: 'text-red-400' },
      CONVERTED: { label: 'Convertida', bg: 'bg-purple-500/20', text: 'text-purple-400' },
      ARCHIVED: { label: 'Arquivada', bg: 'bg-gray-500/20', text: 'text-gray-400' },
    };
    
    const config = statusConfig[status] || statusConfig.SUBMITTED;

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen -m-6 p-8 space-y-6">
        <PageHeader
          icon="💡"
          title="Caixa de Ideias"
          description="Capture e gerencie ideias, notas e oportunidades"
          recordCount={stats.total}
          showBack
          onRefresh={fetchIdeas}
          isLoading={isLoading}
          actions={
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              <Plus size={16} className="mr-2" />
              Nova Ideia
            </Button>
          }
        />

        {/* Métricas */}
        <StaggerContainer>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <EnterpriseMetricCard
              icon={<Lightbulb className="h-6 w-6 text-purple-400" />}
              badge="Total"
              title="Total"
              value={stats.total}
              subtitle="ideias registradas"
              variant="purple"
              delay={0.2}
            />
            <EnterpriseMetricCard
              icon={<Clock className="h-6 w-6 text-yellow-400" />}
              badge="Pendentes"
              badgeEmoji="⏳"
              title="Pendentes"
              value={stats.submitted}
              subtitle="aguardando revisão"
              variant="yellow"
              delay={0.3}
            />
            <EnterpriseMetricCard
              icon={<MessageSquare className="h-6 w-6 text-blue-400" />}
              badge="Em Revisão"
              title="Em Revisão"
              value={stats.underReview}
              subtitle="sendo analisadas"
              variant="blue"
              delay={0.4}
            />
            <EnterpriseMetricCard
              icon={<CheckCircle2 className="h-6 w-6 text-green-400" />}
              badge="Aprovadas"
              badgeEmoji="✅"
              title="Aprovadas"
              value={stats.approved}
              subtitle="prontas para conversão"
              variant="green"
              delay={0.5}
            />
            <EnterpriseMetricCard
              icon={<ArrowRight className="h-6 w-6 text-cyan-400" />}
              badge="Convertidas"
              badgeEmoji="🚀"
              title="Convertidas"
              value={stats.converted}
              subtitle="em ação"
              variant="blue"
              delay={0.6}
            />
          </div>
        </StaggerContainer>

        {/* Filtros */}
        <FadeIn delay={0.15}>
          <div className="flex gap-2 flex-wrap">
            {['all', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CONVERTED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  filterStatus === status
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                {status === 'all' ? 'Todas' : 
                 status === 'SUBMITTED' ? 'Pendentes' :
                 status === 'UNDER_REVIEW' ? 'Em Revisão' :
                 status === 'APPROVED' ? 'Aprovadas' : 'Convertidas'}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Lista de Ideias */}
        <FadeIn delay={0.2}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : ideas.length === 0 ? (
            <GlassmorphismCard className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-yellow-400/30 mx-auto mb-4" />
              <h3 className="text-white/70 text-lg font-medium">Nenhuma ideia encontrada</h3>
              <p className="text-white/40 text-sm mt-1">
                Clique em &quot;Nova Ideia&quot; para começar a registrar
              </p>
            </GlassmorphismCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {ideas.map((idea, index) => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassmorphismCard 
                      className="p-4 hover:border-white/20 transition-all cursor-pointer h-full"
                      onClick={() => router.push(`/strategic/ideas/${idea.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {SOURCE_TYPES.find(s => s.value === idea.sourceType)?.icon || '💡'}
                          </span>
                          <span className="text-white/50 text-xs">{idea.code}</span>
                        </div>
                        {getStatusBadge(idea.status)}
                      </div>
                      
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">{idea.title}</h3>
                      <p className="text-white/60 text-sm line-clamp-3 mb-4">{idea.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          {IMPORTANCE_LEVELS.find(p => p.value === idea.importance) && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              IMPORTANCE_LEVELS.find(p => p.value === idea.importance)?.bg
                            } ${IMPORTANCE_LEVELS.find(p => p.value === idea.importance)?.color}`}>
                              {IMPORTANCE_LEVELS.find(p => p.value === idea.importance)?.label}
                            </span>
                          )}
                        </div>
                        
                        {idea.status === 'SUBMITTED' && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(idea); }}
                              className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                              title="Aprovar"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(idea); }}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              title="Rejeitar"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}

                        {idea.status === 'APPROVED' && (
                          <Button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedIdea(idea);
                              setShowConvertModal(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-purple-500/10 border-purple-500/30 text-purple-400 text-xs"
                          >
                            <ArrowRight size={12} className="mr-1" />
                            Converter
                          </Button>
                        )}
                      </div>
                    </GlassmorphismCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </FadeIn>

        {/* Modal Nova Ideia */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="text-yellow-400" />
                Nova Ideia
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Registre uma nova ideia ou oportunidade de melhoria
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Título *</label>
                <Input
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                  placeholder="Dê um título para sua ideia..."
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Origem</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_TYPES.map((source) => (
                      <button
                        key={source.value}
                        type="button"
                        onClick={() => setNewIdea({ ...newIdea, sourceType: source.value })}
                        className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                          newIdea.sourceType === source.value
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <span>{source.icon}</span>
                        <span className="text-sm">{source.label}</span>
                      </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Importância</label>
                <div className="flex gap-2">
                  {IMPORTANCE_LEVELS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setNewIdea({ ...newIdea, importance: p.value })}
                      className={`flex-1 p-2 rounded-xl border text-sm transition-all ${
                        newIdea.importance === p.value
                          ? `${p.bg} border-current ${p.color}`
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Descrição</label>
                <Textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                  placeholder="Descreva sua ideia em detalhes..."
                  className="bg-white/5 border-white/10 min-h-[100px]"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-white/10">
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitIdea} 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Plus size={16} className="mr-2" />
                )}
                Submeter Ideia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Converter */}
        <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
          <DialogContent className="bg-[#1a1a2e] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Converter Ideia em Ação</DialogTitle>
              <DialogDescription className="text-white/60">
                Escolha para onde converter a ideia &quot;{selectedIdea?.title}&quot;
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-3 py-4">
              {CONVERT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <a
                    key={option.value}
                    href={`${option.href}?fromIdea=${selectedIdea?.id}&title=${encodeURIComponent(selectedIdea?.title || '')}`}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all flex flex-col items-center gap-2 text-white/70 hover:text-white"
                  >
                    <Icon size={24} />
                    <span className="text-sm">{option.label}</span>
                  </a>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
