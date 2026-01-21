'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, ChevronDown, ChevronRight, Eye, GitCompare } from 'lucide-react';
import type { EntityHistory as EntityHistoryType, EntityVersion } from '@/lib/audit/audit-types';

interface EntityHistoryProps {
  history: EntityHistoryType;
  onViewSnapshot: (version: EntityVersion) => void;
  onCompare: (fromVersion: number, toVersion: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function EntityHistoryInner({
  history,
  onViewSnapshot,
  onCompare,
  onLoadMore,
  hasMore,
}: EntityHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<number[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const toggleExpanded = (version: number) => {
    setExpandedVersions((prev) =>
      prev.includes(version) ? prev.filter((v) => v !== version) : [...prev, version]
    );
  };

  const toggleSelected = (version: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(version)) {
        return prev.filter((v) => v !== version);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const [from, to] = selectedVersions.sort((a, b) => a - b);
      onCompare(from, to);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} className="text-purple-400" />
          <h3 className="text-white font-semibold">Histórico de Alterações</h3>
          <span className="text-white/40 text-sm">
            v{history.currentVersion} atual
          </span>
        </div>

        {selectedVersions.length === 2 && (
          <button
            onClick={handleCompare}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg 
              hover:bg-purple-600 transition-colors flex items-center gap-2"
          >
            <GitCompare size={16} />
            Comparar v{Math.min(...selectedVersions)} com v{Math.max(...selectedVersions)}
          </button>
        )}
      </div>

      {/* Versions List */}
      <div className="space-y-3">
        {history.versions.map((version, index) => (
          <motion.div
            key={version.version}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Version Header */}
            <div
              className="p-4 bg-white/5 flex items-center gap-4 cursor-pointer 
                hover:bg-white/10 transition-colors"
              onClick={() => toggleExpanded(version.version)}
            >
              {/* Checkbox for comparison */}
              <input
                type="checkbox"
                checked={selectedVersions.includes(version.version)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelected(version.version);
                }}
                className="w-4 h-4 rounded border-white/20 bg-white/5 
                  text-purple-500 focus:ring-purple-500"
              />

              {/* Expand icon */}
              {expandedVersions.includes(version.version) ? (
                <ChevronDown size={18} className="text-white/40" />
              ) : (
                <ChevronRight size={18} className="text-white/40" />
              )}

              {/* Version info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">v{version.version}</span>
                  <span className="text-white/40 text-sm">•</span>
                  <span className="text-white/60 text-sm">
                    {format(new Date(version.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                  <span className="text-white/40 text-sm">•</span>
                  <span className="text-white/70 text-sm">{version.userName}</span>
                </div>
                {version.reason && (
                  <p className="text-white/40 text-sm mt-1 italic">
                    &quot;{version.reason}&quot;
                  </p>
                )}
              </div>

              {/* Changes count */}
              <span className="text-white/50 text-sm">
                {version.changes.length} alteração
                {version.changes.length !== 1 ? 'ões' : ''}
              </span>

              {/* Actions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSnapshot(version);
                }}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                  hover:text-white transition-colors"
                title="Ver snapshot"
              >
                <Eye size={16} />
              </button>
            </div>

            {/* Expanded Changes */}
            {expandedVersions.includes(version.version) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="p-4 border-t border-white/10 bg-white/[0.02]"
              >
                <div className="space-y-2">
                  {version.changes.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-sm p-2 rounded-lg bg-white/5"
                    >
                      <span className="text-white/60">{change.fieldLabel || change.field}:</span>
                      <span className="text-red-400 line-through">
                        {change.previousValue === null
                          ? '(vazio)'
                          : typeof change.previousValue === 'object'
                            ? JSON.stringify(change.previousValue)
                            : String(change.previousValue)}
                      </span>
                      <span className="text-white/40">→</span>
                      <span className="text-green-400">
                        {change.newValue === null
                          ? '(vazio)'
                          : typeof change.newValue === 'object'
                            ? JSON.stringify(change.newValue)
                            : String(change.newValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-center text-purple-400 hover:text-purple-300 
            hover:bg-white/5 rounded-xl transition-colors"
        >
          Carregar versões anteriores
        </button>
      )}

      {history.versions.length === 0 && (
        <div className="text-center py-8 text-white/40">
          Nenhum histórico de alterações disponível
        </div>
      )}
    </div>
  );
}

export const EntityHistory = memo(EntityHistoryInner);
