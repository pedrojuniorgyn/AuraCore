"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { FileText, Save, Upload } from "lucide-react";

export default function NovoDocumentoFiscalPage() {
  const router = useRouter();
  
  const [documentType, setDocumentType] = useState("RECEIPT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentSeries, setDocumentSeries] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerDocument, setPartnerDocument] = useState("");
  const [grossAmount, setGrossAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/fiscal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          documentNumber,
          documentSeries,
          issueDate,
          partnerName,
          partnerDocument,
          grossAmount,
          netAmount: grossAmount,
          notes,
          operationType: documentType === "RECEIPT" ? "ENTRADA" : "SAIDA",
        }),
      });
      
      if (response.ok) {
        alert("Documento criado com sucesso!");
        router.push("/fiscal/documentos");
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao criar documento:", error);
      alert("Erro ao criar documento");
    }
  };
  
  return (
    <PageTransition>
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div>
            <GradientText className="text-4xl font-bold mb-2">
              Novo Documento Fiscal
            </GradientText>
            <p className="text-slate-400">
              Cadastro manual de recibos e documentos não-fiscais
            </p>
          </div>
        </FadeIn>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="p-6 border-purple-500/20">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">Informações do Documento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de Documento *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="RECEIPT">Recibo</option>
                    <option value="MANUAL">Documento Manual</option>
                  </select>
                </div>
                
                {/* Número */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Número do Documento *
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: REC-0001"
                    required
                  />
                </div>
                
                {/* Série */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Série (opcional)
                  </label>
                  <input
                    type="text"
                    value={documentSeries}
                    onChange={(e) => setDocumentSeries(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: 1"
                  />
                </div>
                
                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                {/* Valor */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                {/* Parceiro Nome */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome do Parceiro (opcional)
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: João Silva"
                  />
                </div>
                
                {/* Parceiro Documento */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CPF/CNPJ do Parceiro (opcional)
                  </label>
                  <input
                    type="text"
                    value={partnerDocument}
                    onChange={(e) => setPartnerDocument(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>
                
                {/* Observações */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observações / Descrição
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-500/30 rounded-lg text-white focus:ring-2 focus:ring-gray-500"
                    placeholder="Descreva o motivo do documento..."
                  />
                </div>
                
                {/* Upload PDF (futuro) */}
                <div className="col-span-2 p-4 border-2 border-dashed border-gray-500/30 rounded-lg text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">
                    Upload de PDF/Imagem (em breve)
                  </p>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Ações */}
          <FadeIn delay={0.3}>
            <div className="flex gap-4 justify-end">
              <RippleButton
                type="button"
                onClick={() => router.back()}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
              >
                Cancelar
              </RippleButton>
              
              <RippleButton
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Documento
              </RippleButton>
            </div>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}









