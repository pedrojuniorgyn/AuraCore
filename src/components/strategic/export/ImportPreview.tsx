'use client';

import { memo } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type { ImportValidationResult } from '@/lib/export/export-types';

interface ImportPreviewProps {
  validation: ImportValidationResult;
}

function ImportPreviewInner({ validation }: ImportPreviewProps) {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Resultado da validação:</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-green-400 font-medium">{validation.validRows}</span>
          </div>
          <p className="text-white/60 text-xs">Linhas válidas</p>
        </div>

        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-medium">{validation.warningRows}</span>
          </div>
          <p className="text-white/60 text-xs">Com avisos</p>
        </div>

        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 font-medium">{validation.errorRows}</span>
          </div>
          <p className="text-white/60 text-xs">Com erros</p>
        </div>
      </div>

      {/* Issues */}
      {validation.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/60 text-sm font-medium">Detalhes dos problemas:</p>
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {validation.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  issue.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}
              >
                {issue.type === 'error' ? (
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm ${
                      issue.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`}
                  >
                    Linha {issue.row}: {issue.message}
                  </p>
                  {issue.suggestion && (
                    <p className="text-white/40 text-xs mt-1">{issue.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Table */}
      {validation.preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-white/60 text-sm font-medium">Pré-visualização:</p>
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="max-h-[200px] overflow-y-auto">
              {validation.preview.slice(0, 5).map((row) => (
                <div
                  key={row.rowNumber}
                  className={`px-4 py-2 border-b border-white/10 last:border-0 flex items-center gap-3 ${
                    row.status === 'error'
                      ? 'bg-red-500/5'
                      : row.status === 'warning'
                        ? 'bg-yellow-500/5'
                        : 'bg-white/5'
                  }`}
                >
                  {row.status === 'valid' && (
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  )}
                  {row.status === 'warning' && (
                    <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
                  )}
                  {row.status === 'error' && (
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-white/60 text-xs">#{row.rowNumber}</span>
                  <span className="text-white text-sm truncate">
                    {Object.values(row.data).slice(0, 3).join(' | ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ImportPreview = memo(ImportPreviewInner);
