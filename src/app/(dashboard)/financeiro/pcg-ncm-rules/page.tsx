"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";

// AG Grid Enterprise Modules
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { NumberCounter } from "@/components/ui/magic-components";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";

// AG Grid CSS
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { auraTheme } from "@/lib/ag-grid/theme";

import { 
  Plus, 
  RefreshCw, 
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PcgNcmRule {
  id: number;
  ncmCode: string;
  ncmDescription: string | null;
  pcgId: number;
  pcgCode: string | null;
  pcgName: string | null;
  flagPisCofinsMono: boolean;
  flagIcmsSt: boolean;
  flagIcmsDif: boolean;
  flagIpiSuspenso: boolean;
  flagImportacao: boolean;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

interface PcgOption {
  id: number;
  code: string;
  name: string;
}

// Registrar módulos Enterprise
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function PcgNcmRulesPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [rules, setRules] = useState<PcgNcmRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PcgNcmRule | null>(null);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [pcgOptions, setPcgOptions] = useState<PcgOption[]>([]);

  const [formData, setFormData] = useState({
    ncmCode: "",
    ncmDescription: "",
    pcgId: 0,
    flagPisCofinsMono: false,
    flagIcmsSt: false,
    flagIcmsDif: false,
    flagIpiSuspenso: false,
    flagImportacao: false,
    priority: 100,
  });

  // KPI Stats
  const [stats, setStats] = useState({
    total: 0,
    monofasico: 0,
    icmsSt: 0,
    active: 0,
  });

  useEffect(() => {
    fetchRules();
    fetchPcgOptions();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pcg-ncm-rules");
      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        const rulesArray = Array.isArray(data) ? data : [];
        setRules(rulesArray);

        // Calcular KPIs
        setStats({
          total: rulesArray.length,
          monofasico: rulesArray.filter((r: PcgNcmRule) => r.flagPisCofinsMono).length,
          icmsSt: rulesArray.filter((r: PcgNcmRule) => r.flagIcmsSt).length,
          active: rulesArray.filter((r: PcgNcmRule) => r.isActive).length,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar regras:", error);
      toast.error("Erro ao carregar regras PCG-NCM");
    } finally {
      setLoading(false);
    }
  };

  const fetchPcgOptions = async () => {
    try {
      const response = await fetch("/api/management/chart-accounts");
      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        setPcgOptions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao buscar PCG:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ncmCode || !formData.pcgId) {
      toast.error("NCM e PCG são obrigatórios!");
      return;
    }

    try {
      const url = editingRule
        ? `/api/pcg-ncm-rules/${editingRule.id}`
        : "/api/pcg-ncm-rules";
      const method = editingRule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingRule ? "Regra atualizada!" : "Regra criada!");
        closeModal();
        fetchRules();
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao salvar regra");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao salvar regra");
    }
  };

  const handleEdit = (rule: PcgNcmRule) => {
    setEditingRule(rule);
    setFormData({
      ncmCode: rule.ncmCode,
      ncmDescription: rule.ncmDescription || "",
      pcgId: rule.pcgId,
      flagPisCofinsMono: rule.flagPisCofinsMono,
      flagIcmsSt: rule.flagIcmsSt,
      flagIcmsDif: rule.flagIcmsDif,
      flagIpiSuspenso: rule.flagIpiSuspenso,
      flagImportacao: rule.flagImportacao,
      priority: rule.priority,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;

    try {
      const response = await fetch(`/api/pcg-ncm-rules/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Regra excluída!");
        fetchRules();
      } else {
        toast.error("Erro ao excluir regra");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir regra");
    }
  };

  const openModal = () => {
    setEditingRule(null);
    setFormData({
      ncmCode: "",
      ncmDescription: "",
      pcgId: 0,
      flagPisCofinsMono: false,
      flagIcmsSt: false,
      flagIcmsDif: false,
      flagIpiSuspenso: false,
      flagImportacao: false,
      priority: 100,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRule(null);
  };

  const exportToExcel = () => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `pcg-ncm-rules-${new Date().toISOString().split("T")[0]}.xlsx`,
    });
  };

  // Definição de colunas
  const columnDefs: ColDef[] = [
    {
      headerName: "NCM",
      field: "ncmCode",
      width: 140,
      pinned: "left",
      filter: "agTextColumnFilter",
      cellClass: "font-mono font-semibold",
    },
    {
      headerName: "Descrição NCM",
      field: "ncmDescription",
      width: 300,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "PCG",
      field: "pcgCode",
      width: 120,
      filter: "agTextColumnFilter",
      cellClass: "font-mono",
    },
    {
      headerName: "Conta Gerencial",
      field: "pcgName",
      width: 280,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Monofásico",
      field: "flagPisCofinsMono",
      width: 130,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" /> Sim
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" /> Não
          </Badge>
        )
      ),
    },
    {
      headerName: "ICMS-ST",
      field: "flagIcmsSt",
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-blue-500">
            <CheckCircle className="w-3 h-3 mr-1" /> Sim
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" /> Não
          </Badge>
        )
      ),
    },
    {
      headerName: "Diferimento",
      field: "flagIcmsDif",
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-purple-500">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        )
      ),
    },
    {
      headerName: "IPI Suspenso",
      field: "flagIpiSuspenso",
      width: 130,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-orange-500">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        )
      ),
    },
    {
      headerName: "Importação",
      field: "flagImportacao",
      width: 120,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-red-500">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        )
      ),
    },
    {
      headerName: "Prioridade",
      field: "priority",
      width: 110,
      filter: "agNumberColumnFilter",
      cellClass: "text-center",
    },
    {
      headerName: "Status",
      field: "isActive",
      width: 110,
      cellRenderer: (params: ICellRendererParams) => (
        params.value ? (
          <Badge variant="default" className="bg-green-600">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )
      ),
    },
    {
      headerName: "Ações",
      field: "id",
      width: 120,
      pinned: "right",
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex gap-2 items-center h-full">
          <button
            onClick={() => handleEdit(params.data)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={() => handleDelete(params.data.id)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                <GradientText>Regras PCG-NCM</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerenciar relacionamento entre NCM e Plano de Contas Gerencial com flags fiscais
              </p>
            </div>
            <div className="flex gap-3">
              <RippleButton
                variant="outline"
                onClick={fetchRules}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </RippleButton>
              <RippleButton
                variant="outline"
                onClick={exportToExcel}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </RippleButton>
              <RippleButton onClick={openModal}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </RippleButton>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total de Regras
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      <NumberCounter value={stats.total} />
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Monofásicas
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      <NumberCounter value={stats.monofasico} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.monofasico / stats.total) * 100) : 0}% do total
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Com ICMS-ST
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      <NumberCounter value={stats.icmsSt} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.icmsSt / stats.total) * 100) : 0}% do total
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Regras Ativas
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      <NumberCounter value={stats.active} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% do total
                    </p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.5}>
          <GlassmorphismCard className="p-6">
            {/* Quick Filter */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Buscar NCM, descrição ou conta..."
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
              />
            </div>

            <div
              className="ag-theme-quartz aurora-premium-grid"
              style={{ height: 600 }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={rules}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[20, 50, 100]}
                quickFilterText={quickFilterText}
                rowHeight={50}
                theme={auraTheme}
                loading={loading}
                loadingOverlayComponent={() => <div>Carregando...</div>}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-2xl font-bold">
                  {editingRule ? "Editar Regra" : "Nova Regra"} PCG-NCM
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* NCM Code */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Código NCM *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Ex: 2710.19.21 ou 8421*"
                    value={formData.ncmCode}
                    onChange={(e) =>
                      setFormData({ ...formData, ncmCode: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use * para wildcards (ex: 8421* para todos os NCMs que começam com 8421)
                  </p>
                </div>

                {/* NCM Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição NCM
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Ex: Óleo Diesel S-10 / S-500"
                    value={formData.ncmDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, ncmDescription: e.target.value })
                    }
                  />
                </div>

                {/* PCG */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Plano de Contas Gerencial (PCG) *
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={formData.pcgId}
                    onChange={(e) =>
                      setFormData({ ...formData, pcgId: parseInt(e.target.value) })
                    }
                  >
                    <option value="">Selecione...</option>
                    {pcgOptions.map((pcg) => (
                      <option key={pcg.id} value={pcg.id}>
                        {pcg.code} - {pcg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Flags Fiscais */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Flags Fiscais
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.flagPisCofinsMono}
                        onChange={(e) =>
                          setFormData({ ...formData, flagPisCofinsMono: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span>PIS/COFINS Monofásico</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.flagIcmsSt}
                        onChange={(e) =>
                          setFormData({ ...formData, flagIcmsSt: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span>ICMS Substituição Tributária</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.flagIcmsDif}
                        onChange={(e) =>
                          setFormData({ ...formData, flagIcmsDif: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span>ICMS Diferimento</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.flagIpiSuspenso}
                        onChange={(e) =>
                          setFormData({ ...formData, flagIpiSuspenso: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span>IPI Suspenso</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.flagImportacao}
                        onChange={(e) =>
                          setFormData({ ...formData, flagImportacao: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span>Item Importado</span>
                    </label>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prioridade
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Menor = maior prioridade (use 10 para NCMs exatos, 50+ para wildcards)
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingRule ? "Atualizar" : "Criar"} Regra
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}





