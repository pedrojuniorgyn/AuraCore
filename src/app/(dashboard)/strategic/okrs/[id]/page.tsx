'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Target,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  MoreHorizontal,
  Play,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { okrService } from '@/lib/okrs/okr-service';
import {
  KeyResultCard,
  KeyResultForm,
  OKRProgress,
  OKRAlignment,
  OKRTimeline,
  OKRForm,
} from '@/components/strategic/okrs';
import { LEVEL_LABELS, STATUS_LABELS } from '@/lib/okrs/okr-types';
import type { OKR, KeyResult } from '@/lib/okrs/okr-types';
import { toast } from 'sonner';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useClientFormattedDate } from '@/hooks/useClientFormattedTime';

export default function OKRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const okrId = params.id as string;

  const [okr, setOKR] = useState<OKR | null>(null);
  const [parent, setParent] = useState<OKR | null>(null);
  const [children, setChildren] = useState<OKR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNewKRForm, setShowNewKRForm] = useState(false);
  const [selectedKRHistory, setSelectedKRHistory] = useState<KeyResult | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Hook de delete
  const {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmDelete,
    cancelDelete,
    pendingOptions,
  } = useDeleteResource('okrs');

  // Formatação de datas no cliente (evita hydration mismatch)
  // Chamado sempre antes de early returns (Rules of Hooks)
  // Usar epoch (new Date(0)) como fallback para evitar flickering durante loading
  const formattedStartDate = useClientFormattedDate(okr?.startDate || new Date(0));
  const formattedEndDate = useClientFormattedDate(okr?.endDate || new Date(0));

  useEffect(() => {
    async function loadOKR() {
      setIsLoading(true);
      try {
        const data = await okrService.getOKR(okrId);
        setOKR(data);

        if (data.parentId) {
          const parentData = await okrService.getOKR(data.parentId);
          setParent(parentData);
        }

        const childrenData = await okrService.getOKRs({ parentId: okrId });
        setChildren(childrenData);
      } catch (err) {
        console.error('Failed to load OKR:', err);
        toast.error('Erro ao carregar OKR');
      } finally {
        setIsLoading(false);
      }
    }

    loadOKR();
  }, [okrId]);

  const handleUpdateOKR = async (data: Partial<OKR>) => {
    if (!okr) return;
    try {
      const updated = await okrService.updateOKR(okr.id, data);
      setOKR(updated);
      setShowEditForm(false);
      toast.success('OKR atualizado');
    } catch {
      toast.error('Erro ao atualizar OKR');
    }
  };

  // Função de delete agora usa o hook useDeleteResource

  const handleAddKeyResult = async (data: Partial<KeyResult>) => {
    if (!okr) return;
    try {
      const created = await okrService.addKeyResult(okr.id, data);
      setOKR({ ...okr, keyResults: [...okr.keyResults, created] });
      setShowNewKRForm(false);
      toast.success('Key Result adicionado');
    } catch {
      toast.error('Erro ao adicionar Key Result');
    }
  };

  const handleUpdateKRValue = async (krId: string, value: number, comment?: string) => {
    if (!okr) return;
    try {
      const updated = await okrService.updateKeyResultValue(okr.id, krId, value, comment);
      setOKR({
        ...okr,
        keyResults: okr.keyResults.map((kr) => (kr.id === krId ? updated : kr)),
        progress: okrService.calculateProgress(
          okr.keyResults.map((kr) => (kr.id === krId ? updated : kr))
        ),
      });
      toast.success('Valor atualizado');
    } catch {
      toast.error('Erro ao atualizar valor');
    }
  };

  const handleActivateOKR = async () => {
    if (!okr) return;
    try {
      const updated = await okrService.updateOKR(okr.id, { status: 'active' });
      setOKR(updated);
      toast.success('OKR ativado');
    } catch {
      toast.error('Erro ao ativar OKR');
    }
  };

  const handleCompleteOKR = async () => {
    if (!okr) return;
    try {
      const updated = await okrService.updateOKR(okr.id, { status: 'completed' });
      setOKR(updated);
      toast.success('OKR concluído');
    } catch {
      toast.error('Erro ao concluir OKR');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!okr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Target className="mx-auto mb-4 text-white/20" size={48} />
          <h2 className="text-white text-xl mb-4">OKR não encontrado</h2>
          <Link href="/strategic/okrs" className="text-purple-400 hover:text-purple-300">
            Voltar para OKRs
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-blue-500/20 text-blue-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/strategic/okrs"
            className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-white/40 text-sm mb-1">
              <span>{LEVEL_LABELS[okr.level]}</span>
              <span>•</span>
              <span>{okr.periodLabel}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{okr.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-sm ${statusColors[okr.status]}`}>
              {STATUS_LABELS[okr.status]}
            </span>
            {okr.status === 'draft' && (
              <button
                onClick={handleActivateOKR}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400
                  rounded-xl hover:bg-green-500/30"
              >
                <Play size={16} />
                Ativar
              </button>
            )}
            {okr.status === 'active' && okr.progress >= 100 && (
              <button
                onClick={handleCompleteOKR}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400
                  rounded-xl hover:bg-blue-500/30"
              >
                <CheckCircle size={16} />
                Concluir
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white"
              >
                <MoreHorizontal size={20} />
              </button>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10
                    rounded-xl shadow-xl overflow-hidden z-10"
                >
                  <button
                    onClick={() => {
                      setShowEditForm(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-white/70 hover:bg-white/5"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(okrId, {
                      itemName: okr.title,
                      resourceType: 'OKR',
                    })}
                    disabled={isDeleting}
                    className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {showEditForm && (
          <div className="mb-6">
            <OKRForm okr={okr} onSubmit={handleUpdateOKR} onCancel={() => setShowEditForm(false)} />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Key Results */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            {okr.description && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/70">{okr.description}</p>
              </div>
            )}

            {/* Key Results */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Key Results</h2>
                <button
                  onClick={() => setShowNewKRForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400
                    rounded-lg hover:bg-purple-500/30 text-sm"
                >
                  <Plus size={14} />
                  Novo KR
                </button>
              </div>

              {showNewKRForm && (
                <div className="mb-4">
                  <KeyResultForm
                    okrId={okr.id}
                    onSubmit={handleAddKeyResult}
                    onCancel={() => setShowNewKRForm(false)}
                  />
                </div>
              )}

              {okr.keyResults.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <Target className="mx-auto mb-3 text-white/20" size={32} />
                  <p className="text-white/40">Nenhum Key Result definido</p>
                  <button
                    onClick={() => setShowNewKRForm(true)}
                    className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Adicionar Key Result
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {okr.keyResults.map((kr) => (
                    <KeyResultCard
                      key={kr.id}
                      keyResult={kr}
                      onUpdate={(value, comment) => handleUpdateKRValue(kr.id, value, comment)}
                      onEdit={() => setSelectedKRHistory(kr)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* KR History */}
            {selectedKRHistory && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">Histórico de Atualizações</h2>
                  <button
                    onClick={() => setSelectedKRHistory(null)}
                    className="text-white/40 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
                <OKRTimeline
                  history={selectedKRHistory.valueHistory}
                  krTitle={selectedKRHistory.title}
                />
              </div>
            )}
          </div>

          {/* Right Column - Progress & Alignment */}
          <div className="space-y-6">
            {/* Owner Info */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="text-purple-400" size={20} />
                </div>
                <div>
                  <span className="text-white/40 text-xs block">Responsável</span>
                  <span className="text-white">{okr.ownerName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-white/40">
                <Calendar size={14} />
                <span>
                  {formattedStartDate && formattedEndDate 
                    ? `${formattedStartDate} - ${formattedEndDate}` 
                    : '\u00A0'}
                </span>
              </div>
            </div>

            {/* Progress */}
            <OKRProgress okr={okr} />

            {/* Alignment */}
            <OKRAlignment okr={okr} parent={parent} childOKRs={children} />
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        itemName={pendingOptions.itemName}
        resourceType={pendingOptions.resourceType}
        isDeleting={isDeleting}
      />
    </div>
  );
}
