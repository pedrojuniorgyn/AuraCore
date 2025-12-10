"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface CostCenter {
  id: number;
  code: string;
  name: string;
}

interface ChartAccount {
  id: number;
  code: string;
  name: string;
  requiresCostCenter: boolean;
}

export default function NovaContaPagarPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [requiresCostCenter, setRequiresCostCenter] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    documentNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    amount: "",
    categoryId: "",
    costCenterId: "",
    chartAccountId: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar centros de custo
      const costCentersRes = await fetch("/api/financial/cost-centers");
      if (costCentersRes.ok) {
        const data = await costCentersRes.json();
        setCostCenters(Array.isArray(data) ? data : (data.data || []));
      }

      // Carregar plano de contas
      const accountsRes = await fetch("/api/financial/chart-of-accounts");
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setChartAccounts(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requiresCostCenter && !formData.costCenterId) {
      toast.error("A conta contábil selecionada exige um centro de custo");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/financial/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: parseInt(formData.categoryId),
          costCenterId: formData.costCenterId
            ? parseInt(formData.costCenterId)
            : null,
          chartAccountId: formData.chartAccountId
            ? parseInt(formData.chartAccountId)
            : null,
          description: formData.description,
          documentNumber: formData.documentNumber,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          amount: parseFloat(formData.amount),
          notes: formData.notes,
          status: "PENDING",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Conta a pagar criada com sucesso!");
        router.push("/financeiro/contas-pagar");
      } else {
        toast.error(result.error || "Erro ao criar conta");
      }
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      toast.error("Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChartAccountChange = (value: string) => {
    setFormData({ ...formData, chartAccountId: value });
    const account = chartAccounts.find((a) => a.id === parseInt(value));
    setRequiresCostCenter(account?.requiresCostCenter || false);
  };

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center gap-4 mb-6">
            <RippleButton
              onClick={() => router.back()}
              className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 px-3 py-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </RippleButton>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                ➕ Nova Conta a Pagar
              </h1>
              <p className="text-slate-400 mt-1">
                Preencha os dados da nova conta
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Card Dados da Conta */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  📋 Dados da Conta
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-purple-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Número do Documento
                    </label>
                    <input
                      type="text"
                      value={formData.documentNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          documentNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-purple-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data de Emissão *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, issueDate: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all hover:border-purple-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all hover:border-purple-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Valor *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-purple-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Categoria (ID) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      placeholder="ID da categoria"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-purple-400/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Conta Contábil
                      {requiresCostCenter && (
                        <span className="ml-2 text-xs text-red-400 font-semibold">
                          (Exige CC)
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      options={chartAccounts.map((a) => ({
                        value: String(a.id),
                        label: a.name,
                        subtitle: a.code,
                      }))}
                      value={formData.chartAccountId}
                      onChange={handleChartAccountChange}
                      placeholder="Selecione uma conta"
                      emptyText="Nenhuma conta encontrada"
                      borderColor="border-purple-500/30"
                      focusColor="ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Centro de Custo
                      {requiresCostCenter && (
                        <span className="text-red-400"> *</span>
                      )}
                    </label>
                    <SearchableSelect
                      options={costCenters.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        subtitle: c.code,
                      }))}
                      value={formData.costCenterId}
                      onChange={(value) => setFormData({ ...formData, costCenterId: value })}
                      placeholder="Selecione um centro de custo"
                      emptyText="Nenhum centro de custo encontrado"
                      borderColor="border-purple-500/30"
                      focusColor="ring-purple-500"
                      required={requiresCostCenter}
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Observações */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-pink-500/30 hover:border-pink-400/50 transition-all">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  📝 Observações
                </h2>

                <div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observações adicionais..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-pink-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-pink-400/50 resize-none"
                  />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Botões de Ação */}
          <FadeIn delay={0.4}>
            <div className="flex gap-4 justify-end">
              <RippleButton
                type="button"
                onClick={() => router.back()}
                className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 px-6 py-3"
                disabled={isLoading}
              >
                Cancelar
              </RippleButton>
              <RippleButton
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Conta a Pagar
                  </>
                )}
              </RippleButton>
            </div>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}
