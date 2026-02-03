/**
 * Offline Queue - IndexedDB
 * Gerencia fila de ações offline para sincronização posterior
 * 
 * @module lib/offline
 */

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string; // 'kpi', 'goal', 'action-plan', etc
  entityId?: string;
  payload: unknown;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export class OfflineQueue {
  private static instance: OfflineQueue | null = null;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'auracore-offline';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'actions';

  private constructor() {
    // Singleton
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  /**
   * Inicializa IndexedDB
   */
  public async init(): Promise<void> {
    if (this.db) {
      return; // Já inicializado
    }

    if (typeof window === 'undefined') {
      return; // Server-side, não faz nada
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineQueue] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          
          // Índices
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('entity', 'entity', { unique: false });
          
          console.log('[OfflineQueue] Object store created');
        }
      };
    });
  }

  /**
   * Adiciona ação à fila
   */
  public async addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount' | 'error'>): Promise<string> {
    await this.init();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const fullAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      error: undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(fullAction);

      request.onsuccess = () => {
        console.log(`[OfflineQueue] Action added: ${fullAction.id}`);
        resolve(fullAction.id);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Error adding action:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Busca ações pendentes
   */
  public async getPendingActions(): Promise<OfflineAction[]> {
    await this.init();

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('PENDING');

      request.onsuccess = () => {
        const actions = request.result as OfflineAction[];
        // Ordenar por timestamp (mais antigos primeiro)
        actions.sort((a, b) => a.timestamp - b.timestamp);
        resolve(actions);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Error getting pending actions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Marca ação como sincronizada
   */
  public async markAsSynced(actionId: string): Promise<void> {
    await this.init();

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result as OfflineAction;
        if (action) {
          action.status = 'SYNCED';
          const updateRequest = store.put(action);

          updateRequest.onsuccess = () => {
            console.log(`[OfflineQueue] Action synced: ${actionId}`);
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve(); // Ação não encontrada, ignorar
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Marca ação como falhada
   */
  public async markAsFailed(actionId: string, error: string): Promise<void> {
    await this.init();

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result as OfflineAction;
        if (action) {
          action.retryCount += 1;

          if (action.retryCount >= action.maxRetries) {
            action.status = 'FAILED';
            action.error = error;
          }

          const updateRequest = store.put(action);

          updateRequest.onsuccess = () => {
            console.log(`[OfflineQueue] Action failed: ${actionId} (retry ${action.retryCount}/${action.maxRetries})`);
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Limpa ações sincronizadas antigas (>7 dias)
   */
  public async cleanupSynced(): Promise<number> {
    await this.init();

    if (!this.db) {
      return 0;
    }

    const cutoffDate = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 dias atrás

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('SYNCED'));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const action = cursor.value as OfflineAction;
          if (action.timestamp < cutoffDate) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`[OfflineQueue] Cleaned up ${deletedCount} old actions`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Executa ação (faz request HTTP)
   */
  public async executeAction(action: OfflineAction): Promise<void> {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: action.method !== 'DELETE' ? JSON.stringify(action.payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.markAsSynced(action.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markAsFailed(action.id, errorMessage);
      throw error;
    }
  }

  /**
   * Sincroniza todas as ações pendentes
   */
  public async syncPending(): Promise<{ synced: number; failed: number }> {
    const pending = await this.getPendingActions();
    let synced = 0;
    let failed = 0;

    for (const action of pending) {
      try {
        await this.executeAction(action);
        synced++;
      } catch (error) {
        console.error(`[OfflineQueue] Failed to sync action ${action.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Conta ações por status
   */
  public async getStats(): Promise<Record<OfflineAction['status'], number>> {
    await this.init();

    if (!this.db) {
      return { PENDING: 0, SYNCED: 0, FAILED: 0 };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const actions = request.result as OfflineAction[];
        const stats = {
          PENDING: 0,
          SYNCED: 0,
          FAILED: 0,
        };

        for (const action of actions) {
          stats[action.status]++;
        }

        resolve(stats);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const offlineQueue = OfflineQueue.getInstance();
