'use client';

import { useState } from 'react';
import { useDeleteResource } from '@/hooks/useDeleteResource';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

export default function TestDeleteHookPage() {
  const { 
    handleDelete, 
    isDeleting,
    showDeleteDialog,
    confirmDelete,
    cancelDelete,
    pendingOptions,
  } = useDeleteResource('action-plans');
  const [testId] = useState('test-abc-123');

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Test Delete Hook</h1>
      
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Test ID: <code className="bg-muted px-2 py-1 rounded">{testId}</code>
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleDelete(testId, {
            itemName: 'Plano de Teste ABC-123',
            resourceType: 'plano de ação',
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Excluindo...' : 'Excluir com Modal Elegante'}
        </button>

        <button
          onClick={() => handleDelete(testId, {
            itemName: 'Plano de Teste ABC-123',
            resourceType: 'plano de ação',
            confirmMessage: 'Mensagem customizada: Deletar MESMO?',
            onSuccess: () => alert('Deletado!'),
            onError: (e) => alert(`Erro: ${e.message}`),
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Excluir (mensagem custom)
        </button>

        <button
          onClick={() => handleDelete(testId, {
            useModal: false,
            confirmMessage: 'Usando window.confirm (fallback)',
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Excluir com window.confirm
        </button>

        <button
          onClick={() => handleDelete(testId, {
            skipConfirmation: true,
            onSuccess: () => console.log('Deletado sem confirmação!'),
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Excluir sem confirmação
        </button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Como testar:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Clique no botão &quot;Excluir com Modal Elegante&quot;</li>
          <li>Verifique se aparece modal bonito (não window.confirm)</li>
          <li>Verifique nome do item no modal</li>
          <li>Clique &quot;Cancelar&quot; → modal fecha</li>
          <li>Clique novamente e confirme → toast aparece</li>
          <li>Teste mensagem customizada com segundo botão</li>
          <li>Teste fallback (window.confirm) com terceiro botão</li>
          <li>Teste skip de confirmação com quarto botão</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Nota:</strong> Este teste enviará requisições reais para a API. 
          O ID <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{testId}</code> provavelmente 
          não existe, então você verá um erro 404 (esperado).
        </p>
      </div>

      {/* Modal de confirmação */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            cancelDelete(); // Limpa estado pendente ao fechar modal
          }
        }}
        onConfirm={confirmDelete}
        itemName={pendingOptions.itemName}
        resourceType={pendingOptions.resourceType}
        customMessage={pendingOptions.confirmMessage}
        isDeleting={isDeleting}
      />
    </div>
  );
}
