'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, Calendar, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  reportId: string;
  reportName: string;
  reportType: string;
  generatedAt: string;
  status: 'success' | 'failed' | 'pending';
  pdfUrl?: string;
  emailsSent?: number;
  error?: string;
}

export function ReportHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/strategic/reports/history');
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Failed to fetch report history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusBadge = (status: HistoryEntry['status']) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">Sucesso</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">Falhou</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">Pendente</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'executive': return '📈';
      case 'bsc': return '🎯';
      case 'actions': return '✅';
      case 'kpis': return '📊';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/50">Nenhum relatório gerado ainda</p>
        <p className="text-white/30 text-sm mt-1">
          Os relatórios gerados aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">📜 Histórico de Geração</h2>
      
      <div className="space-y-3">
        {history.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 
              hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{getTypeIcon(entry.reportType)}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{entry.reportName}</p>
                  {getStatusBadge(entry.status)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-white/50 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {format(new Date(entry.generatedAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {format(new Date(entry.generatedAt), "HH:mm", { locale: ptBR })}
                  </span>
                  {entry.emailsSent !== undefined && (
                    <span>{entry.emailsSent} emails enviados</span>
                  )}
                </div>
                {entry.error && (
                  <p className="text-red-400 text-xs mt-1">{entry.error}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {entry.pdfUrl && (
                <>
                  <a
                    href={entry.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/10 text-white/70 
                      hover:bg-white/20 transition-colors"
                    title="Visualizar"
                  >
                    <Eye size={16} />
                  </a>
                  <a
                    href={entry.pdfUrl}
                    download
                    className="p-2 rounded-lg bg-white/10 text-white/70 
                      hover:bg-white/20 transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Time reference */}
      <p className="text-white/30 text-xs text-center mt-4">
        Mostrando últimos 30 dias de histórico
      </p>
    </div>
  );
}
