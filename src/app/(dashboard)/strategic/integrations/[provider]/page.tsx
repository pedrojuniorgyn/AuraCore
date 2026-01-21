'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SlackConfig } from '@/components/strategic/integrations/SlackConfig';
import { TeamsConfig } from '@/components/strategic/integrations/TeamsConfig';
import { EmailConfig } from '@/components/strategic/integrations/EmailConfig';
import { WebhookBuilder } from '@/components/strategic/integrations/WebhookBuilder';
import { integrationService } from '@/lib/integrations/integration-service';
import type {
  Integration,
  IntegrationProvider,
  IntegrationConfigData,
  Webhook,
} from '@/lib/integrations/integration-types';
import { PROVIDER_INFO } from '@/lib/integrations/integration-types';
import { IntegrationsAIWidget } from '@/components/integrations';

export default function ProviderPage() {
  const params = useParams();
  const router = useRouter();
  const provider = params.provider as IntegrationProvider;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showNewWebhook, setShowNewWebhook] = useState(false);

  const providerInfo = PROVIDER_INFO[provider];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const integrations = await integrationService.getIntegrations();
      const existing = integrations.find(
        (i) => i.provider === provider || ('type' in i && i.type === provider)
      );
      if (existing) {
        setIntegration(existing);
      }

      if (provider === 'webhook') {
        const webhooksData = await integrationService.getWebhooks();
        setWebhooks(webhooksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (provider && PROVIDER_INFO[provider]) {
      fetchData();
    }
  }, [provider, fetchData]);

  const handleSave = async (config: IntegrationConfigData & { type: IntegrationProvider; name: string }) => {
    try {
      await integrationService.saveIntegration(config);
      toast.success('Integração salva com sucesso!');
      await fetchData();
      setShowConfig(false);
    } catch (error) {
      toast.error('Erro ao salvar integração');
    }
  };

  const handleTest = async (
    config: IntegrationConfigData & { type: IntegrationProvider }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await integrationService.testConnection(config);
    } catch {
      return { success: false, message: 'Erro ao testar conexão' };
    }
  };

  const handleSaveWebhook = async (webhook: Partial<Webhook>) => {
    try {
      if (webhook.id) {
        await integrationService.updateWebhook(webhook.id, webhook);
        toast.success('Webhook atualizado!');
      } else {
        await integrationService.createWebhook(webhook);
        toast.success('Webhook criado!');
      }
      await fetchData();
      setEditingWebhook(null);
      setShowNewWebhook(false);
    } catch (error) {
      toast.error('Erro ao salvar webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;
    try {
      await integrationService.deleteWebhook(id);
      toast.success('Webhook excluído!');
      await fetchData();
    } catch (error) {
      toast.error('Erro ao excluir webhook');
    }
  };

  if (!providerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
        <p className="text-white">Provider não encontrado</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link
          href="/strategic/integrations"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para Integrações
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-5xl">{providerInfo.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-white">{providerInfo.name}</h1>
            <p className="text-white/60">{providerInfo.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {integration ? (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400">
                <CheckCircle size={16} />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white/60">
                <XCircle size={16} />
                Não conectado
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {provider === 'webhook' ? (
        // Webhook Management
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Webhooks Configurados</h2>
            <button
              onClick={() => setShowNewWebhook(true)}
              className="px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              + Novo Webhook
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-4xl block mb-4">🔗</span>
              <p className="text-white/60">Nenhum webhook configurado</p>
              <button
                onClick={() => setShowNewWebhook(true)}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Criar primeiro webhook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <motion.div
                  key={webhook.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold">{webhook.name}</h3>
                      <p className="text-white/50 text-sm truncate max-w-md">{webhook.url}</p>
                      <div className="flex gap-2 mt-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs"
                          >
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 3 && (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white/40 text-xs">
                            +{webhook.events.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          webhook.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                        }`}
                      />
                      <button
                        onClick={() => setEditingWebhook(webhook)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Webhook Builder Modal */}
          {(showNewWebhook || editingWebhook) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowNewWebhook(false);
                setEditingWebhook(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-semibold text-white">
                    {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                  </h2>
                </div>
                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                  <WebhookBuilder
                    webhook={editingWebhook || undefined}
                    onSave={handleSaveWebhook}
                    onCancel={() => {
                      setShowNewWebhook(false);
                      setEditingWebhook(null);
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      ) : (
        // Other integrations
        <div className="space-y-6">
          {integration ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10"
            >
              <h2 className="text-lg font-bold text-white mb-4">Configuração Atual</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {integration.config.channel && (
                  <div>
                    <span className="text-white/40">Canal:</span>
                    <span className="text-white ml-2">{integration.config.channel}</span>
                  </div>
                )}
                <div>
                  <span className="text-white/40">Eventos:</span>
                  <span className="text-white ml-2">{integration.config.events.length} configurados</span>
                </div>
                <div>
                  <span className="text-white/40">Status:</span>
                  <span className={`ml-2 ${integration.isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                    {integration.isActive ? 'Ativo' : 'Pausado'}
                  </span>
                </div>
                {integration.stats && (
                  <div>
                    <span className="text-white/40">Enviados:</span>
                    <span className="text-white ml-2">{integration.stats.totalSent}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Editar Configuração
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-5xl block mb-4">{providerInfo.icon}</span>
              <p className="text-white/60 mb-4">Esta integração ainda não foi configurada</p>
              <button
                onClick={() => setShowConfig(true)}
                className="px-6 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
              >
                Configurar Agora
              </button>
            </div>
          )}

          {/* Config Modals */}
          {showConfig && provider === 'slack' && (
            <SlackConfig
              config={integration?.config}
              onSave={handleSave}
              onTest={handleTest}
              onClose={() => setShowConfig(false)}
            />
          )}

          {showConfig && provider === 'teams' && (
            <TeamsConfig
              config={integration?.config}
              onSave={handleSave}
              onTest={handleTest}
              onClose={() => setShowConfig(false)}
            />
          )}

          {showConfig && provider === 'email' && (
            <EmailConfig
              config={integration?.config}
              onSave={handleSave}
              onTest={handleTest}
              onClose={() => setShowConfig(false)}
            />
          )}
        </div>
      )}
    </div>
    
    {/* AI Assistant Widget */}
    <IntegrationsAIWidget screen="provider" />
  </>
  );
}
