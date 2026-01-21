'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TestTube, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { IntegrationEventType, IntegrationConfigData, EmailRecipient } from '@/lib/integrations/integration-types';
import { EVENT_LABELS } from '@/lib/integrations/integration-types';

interface EmailConfigProps {
  config?: IntegrationConfigData;
  onSave: (config: IntegrationConfigData & { type: 'email'; name: string }) => Promise<void>;
  onTest: (config: IntegrationConfigData & { type: 'email' }) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

function EmailConfigInner({ config, onSave, onTest, onClose }: EmailConfigProps) {
  const [name, setName] = useState('Email');
  const [smtpHost, setSmtpHost] = useState(config?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(config?.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(config?.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState(config?.smtpPassword || '');
  const [fromEmail, setFromEmail] = useState(config?.fromEmail || '');
  const [fromName, setFromName] = useState(config?.fromName || '');
  const [recipients, setRecipients] = useState<{ email: string; name: string }[]>(
    config?.recipients?.map((r) => ({ email: r.email, name: r.name || '' })) || [{ email: '', name: '' }]
  );
  const [events, setEvents] = useState<IntegrationEventType[]>(config?.events || []);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddRecipient = () => {
    setRecipients([...recipients, { email: '', name: '' }]);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

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
        type: 'email',
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        recipients: recipients.filter((r) => r.email).map((r) => ({ ...r, events })),
        events,
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
        type: 'email',
        name,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        recipients: recipients.filter((r) => r.email).map((r) => ({ ...r, events })),
        events,
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
            <span className="text-3xl">📧</span>
            <div>
              <h2 className="text-xl font-semibold text-white">Configurar Email</h2>
              <p className="text-white/50 text-sm">Receba notificações por email</p>
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
          {/* SMTP Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Host SMTP</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Porta</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="587"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Usuário SMTP</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Senha</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Email Remetente</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@example.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Nome Remetente</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="AuraCore Strategic"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
                  rounded-xl text-white placeholder:text-white/30
                  focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Destinatários</label>
            <div className="space-y-2">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={recipient.email}
                    onChange={(e) => {
                      const newRecipients = [...recipients];
                      newRecipients[index].email = e.target.value;
                      setRecipients(newRecipients);
                    }}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 
                      rounded-lg text-white placeholder:text-white/30 text-sm
                      focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => {
                      const newRecipients = [...recipients];
                      newRecipients[index].name = e.target.value;
                      setRecipients(newRecipients);
                    }}
                    placeholder="Nome (opcional)"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 
                      rounded-lg text-white placeholder:text-white/30 text-sm
                      focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleRemoveRecipient(index)}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddRecipient}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                <Plus size={14} />
                Adicionar Destinatário
              </button>
            </div>
          </div>

          {/* Events */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Eventos</label>
            <div className="grid grid-cols-2 gap-2 p-4 bg-white/5 rounded-xl max-h-40 overflow-y-auto">
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
            disabled={!smtpHost || isTesting}
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
            disabled={!smtpHost || events.length === 0 || isSaving}
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

export const EmailConfig = memo(EmailConfigInner);
