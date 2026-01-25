"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, ICellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// Registrar módulos Enterprise
ModuleRegistry.registerModules([AllEnterpriseModule]);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { AccountingAIWidget } from "@/components/accounting";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { Plus, Edit, Trash2, BookOpen, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { StatusCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";

interface ChartAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  category: string | null;
  parentId: number | null;
  level: number;
  acceptsCostCenter: boolean;
  requiresCostCenter: boolean;
  status: string;
}

export default function ChartOfAccountsPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "EXPENSE" as string,
    category: "" as string,
    parentId: null as number | null,
    acceptsCostCenter: false,
    requiresCostCenter: false,
  });

  // ✅ CELL RENDERERS - MESMO PADRÃO DE CATEGORIAS
  const ActionCellRenderer = (props: ICellRendererParams<ChartAccount>) => {
    return (
      <div className="flex gap-2 h-full items-center justify-center">
        <button
          onClick={() => props.data && handleEdit(props.data)}
          disabled={!props.data}
          className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          title="Editar"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => props.data && handleDelete(props.data.id)}
          disabled={!props.data}
          className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const TypeCellRenderer = (props: ICellRendererParams<ChartAccount>) => {
    const colors: Record<string, string> = {
      REVENUE: "bg-green-500/20 text-green-400 border-green-500/30",
      EXPENSE: "bg-red-500/20 text-red-400 border-red-500/30",
      ASSET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      LIABILITY: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      EQUITY: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[props.value] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
        {props.value}
      </span>
    );
  };

  const RequiresCCCellRenderer = (props: ICellRendererParams<ChartAccount>) => {
    return props.value ? (
      <span className="text-red-400 font-semibold">Sim</span>
    ) : (
      <span className="text-gray-500">-</span>
    );
  };

  const columnDefs: ColDef[] = [
    {
      field: "code",
      headerName: "Código",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: (params: ICellRendererParams<ChartAccount>) => {
        const indent = "  ".repeat(params.data?.level || 0);
        return `${indent}${params.value}`;
      },
    },
    {
      field: "name",
      headerName: "Nome",
      flex: 1,
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
      field: "category",
      headerName: "Categoria",
      width: 180,
      filter: "agTextColumnFilter",
      valueFormatter: (params) => params.value || "-",
    },
    {
      field: "requiresCostCenter",
      headerName: "Exige CC",
      width: 100,
      filter: "agSetColumnFilter",
      cellRenderer: RequiresCCCellRenderer,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      filter: "agSetColumnFilter",
      filterParams: {
        buttons: ["apply", "reset"],
        closeOnApply: true,
        excelMode: "windows", // ✅ Ativa search nativo!
      },
      cellRenderer: StatusCellRenderer,
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

  const fetchAccounts = useCallback(async () => {
    try {
      const result = await fetchAPI<{ success: boolean; data: { flat: ChartAccount[] } }>("/api/financial/chart-accounts");
      if (result.success) {
        setAccounts(result.data.flat);
      }
    } catch (error) {
      console.error("Erro ao buscar plano de contas:", error);
      toast.error("Erro ao carregar plano de contas");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      code: "",
      name: "",
      type: "EXPENSE",
      category: "",
      parentId: null,
      acceptsCostCenter: false,
      requiresCostCenter: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (data: ChartAccount) => {
    setIsEditing(true);
    setCurrentId(data.id);
    setFormData({
      code: data.code,
      name: data.name,
      type: data.type,
      category: data.category || "",
      parentId: data.parentId,
      acceptsCostCenter: data.acceptsCostCenter,
      requiresCostCenter: data.requiresCostCenter,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir esta conta?")) return;

    try {
      await fetchAPI(`/api/financial/chart-accounts/${id}`, {
        method: "DELETE",
      });
      toast.success("Conta excluída!");
      fetchAccounts();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir conta");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = isEditing
        ? `/api/financial/chart-accounts/${currentId}`
        : "/api/financial/chart-accounts";
      const method = isEditing ? "PUT" : "POST";

      await fetchAPI(url, {
        method,
        body: {
          ...formData,
          category: formData.category || null,
        },
      });

      toast.success(isEditing ? "Conta atualizada!" : "Conta criada!");
      setIsDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar conta");
    }
  };

  return (
    <>
      <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              📊 Plano de Contas
            </h1>
            <p className="text-sm text-slate-400">
              Estrutura contábil hierárquica
            </p>
          </div>
          <RippleButton 
            onClick={handleCreate}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </RippleButton>
        </div>
      </FadeIn>

      {/* KPI Cards */}
      <StaggerContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Contas */}
          <FadeIn delay={0.15}>
            <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                    <BookOpen className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                    Total
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Contas</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <NumberCounter value={accounts.length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Receitas */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
              <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                    Receitas
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Contas de Receita</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  <NumberCounter value={accounts.filter(a => a.type === 'REVENUE').length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Despesas */}
          <FadeIn delay={0.25}>
            <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20">
              <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner">
                    <TrendingDown className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30">
                    Despesas
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Contas de Despesa</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                  <NumberCounter value={accounts.filter(a => a.type === 'EXPENSE').length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Ativos */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
              <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                    <Landmark className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                    Ativos
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Ativos/Passivos</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  <NumberCounter value={accounts.filter(a => ['ASSET', 'LIABILITY', 'EQUITY'].includes(a.type)).length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </StaggerContainer>

      <FadeIn delay={0.35}>
        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
          <div style={{ height: 'calc(100vh - 600px)', width: "100%", minHeight: '400px' }} className="ag-theme-quartz-dark">
              <AgGridReact
                ref={gridRef}
                rowData={accounts}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true,
                  floatingFilter: true,
                  enableRowGroup: true,
                  enablePivot: true,
                  enableValue: true,
                }}
                sideBar={{
                  toolPanels: [
                    { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                    { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
                  ],
                  defaultToolPanel: "",
                }}
                enableRangeSelection={true}
                rowGroupPanelShow="always"
                groupDisplayType="groupRows"
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                domLayout="normal"
              />
            </div>
          </div>
      </FadeIn>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar" : "Nova"} Conta
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="4.1.01"
                  required
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVENUE">Receita</SelectItem>
                    <SelectItem value="EXPENSE">Despesa</SelectItem>
                    <SelectItem value="ASSET">Ativo</SelectItem>
                    <SelectItem value="LIABILITY">Passivo</SelectItem>
                    <SelectItem value="EQUITY">Patrimônio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Combustível"
                required
              />
            </div>

            <div>
              <Label>Categoria (Opcional)</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  <SelectItem value="OPERATIONAL_OWN_FLEET">
                    Operacional - Frota Própria
                  </SelectItem>
                  <SelectItem value="OPERATIONAL_THIRD_PARTY">
                    Operacional - Terceiros
                  </SelectItem>
                  <SelectItem value="ADMINISTRATIVE">
                    Administrativa
                  </SelectItem>
                  <SelectItem value="FINANCIAL">Financeira</SelectItem>
                  <SelectItem value="TAX">Tributária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Conta Pai (Opcional)</Label>
              <Select
                value={formData.parentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentId: value === "none" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="accepts"
                  checked={formData.acceptsCostCenter}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptsCostCenter: checked })
                  }
                />
                <Label htmlFor="accepts" className="text-sm">
                  Aceita Centro de Custo
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires"
                  checked={formData.requiresCostCenter}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiresCostCenter: checked })
                  }
                />
                <Label htmlFor="requires" className="text-sm font-semibold text-red-600">
                  Exige Centro de Custo
                </Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </PageTransition>

      {/* AI Insight Widget - Assistente Plano de Contas */}
      <AccountingAIWidget screen="chart-of-accounts" defaultMinimized={true} />
    </>
  );
}
