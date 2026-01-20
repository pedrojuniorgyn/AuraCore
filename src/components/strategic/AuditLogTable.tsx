"use client";

/**
 * AuditLogTable - Tabela paginada de entradas de audit
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditEntry } from './AuditLogDetail';

interface Props {
  entries: AuditEntry[];
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onViewDetail: (entry: AuditEntry) => void;
}

const ACTION_CONFIG: Record<string, { icon: string; bgClass: string; textClass: string }> = {
  CREATE: { icon: '➕', bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
  UPDATE: { icon: '✏️', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  DELETE: { icon: '🗑️', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
  COMMENT: { icon: '💬', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400' },
  STATUS_CHANGE: { icon: '🔄', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400' },
  AUTO: { icon: '🤖', bgClass: 'bg-gray-500/20', textClass: 'text-gray-400' },
};

export function AuditLogTable({ 
  entries, 
  page, 
  totalPages, 
  totalItems,
  onPageChange, 
  onViewDetail 
}: Props) {
  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div>
      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Data/Hora</th>
              <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Usuário</th>
              <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Ação</th>
              <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Entidade</th>
              <th className="px-4 py-3 text-center text-white/60 text-sm font-medium w-20">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-white/40">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              entries.map((entry, i) => {
                const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.UPDATE;
                const formattedDate = format(new Date(entry.createdAt), "dd/MM HH:mm", { locale: ptBR });

                return (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-t border-white/5 hover:bg-white/5 transition-all"
                  >
                    <td className="px-4 py-3 text-white/70 text-sm font-mono">
                      {formattedDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                          flex items-center justify-center text-white text-xs font-bold">
                          {entry.user.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{entry.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg ${config.bgClass} 
                        ${config.textClass} text-sm flex items-center gap-1 w-fit`}>
                        {config.icon} {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm truncate max-w-[200px]">{entry.entityTitle}</p>
                        <p className="text-white/40 text-xs">{entry.entityType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewDetail(entry)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/50 
                          hover:text-white transition-all"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-white/50 text-sm">
            Mostrando {startItem}-{endItem} de {totalItems}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-sm transition-all
                  ${page === pageNum 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
