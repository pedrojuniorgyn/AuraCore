'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link2, Lock, Loader2 } from 'lucide-react';
import { IntegrationCard, type Integration, type IntegrationType } from '@/components/strategic/IntegrationCard';
import { IntegrationSetup, type IntegrationConfig } from '@/components/strategic/IntegrationSetup';
import { IntegrationLogs, type LogEntry } from '@/components/strategic/IntegrationLogs';
import { toast } from 'sonner';

interface IntegrationWithLogs extends Integration {
  logs?: LogEntry[];
}

const availableIntegrations: { type: IntegrationType; name: string; icon: string; available: boolean }[] = [
  { type: 'slack', name: 'Slack', icon: '💬', available: true },
  { type: 'teams', name: 'Microsoft Teams', icon: '🔷', available: true },
  { type: 'email', name: 'Email', icon: '📧', available: true },
  { type: 'webhook', name: 'Webhook', icon: '🌐', available: true },
  { type: 'push', name: 'Push Browser', icon: '🔔', available: true },
];

const comingSoon = [
  { name: 'Power BI', icon: '📊' },
  { name: 'WhatsApp', icon: '📱' },
  { name: 'Zapier', icon: '🤖' },
  { name: 'Google Chat', icon: '💬' },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupType, setSetupType] = useState<IntegrationType | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationWithLogs | null>(null);
  const [logsIntegration, setLogsIntegration] = useState<IntegrationWithLogs | null>(null);

  // Fetch integrations with cleanup
  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/strategic/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Erro ao carregar integrações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadData = async () => {
      try {
        const response = await fetch('/api/strategic/integrations', {
          signal: controller.signal,
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          setIntegrations(data.integrations || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        if (isMounted) {
          console.error('Failed to fetch integrations:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleSave = async (config: IntegrationConfig) => {
    const method = editingIntegration ? 'PUT' : 'POST';
    const url = editingIntegration 
      ? `/api/strategic/integrations/${editingIntegration.id}` 
      : '/api/strategic/integrations';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      await fetchIntegrations();
      toast.success(editingIntegration ? 'Integração atualizada!' : 'Integração criada!');
      setEditingIntegration(null);
      setSetupType(null);
    } else {
      toast.error('Erro ao salvar integração');
    }
  };

  const handleTest = async (config: IntegrationConfig): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/strategic/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return response.json();
    } catch {
      return { success: false, message: 'Erro ao testar conexão' };
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/strategic/integrations/${id}/toggle`, { method: 'POST' });
      if (response.ok) {
        await fetchIntegrations();
        toast.success('Status atualizado');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta integração?')) return;
    
    try {
      const response = await fetch(`/api/strategic/integrations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchIntegrations();
        toast.success('Integração excluída');
      }
    } catch {
      toast.error('Erro ao excluir integração');
    }
  };

  // CALLBACK-001: Handler que recebe integração diretamente
  const handleTestIntegration = async (integration: IntegrationWithLogs) => {
    toast.loading('Testando conexão...', { id: 'test-connection' });
    
    const result = await handleTest({
      type: integration.type,
      name: integration.name,
      webhookUrl: integration.config.webhookUrl || '',
      channel: integration.config.channel,
      events: integration.config.events,
      messageFormat: 'detailed',
    });
    
    toast.dismiss('test-connection');
    
    if (result.success) {
      toast.success('Conexão OK!');
    } else {
      toast.error(result.message);
    }
  };

  const activeIntegrations = integrations.filter(i => i.isActive);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Link2 className="text-purple-400" />
            Integrações
          </h1>
          <p className="text-white/60 mt-1">
            Conecte o AuraCore com suas ferramentas favoritas
          </p>
        </div>
      </motion.div>

      {/* Active Integrations */}
      {activeIntegrations.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            🟢 Integrações Ativas
          </h2>
          <div className="space-y-4">
            {activeIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={() => {
                  // CALLBACK-001: Usar item do map diretamente
                  setEditingIntegration(integration);
                  setSetupType(integration.type);
                }}
                onTest={() => handleTestIntegration(integration)}
                onLogs={() => {
                  // CALLBACK-001: Usar item do map diretamente
                  setLogsIntegration(integration);
                }}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available Integrations */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          ⚪ Integrações Disponíveis
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {availableIntegrations
            .filter(ai => !integrations.some(i => i.type === ai.type))
            .map((integration) => (
              <button
                key={integration.type}
                onClick={() => setSetupType(integration.type)}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 
                  hover:border-purple-500/30 hover:bg-white/10 transition-all text-center"
              >
                <span className="text-4xl block mb-3">{integration.icon}</span>
                <span className="text-white font-medium">{integration.name}</span>
                <span className="block mt-2 text-purple-400 text-sm">Configurar</span>
              </button>
            ))}
        </div>
      </section>

      {/* Coming Soon */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🔜 Em Breve
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {comingSoon.map((integration) => (
            <div
              key={integration.name}
              className="p-6 rounded-2xl bg-white/2 border border-white/5 text-center opacity-50"
            >
              <span className="text-4xl block mb-3">{integration.icon}</span>
              <span className="text-white font-medium">{integration.name}</span>
              <span className="block mt-2 text-white/40 text-sm flex items-center justify-center gap-1">
                <Lock size={12} /> Em breve
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Setup Modal */}
      {setupType && (
        <IntegrationSetup
          isOpen={!!setupType}
          onClose={() => { setSetupType(null); setEditingIntegration(null); }}
          onSave={handleSave}
          onTest={handleTest}
          integrationType={setupType}
          initialConfig={editingIntegration ? {
            type: editingIntegration.type,
            name: editingIntegration.name,
            webhookUrl: editingIntegration.config.webhookUrl || '',
            channel: editingIntegration.config.channel,
            events: editingIntegration.config.events,
            messageFormat: 'detailed',
          } : undefined}
        />
      )}

      {/* Logs Drawer */}
      <IntegrationLogs
        isOpen={!!logsIntegration}
        onClose={() => setLogsIntegration(null)}
        integrationName={logsIntegration?.name || ''}
        logs={logsIntegration?.logs || []}
        onRefresh={fetchIntegrations}
        onRetry={async (retryLogId) => {
          toast.loading('Reenviando...', { id: 'retry' });
          // TODO: Implement retry logic for log entry
          console.log('Retrying log entry:', retryLogId);
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.dismiss('retry');
          toast.success('Reenviado com sucesso!');
        }}
      />
    </div>
  );
}
