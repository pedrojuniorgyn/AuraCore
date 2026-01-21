'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Minus, Edit } from 'lucide-react';
import type { VersionComparison, AuditChange } from '@/lib/audit/audit-types';

interface ChangeComparisonProps {
  comparison: VersionComparison;
  onVersionChange?: (from: number, to: number) => void;
  availableVersions?: number[];
}

function ChangeComparisonInner({
  comparison,
  onVersionChange,
  availableVersions = [],
}: ChangeComparisonProps) {
  const [fromVersion, setFromVersion] = useState(comparison.fromVersion);
  const [toVersion, setToVersion] = useState(comparison.toVersion);

  const handleVersionChange = () => {
    if (onVersionChange) {
      onVersionChange(fromVersion, toVersion);
    }
  };

  const getChangeIcon = (type: AuditChange['changeType']) => {
    switch (type) {
      case 'added':
        return <Plus size={12} className="text-green-400" />;
      case 'removed':
        return <Minus size={12} className="text-red-400" />;
      case 'modified':
        return <Edit size={12} className="text-blue-400" />;
    }
  };

  const getChangeColor = (type: AuditChange['changeType']) => {
    switch (type) {
      case 'added':
        return 'bg-green-500/10 border-green-500/30';
      case 'removed':
        return 'bg-red-500/10 border-red-500/30';
      case 'modified':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(vazio)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      {availableVersions.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
          <select
            value={fromVersion}
            onChange={(e) => setFromVersion(Number(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white focus:outline-none focus:border-purple-500"
          >
            {availableVersions.map((v) => (
              <option key={v} value={v} className="bg-gray-900">
                v{v}
              </option>
            ))}
          </select>

          <ArrowRight size={20} className="text-white/40" />

          <select
            value={toVersion}
            onChange={(e) => setToVersion(Number(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white focus:outline-none focus:border-purple-500"
          >
            {availableVersions.map((v) => (
              <option key={v} value={v} className="bg-gray-900">
                v{v}
              </option>
            ))}
          </select>

          <button
            onClick={handleVersionChange}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg 
              hover:bg-purple-600 transition-colors"
          >
            Comparar
          </button>
        </div>
      )}

      {/* Changes List */}
      <div className="space-y-4">
        <h4 className="text-white font-medium">
          {comparison.changes.length} alteração
          {comparison.changes.length !== 1 ? 'ões' : ''} entre v{comparison.fromVersion} e v
          {comparison.toVersion}
        </h4>

        {comparison.changes.map((change, index) => (
          <motion.div
            key={change.field}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl border ${getChangeColor(change.changeType)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {getChangeIcon(change.changeType)}
              <span className="text-white font-medium">
                {change.fieldLabel || change.field}
              </span>
              <span className="text-white/40 text-sm">
                (
                {change.changeType === 'added'
                  ? 'adicionado'
                  : change.changeType === 'removed'
                    ? 'removido'
                    : 'modificado'}
                )
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Previous */}
              <div>
                <p className="text-white/40 text-xs mb-1">Antes</p>
                <pre className="text-red-300 text-sm bg-black/20 p-2 rounded overflow-auto max-h-32">
                  {formatValue(change.previousValue)}
                </pre>
              </div>

              {/* Current */}
              <div>
                <p className="text-white/40 text-xs mb-1">Depois</p>
                <pre className="text-green-300 text-sm bg-black/20 p-2 rounded overflow-auto max-h-32">
                  {formatValue(change.newValue)}
                </pre>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Full Snapshots (collapsible) */}
      <details className="p-4 bg-white/5 rounded-xl">
        <summary className="text-white/60 cursor-pointer hover:text-white">
          Ver snapshots completos
        </summary>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-white/40 text-sm mb-2">v{comparison.fromVersion}</p>
            <pre className="text-white/70 text-xs bg-black/20 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(comparison.fromSnapshot, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-white/40 text-sm mb-2">v{comparison.toVersion}</p>
            <pre className="text-white/70 text-xs bg-black/20 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(comparison.toSnapshot, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}

export const ChangeComparison = memo(ChangeComparisonInner);
