'use client';

import { useState } from 'react';
import { useDeleteResource } from '@/hooks/useDeleteResource';

export default function TestDeleteHookPage() {
  const { handleDelete, isDeleting } = useDeleteResource('action-plans');
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
          onClick={() => handleDelete(testId)}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Excluindo...' : 'Excluir Action Plan'}
        </button>

        <button
          onClick={() => handleDelete(testId, {
            confirmMessage: 'Deletar MESMO?',
            onSuccess: () => alert('Deletado!'),
            onError: (e) => alert(`Erro: ${e.message}`),
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Excluir (com callbacks)
        </button>

        <button
          onClick={() => handleDelete(testId, {
            skipConfirmation: true,
            confirmMessage: 'Isso não será exibido',
            onSuccess: () => console.log('Deletado sem confirmação!'),
          })}
          disabled={isDeleting}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
        >
          Excluir sem confirmação
        </button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Como testar:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Clique no botão &quot;Excluir Action Plan&quot;</li>
          <li>Verifique se aparece o window.confirm</li>
          <li>Confirme → deve mostrar toast de sucesso/erro</li>
          <li>Verifique se a página dá refresh automático</li>
          <li>Teste os callbacks customizados com o segundo botão</li>
          <li>Teste skip de confirmação com o terceiro botão</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Nota:</strong> Este teste enviará requisições reais para a API. 
          O ID <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{testId}</code> provavelmente 
          não existe, então você verá um erro 404 (esperado).
        </p>
      </div>
    </div>
  );
}
