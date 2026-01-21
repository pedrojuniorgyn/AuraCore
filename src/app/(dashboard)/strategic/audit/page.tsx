'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Table, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditTimeline, AuditFilters } from '@/components/strategic/audit';
import type { AuditLog } from '@/lib/audit/audit-types';

type ViewMode = 'timeline' | 'table';

export default function AuditPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { logs, total, isLoading, hasMore, filter, setFilter, loadMore, exportLogs, restoreEntity } =
    useAuditLogs();

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const handleRestore = async (log: AuditLog) => {
    if (!confirm('Tem certeza que deseja restaurar este item?')) return;

    try {
      await restoreEntity(log.entityType, log.entityId);
      toast.success('Item restaurado com sucesso!');
    } catch {
      toast.error('Erro ao restaurar item');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportLogs('xlsx');
      toast.success('Exportação concluída!');
    } catch {
      toast.error('Erro ao exportar logs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <History className="text-purple-400" />
          Registro de Auditoria
        </h1>
        <p className="text-white/60 mt-1">
          Histórico completo de alterações no módulo Strategic
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-white/60 text-sm">Total de Registros</div>
          <div className="text-2xl font-bold text-white mt-1">{total}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-white/60 text-sm">Hoje</div>
          <div className="text-2xl font-bold text-white mt-1">
            {logs.filter((l) => {
              const today = new Date();
              const logDate = new Date(l.createdAt);
              return logDate.toDateString() === today.toDateString();
            }).length}
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-white/60 text-sm">Esta Semana</div>
          <div className="text-2xl font-bold text-white mt-1">
            {logs.filter((l) => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(l.createdAt) >= weekAgo;
            }).length}
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="text-white/60 text-sm">Alterações</div>
          <div className="text-2xl font-bold text-white mt-1">
            {logs.filter((l) => l.action === 'update').length}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <AuditFilters
          filter={filter}
          onFilterChange={setFilter}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </motion.div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${viewMode === 'timeline' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <Clock size={18} />
          Timeline
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
          <Table size={18} />
          Tabela
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 rounded-2xl border border-white/10 p-6"
      >
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-purple-400" />
          </div>
        ) : viewMode === 'timeline' ? (
          <AuditTimeline logs={logs} onViewDetails={handleViewDetails} onRestore={handleRestore} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Data</th>
                  <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Entidade</th>
                  <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Ação</th>
                  <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleViewDetails(log)}
                  >
                    <td className="py-3 px-4 text-white/70 text-sm">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-white">{log.userName}</td>
                    <td className="py-3 px-4 text-white/80">{log.entityName}</td>
                    <td className="py-3 px-4 text-white/70">{log.action}</td>
                    <td className="py-3 px-4 text-white/50">
                      {log.changes?.length || 0} alterações
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full mt-6 py-3 text-center text-purple-400 hover:text-purple-300 
              hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}

        {logs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <History size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/60">Nenhum registro de auditoria encontrado</p>
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      {selectedLog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-auto"
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Detalhes do Registro</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-sm">Usuário</p>
                  <p className="text-white">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Data/Hora</p>
                  <p className="text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Entidade</p>
                  <p className="text-white">{selectedLog.entityName}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Ação</p>
                  <p className="text-white">{selectedLog.action}</p>
                </div>
              </div>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <p className="text-white/40 text-sm mb-2">Alterações</p>
                  <div className="space-y-2 bg-white/5 p-4 rounded-xl">
                    {selectedLog.changes.map((change, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-white/60">{change.field}:</span>
                        <span className="text-red-400">
                          {String(change.previousValue || '(vazio)')}
                        </span>
                        <span className="text-white/40">→</span>
                        <span className="text-green-400">
                          {String(change.newValue || '(vazio)')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.reason && (
                <div>
                  <p className="text-white/40 text-sm">Motivo</p>
                  <p className="text-white italic">&quot;{selectedLog.reason}&quot;</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
