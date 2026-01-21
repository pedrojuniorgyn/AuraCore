'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { integrationService } from '@/lib/integrations/integration-service';
import type { Webhook, IntegrationEventType } from '@/lib/integrations/integration-types';
import { EVENT_LABELS } from '@/lib/integrations/integration-types';

interface WebhookBuilderProps {
  webhook?: Webhook;
  onSave: (webhook: Partial<Webhook>) => Promise<void>;
  onCancel: () => void;
}

function WebhookBuilderInner({ webhook, onSave, onCancel }: WebhookBuilderProps) {
  const [name, setName] = useState(webhook?.name || '');
  const [url, setUrl] = useState(webhook?.url || '');
  const [method, setMethod] = useState<'POST' | 'PUT'>(webhook?.method || 'POST');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    webhook?.headers
      ? Object.entries(webhook.headers).map(([key, value]) => ({ key, value }))
      : [{ key: 'Authorization', value: '' }]
  );
  const [events, setEvents] = useState<IntegrationEventType[]>(webhook?.events || []);
  const [retryPolicy, setRetryPolicy] = useState<'none' | '3' | '5'>(webhook?.retryPolicy || '3');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [previewEvent, setPreviewEvent] = useState<IntegrationEventType>('kpi.critical');

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
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
      const payload = integrationService.generatePayloadPreview(previewEvent);
      const response = await fetch(url, {
        method,
        headers: Object.fromEntries(
          headers.filter((h) => h.key).map((h) => [h.key, h.value])
        ),
        body: JSON.stringify(payload),
      });

      setTestResult({
        success: response.ok,
        message: response.ok
          ? `Sucesso! Status: ${response.status}`
          : `Erro: ${response.status} ${response.statusText}`,
      });
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
        id: webhook?.id,
        name,
        url,
        method,
        headers: Object.fromEntries(
          headers.filter((h) => h.key).map((h) => [h.key, h.value])
        ),
        events,
        retryPolicy,
        isActive: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const payload = integrationService.generatePayloadPreview(previewEvent);

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: KPI Alert to External System"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
            rounded-xl text-white placeholder:text-white/30
            focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* URL */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">URL de Destino</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/webhooks"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 
            rounded-xl text-white placeholder:text-white/30
            focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Method */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Método HTTP</label>
        <div className="flex gap-4">
          {(['POST', 'PUT'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="w-4 h-4 text-purple-500"
              />
              <span className="text-white">{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Eventos que disparam</label>
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

      {/* Headers */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Headers Customizados</label>
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={header.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].key = e.target.value;
                  setHeaders(newHeaders);
                }}
                placeholder="Header name"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 text-sm
                  focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={header.value}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].value = e.target.value;
                  setHeaders(newHeaders);
                }}
                placeholder="Value"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 text-sm
                  focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => handleRemoveHeader(index)}
                className="p-2 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddHeader}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
          >
            <Plus size={14} />
            Adicionar Header
          </button>
        </div>
      </div>

      {/* Payload Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/60 text-sm">Payload Preview</label>
          <select
            value={previewEvent}
            onChange={(e) => setPreviewEvent(e.target.value as IntegrationEventType)}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg 
              text-white text-xs focus:outline-none"
          >
            {(events.length > 0 ? events : (['kpi.critical'] as IntegrationEventType[])).map(
              (event) => (
                <option key={event} value={event} className="bg-gray-900">
                  {EVENT_LABELS[event]}
                </option>
              )
            )}
          </select>
        </div>
        <div className="p-4 bg-gray-950 rounded-xl border border-white/10 overflow-auto max-h-48">
          <pre className="text-green-400 text-xs">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>

      {/* Retry Policy */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Política de Retry</label>
        <div className="flex gap-4">
          {(
            [
              { value: 'none', label: 'Nenhum' },
              { value: '3', label: '3 tentativas' },
              { value: '5', label: '5 tentativas' },
            ] as const
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={retryPolicy === option.value}
                onChange={() => setRetryPolicy(option.value)}
                className="w-4 h-4 text-purple-500"
              />
              <span className="text-white">{option.label}</span>
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

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button
          onClick={handleTest}
          disabled={!url || isTesting}
          className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
            hover:bg-white/10 transition-colors disabled:opacity-50
            flex items-center gap-2"
        >
          <Play size={16} />
          {isTesting ? 'Testando...' : 'Testar Webhook'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 text-white/70 
            hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !url || events.length === 0 || isSaving}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white 
            hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

export const WebhookBuilder = memo(WebhookBuilderInner);
