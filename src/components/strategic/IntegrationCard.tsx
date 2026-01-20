'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, TestTube, FileText, Pause, Play, 
  MoreHorizontal, Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type IntegrationType = 'slack' | 'teams' | 'email' | 'webhook' | 'push';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  description?: string;
  config: {
    channel?: string;
    webhookUrl?: string;
    events: string[];
  };
  isActive: boolean;
  lastSyncAt?: Date | string;
  stats: {
    totalSent: number;
    successRate: number;
  };
}

interface Props {
  integration: Integration;
  onConfigure: (id: string) => void;
  onTest: (id: string) => void;
  onLogs: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const integrationConfig: Record<IntegrationType, { icon: string; color: string; label: string }> = {
  slack: { icon: '💬', color: 'green', label: 'Slack' },
  teams: { icon: '🔷', color: 'blue', label: 'Microsoft Teams' },
  email: { icon: '📧', color: 'purple', label: 'Email' },
  webhook: { icon: '🌐', color: 'orange', label: 'Webhook' },
  push: { icon: '🔔', color: 'pink', label: 'Push Notification' },
};

export function IntegrationCard({
  integration,
  onConfigure,
  onTest,
  onLogs,
  onToggle,
  onDelete,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const config = integrationConfig[integration.type];

  const lastSync = integration.lastSyncAt 
    ? formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl border transition-all ${
        integration.isActive 
          ? 'bg-white/5 border-white/10 hover:border-purple-500/30' 
          : 'bg-white/2 border-white/5 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-${config.color}-500/20 text-2xl`}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">{config.label}</h3>
              {integration.name !== config.label && (
                <span className="text-white/50 text-sm">({integration.name})</span>
              )}
            </div>
            {integration.config.channel && (
              <p className="text-white/50 text-sm">Canal: {integration.config.channel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
            integration.isActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              integration.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`} />
            {integration.isActive ? 'Ativo' : 'Pausado'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-4 text-sm">
        <div>
          <span className="text-white/40">Última sync:</span>
          <span className="text-white ml-2">{lastSync}</span>
        </div>
        <div>
          <span className="text-white/40">Enviados:</span>
          <span className="text-white ml-2">{integration.stats.totalSent}</span>
        </div>
        <div>
          <span className="text-white/40">Sucesso:</span>
          <span className={`ml-2 ${
            integration.stats.successRate >= 95 ? 'text-green-400' : 
            integration.stats.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {integration.stats.successRate}%
          </span>
        </div>
      </div>

      {/* Events */}
      <div className="flex flex-wrap gap-2 mb-4">
        {integration.config.events.slice(0, 4).map((event) => (
          <span
            key={event}
            className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs"
          >
            {event}
          </span>
        ))}
        {integration.config.events.length > 4 && (
          <span className="px-2 py-1 rounded-lg bg-white/10 text-white/40 text-xs">
            +{integration.config.events.length - 4} mais
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfigure(integration.id)}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 
            hover:bg-white/20 text-sm flex items-center gap-1.5"
        >
          <Settings size={14} /> Configurar
        </button>
        <button
          onClick={() => onTest(integration.id)}
          className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 
            hover:bg-purple-500/30 text-sm flex items-center gap-1.5"
        >
          <TestTube size={14} /> Testar
        </button>
        <button
          onClick={() => onLogs(integration.id)}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 
            hover:bg-white/20 text-sm flex items-center gap-1.5"
        >
          <FileText size={14} /> Logs
        </button>
        <button
          onClick={() => onToggle(integration.id)}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${
            integration.isActive 
              ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' 
              : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
          }`}
        >
          {integration.isActive ? <Pause size={14} /> : <Play size={14} />}
          {integration.isActive ? 'Pausar' : 'Ativar'}
        </button>

        {/* More Menu */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl 
                bg-gray-800 border border-white/10 shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { onDelete(integration.id); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 
                    hover:bg-red-500/10 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
