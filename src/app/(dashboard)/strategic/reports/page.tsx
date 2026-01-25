'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Calendar, History, Loader2 } from 'lucide-react';
import { ReportCard, type Report } from '@/components/strategic/ReportCard';
import { ReportBuilder, type ReportConfig } from '@/components/strategic/ReportBuilder';
import { ReportHistory } from '@/components/strategic/ReportHistory';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';

type TabType = 'reports' | 'scheduled' | 'history';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const data = await fetchAPI<{ reports: Report[] }>('/api/strategic/reports');
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const scheduledReports = reports.filter(r => r.frequency !== 'manual' && r.isActive);

  const handleSave = async (config: ReportConfig & { generateNow?: boolean }) => {
    const isEditing = !!editingReport;
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing 
      ? `/api/strategic/reports/${editingReport.id}` 
      : '/api/strategic/reports';

    // FIX Bug 6: Capturar o ID ANTES de qualquer operação que possa limpar editingReport
    const existingReportId = editingReport?.id;

    try {
      const result = await fetchAPI<{ id: string }>(url, {
        method,
        body: config,
      });
      
      // FIX Bug 6: Usar o ID da resposta OU o ID existente (capturado antes)
      const reportId = result.id || existingReportId;
      
      await fetchReports();
      toast.success(isEditing ? 'Relatório atualizado' : 'Relatório criado');

      // FIX Bug 6: Validar ID antes de chamar generate
      if (config.generateNow && reportId) {
        toast.info('Gerando relatório...');
        try {
          await fetchAPI(`/api/strategic/reports/${reportId}/generate`, {
            method: 'POST',
            body: config,
          });
          toast.success('Relatório gerado e enviado!');
        } catch {
          toast.error('Erro ao gerar relatório');
        }
      } else if (config.generateNow && !reportId) {
        toast.error('ID do relatório inválido para geração');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Erro ao salvar relatório');
      throw error;
    }
  };

  const handleGenerate = async (id: string) => {
    // FIX Bug 6: Validar ID antes de chamar API
    if (!id || id === 'undefined') {
      toast.error('ID do relatório inválido');
      return;
    }

    toast.info('Gerando relatório...');
    try {
      await fetchAPI(`/api/strategic/reports/${id}/generate`, { method: 'POST' });
      toast.success('Relatório gerado!');
      await fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    }
  };

  const handleEdit = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (report) {
      setEditingReport(report);
      setShowBuilder(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este relatório?')) return;
    
    try {
      await fetchAPI(`/api/strategic/reports/${id}`, { method: 'DELETE' });
      await fetchReports();
      toast.success('Relatório excluído');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Erro ao excluir relatório');
    }
  };

  const handleOpenBuilder = () => {
    setEditingReport(null);
    setShowBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setEditingReport(null);
  };

  const tabs = [
    { id: 'reports' as const, label: 'Meus Relatórios', icon: FileText },
    { id: 'scheduled' as const, label: 'Agendados', icon: Calendar },
    { id: 'history' as const, label: 'Histórico', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="text-purple-400" />
            Relatórios
          </h1>
          <p className="text-white/60 mt-1 text-sm lg:text-base">
            Gere e agende relatórios automáticos
          </p>
        </div>

        <button
          onClick={handleOpenBuilder}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white 
            hover:bg-purple-600 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Novo Relatório
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm
              ${activeTab === id
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'reports' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onGenerate={handleGenerate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {reports.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">Nenhum relatório criado</p>
                  <button
                    onClick={handleOpenBuilder}
                    className="mt-4 px-4 py-2 rounded-xl bg-purple-500 text-white transition-colors hover:bg-purple-600"
                  >
                    Criar Primeiro Relatório
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'scheduled' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">⏰ Próximos Agendamentos</h2>
              
              {scheduledReports.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">Nenhum relatório agendado</p>
                  <p className="text-white/30 text-sm mt-1">
                    Crie um relatório com frequência automática
                  </p>
                </div>
              ) : (
                scheduledReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">
                        {report.type === 'executive' ? '📈' : 
                         report.type === 'bsc' ? '🎯' : 
                         report.type === 'actions' ? '✅' : '📊'}
                      </span>
                      <div>
                        <p className="text-white font-medium">{report.name}</p>
                        <p className="text-white/50 text-sm">
                          {report.recipients.length} destinatário(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {report.nextRun && (
                        <p className="text-white">
                          {new Date(report.nextRun).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      <p className="text-white/50 text-sm capitalize">{report.frequency}</p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ReportHistory />
            </motion.div>
          )}
        </>
      )}

      {/* Builder Modal */}
      <ReportBuilder
        isOpen={showBuilder}
        onClose={handleCloseBuilder}
        onSave={handleSave}
        initialConfig={editingReport ? {
          name: editingReport.name,
          type: editingReport.type,
          frequency: editingReport.frequency,
          recipients: editingReport.recipients,
        } : undefined}
      />
    </div>
  );
}
