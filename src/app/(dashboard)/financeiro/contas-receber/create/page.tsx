"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface BusinessPartner {
  id: number;
  name: string;
  document: string;
}

interface FinancialCategory {
  id: number;
  name: string;
  code: string;
}

interface ChartAccount {
  id: number;
  name: string;
  code: string;
}

export default function CreateReceivablePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);

  const [formData, setFormData] = useState({
    partnerId: "",
    categoryId: "",
    chartAccountId: "",
    description: "",
    documentNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    amount: "",
    installments: "1",
    paymentMethod: "PIX",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar clientes
      const partnersRes = await fetch("/api/business-partners?type=CLIENT");
      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setPartners(Array.isArray(data) ? data : (data.data || []));
      }

      // Carregar categorias
      const categoriesRes = await fetch("/api/financial/categories?type=INCOME");
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(Array.isArray(data) ? data : (data.data || []));
      }

      // Carregar plano de contas
      const accountsRes = await fetch("/api/financial/chart-of-accounts?type=REVENUE&analytical=true");
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Aviso",
        description: "Erro ao carregar dados. Tente recarregar a página.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const installmentsCount = parseInt(formData.installments) || 1;
      const totalAmount = parseFloat(formData.amount);
      const installmentAmount = totalAmount / installmentsCount;

      const receivables = [];

      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(formData.dueDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        receivables.push({
          partnerId: parseInt(formData.partnerId),
          categoryId: parseInt(formData.categoryId),
          chartAccountId: parseInt(formData.chartAccountId),
          description: formData.description,
          documentNumber: formData.documentNumber || null,
          issueDate: formData.issueDate,
          dueDate: dueDate.toISOString().split("T")[0],
          amount: installmentAmount,
          installment: installmentsCount > 1 ? `${i + 1}/${installmentsCount}` : null,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes || null,
          status: "PENDING",
        });
      }

      for (const receivable of receivables) {
        const res = await fetch("/api/financial/receivables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(receivable),
        });

        if (!res.ok) {
          throw new Error("Erro ao criar conta a receber");
        }
      }

      toast({
        title: "Sucesso!",
        description: `${installmentsCount} conta(s) a receber criada(s) com sucesso!`,
      });

      router.push("/financeiro/contas-receber");
    } catch (error: unknown) {
      console.error("Erro ao criar:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta a receber",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                ➕ Nova Conta a Receber
              </h1>
              <p className="text-slate-400 mt-1">
                Lançamento manual de receitas
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          {/* Card Principal */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  📋 Informações Principais
                </h2>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cliente *
                  </label>
                  <SearchableSelect
                    options={partners.map((p) => ({
                      value: String(p.id),
                      label: p.name,
                      subtitle: p.document,
                    }))}
                    value={formData.partnerId}
                    onChange={(value) => setFormData({ ...formData, partnerId: value })}
                    placeholder="Selecione um cliente"
                    emptyText="Nenhum cliente encontrado"
                    borderColor="border-green-500/30"
                    focusColor="ring-green-500"
                    required
                  />
                </div>

                {/* Categoria e Conta Contábil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Categoria Financeira *
                    </label>
                    <SearchableSelect
                      options={categories.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        subtitle: c.code,
                      }))}
                      value={formData.categoryId}
                      onChange={(value) => setFormData({ ...formData, categoryId: value })}
                      placeholder="Selecione uma categoria"
                      emptyText="Nenhuma categoria encontrada"
                      borderColor="border-green-500/30"
                      focusColor="ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Conta Contábil *
                    </label>
                    <SearchableSelect
                      options={accounts.map((a) => ({
                        value: String(a.id),
                        label: a.name,
                        subtitle: a.code,
                      }))}
                      value={formData.chartAccountId}
                      onChange={(value) => setFormData({ ...formData, chartAccountId: value })}
                      placeholder="Selecione uma conta"
                      emptyText="Nenhuma conta encontrada"
                      borderColor="border-green-500/30"
                      focusColor="ring-green-500"
                      required
                    />
                  </div>
                </div>

                {/* Descrição e Número do Documento */}
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
                      placeholder="Ex: Prestação de serviço de transporte"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50"
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
                        setFormData({ ...formData, documentNumber: e.target.value })
                      }
                      placeholder="Ex: CTe-12345"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-green-400/50"
                    />
                  </div>
                </div>

                {/* Datas */}
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
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white transition-all hover:border-green-400/50"
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
                      className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white transition-all hover:border-green-400/50"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Valores e Recebimento */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-emerald-500/30 hover:border-emerald-400/50 transition-all">
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  💰 Valores e Recebimento
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Valor Total (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-emerald-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Número de Parcelas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.installments}
                      onChange={(e) =>
                        setFormData({ ...formData, installments: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-900/50 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white transition-all hover:border-emerald-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Forma de Recebimento
                    </label>
                    <SearchableSelect
                      options={[
                        { value: "PIX", label: "PIX" },
                        { value: "BOLETO", label: "Boleto Bancário" },
                        { value: "TED", label: "TED - Transferência Eletrônica" },
                        { value: "DOC", label: "DOC - Documento de Crédito" },
                        { value: "DINHEIRO", label: "Dinheiro" },
                        { value: "CARTAO_CREDITO", label: "Cartão de Crédito" },
                        { value: "CARTAO_DEBITO", label: "Cartão de Débito" },
                      ]}
                      value={formData.paymentMethod}
                      onChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                      placeholder="Selecione a forma de recebimento"
                      emptyText="Nenhuma forma de recebimento encontrada"
                      borderColor="border-emerald-500/30"
                      focusColor="ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Card Observações */}
          <FadeIn delay={0.4}>
            <GlassmorphismCard className="border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
                  📝 Observações
                </h2>

                <div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Informações adicionais..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 transition-all hover:border-cyan-400/50 resize-none"
                  />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Botões de Ação */}
          <FadeIn delay={0.5}>
            <div className="flex gap-4 justify-end">
              <RippleButton
                type="button"
                onClick={() => router.back()}
                className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 px-6 py-3"
                disabled={loading}
              >
                Cancelar
              </RippleButton>
              <RippleButton
                type="submit"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-8 py-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Conta a Receber
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
