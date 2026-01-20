'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export type Frequency = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleConfig {
  frequency: Frequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  includePdf: boolean;
  sendCopy: boolean;
}

interface Props {
  config: ScheduleConfig;
  onChange: (updates: Partial<ScheduleConfig>) => void;
}

const frequencies = [
  { value: 'manual', label: 'Manual', description: 'Gerar sob demanda' },
  { value: 'daily', label: 'Diário', description: 'Todo dia' },
  { value: 'weekly', label: 'Semanal', description: 'Uma vez por semana' },
  { value: 'monthly', label: 'Mensal', description: 'Uma vez por mês' },
];

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export function ReportScheduler({ config, onChange }: Props) {
  const [newEmail, setNewEmail] = useState('');

  const addRecipient = () => {
    const trimmedEmail = newEmail.trim();
    if (trimmedEmail && !config.recipients.includes(trimmedEmail)) {
      onChange({ recipients: [...config.recipients, trimmedEmail] });
      setNewEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    onChange({ recipients: config.recipients.filter(r => r !== email) });
  };

  return (
    <div className="space-y-6">
      {/* Frequency */}
      <div>
        <label className="text-white/60 text-sm mb-2 block">Frequência</label>
        <div className="grid grid-cols-4 gap-3">
          {frequencies.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => onChange({ frequency: value as Frequency })}
              className={`p-4 rounded-xl border text-center transition-all
                ${config.frequency === value
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
            >
              <p className="text-white font-medium text-sm">{label}</p>
              <p className="text-white/40 text-xs mt-1">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Day & Time */}
      {config.frequency !== 'manual' && (
        <div className="grid grid-cols-2 gap-4">
          {config.frequency === 'weekly' && (
            <div>
              <label className="text-white/60 text-sm mb-2 block">Dia da Semana</label>
              <select
                value={config.dayOfWeek ?? 1}
                onChange={(e) => onChange({ dayOfWeek: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                  text-white focus:outline-none focus:border-purple-500/50"
              >
                {daysOfWeek.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-gray-900">{label}</option>
                ))}
              </select>
            </div>
          )}

          {config.frequency === 'monthly' && (
            <div>
              <label className="text-white/60 text-sm mb-2 block">Dia do Mês</label>
              <select
                value={config.dayOfMonth ?? 1}
                onChange={(e) => onChange({ dayOfMonth: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                  text-white focus:outline-none focus:border-purple-500/50"
              >
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-gray-900">{i + 1}</option>
                ))}
                <option value={-1} className="bg-gray-900">Último dia</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-white/60 text-sm mb-2 block">Horário</label>
            <input
              type="time"
              value={config.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      )}

      {/* Recipients */}
      {config.frequency !== 'manual' && (
        <div>
          <label className="text-white/60 text-sm mb-2 block">Destinatários</label>
          
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@empresa.com"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={addRecipient}
              className="px-4 py-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {config.recipients.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5"
              >
                <span className="text-white text-sm">👤 {email}</span>
                <button
                  onClick={() => removeRecipient(email)}
                  className="text-white/40 hover:text-red-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {config.recipients.length === 0 && (
              <p className="text-white/40 text-sm text-center py-2">
                Nenhum destinatário adicionado
              </p>
            )}
          </div>

          {/* Options */}
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.sendCopy}
                onChange={(e) => onChange({ sendCopy: e.target.checked })}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 
                  focus:ring-purple-500"
              />
              <span className="text-white text-sm">Enviar cópia para mim</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includePdf}
                onChange={(e) => onChange({ includePdf: e.target.checked })}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 
                  focus:ring-purple-500"
              />
              <span className="text-white text-sm">Incluir anexo PDF</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
