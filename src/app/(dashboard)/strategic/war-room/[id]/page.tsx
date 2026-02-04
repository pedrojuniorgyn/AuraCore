'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useWarRoom } from '@/hooks/useWarRoom';
import { WarRoomDashboard } from '@/components/strategic/war-room';
import { toast } from 'sonner';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface Props {
  params: Promise<{ id: string }>;
}

export default function WarRoomDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const {
    warRoom,
    isLoading,
    error,
    createAction,
    completeAction,
    addMember,
    removeMember,
    escalate,
    addUpdate,
    refresh,
  } = useWarRoom(id);

  const [showActionModal, setShowActionModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Hook de delete
  const {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmDelete,
    cancelDelete,
    pendingOptions,
  } = useDeleteResource('war-room');

  const handleCreateAction = async () => {
    // For now, create a simple action
    try {
      await createAction({
        title: 'Nova ação',
        assigneeId: 'current-user',
        assigneeName: 'Você',
        status: 'pending',
        priority: 'high',
        createdBy: 'current-user',
        createdAt: new Date(),
      });
      toast.success('Ação criada com sucesso!');
    } catch {
      toast.error('Erro ao criar ação');
    }
  };

  const handleCompleteAction = async (actionId: string) => {
    try {
      await completeAction(actionId);
      toast.success('Ação concluída!');
    } catch {
      toast.error('Erro ao concluir ação');
    }
  };

  const handleAddMember = async () => {
    // For now, add a mock member
    try {
      await addMember('new-user', 'member');
      toast.success('Membro adicionado!');
    } catch {
      toast.error('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(userId);
      toast.success('Membro removido');
    } catch {
      toast.error('Erro ao remover membro');
    }
  };

  const handleEscalate = async () => {
    try {
      await escalate('Situação não resolvida no prazo');
      toast.success('Escalação realizada!');
    } catch {
      toast.error('Erro ao escalar');
    }
  };

  const handleAddUpdate = async () => {
    try {
      await addUpdate('comment', 'Novo comentário adicionado');
      toast.success('Atualização adicionada!');
    } catch {
      toast.error('Erro ao adicionar atualização');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !warRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-white/60 mb-4">War Room não encontrada</p>
        <button
          onClick={() => router.push('/strategic/war-room/rooms')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
        >
          <ArrowLeft size={16} />
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/strategic/war-room/rooms')}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para lista
      </button>

      {/* Dashboard */}
      <WarRoomDashboard
        warRoom={warRoom}
        onRefresh={refresh}
        onCreateAction={handleCreateAction}
        onCompleteAction={handleCompleteAction}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onEscalate={handleEscalate}
        onAddUpdate={handleAddUpdate}
      />

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
