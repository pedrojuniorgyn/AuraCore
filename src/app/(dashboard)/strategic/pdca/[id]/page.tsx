'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { RippleButton } from '@/components/ui/ripple-button';
import { ArrowLeft, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useClientFormattedDate } from '@/hooks/useClientFormattedTime';

interface PDCACycle {
  id: string;
  code: string;
  title: string;
  description: string;
  currentPhase: string;
  status: string;
  responsible: string;
  responsibleUserId: string | null;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  effectiveness: number | null;
  isOverdue: boolean;
  daysUntilDue: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const PHASE_LABELS: Record<string, string> = {
  PLAN: 'Planejar',
  DO: 'Executar',
  CHECK: 'Verificar',
  ACT: 'Agir',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Planejado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
};

export default function PDCADetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<PDCACycle | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook de delete
  const {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    confirmDelete,
    cancelDelete,
    pendingOptions,
  } = useDeleteResource('pdca');

  // Formatação de datas no cliente (evita hydration mismatch)
  const formattedStartDate = useClientFormattedDate(data?.startDate || new Date());
  const formattedEndDate = useClientFormattedDate(data?.endDate || new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/strategic/pdca/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Error fetching PDCA Cycle:', error);
        toast.error('Erro ao carregar Ciclo PDCA', {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Função de delete agora usa o hook useDeleteResource

  if (loading) {
    return (
      <div className="min-h-screen -m-6 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen -m-6 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600">Ciclo PDCA não encontrado</p>
            <Link href="/strategic/pdca">
              <RippleButton className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </RippleButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-6 p-8 space-y-6">
      <PageHeader
        icon="🔄"
        title={`Ciclo PDCA: ${data.code}`}
        description={data.title}
        actions={
          <>
            <Link href="/strategic/pdca">
              <RippleButton variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </RippleButton>
            </Link>

            <Link href={`/strategic/pdca/${id}/edit`}>
              <RippleButton className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </RippleButton>
            </Link>

            <RippleButton
              onClick={() => handleDelete(id, {
                itemName: data.title || data.code,
                resourceType: 'Ciclo PDCA',
              })}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
            >
              <Trash className="w-4 h-4 mr-2" />
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </RippleButton>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Informações Gerais</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-white/60">Código</dt>
              <dd className="text-white font-mono">{data.code}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Título</dt>
              <dd className="text-white">{data.title}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Descrição</dt>
              <dd className="text-white">{data.description}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Fase Atual</dt>
              <dd className="text-white">{PHASE_LABELS[data.currentPhase] || data.currentPhase}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Status</dt>
              <dd className="text-white">{STATUS_LABELS[data.status] || data.status}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Progresso e Datas</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-white/60">Responsável</dt>
              <dd className="text-white">{data.responsible}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Progresso</dt>
              <dd className="text-white">{data.progress}%</dd>
            </div>
            {data.effectiveness !== null && (
              <div>
                <dt className="text-sm text-white/60">Efetividade</dt>
                <dd className="text-white">{data.effectiveness}%</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-white/60">Data Início</dt>
              {formattedStartDate && (
                <dd className="text-white">{formattedStartDate}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm text-white/60">Data Fim</dt>
              {formattedEndDate && (
                <dd className="text-white">{formattedEndDate}</dd>
              )}
            </div>
            {data.isOverdue && (
              <div>
                <dt className="text-sm text-white/60">Status de Prazo</dt>
                <dd className="text-red-400 font-semibold">
                  Atrasado ({data.daysUntilDue} dias)
                </dd>
              </div>
            )}
          </dl>
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
