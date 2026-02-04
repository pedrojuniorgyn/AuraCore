'use client';

/**
 * Página: Detalhe de Análise SWOT
 * Visualiza e gerencia um item SWOT específico
 *
 * @module app/(dashboard)/strategic/swot/[id]
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Target, ArrowLeft, Loader2, Edit2, Trash2, Save,
  TrendingUp, AlertTriangle, Lightbulb, Shield,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { PageTransition, FadeIn } from '@/components/ui/animated-wrappers';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { fetchAPI } from '@/lib/api';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface SwotItem {
  id: string;
  quadrant: string;
  title: string;
  description: string;
  impactScore: number;
  probabilityScore: number;
  priorityScore: number;
  category: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

const QUADRANT_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  STRENGTH: { label: 'Força', icon: Shield, color: 'text-green-400', bg: 'bg-green-500/20' },
  WEAKNESS: { label: 'Fraqueza', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
  OPPORTUNITY: { label: 'Oportunidade', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  THREAT: { label: 'Ameaça', icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  IDENTIFIED: { label: 'Identificado', bg: 'bg-gray-500/20', text: 'text-gray-400' },
  ANALYZING: { label: 'Em Análise', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  ACTION_DEFINED: { label: 'Ação Definida', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  MONITORING: { label: 'Monitorando', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  RESOLVED: { label: 'Resolvido', bg: 'bg-green-500/20', text: 'text-green-400' },
};

export default function SwotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [swot, setSwot] = useState<SwotItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hook de delete
  const {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmDelete,
    cancelDelete,
    pendingOptions,
  } = useDeleteResource('swot');

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    impactScore: 3,
    probabilityScore: 3,
    category: '',
  });

  const fetchSwot = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAPI<SwotItem>(`/api/strategic/swot/${id}`);
      setSwot(data);
      setEditForm({
        title: data.title,
        description: data.description || '',
        impactScore: Number(data.impactScore) || 3,
        probabilityScore: Number(data.probabilityScore) || 3,
        category: data.category || '',
      });
    } catch (error) {
      console.error('Erro ao carregar SWOT:', error);
      toast.error('Erro ao carregar análise SWOT');
      router.push('/strategic/swot');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchSwot();
    }
  }, [id, fetchSwot]);

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await fetchAPI(`/api/strategic/swot/${id}`, {
        method: 'PUT',
        body: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          impactScore: editForm.impactScore,
          probabilityScore: editForm.probabilityScore,
          category: editForm.category.trim() || undefined,
        },
      });

      toast.success('Análise SWOT atualizada com sucesso!');
      setIsEditing(false);
      fetchSwot();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
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

  if (!swot) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Lightbulb className="w-16 h-16 text-yellow-400/30 mx-auto mb-4" />
            <h3 className="text-white/70 text-lg font-medium">Análise SWOT não encontrada</h3>
            <Button
              onClick={() => router.push('/strategic/swot')}
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

  const quadrantInfo = QUADRANT_CONFIG[swot.quadrant] || QUADRANT_CONFIG.STRENGTH;
  const statusInfo = STATUS_CONFIG[swot.status] || STATUS_CONFIG.IDENTIFIED;
  const QuadrantIcon = quadrantInfo.icon;

  return (
    <PageTransition>
      <div className="min-h-screen -m-6 p-8 space-y-6">
        <PageHeader
          icon="📊"
          title="Análise SWOT"
          description={swot.title}
          showBack
          onRefresh={fetchSwot}
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
                      itemName: swot.title,
                      resourceType: 'Análise SWOT',
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
                  <div className={`p-3 rounded-xl ${quadrantInfo.bg}`}>
                    <QuadrantIcon size={24} className={quadrantInfo.color} />
                  </div>
                  <div className="flex-1">
                    <span className={`px-3 py-1 rounded-full text-sm ${quadrantInfo.bg} ${quadrantInfo.color} mr-2`}>
                      {quadrantInfo.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.bg} ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-white/70">Título *</Label>
                      <Input
                        id="title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Título da análise"
                        className="bg-white/5 border-white/10 mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-white/70">Descrição</Label>
                      <Textarea
                        id="description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Descreva detalhadamente este item SWOT..."
                        className="bg-white/5 border-white/10 min-h-[150px] mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="impactScore" className="text-white/70">Impacto (1-5)</Label>
                        <Input
                          id="impactScore"
                          type="number"
                          min="1"
                          max="5"
                          value={editForm.impactScore}
                          onChange={(e) => setEditForm({ ...editForm, impactScore: Number(e.target.value) })}
                          className="bg-white/5 border-white/10 mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="probabilityScore" className="text-white/70">Probabilidade (1-5)</Label>
                        <Input
                          id="probabilityScore"
                          type="number"
                          min="1"
                          max="5"
                          value={editForm.probabilityScore}
                          onChange={(e) => setEditForm({ ...editForm, probabilityScore: Number(e.target.value) })}
                          className="bg-white/5 border-white/10 mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-white/70">Categoria (opcional)</Label>
                      <Input
                        id="category"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        placeholder="Ex: MARKET, TECHNOLOGY, FINANCIAL..."
                        className="bg-white/5 border-white/10 mt-2"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => setIsEditing(false)}
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
                    <h2 className="text-2xl font-bold text-white">{swot.title}</h2>
                    <p className="text-white/70 whitespace-pre-wrap">
                      {swot.description || 'Sem descrição'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white/60 text-sm mb-1">Impacto</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full ${
                                  i <= swot.impactScore ? 'bg-purple-500' : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-white font-semibold">{swot.impactScore}/5</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-white/60 text-sm mb-1">Probabilidade</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full ${
                                  i <= swot.probabilityScore ? 'bg-blue-500' : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-white font-semibold">{swot.probabilityScore}/5</span>
                        </div>
                      </div>
                    </div>

                    {swot.priorityScore > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <h4 className="text-amber-400 font-medium mb-1">Score de Prioridade</h4>
                        <p className="text-white text-2xl font-bold">{Number(swot.priorityScore).toFixed(2)}</p>
                        <p className="text-white/50 text-sm mt-1">Calculado: Impacto × Probabilidade</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassmorphismCard>
            </FadeIn>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Informações</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-white/50 text-sm">Quadrante</span>
                    <p className={`font-medium flex items-center gap-2 ${quadrantInfo.color}`}>
                      <QuadrantIcon size={18} />
                      {quadrantInfo.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/50 text-sm">Status</span>
                    <p className={`font-medium ${statusInfo.text}`}>
                      {statusInfo.label}
                    </p>
                  </div>
                  {swot.category && (
                    <div>
                      <span className="text-white/50 text-sm">Categoria</span>
                      <p className="text-white">{swot.category}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-white/50 text-sm">Criado em</span>
                    <p className="text-white text-sm">
                      {new Date(swot.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {swot.updatedAt && (
                    <div>
                      <span className="text-white/50 text-sm">Atualizado em</span>
                      <p className="text-white/70 text-sm">
                        {new Date(swot.updatedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </div>

        {/* Modal Excluir */}
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          itemName={pendingOptions.itemName}
          resourceType={pendingOptions.resourceType}
          isDeleting={isDeleting}
        />
      </div>
    </PageTransition>
  );
}
