"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";

// AG Grid Enterprise Modules (v34+)
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { NumberCounter } from "@/components/ui/magic-components";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { AccountingAIWidget } from "@/components/accounting";
import { fetchAPI, fetchAPISafe } from "@/lib/api";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { auraTheme } from "@/lib/ag-grid/theme";

import { 
  Activity, 
  Plus, 
  RefreshCw, 
  Download,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinancialCategory {
  id: number;
  name: string;
  type: "INCOME" | "REVENUE" | "EXPENSE";
  code: string | null;
  description: string | null;
  status: string;
  createdAt: string;
}

// Registrar módulos Enterprise
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function CategoriasPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [quickFilterText, setQuickFilterText] = useState(""); // ✅ Quick Filter
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "EXPENSE" as "INCOME" | "REVENUE" | "EXPENSE",
    description: "",
  });

  // KPI Stats
  const [stats, setStats] = useState({
    total: 0,
    income: 0,
    expense: 0,
    active: 0,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      const { data: json, error } = await fetchAPISafe<{ data?: FinancialCategory[] } | FinancialCategory[]>("/api/financial/categories");
      
      if (error) {
        const msg = error.message || "Falha ao carregar categorias";
        setLoadError(msg);
        console.error("Erro ao buscar categorias:", msg);
        setCategories([]);
        setStats({ total: 0, income: 0, expense: 0, active: 0 });
        return;
      }

      const data = (json && 'data' in json) ? json.data : json;
      const catArray = Array.isArray(data) ? data : [];
      setCategories(catArray);

      // Calcular KPIs
      setStats({
        total: catArray.length,
        income: catArray.filter((c: FinancialCategory) => c.type === "INCOME" || c.type === "REVENUE").length,
        expense: catArray.filter((c: FinancialCategory) => c.type === "EXPENSE").length,
        active: catArray.filter((c: FinancialCategory) => c.status === "ACTIVE").length,
      });
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      setLoadError("Erro inesperado ao carregar categorias.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory
        ? `/api/financial/categories/${editingCategory.id}`
        : "/api/financial/categories";
      const method = editingCategory ? "PUT" : "POST";

      await fetchAPI(url, {
        method,
        body: formData,
      });

      alert(editingCategory ? "✅ Categoria atualizada!" : "✅ Categoria criada!");
      closeModal();
      fetchCategories();
    } catch (error) {
      console.error("Erro:", error);
      alert("❌ Erro ao salvar categoria");
    }
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code || "",
      type: category.type,
      description: category.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      await fetchAPI(`/api/financial/categories/${id}`, {
        method: "DELETE",
      });

      alert("✅ Categoria excluída!");
      fetchCategories();
    } catch (error) {
      console.error("Erro:", error);
      alert("❌ Erro ao excluir categoria");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: "", code: "", type: "EXPENSE", description: "" });
  };

  const exportToExcel = () => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsExcel({
        fileName: `categorias_financeiras_${new Date().toISOString().split("T")[0]}.xlsx`,
        sheetName: "Categorias",
      });
    }
  };

  // ✅ CELL RENDERERS - MESMO PADRÃO DO MONITOR FISCAL
  const ActionCellRenderer = (props: ICellRendererParams) => {
    return (
      <div className="flex gap-2 h-full items-center justify-center">
        <button
          onClick={() => handleEdit(props.data)}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDelete(props.data.id)}
          className="text-red-400 hover:text-red-300 transition-colors"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const TypeCellRenderer = (props: ICellRendererParams) => {
    const type = props.value;
    if (type === "INCOME" || type === "REVENUE") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          💰 Receita
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        💸 Despesa
      </Badge>
    );
  };

  const StatusCellRenderer = (props: ICellRendererParams) => {
    return props.value === "ACTIVE" ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        ✓ Ativo
      </Badge>
    ) : (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
        ✗ Inativo
      </Badge>
    );
  };

  // Column Definitions - COM SET FILTER + SEARCH
  const columnDefs: ColDef[] = [
    {
      field: "name",
      headerName: "Nome",
      width: 200,
      filter: "agTextColumnFilter",
      pinned: "left",
      cellStyle: { fontWeight: 500 },
    },
    {
      field: "code",
      headerName: "Código",
      width: 100,
      filter: "agTextColumnFilter",
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 140,
      filter: "agSetColumnFilter",
      filterParams: {
        buttons: ["apply", "reset"],
        closeOnApply: true,
        excelMode: "windows", // ✅ Ativa search nativo!
      },
      cellRenderer: TypeCellRenderer,
    },
    {
      field: "description",
      headerName: "Descrição",
      flex: 1,
      filter: "agTextColumnFilter",
      cellStyle: { color: "#9ca3af" },
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      filter: "agSetColumnFilter",
      filterParams: {
        buttons: ["apply", "reset"],
        closeOnApply: true,
        excelMode: "windows", // ✅ Ativa search nativo!
      },
      cellRenderer: StatusCellRenderer,
    },
    {
      field: "createdAt",
      headerName: "Criado em",
      width: 130,
      filter: "agDateColumnFilter",
      valueFormatter: (params) => {
        if (!params.value) return "";
        return new Date(params.value).toLocaleDateString("pt-BR");
      },
    },
    {
      headerName: "Ações",
      width: 90,
      pinned: "right",
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellRenderer: ActionCellRenderer,
    },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
  };

  const onGridReady = (params: GridReadyEvent) => {
    // Grid ready
  };

  return (
    <>
      <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <GradientText className="text-4xl font-bold mb-2">
              💼 Categorias Financeiras
            </GradientText>
            <p className="text-gray-400">
              Gerencie categorias de receitas e despesas
            </p>
          </div>

          <div className="flex gap-3">
            <RippleButton
              onClick={fetchCategories}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </RippleButton>

            <RippleButton
              onClick={exportToExcel}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </RippleButton>

            <RippleButton
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Categoria
            </RippleButton>
          </div>
        </div>

        {/* Erro de carregamento */}
        {loadError && (
          <GlassmorphismCard className="p-4 border-red-500/30 bg-red-900/10">
            <div className="text-sm text-red-300">
              ❌ {loadError}
            </div>
          </GlassmorphismCard>
        )}

        {/* KPI Cards - MESMO PADRÃO DO MONITOR FISCAL */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total */}
          <FadeIn delay={0.1}>
            <GlassmorphismCard className="p-3 border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-purple-800/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all">
              <div className="flex items-center justify-between mb-1">
                <Activity className="h-4 w-4 text-purple-400" />
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-2 py-0.5">Total</Badge>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                <NumberCounter value={stats.total} duration={1.5} />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Categorias Cadastradas</div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Receitas */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="p-3 border-green-500/20 bg-gradient-to-br from-green-900/20 to-green-800/10 hover:shadow-lg hover:shadow-green-500/20 transition-all">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5">Receitas</Badge>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                <NumberCounter value={stats.income} duration={1.5} />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Categorias de Receita</div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Despesas */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="p-3 border-red-500/20 bg-gradient-to-br from-red-900/20 to-red-800/10 hover:shadow-lg hover:shadow-red-500/20 transition-all">
              <div className="flex items-center justify-between mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-2 py-0.5">Despesas</Badge>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                <NumberCounter value={stats.expense} duration={1.5} />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Categorias de Despesa</div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Ativas */}
          <FadeIn delay={0.4}>
            <GlassmorphismCard className="p-3 border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="h-4 w-4 text-cyan-400" />
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] px-2 py-0.5">Ativas</Badge>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                <NumberCounter value={stats.active} duration={1.5} />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Categorias Ativas</div>
            </GlassmorphismCard>
          </FadeIn>
        </StaggerContainer>

        {/* Quick Filter - BUSCA GLOBAL */}
        <FadeIn delay={0.5}>
          <GlassmorphismCard className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar em todas as colunas..."
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2.5 pl-10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              />
              <RefreshCw 
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 ${quickFilterText ? 'animate-spin' : ''}`} 
              />
              {quickFilterText && (
                <button
                  onClick={() => setQuickFilterText("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* AG Grid - COM QUICK FILTER + SET FILTER */}
        <FadeIn delay={0.6}>
          <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 440px)" }}>
              <AgGridReact
                ref={gridRef}
                rowData={categories}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                loading={loading}
                quickFilterText={quickFilterText} // ✅ Quick Filter ativado
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[25, 50, 100, 200]}
                cellSelection={true}
                rowGroupPanelShow="always"
                sideBar={{
                  toolPanels: [
                    {
                      id: "columns",
                      labelDefault: "Colunas",
                      labelKey: "columns",
                      iconKey: "columns",
                      toolPanel: "agColumnsToolPanel",
                    },
                    {
                      id: "filters",
                      labelDefault: "Filtros",
                      labelKey: "filters",
                      iconKey: "filter",
                      toolPanel: "agFiltersToolPanel",
                    },
                  ],
                  defaultToolPanel: "",
                }}
                animateRows={true}
              />
            </div>
          </div>
        </FadeIn>

        {/* Modal - MESMO PADRÃO */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <FadeIn>
              <GlassmorphismCard className="w-full max-w-2xl p-6 relative">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>

                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      required
                      placeholder="Ex: Combustível, Manutenção"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Código
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      placeholder="Ex: COMB, MANUT"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "INCOME" | "EXPENSE" })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    >
                      <option value="EXPENSE">💸 Despesa</option>
                      <option value="INCOME">💰 Receita</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
                      placeholder="Descrição opcional"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <RippleButton type="button" onClick={closeModal} variant="secondary" className="flex-1">
                      Cancelar
                    </RippleButton>
                    <RippleButton type="submit" className="flex-1">
                      {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                    </RippleButton>
                  </div>
                </form>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        )}
      </div>
      </PageTransition>

      {/* AI Insight Widget - Assistente de Categorias */}
      <AccountingAIWidget screen="categories" defaultMinimized={true} />
    </>
  );
}
