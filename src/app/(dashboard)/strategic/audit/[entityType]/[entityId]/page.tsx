'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { auditService } from '@/lib/audit/audit-service';
import { EntityHistory, ChangeComparison } from '@/components/strategic/audit';
import type {
  EntityHistory as EntityHistoryType,
  VersionComparison,
  EntityVersion,
  AuditEntityType,
} from '@/lib/audit/audit-types';
import { ENTITY_TYPE_LABELS } from '@/lib/audit/audit-types';

interface PageProps {
  params: Promise<{ entityType: string; entityId: string }>;
}

export default function EntityHistoryPage({ params }: PageProps) {
  const { entityType, entityId } = use(params);

  const [history, setHistory] = useState<EntityHistoryType | null>(null);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<EntityVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [entityType, entityId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getEntityHistory(entityType as AuditEntityType, entityId);
      setHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async (fromVersion: number, toVersion: number) => {
    try {
      const data = await auditService.compareVersions(
        entityType as AuditEntityType,
        entityId,
        fromVersion,
        toVersion
      );
      setComparison(data);
      setSelectedSnapshot(null);
    } catch (error) {
      console.error('Erro ao comparar versões:', error);
    }
  };

  const handleViewSnapshot = (version: EntityVersion) => {
    setSelectedSnapshot(version);
    setComparison(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
        <div className="text-center py-12">
          <History size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">Histórico não encontrado</p>
          <Link href="/strategic/audit" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
            Voltar para Auditoria
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link
          href="/strategic/audit"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft size={18} />
          Voltar para Auditoria
        </Link>

        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <History className="text-purple-400" />
          {history.entityName}
        </h1>
        <p className="text-white/60 mt-1">
          Histórico de alterações - {ENTITY_TYPE_LABELS[entityType as AuditEntityType]}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* History */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-2xl border border-white/10 p-6"
        >
          <EntityHistory
            history={history}
            onViewSnapshot={handleViewSnapshot}
            onCompare={handleCompare}
          />
        </motion.div>

        {/* Detail Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 rounded-2xl border border-white/10 p-6"
        >
          {comparison && (
            <div>
              <h3 className="text-white font-semibold mb-4">Comparação de Versões</h3>
              <ChangeComparison
                comparison={comparison}
                onVersionChange={handleCompare}
                availableVersions={history.versions.map((v) => v.version)}
              />
            </div>
          )}

          {selectedSnapshot && (
            <div>
              <h3 className="text-white font-semibold mb-4">
                Snapshot v{selectedSnapshot.version}
              </h3>
              <div className="space-y-4">
                <div className="text-white/60 text-sm">
                  Por {selectedSnapshot.userName} em{' '}
                  {new Date(selectedSnapshot.createdAt).toLocaleString('pt-BR')}
                </div>
                {selectedSnapshot.reason && (
                  <p className="text-white/40 italic">
                    &quot;{selectedSnapshot.reason}&quot;
                  </p>
                )}
                <pre className="bg-black/20 p-4 rounded-xl text-white/70 text-sm overflow-auto max-h-96">
                  {JSON.stringify(selectedSnapshot.snapshot, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!comparison && !selectedSnapshot && (
            <div className="text-center py-12 text-white/40">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecione versões para comparar ou clique em uma versão para ver o snapshot</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
