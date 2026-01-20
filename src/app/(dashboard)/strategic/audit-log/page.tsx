"use client";

/**
 * Página de Histórico de Alterações (Audit Log)
 * 
 * @module app/(dashboard)/strategic/audit-log
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { History, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AuditLogFilters, type AuditFilters } from '@/components/strategic/AuditLogFilters';
import { AuditLogTable } from '@/components/strategic/AuditLogTable';
import { AuditLogDetail, type AuditEntry } from '@/components/strategic/AuditLogDetail';
import { toast } from 'sonner';

interface AuditLogData {
  users: { id: string; name: string }[];
  entries: AuditEntry[];
  totalItems: number;
  totalPages: number;
  page: number;
}

const DEFAULT_FILTERS: AuditFilters = {
  search: '',
  actions: [],
  entityTypes: [],
  userId: '',
  dateFrom: '',
  dateTo: '',
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: String(page),
        search: filters.search,
        actions: filters.actions.join(','),
        entityTypes: filters.entityTypes.join(','),
        userId: filters.userId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

      const response = await fetch(`/api/strategic/audit-log?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams({
        search: filters.search,
        actions: filters.actions.join(','),
        entityTypes: filters.entityTypes.join(','),
        userId: filters.userId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

      const response = await fetch(`/api/strategic/audit-log/export?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erro ao exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Exportação concluída!');
    } catch (err) {
      toast.error('Erro ao exportar histórico');
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchData}
              className="px-6 py-3 rounded-xl bg-purple-500 text-white flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 -m-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="text-purple-400" />
            Histórico de Alterações
          </h1>
          <p className="text-white/60 mt-1">
            Rastreie todas as mudanças no módulo estratégico
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
            text-white flex items-center gap-2 hover:bg-white/20 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Exportar
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <AuditLogFilters
          filters={filters}
          onChange={handleFiltersChange}
          users={data?.users || []}
        />
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <AuditLogTable
            entries={data?.entries || []}
            page={page}
            totalPages={data?.totalPages || 1}
            totalItems={data?.totalItems || 0}
            onPageChange={setPage}
            onViewDetail={setSelectedEntry}
          />
        )}
      </motion.div>

      {/* Detail Modal */}
      <AuditLogDetail
        entry={selectedEntry}
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
