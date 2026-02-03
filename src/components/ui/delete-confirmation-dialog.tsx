'use client';

/**
 * DeleteConfirmationDialog - Modal elegante para confirmação de exclusão
 * Substitui window.confirm() com design profissional
 * 
 * @module components/ui
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export interface DeleteConfirmationDialogProps {
  /**
   * Estado de abertura do modal
   */
  open: boolean;

  /**
   * Callback quando modal fecha
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback quando usuário confirma exclusão
   */
  onConfirm: () => void;

  /**
   * Nome do item a ser excluído (ex: "Plano de Ação XYZ")
   */
  itemName?: string;

  /**
   * Tipo do recurso (ex: "plano de ação", "objetivo", "KPI")
   */
  resourceType?: string;

  /**
   * Mensagem customizada (sobrescreve padrão)
   */
  customMessage?: string;

  /**
   * Estado de loading durante exclusão
   */
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  resourceType = 'item',
  customMessage,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const defaultMessage = itemName
    ? `Você está prestes a excluir o ${resourceType} "${itemName}".`
    : `Você está prestes a excluir este ${resourceType}.`;

  const handleConfirm = () => {
    onConfirm();
    // Note: O modal será fechado pelo hook após o delete ser concluído
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="text-left">Confirmar Exclusão</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2 text-left">
            <p className="text-sm">
              {customMessage || defaultMessage}
            </p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-500">
              ⚠️ Esta ação não pode ser desfeita.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
