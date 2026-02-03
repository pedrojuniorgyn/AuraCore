/**
 * Offline Indicator
 * Mostra indicador de conexão offline e status de sincronização
 * 
 * @module components/pwa
 */
'use client';

import { WifiOff, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineQueue } from '@/lib/offline';

export function OfflineIndicator() {
  const { isOnline, isSyncing, stats, syncPending } = useOfflineQueue();

  // Não exibir se está online e não há pendentes
  if (isOnline && stats.pending === 0) {
    return null;
  }

  const handleSync = () => {
    syncPending().catch(console.error);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-5 duration-300">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-lg mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Modo Offline
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Suas alterações serão sincronizadas quando voltar online
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending actions banner */}
      {stats.pending > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isSyncing ? (
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <CloudOff className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {isSyncing ? 'Sincronizando...' : `${stats.pending} ${stats.pending === 1 ? 'ação pendente' : 'ações pendentes'}`}
              </p>
              {!isSyncing && isOnline && (
                <button
                  onClick={handleSync}
                  className="text-xs text-blue-700 dark:text-blue-300 hover:underline mt-0.5"
                >
                  Sincronizar agora
                </button>
              )}
            </div>
            {isSyncing && (
              <div className="flex-shrink-0">
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  {stats.pending > 0 && `${stats.pending} restantes`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success banner (temporário) */}
      {stats.pending === 0 && stats.synced > 0 && isOnline && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Sincronizado com sucesso!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
