'use client';

/**
 * DeleteResourceButton - Botão de exclusão para páginas Detail
 * 
 * @module components/strategic
 */
import { useRouter } from 'next/navigation';
import { Trash } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';
import { useDeleteResource } from '@/hooks/useDeleteResource';

interface DeleteResourceButtonProps {
  /**
   * ID do recurso
   */
  id: string;

  /**
   * Tipo do recurso (ex: 'action-plans', 'goals', 'kpis')
   */
  resourceType: string;

  /**
   * URL para redirecionar após exclusão bem-sucedida
   */
  redirectTo: string;

  /**
   * Nome do recurso para exibir na confirmação de exclusão
   */
  resourceName?: string;

  /**
   * Mensagem customizada para confirmação de exclusão
   */
  deleteConfirmMessage?: string;

  /**
   * Callback adicional após exclusão bem-sucedida
   */
  onDeleteSuccess?: () => void;

  /**
   * Variante do botão
   * @default 'danger'
   */
  variant?: 'danger' | 'outline';

  /**
   * Tamanho do botão
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';
}

export function DeleteResourceButton({
  id,
  resourceType,
  redirectTo,
  resourceName,
  deleteConfirmMessage,
  onDeleteSuccess,
  variant = 'danger',
  size = 'default',
}: DeleteResourceButtonProps) {
  const router = useRouter();
  const { handleDelete, isDeleting } = useDeleteResource(resourceType);

  const handleDeleteAndRedirect = async () => {
    await handleDelete(id, {
      confirmMessage: deleteConfirmMessage || 
        (resourceName 
          ? `Excluir "${resourceName}"? Esta ação não pode ser desfeita.`
          : undefined
        ),
      onSuccess: () => {
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
        router.push(redirectTo);
      },
    });
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
  };

  return (
    <RippleButton
      onClick={handleDeleteAndRedirect}
      disabled={isDeleting}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
      `}
    >
      <Trash className="h-4 w-4" />
      {isDeleting ? 'Excluindo...' : 'Excluir'}
    </RippleButton>
  );
}

/**
 * DeleteResourceButtonCompact - Versão compacta (ícone apenas)
 */
export function DeleteResourceButtonCompact({
  id,
  resourceType,
  redirectTo,
  resourceName,
  deleteConfirmMessage,
  onDeleteSuccess,
}: Omit<DeleteResourceButtonProps, 'variant' | 'size'>) {
  const router = useRouter();
  const { handleDelete, isDeleting } = useDeleteResource(resourceType);

  const handleDeleteAndRedirect = async () => {
    await handleDelete(id, {
      confirmMessage: deleteConfirmMessage || 
        (resourceName 
          ? `Excluir "${resourceName}"? Esta ação não pode ser desfeita.`
          : undefined
        ),
      onSuccess: () => {
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
        router.push(redirectTo);
      },
    });
  };

  return (
    <button
      onClick={handleDeleteAndRedirect}
      disabled={isDeleting}
      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={isDeleting ? 'Excluindo...' : 'Excluir'}
    >
      <Trash className="h-4 w-4" />
    </button>
  );
}
