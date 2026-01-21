'use client';

/**
 * Hook para gerenciar integrações
 * @module hooks/useIntegrations
 */

import { useState, useCallback, useEffect } from 'react';
import { integrationService } from '@/lib/integrations/integration-service';
import type {
  Integration,
  IntegrationProvider,
  IntegrationConfigData,
  IntegrationLog,
  Webhook,
} from '@/lib/integrations/integration-types';

interface UseIntegrationsReturn {
  integrations: Integration[];
  webhooks: Webhook[];
  logs: IntegrationLog[];
  isLoading: boolean;
  error: Error | null;

  // Integration actions
  saveIntegration: (config: IntegrationConfigData & { type: IntegrationProvider; name: string }) => Promise<void>;
  updateIntegration: (id: string, config: Partial<IntegrationConfigData>) => Promise<void>;
  deleteIntegration: (id: string) => Promise<void>;
  testConnection: (config: IntegrationConfigData & { type: IntegrationProvider }) => Promise<{ success: boolean; message: string }>;
  toggleIntegration: (id: string) => Promise<void>;

  // Webhook actions
  createWebhook: (webhook: Partial<Webhook>) => Promise<Webhook>;
  updateWebhook: (id: string, updates: Partial<Webhook>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  testWebhook: (id: string) => Promise<{ success: boolean; statusCode?: number; error?: string }>;

  // Refresh
  refresh: () => Promise<void>;
  refreshLogs: (integrationId?: string) => Promise<void>;
}

export function useIntegrations(): UseIntegrationsReturn {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [integrationsData, webhooksData, logsData] = await Promise.all([
        integrationService.getIntegrations(),
        integrationService.getWebhooks().catch(() => []),
        integrationService.getLogs({ limit: 50 }).catch(() => []),
      ]);

      setIntegrations(integrationsData);
      setWebhooks(webhooksData);
      setLogs(logsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveIntegration = useCallback(
    async (config: IntegrationConfigData & { type: IntegrationProvider; name: string }) => {
      const saved = await integrationService.saveIntegration(config);
      setIntegrations((prev) => [...prev, saved]);
    },
    []
  );

  const updateIntegration = useCallback(async (id: string, config: Partial<IntegrationConfigData>) => {
    const updated = await integrationService.updateIntegration(id, config);
    setIntegrations((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  const deleteIntegration = useCallback(async (id: string) => {
    await integrationService.deleteIntegration(id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const testConnection = useCallback(
    async (config: IntegrationConfigData & { type: IntegrationProvider }) => {
      return integrationService.testConnection(config);
    },
    []
  );

  const toggleIntegration = useCallback(async (id: string) => {
    await integrationService.toggleIntegration(id);
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i))
    );
  }, []);

  const createWebhook = useCallback(async (webhook: Partial<Webhook>) => {
    const created = await integrationService.createWebhook(webhook);
    setWebhooks((prev) => [...prev, created]);
    return created;
  }, []);

  const updateWebhook = useCallback(async (id: string, updates: Partial<Webhook>) => {
    const updated = await integrationService.updateWebhook(id, updates);
    setWebhooks((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, []);

  const deleteWebhook = useCallback(async (id: string) => {
    await integrationService.deleteWebhook(id);
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const testWebhook = useCallback(async (id: string) => {
    return integrationService.testWebhook(id);
  }, []);

  const refreshLogs = useCallback(async (integrationId?: string) => {
    const logsData = await integrationService.getLogs({ 
      integrationId, 
      limit: 50 
    });
    setLogs(logsData);
  }, []);

  return {
    integrations,
    webhooks,
    logs,
    isLoading,
    error,
    saveIntegration,
    updateIntegration,
    deleteIntegration,
    testConnection,
    toggleIntegration,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    refresh: fetchAll,
    refreshLogs,
  };
}
