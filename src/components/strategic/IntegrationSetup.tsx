'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TestTube, Save, Loader2, Check, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { IntegrationType } from './IntegrationCard';

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  webhookUrl: string;
  channel?: string;
  events: string[];
  messageFormat: 'compact' | 'detailed' | 'rich';
  headers?: Record<string, string>;
  payloadTemplate?: string;
  secretToken?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: IntegrationConfig) => Promise<void>;
  onTest: (config: IntegrationConfig) => Promise<{ success: boolean; message: string }>;
  initialConfig?: Partial<IntegrationConfig>;
  integrationType: IntegrationType;
}

const eventOptions = [
  { id: 'kpi.critical', label: 'Alerta crítico disparado', default: true },
  { id: 'kpi.target_reached', label: 'KPI atingiu meta', default: true },
  { id: 'action.overdue', label: 'Plano de ação atrasado', default: true },
  { id: 'action.completed', label: 'Plano de ação concluído', default: false },
  { id: 'achievement.unlocked', label: 'Nova conquista desbloqueada', default: true },
  { id: 'comment.mention', label: 'Comentário em plano que participo', default: false },
  { id: 'report.generated', label: 'Relatório gerado', default: false },
  { id: 'status.changed', label: 'Mudança de status em plano', default: false },
];

const integrationInfo: Record<IntegrationType, { 
  title: string; 
  description: string; 
  helpUrl: string;
  placeholder: string;
  icon: string;
}> = {
  slack: {
    title: 'Slack',
    description: 'Receba notificações em tempo real no seu workspace',
    helpUrl: 'https://api.slack.com/messaging/webhooks',
    placeholder: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXX',
    icon: '💬',
  },
  teams: {
    title: 'Microsoft Teams',
    description: 'Envie notificações para canais do Teams',
    helpUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors',
    placeholder: 'https://outlook.office.com/webhook/...',
    icon: '🔷',
  },
  email: {
    title: 'Email',
    description: 'Configure notificações por email',
    helpUrl: '',
    placeholder: 'email@exemplo.com',
    icon: '📧',
  },
  webhook: {
    title: 'Webhook Customizado',
    description: 'Envie dados para qualquer endpoint HTTP',
    helpUrl: '',
    placeholder: 'https://api.meusistema.com/webhook',
    icon: '🌐',
  },
  push: {
    title: 'Push Notification',
    description: 'Notificações no navegador',
    helpUrl: '',
    placeholder: '',
    icon: '🔔',
  },
};

