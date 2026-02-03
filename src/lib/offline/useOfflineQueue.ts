/**
 * useOfflineQueue Hook
 * React hook para gerenciar offline queue
 * 
 * @module lib/offline
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { offlineQueue, type OfflineAction } from './OfflineQueue';

export interface OfflineQueueStats {
  pending: number;
  synced: number;
  failed: number;
}

export function useOfflineQueue() {
  const [stats, setStats] = useState<OfflineQueueStats>({
    pending: 0,
    synced: 0,
    failed: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Atualizar stats
  const refreshStats = useCallback(async () => {
    try {
      const dbStats = await offlineQueue.getStats();
      setStats({
        pending: dbStats.PENDING,
        synced: dbStats.SYNCED,
        failed: dbStats.FAILED,
      });
    } catch (error) {
      console.error('[useOfflineQueue] Error refreshing stats:', error);
    }
  }, []);

  // Adicionar ação à fila
  const queueAction = useCallback(async (
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount' | 'error'>
  ): Promise<string> => {
    try {
      const actionId = await offlineQueue.addAction(action);
      await refreshStats();
      return actionId;
    } catch (error) {
      console.error('[useOfflineQueue] Error queueing action:', error);
      throw error;
    }
  }, [refreshStats]);

  // Sincronizar pendentes
  const syncPending = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    setIsSyncing(true);
    try {
      const result = await offlineQueue.syncPending();
      await refreshStats();
      return result;
    } catch (error) {
      console.error('[useOfflineQueue] Error syncing:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // Limpar ações antigas
  const cleanup = useCallback(async (): Promise<number> => {
    try {
      const deleted = await offlineQueue.cleanupSynced();
      await refreshStats();
      return deleted;
    } catch (error) {
      console.error('[useOfflineQueue] Error cleaning up:', error);
      throw error;
    }
  }, [refreshStats]);

  // Listeners de conexão
  useEffect(() => {
    // Status inicial
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('[useOfflineQueue] Back online');
      setIsOnline(true);
      
      // Auto-sync quando voltar online
      syncPending().catch(console.error);
    };

    const handleOffline = () => {
      console.log('[useOfflineQueue] Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending]);

  // Inicializar e carregar stats
  useEffect(() => {
    offlineQueue.init().then(refreshStats).catch(console.error);
  }, [refreshStats]);

  // Auto-cleanup a cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      cleanup().catch(console.error);
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, [cleanup]);

  return {
    stats,
    isOnline,
    isSyncing,
    queueAction,
    syncPending,
    cleanup,
    refreshStats,
  };
}
