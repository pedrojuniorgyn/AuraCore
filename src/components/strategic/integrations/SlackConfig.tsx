'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TestTube, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { IntegrationEventType, IntegrationConfigData } from '@/lib/integrations/integration-types';
import { EVENT_LABELS, EVENT_CATEGORIES } from '@/lib/integrations/integration-types';

interface SlackConfigProps {
  config?: IntegrationConfigData;
  onSave: (config: IntegrationConfigData & { type: 'slack'; name: string }) => Promise<void>;
  onTest: (config: IntegrationConfigData & { type: 'slack' }) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

function SlackConfigInner({ config, onSave, onTest, onClose }: SlackConfigProps) {
  const [name, setName] = useState(config?.workspaceName || 'Slack');
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl || '');
  const [channel, setChannel] = useState(config?.channel || '');
  const [events, setEvents] = useState<IntegrationEventType[]>(config?.events || []);
  const [messageFormat, setMessageFormat] = useState<'compact' | 'detailed' | 'rich'>(
    config?.messageFormat || 'detailed'
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleEvent = (event: IntegrationEventType) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSelectAllCategory = (category: keyof typeof EVENT_CATEGORIES) => {
    const categoryEvents = EVENT_CATEGORIES[category];
    const allSelected = categoryEvents.every((e) => events.includes(e));
    if (allSelected) {
      setEvents((prev) => prev.filter((e) => !categoryEvents.includes(e)));
    } else {
      setEvents((prev) => [...new Set([...prev, ...categoryEvents])]);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTest({
        type: 'slack',
        webhookUrl,
        channel,
        events,
        messageFormat,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        type: 'slack',
        name,
        webhookUrl,
        channel,
        events,
        messageFormat,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <h2 className="text-xl font-semibold text-white">Configurar Slack</h2>
              <p className="text-white/50 text-sm">Receba notificações em canais do Slack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Nome da Integração</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Slack - Estratégia"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
            <p className="text-white/40 text-xs mt-1">
              Crie um Incoming Webhook no Slack Apps
            </p>
          </div>

          {/* Channel */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Canal (opcional)</label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#estrategia"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Events */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Eventos</label>
            <div className="space-y-4 p-4 bg-white/5 rounded-xl">
              {Object.entries(EVENT_CATEGORIES).map(([category, categoryEvents]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm capitalize">{category.replace('_', ' ')}</span>
                    <button
                      onClick={() => handleSelectAllCategory(category as keyof typeof EVENT_CATEGORIES)}
                      className="text-purple-400 text-xs hover:text-purple-300"
                    >
                      {categoryEvents.every((e) => events.includes(e)) ? 'Desmarcar' : 'Selecionar'} todos
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryEvents.map((event) => (
                      <label key={event} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={events.includes(event)}
                          onChange={() => handleToggleEvent(event)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 
                            text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white/80 text-sm">{EVENT_LABELS[event]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Format */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Formato da Mensagem</label>
            <div className="flex gap-4">
              {(['compact', 'detailed', 'rich'] as const).map((format) => (
                <label key={format} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={messageFormat === format}
                    onChange={() => setMessageFormat(format)}
                    className="w-4 h-4 text-purple-500"
                  />
                  <span className="text-white capitalize">{format}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3
                ${
                  testResult.success
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
            >
              {testResult.success ? (
                <CheckCircle className="text-green-400" size={20} />
              ) : (
                <AlertCircle className="text-red-400" size={20} />
              )}
              <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                {testResult.message}
              </span>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={handleTest}
            disabled={!webhookUrl || isTesting}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
              hover:bg-white/10 transition-colors disabled:opacity-50
              flex items-center gap-2"
          >
            <TestTube size={16} />
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
              hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!webhookUrl || events.length === 0 || isSaving}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white 
              hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const SlackConfig = memo(SlackConfigInner);