export function IntegrationSetup({ 
  isOpen, 
  onClose, 
  onSave, 
  onTest, 
  initialConfig,
  integrationType,
}: Props) {
  const info = integrationInfo[integrationType];
  
  const [config, setConfig] = useState<IntegrationConfig>({
    type: integrationType,
    name: info.title,
    webhookUrl: '',
    channel: '',
    events: eventOptions.filter(e => e.default).map(e => e.id),
    messageFormat: 'detailed',
    headers: {},
    payloadTemplate: integrationType === 'webhook' ? `{
  "event": "{{event_type}}",
  "data": {{event_data}},
  "timestamp": "{{timestamp}}"
}` : undefined,
    secretToken: '',
    ...initialConfig,
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const updateConfig = (updates: Partial<IntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setTestResult(null);
  };

  const toggleEvent = (eventId: string) => {
    setConfig(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const generateToken = () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    updateConfig({ secretToken: token });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(config);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Erro ao testar conexão' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {info.icon}
                      {info.title}
                    </h2>
                    <p className="text-white/50 text-sm mt-1">{info.description}</p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Name */}
                {integrationType === 'webhook' && (
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Nome da integração *</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => updateConfig({ name: e.target.value })}
                      placeholder="Meu Sistema"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                        text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}

                {/* Webhook URL */}
                <div>
                  <label className="text-white/60 text-sm mb-2 block">
                    {integrationType === 'email' ? 'Email *' : 'Webhook URL *'}
                  </label>
                  <input
                    type={integrationType === 'email' ? 'email' : 'url'}
                    value={config.webhookUrl}
                    onChange={(e) => updateConfig({ webhookUrl: e.target.value })}
                    placeholder={info.placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                      text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                  {info.helpUrl && (
                    <a
                      href={info.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 text-xs mt-2 inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink size={12} /> Como criar um webhook
                    </a>
                  )}
                </div>

                {/* Channel (Slack/Teams) */}
                {(integrationType === 'slack' || integrationType === 'teams') && (
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Canal</label>
                    <input
                      type="text"
                      value={config.channel}
                      onChange={(e) => updateConfig({ channel: e.target.value })}
                      placeholder="#estrategia"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                        text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}

                {/* Webhook Custom - Headers & Payload */}
                {integrationType === 'webhook' && (
                  <>
                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Headers (JSON)</label>
                      <textarea
                        value={JSON.stringify(config.headers, null, 2)}
                        onChange={(e) => {
                          try {
                            updateConfig({ headers: JSON.parse(e.target.value) });
                          } catch {
                            // Ignore invalid JSON while typing
                          }
                        }}
                        placeholder='{"Authorization": "Bearer token"}'
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                          text-white placeholder-white/30 font-mono text-sm resize-none 
                          focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Payload Template (JSON)</label>
                      <textarea
                        value={config.payloadTemplate}
                        onChange={(e) => updateConfig({ payloadTemplate: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                          text-white font-mono text-sm resize-none 
                          focus:outline-none focus:border-purple-500/50"
                      />
                      <p className="text-white/40 text-xs mt-2">
                        Variáveis: {'{{event_type}}'}, {'{{event_data}}'}, {'{{timestamp}}'}
                      </p>
                    </div>

                    <div>
                      <label className="text-white/60 text-sm mb-2 block">Secret Token (HMAC)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={config.secretToken}
                            onChange={(e) => updateConfig({ secretToken: e.target.value })}
                            placeholder="Token para validação de assinatura"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                              text-white placeholder-white/30 font-mono text-sm
                              focus:outline-none focus:border-purple-500/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                          >
                            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={generateToken}
                          className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20"
                          title="Gerar token"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Events */}
                <div>
                  <label className="text-white/60 text-sm mb-3 block">Notificar quando:</label>
                  <div className="space-y-2">
                    {eventOptions.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 
                          hover:bg-white/10 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={config.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="w-5 h-5 rounded border-white/20 bg-white/10 
                            text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message Format (Slack/Teams) */}
                {(integrationType === 'slack' || integrationType === 'teams') && (
                  <div>
                    <label className="text-white/60 text-sm mb-3 block">Formato da mensagem</label>
                    <div className="space-y-2">
                      {[
                        { value: 'compact', label: 'Compacto', desc: 'Apenas título' },
                        { value: 'detailed', label: 'Detalhado', desc: 'Título + descrição + link' },
                        { value: 'rich', label: 'Rico', desc: 'Com gráficos e métricas' },
                      ].map((fmt) => (
                        <label
                          key={fmt.value}
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border
                            ${config.messageFormat === fmt.value
                              ? 'bg-purple-500/20 border-purple-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                          <input
                            type="radio"
                            name="messageFormat"
                            value={fmt.value}
                            checked={config.messageFormat === fmt.value}
                            onChange={(e) => updateConfig({ messageFormat: e.target.value as IntegrationConfig['messageFormat'] })}
                            className="w-5 h-5 text-purple-500"
                          />
                          <div>
                            <span className="text-white font-medium">{fmt.label}</span>
                            <span className="text-white/40 text-sm ml-2">{fmt.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Result */}
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      testResult.success 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Check className="text-green-400" size={18} />
                      ) : (
                        <X className="text-red-400" size={18} />
                      )}
                      <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                        {testResult.message}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                >
                  Cancelar
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handleTest}
                    disabled={!config.webhookUrl || isTesting}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white 
                      hover:bg-white/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTesting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <TestTube size={16} />
                    )}
                    Testar Conexão
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!config.webhookUrl || config.events.length === 0 || isSaving}
                    className="px-4 py-2 rounded-xl bg-purple-500 text-white 
                      hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
