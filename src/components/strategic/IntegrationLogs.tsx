'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface LogEntry {
  id: string;
  timestamp: Date | string;
  method: string;
  status: number;
  duration: number;
  event: string;
  description: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  integrationName: string;
  logs: LogEntry[];
  onRefresh: () => void;
  onRetry: (logId: string) => void;
}

export function IntegrationLogs({ 
  isOpen, 
  onClose, 
  integrationName, 
  logs, 
  onRefresh,
  onRetry,
}: Props) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50"
          >
            <div className="h-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 
              shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Logs de Integração</h2>
                  <p className="text-white/50 text-sm">{integrationName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRefresh}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/50"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Logs List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id;
                  const isSuccess = log.status >= 200 && log.status < 300;
                  const formattedTime = format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR });

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
                    >
                      {/* Summary */}
                      <button
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`w-2 h-2 rounded-full ${
                            isSuccess ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-white/50 text-sm font-mono">{formattedTime}</span>
                          <span className="text-white/70 text-sm">{log.method}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                            isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-white/40 text-xs">{log.duration}ms</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-white/40" />
                        ) : (
                          <ChevronRight size={16} className="text-white/40" />
                        )}
                      </button>

                      {/* Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10"
                          >
                            <div className="p-4 space-y-4">
                              <div>
                                <span className="text-white/40 text-xs">Evento:</span>
                                <span className="text-white ml-2">{log.event}</span>
                              </div>
                              <div>
                                <span className="text-white/40 text-xs">Descrição:</span>
                                <span className="text-white ml-2">{log.description}</span>
                              </div>

                              {log.error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                  <span className="text-red-400 text-sm">{log.error}</span>
                                </div>
                              )}

                              {log.request && (
                                <div>
                                  <span className="text-white/40 text-xs block mb-2">Request:</span>
                                  <pre className="p-3 rounded-lg bg-white/5 text-white/70 text-xs 
                                    font-mono overflow-x-auto">
                                    {JSON.stringify(log.request, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.response && (
                                <div>
                                  <span className="text-white/40 text-xs block mb-2">Response:</span>
                                  <pre className="p-3 rounded-lg bg-white/5 text-white/70 text-xs 
                                    font-mono overflow-x-auto">
                                    {JSON.stringify(log.response, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {!isSuccess && (
                                <button
                                  onClick={() => onRetry(log.id)}
                                  className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 
                                    hover:bg-purple-500/30 text-sm flex items-center gap-2"
                                >
                                  <RotateCcw size={14} /> Reenviar
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {logs.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    Nenhum log encontrado
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
