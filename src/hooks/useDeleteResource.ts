'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface UseDeleteResourceOptions {
  /**
   * Mensagem de confirmação customizada
   * @default "Tem certeza que deseja excluir este item?"
   */
  confirmMessage?: string;

  /**
   * Nome do item a ser excluído (usado no modal)
   */
  itemName?: string;

  /**
   * Tipo do recurso (ex: "plano de ação", "objetivo")
   * @default "item"
   */
  resourceType?: string;

  /**
   * Callback executado após sucesso
   */
  onSuccess?: () => void;

  /**
   * Callback executado em caso de erro
   */
  onError?: (error: Error) => void;

  /**
   * Usar modal elegante ao invés de window.confirm
   * @default true
   */
  useModal?: boolean;

  /**
   * Desabilitar confirmação (não recomendado)
   * @default false
   */
  skipConfirmation?: boolean;
}

export interface UseDeleteResourceReturn {
  /**
   * Função para deletar recurso
   * @param id - ID do recurso
   * @param options - Opções customizáveis
   */
  handleDelete: (id: string, options?: UseDeleteResourceOptions) => Promise<void>;

  /**
   * Estado de loading durante delete
   */
  isDeleting: boolean;

  /**
   * Estado de exibição do modal de confirmação
   */
  showDeleteDialog: boolean;

  /**
   * Função para controlar exibição do modal
   */
  setShowDeleteDialog: (show: boolean) => void;

  /**
   * ID pendente de exclusão (quando usando modal)
   */
  pendingDeleteId: string | null;

  /**
   * Opções pendentes (quando usando modal)
   */
  pendingOptions: UseDeleteResourceOptions;

  /**
   * Confirmar exclusão (quando usando modal)
   */
  confirmDelete: () => Promise<void>;

  /**
   * Cancelar exclusão e limpar estado pendente (quando usando modal)
   */
  cancelDelete: () => void;
}

/**
 * Hook reutilizável para deletar recursos Strategic
 * 
 * @param resourceType - Tipo do recurso (ex: 'action-plans', 'goals', 'kpis')
 * @returns Objeto com handleDelete, isDeleting e controles do modal
 * 
 * @example Uso simples (com modal padrão)
 * ```tsx
 * const { handleDelete, isDeleting, showDeleteDialog, setShowDeleteDialog, confirmDelete, pendingOptions } = useDeleteResource('action-plans');
 * 
 * <button onClick={() => handleDelete('abc-123', { itemName: 'Plano XYZ', resourceType: 'plano de ação' })}>
 *   Excluir
 * </button>
 * 
 * <DeleteConfirmationDialog
 *   open={showDeleteDialog}
 *   onOpenChange={setShowDeleteDialog}
 *   onConfirm={confirmDelete}
 *   itemName={pendingOptions.itemName}
 *   resourceType={pendingOptions.resourceType}
 *   isDeleting={isDeleting}
 * />
 * ```
 * 
 * @example Uso com window.confirm (fallback)
 * ```tsx
 * const { handleDelete, isDeleting } = useDeleteResource('action-plans');
 * 
 * <button onClick={() => handleDelete('abc-123', { useModal: false })}>
 *   Excluir
 * </button>
 * ```
 */
export function useDeleteResource(resourceType: string): UseDeleteResourceReturn {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingOptions, setPendingOptions] = useState<UseDeleteResourceOptions>({});

  // Função interna que executa o DELETE
  const executeDelete = useCallback(
    async (id: string, options: UseDeleteResourceOptions = {}) => {
      setIsDeleting(true);

      try {
        // DELETE request
        const response = await fetch(`/api/strategic/${resourceType}/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ao excluir: ${response.status}`);
        }

        // Sucesso
        toast.success('Item excluído com sucesso!');

        // Refresh da página
        router.refresh();

        // Callback de sucesso
        if (options.onSuccess) {
          options.onSuccess();
        }
      } catch (error) {
        console.error('Error deleting resource:', error);

        // Toast de erro
        toast.error(
          error instanceof Error 
            ? error.message 
            : 'Erro ao excluir item. Tente novamente.'
        );

        // Callback de erro
        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [resourceType, router]
  );

  // Função pública que inicia o processo de exclusão
  const handleDelete = useCallback(
    async (id: string, options: UseDeleteResourceOptions = {}) => {
      const { 
        useModal = true, 
        skipConfirmation = false,
        confirmMessage = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
      } = options;

      // Se não precisa confirmação, executar direto
      if (skipConfirmation) {
        await executeDelete(id, options);
        return;
      }

      // Se usar modal, armazenar dados e abrir modal
      if (useModal) {
        setPendingDeleteId(id);
        setPendingOptions(options);
        setShowDeleteDialog(true);
        return;
      }

      // Fallback: window.confirm (para compatibilidade retroativa)
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        await executeDelete(id, options);
      }
    },
    [executeDelete]
  );

  // Função para cancelar delete (limpa estado pendente)
  const cancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
    setPendingOptions({});
  }, []);

  // Função para confirmar delete (chamada pelo modal)
  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId) {
      // NÃO fechar modal aqui - deixar aberto durante execução
      await executeDelete(pendingDeleteId, pendingOptions);
      
      // Fechar modal e limpar estado APÓS delete completar (sucesso ou erro)
      setShowDeleteDialog(false);
      setPendingDeleteId(null);
      setPendingOptions({});
    }
  }, [pendingDeleteId, pendingOptions, executeDelete]);

  return {
    handleDelete,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    pendingDeleteId,
    pendingOptions,
    confirmDelete,
    cancelDelete,
  };
}
