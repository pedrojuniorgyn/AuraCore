'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { TestTube, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { IntegrationEventType, IntegrationConfigData } from '@/lib/integrations/integration-types';
import { EVENT_LABELS, EVENT_CATEGORIES } from '@/lib/integrations/integration-types';

interface TeamsConfigProps {
  config?: IntegrationConfigData;
  onSave: (config: IntegrationConfigData & { type: 'teams'; name: string }) => Promise<void>;
  onTest: (config: IntegrationConfigData & { type: 'teams' }) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

function TeamsConfigInner({ config, onSave, onTest, onClose }: TeamsConfigProps) {
  const [name, setName] = useState(config?.teamName || 'Microsoft Teams');
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

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await onTest({
        type: 'teams',
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
        type: 'teams',
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
            <span className="text-3xl">🔷</span>
            <div>
              <h2 className="text-xl font-semibold text-white">Configurar Microsoft Teams</h2>
              <p className="text-white/50 text-sm">Receba notificações em canais do Teams</p>
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
              placeholder="Teams - Gestão Estratégica"
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
              placeholder="https://outlook.office.com/webhook/..."
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
            <p className="text-white/40 text-xs mt-1">
              Crie um Incoming Webhook no canal do Teams
            </p>
          </div>

          {/* Channel */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Canal</label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Gestão Estratégica"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                rounded-xl text-white placeholder:text-white/30
                focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Events */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Eventos</label>
            <div className="grid grid-cols-2 gap-2 p-4 bg-white/5 rounded-xl max-h-48 overflow-y-auto">
              {(Object.keys(EVENT_LABELS) as IntegrationEventType[]).map((event) => (
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

export const TeamsConfig = memo(TeamsConfigInner);
