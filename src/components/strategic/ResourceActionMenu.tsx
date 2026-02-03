'use client';

/**
 * ResourceActionMenu - Menu de ações reutilizável para recursos Strategic
 * Inclui: Visualizar, Editar e Excluir
 * 
 * @module components/strategic
 */
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Edit, Trash } from 'lucide-react';
import { useDeleteResource } from '@/hooks/useDeleteResource';

interface ResourceActionMenuProps {
  /**
   * ID do recurso
   */
  id: string;

  /**
   * Tipo do recurso (ex: 'action-plans', 'goals', 'kpis')
   */
  resourceType: string;

  /**
   * Caminho base para navegação (ex: '/strategic/action-plans')
   */
  basePath: string;

  /**
   * Nome do recurso para exibir na confirmação de exclusão
   */
  resourceName?: string;

  /**
   * Mensagem customizada para confirmação de exclusão
   * Se não fornecida, usa mensagem padrão
   */
  deleteConfirmMessage?: string;

  /**
   * Callback chamado após exclusão bem-sucedida
   */
  onDeleteSuccess?: () => void;

  /**
   * Desabilitar opção de edição
   * @default false
   */
  disableEdit?: boolean;

  /**
   * Desabilitar opção de visualização
   * @default false
   */
  disableView?: boolean;
}

export function ResourceActionMenu({
  id,
  resourceType,
  basePath,
  resourceName,
  deleteConfirmMessage,
  onDeleteSuccess,
  disableEdit = false,
  disableView = false,
}: ResourceActionMenuProps) {
  const router = useRouter();
  const { handleDelete, isDeleting } = useDeleteResource(resourceType);

  const handleDeleteClick = async () => {
    await handleDelete(id, {
      confirmMessage: deleteConfirmMessage || 
        (resourceName 
          ? `Excluir "${resourceName}"? Esta ação não pode ser desfeita.`
          : undefined
        ),
      onSuccess: onDeleteSuccess,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Ações"
          onClick={(e) => e.stopPropagation()} // Evita propagar click para card pai
        >
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!disableView && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${basePath}/${id}`);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
        )}
        
        {!disableEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${basePath}/${id}/edit`);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          disabled={isDeleting}
        >
          <Trash className="mr-2 h-4 w-4" />
          {isDeleting ? 'Excluindo...' : 'Excluir'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * ResourceActionMenuTrigger - Botão trigger simplificado para usar em layouts compactos
 */
export function ResourceActionMenuTrigger({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      className="p-2 hover:bg-gray-700 rounded-md transition-colors"
      aria-label="Ações"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      <MoreVertical className="h-4 w-4 text-gray-400" />
    </button>
  );
}
