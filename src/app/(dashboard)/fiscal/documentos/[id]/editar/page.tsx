"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageTransition } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ArrowLeft, Save, FileText, Trash2 } from "lucide-react";

interface FiscalDocument {
  id: number;
  documentNumber: string;
  documentType: string;
  partnerName: string;
  fiscalClassification: string;
  fiscalStatus: string;
  accountingStatus: string;
  financialStatus: string;
  notes?: string;
}

interface DocumentItem {
  id: number;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  fiscalCategoryId?: number;
  chartAccountId?: number;
  costCenterId?: number;
}

interface SelectOption {
  id: number;
  name: string;
  code?: string;
}

export default function EditarDocumentoPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<FiscalDocument | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [chartAccounts, setChartAccounts] = useState<SelectOption[]>([]);
  const [costCenters, setCostCenters] = useState<SelectOption[]>([]);
  
  const [formData, setFormData] = useState({
    fiscalClassification: "",
    fiscalStatus: "",
    accountingStatus: "",
    financialStatus: "",
    notes: "",
  });

  useEffect(() => {
    fetchDocument();
    fetchMasterData();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const [docRes, itemsRes] = await Promise.all([
        fetch(`/api/fiscal/documents/${documentId}`),
        fetch(`/api/fiscal/documents/${documentId}/items`),
      ]);
      
      if (docRes.ok) {
        const data = await docRes.json();
        setDocument(data.document);
        setFormData({
          fiscalClassification: data.document.fiscalClassification || "",
          fiscalStatus: data.document.fiscalStatus || "",
          accountingStatus: data.document.accountingStatus || "",
          financialStatus: data.document.financialStatus || "",
          notes: data.document.notes || "",
        });
      }
      
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }
    } catch (error) {
      console.error("Erro ao buscar documento:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [catRes, coaRes, ccRes] = await Promise.all([
        fetch("/api/financial/categories"),
        fetch("/api/fiscal/chart-of-accounts"),
        fetch("/api/financial/cost-centers"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        // API retorna { data: [...] } ou array direto
        const catArray = catData.data || catData;
        setCategories(Array.isArray(catArray) ? catArray : []);
      }
      if (coaRes.ok) {
        const coaData = await coaRes.json();
        setChartAccounts(Array.isArray(coaData) ? coaData : []);
      }
      if (ccRes.ok) {
        const ccData = await ccRes.json();
        // API retorna { data: { flat: [...], tree: [...] } }
        const ccArray = ccData.data?.flat || ccData.flat || ccData.data || ccData;
        setCostCenters(Array.isArray(ccArray) ? ccArray : []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados mestres:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/fiscal/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Documento atualizado com sucesso!");
        router.push("/fiscal/documentos");
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar documento");
    } finally {
      setSaving(false);
    }
  };

  const handleItemUpdate = async (itemId: number, field: string, value: unknown) => {
    try {
      await fetch(`/api/fiscal/documents/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      // Atualizar estado local
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      </PageTransition>
    );
  }

  if (!document) {
    return (
      <PageTransition>
        <div className="p-8">
          <p className="text-white">Documento não encontrado</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              <GradientText>Editar Documento Fiscal</GradientText>
            </h1>
            <p className="text-white/60 mt-2">
              {document.documentType} {document.documentNumber} - {document.partnerName}
            </p>
          </div>
          <RippleButton
            variant="secondary"
            onClick={() => router.push("/fiscal/documentos")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </RippleButton>
        </div>

        {/* Card Principal */}
        <GlassmorphismCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Classificação Fiscal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Classificação Fiscal
              </label>
              <SearchableSelect
                value={formData.fiscalClassification}
                onChange={(value: string) =>
                  setFormData({ ...formData, fiscalClassification: value })
                }
                options={[
                  { value: "PURCHASE", label: "Compra" },
                  { value: "SALE", label: "Venda" },
                  { value: "RETURN", label: "Devolução" },
                  { value: "CARGO", label: "Carga (Transportadora)" },
                  { value: "OTHER", label: "Outros" },
                ]}
                placeholder="Selecione a classificação..."
                emptyText="Nenhuma opção encontrada"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Status Fiscal
              </label>
              <SearchableSelect
                value={formData.fiscalStatus}
                onChange={(value: string) =>
                  setFormData({ ...formData, fiscalStatus: value })
                }
                options={[
                  { value: "CLASSIFIED", label: "Classificado" },
                  { value: "PENDING_CLASSIFICATION", label: "Pendente Classificação" },
                ]}
                placeholder="Selecione o status..."
                emptyText="Nenhuma opção encontrada"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Status Contábil
              </label>
              <SearchableSelect
                value={formData.accountingStatus}
                onChange={(value: string) =>
                  setFormData({ ...formData, accountingStatus: value })
                }
                options={[
                  { value: "PENDING", label: "Pendente" },
                  { value: "POSTED", label: "Contabilizado" },
                  { value: "REVERSED", label: "Estornado" },
                ]}
                placeholder="Selecione o status..."
                emptyText="Nenhuma opção encontrada"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Status Financeiro
              </label>
              <SearchableSelect
                value={formData.financialStatus}
                onChange={(value: string) =>
                  setFormData({ ...formData, financialStatus: value })
                }
                options={[
                  { value: "NO_TITLE", label: "Sem Título" },
                  { value: "GENERATED", label: "Título Gerado" },
                  { value: "PAID", label: "Pago" },
                ]}
                placeholder="Selecione o status..."
                emptyText="Nenhuma opção encontrada"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              placeholder="Observações adicionais..."
            />
          </div>
        </GlassmorphismCard>

        {/* Itens com Categorização */}
        <GlassmorphismCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Categorização de Itens (NCM)
          </h2>
          
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">Nenhum item encontrado neste documento</p>
              <p className="text-white/40 text-sm mt-2">Os itens do XML serão exibidos aqui quando disponíveis</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/70 font-semibold pb-5 px-3">#</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3">Descrição</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3">NCM</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3">Qtd</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3">Valor</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3 min-w-[280px]">Categoria Financeira</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3 min-w-[320px]">Plano de Contas</th>
                    <th className="text-left text-white/70 font-semibold pb-5 px-3 min-w-[280px]">Centro de Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-6 px-3 text-white/60 align-top">{item.itemNumber || index + 1}</td>
                      <td className="py-6 px-3 text-white align-top">{item.description}</td>
                      <td className="py-6 px-3 text-white/80 font-mono text-sm align-top">{item.ncm}</td>
                      <td className="py-6 px-3 text-white/80 align-top">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-6 px-3 text-white/80 font-semibold align-top">
                        R$ {parseFloat(item.totalPrice || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-6 px-3 align-top">
                        <div className="relative z-10">
                          <SearchableSelect
                            value={item.categoryId?.toString() || ""}
                            onChange={(value: string) =>
                              handleItemUpdate(item.id, "categoryId", value ? parseInt(value) : null)
                            }
                            options={categories.map((cat: SelectOption) => ({
                              value: cat.id.toString(),
                              label: cat.name,
                            }))}
                            placeholder="Selecione categoria..."
                            emptyText="Nenhuma categoria encontrada"
                            className="w-full"
                          />
                        </div>
                      </td>
                      <td className="py-6 px-3 align-top">
                        <div className="relative z-10">
                          <SearchableSelect
                            value={item.chartAccountId?.toString() || ""}
                            onChange={(value: string) =>
                              handleItemUpdate(item.id, "chartAccountId", value ? parseInt(value) : null)
                            }
                            options={chartAccounts.map((acc: SelectOption) => ({
                              value: acc.id.toString(),
                              label: `${acc.code} - ${acc.name}`,
                            }))}
                            placeholder="Selecione conta..."
                            emptyText="Nenhuma conta encontrada"
                            className="w-full"
                          />
                        </div>
                      </td>
                      <td className="py-6 px-3 align-top">
                        <div className="relative z-10">
                          <SearchableSelect
                            value={item.costCenterId?.toString() || ""}
                            onChange={(value: string) =>
                              handleItemUpdate(item.id, "costCenterId", value ? parseInt(value) : null)
                            }
                            options={costCenters
                              .filter((cc: SelectOption & { isAnalytical?: boolean }) => cc.isAnalytical) // ✅ Apenas analíticos
                              .map((cc: SelectOption) => ({
                                value: cc.id.toString(),
                                label: `${cc.code} - ${cc.name}`,
                              }))}
                            placeholder="Selecione centro de custo..."
                            emptyText="Nenhum centro de custo analítico encontrado"
                            className="w-full"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Espaço extra para dropdown expandir */}
              <div className="h-64"></div>
            </div>
          )}
        </GlassmorphismCard>

        {/* Ações */}
        <div className="flex gap-4 justify-end">
          <RippleButton variant="secondary" onClick={() => router.push("/fiscal/documentos")}>
            Cancelar
          </RippleButton>
          <RippleButton onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </RippleButton>
        </div>
      </div>
    </PageTransition>
  );
}
