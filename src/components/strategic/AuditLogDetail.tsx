"use client";

/**
 * AuditLogDetail - Modal com detalhes de uma entrada de audit
 * 
 * @module components/strategic
 */
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, FileText, Globe, Monitor } from 'lucide-react';
import { ChangesDiff, type Change } from './ChangesDiff';

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  user: { id: string; name: string; avatar?: string };
  changes: Change[];
  metadata: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date | string;
}

interface Props {
  entry: AuditEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, { label: string; icon: string; colorClass: string }> = {
  CREATE: { label: 'Criado', icon: '➕', colorClass: 'text-green-400' },
  UPDATE: { label: 'Editado', icon: '✏️', colorClass: 'text-blue-400' },
  DELETE: { label: 'Excluído', icon: '🗑️', colorClass: 'text-red-400' },
  COMMENT: { label: 'Comentado', icon: '💬', colorClass: 'text-purple-400' },
  STATUS_CHANGE: { label: 'Status alterado', icon: '🔄', colorClass: 'text-orange-400' },
  AUTO: { label: 'Atualização automática', icon: '🤖', colorClass: 'text-gray-400' },
};

const ENTITY_LABELS: Record<string, string> = {
  'action-plan': 'Plano de Ação',
  'kpi': 'KPI',
  'pdca': 'Ciclo PDCA',
  'goal': 'Objetivo',
  'swot': 'Item SWOT',
  'task': 'Tarefa',
};

export function AuditLogDetail({ entry, isOpen, onClose }: Props) {
  if (!entry) return null;

  const actionConfig = ACTION_LABELS[entry.action] || ACTION_LABELS.UPDATE;
  const formattedDate = format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
              shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                      <FileText size={14} />
                      {ENTITY_LABELS[entry.entityType] || entry.entityType}
                    </div>
                    <h2 className="text-xl font-bold text-white">{entry.entityTitle}</h2>
                    <p className="text-white/60 mt-1 flex items-center gap-2">
                      <span>{actionConfig.icon}</span>
                      <span className={actionConfig.colorClass}>{actionConfig.label}</span>
                      <span>por {entry.user.name} em {formattedDate}</span>
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Changes */}
              <div className="p-6">
                <h3 className="text-white font-bold mb-4">Alterações</h3>
                <ChangesDiff changes={entry.changes} />
              </div>

              {/* Metadata */}
              {(entry.metadata.ip || entry.metadata.userAgent) && (
                <div className="px-6 pb-6">
                  <div className="p-4 rounded-xl bg-white/5 flex items-center gap-6 text-sm text-white/50">
                    {entry.metadata.ip && (
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        IP: {entry.metadata.ip}
                      </div>
                    )}
                    {entry.metadata.userAgent && (
                      <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        {entry.metadata.userAgent}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
