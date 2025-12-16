"use client";

import { useEffect, useState } from "react";
import { X, FileText, Calendar, User, DollarSign, Tag, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { Badge } from "@/components/ui/badge";

interface DocumentDetailModalProps {
  documentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentDetail {
  id: number;
  documentType: string;
  documentNumber: string;
  documentSeries: string;
  accessKey: string;
  partnerName: string;
  partnerDocument: string;
  issueDate: string;
  grossAmount: string;
  taxAmount: string;
  netAmount: string;
  fiscalStatus: string;
  accountingStatus: string;
  financialStatus: string;
  fiscalClassification: string;
  operationType: string;
  items: Array<{
    id: number;
    itemNumber: number;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    netAmount: string;
    ncmCode: string;
  }>;
}

export function DocumentDetailModal({ documentId, isOpen, onClose }: DocumentDetailModalProps) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocumentDetails();
    }
  }, [isOpen, documentId]);

  const fetchDocumentDetails = async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/fiscal/documents/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data.document);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string, type: 'fiscal' | 'accounting' | 'financial') => {
    const colors = {
      fiscal: {
        IMPORTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        PENDING_CLASSIFICATION: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        CLASSIFIED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      accounting: {
        PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        CLASSIFIED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        POSTED: "bg-green-500/20 text-green-400 border-green-500/30",
        REVERSED: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      financial: {
        NO_TITLE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        GENERATED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        PARTIAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        PAID: "bg-green-500/20 text-green-400 border-green-500/30",
      },
    };

    const colorClass = colors[type][status as keyof typeof colors[typeof type]] || "bg-gray-500/20 text-gray-400";
    
    return (
      <Badge className={`${colorClass} border`}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <GlassmorphismCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Documento Fiscal #{documentId}
              </h2>
              {document && (
                <p className="text-sm text-slate-400 mt-1">
                  {document.documentType} {document.documentNumber}/{document.documentSeries}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          )}

          {!loading && document && (
            <>
              {/* Informações Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <User className="h-3 w-3" /> Parceiro
                  </label>
                  <p className="text-white font-medium">{document.partnerName}</p>
                  <p className="text-xs text-slate-400">{document.partnerDocument}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Data de Emissão
                  </label>
                  <p className="text-white font-medium">
                    {new Date(document.issueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <Tag className="h-3 w-3" /> Classificação Fiscal
                  </label>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {document.fiscalClassification}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Operação
                  </label>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {document.operationType}
                  </Badge>
                </div>
              </div>

              {/* Status Triple */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Status Fiscal</label>
                  {getStatusBadge(document.fiscalStatus, 'fiscal')}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Status Contábil</label>
                  {getStatusBadge(document.accountingStatus, 'accounting')}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Status Financeiro</label>
                  {getStatusBadge(document.financialStatus, 'financial')}
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-500/20">
                  <label className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                    <DollarSign className="h-3 w-3" /> Valor Bruto
                  </label>
                  <p className="text-2xl font-bold text-blue-400">
                    R$ {parseFloat(document.grossAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-lg border border-red-500/20">
                  <label className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                    <DollarSign className="h-3 w-3" /> Impostos
                  </label>
                  <p className="text-2xl font-bold text-red-400">
                    R$ {parseFloat(document.taxAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-lg border border-green-500/20">
                  <label className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                    <DollarSign className="h-3 w-3" /> Valor Líquido
                  </label>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {parseFloat(document.netAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Itens */}
              {document.items && document.items.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    Itens ({document.items.length})
                  </h3>
                  <div className="space-y-2">
                    {document.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white">{item.description}</p>
                            <p className="text-xs text-slate-400 mt-1">NCM: {item.ncmCode || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              R$ {parseFloat(item.netAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {item.quantity} {item.unit} × R$ {parseFloat(item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chave de Acesso */}
              {document.accessKey && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <label className="text-xs text-slate-400">Chave de Acesso</label>
                  <p className="text-xs text-white font-mono mt-1">{document.accessKey}</p>
                </div>
              )}
            </>
          )}

          {!loading && !document && (
            <div className="text-center py-12 text-slate-400">
              Documento não encontrado
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </GlassmorphismCard>
    </div>
  );
}














