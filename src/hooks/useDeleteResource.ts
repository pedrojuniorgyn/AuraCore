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
   * Callback executado após sucesso
   */
  onSuccess?: () => void;

  /**
   * Callback executado em caso de erro
   */
  onError?: (error: Error) => void;

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
}

/**
 * Hook reutilizável para deletar recursos Strategic
 * 
 * @param resourceType - Tipo do recurso (ex: 'action-plans', 'goals', 'kpis')
 * @returns Objeto com handleDelete e isDeleting
 * 
 * @example
 * ```tsx
 * const { handleDelete, isDeleting } = useDeleteResource('action-plans');
 * 
 * <button 
 *   onClick={() => handleDelete('abc-123')}
 *   disabled={isDeleting}
 * >
 *   {isDeleting ? 'Excluindo...' : 'Excluir'}
 * </button>
 * ```
 */
export function useDeleteResource(resourceType: string): UseDeleteResourceReturn {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(
    async (id: string, options: UseDeleteResourceOptions = {}) => {
      const {
        confirmMessage = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
        onSuccess,
        onError,
        skipConfirmation = false,
      } = options;

      // 1. Confirmação
      if (!skipConfirmation) {
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
          return; // Usuário cancelou
        }
      }

      setIsDeleting(true);

      try {
        // 2. DELETE request
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

        // 3. Sucesso
        toast.success('Item excluído com sucesso!');

        // 4. Refresh da página
        router.refresh();

        // 5. Callback de sucesso
        if (onSuccess) {
          onSuccess();
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
        if (onError) {
          onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [resourceType, router]
  );

  return {
    handleDelete,
    isDeleting,
  };
}
