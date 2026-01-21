"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams } from "ag-grid-community";
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
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { AccountingAIWidget } from "@/components/accounting";
import { Plus, Edit, Trash2, FolderTree, Target, TrendingUp } from "lucide-react";
import { StatusCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { toast } from "sonner";

interface CostCenter {
  id: number;
  code: string;
  name: string;
  type: "ANALYTIC" | "SYNTHETIC";
  parentId: number | null;
  level: number;
  linkedVehicleId: number | null;
  status: string;
}

export default function CostCentersPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ANALYTIC" as "ANALYTIC" | "SYNTHETIC",
    parentId: null as number | null,
  });

  const columnDefs: ColDef[] = [
    {
      field: "code",
      headerName: "Código",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: (params: ICellRendererParams<CostCenter>) => {
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
      width: 130,
      cellRenderer: (params: ICellRendererParams<CostCenter>) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            params.value === "ANALYTIC"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {params.value === "ANALYTIC" ? "Analítico" : "Sintético"}
        </span>
      ),
    },
    {
      field: "linkedVehicleId",
      headerName: "Veículo",
      width: 100,
      cellRenderer: (params: ICellRendererParams<CostCenter>) =>
        params.value ? `#${params.value}` : "-",
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      cellRenderer: StatusCellRenderer,
    },
    {
      headerName: "Ações",
      width: 120,
      cellRenderer: (params: ICellRendererParams<CostCenter>) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => params.data && handleEdit(params.data)}
            disabled={!params.data}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => params.data && handleDelete(params.data.id)}
            disabled={!params.data}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const fetchCostCenters = useCallback(async () => {
    try {
      const response = await fetch("/api/financial/cost-centers");
      const result = await response.json();
      if (result.success) {
        setCostCenters(result.data.flat);
      }
    } catch (error) {
      console.error("Erro ao buscar centros de custo:", error);
      toast.error("Erro ao carregar centros de custo");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCostCenters();
  }, [fetchCostCenters]);

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      code: "",
      name: "",
      type: "ANALYTIC",
      parentId: null,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (data: CostCenter) => {
    setIsEditing(true);
    setCurrentId(data.id);
    setFormData({
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este centro de custo?")) return;

    try {
      const response = await fetch(`/api/financial/cost-centers/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Centro de custo excluído!");
        fetchCostCenters();
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir centro de custo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = isEditing
        ? `/api/financial/cost-centers/${currentId}`
        : "/api/financial/cost-centers";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          isEditing
            ? "Centro de custo atualizado!"
            : "Centro de custo criado!"
        );
        setIsDialogOpen(false);
        fetchCostCenters();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar centro de custo");
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
              🎯 Centros de Custo
            </h1>
            <p className="text-sm text-slate-400">
              Estrutura hierárquica para controle de custos
            </p>
          </div>
          <RippleButton 
            onClick={handleCreate}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Centro de Custo
          </RippleButton>
        </div>
      </FadeIn>

      {/* KPI Cards */}
      <StaggerContainer>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Centros */}
          <FadeIn delay={0.15}>
            <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                    <FolderTree className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                    Total
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Centros</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <NumberCounter value={costCenters.length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Analíticos */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
              <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                    <Target className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                    Analítico
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Centros Analíticos</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  <NumberCounter value={costCenters.filter(c => c.type === 'ANALYTIC').length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Sintéticos */}
          <FadeIn delay={0.25}>
            <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
              <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                    <TrendingUp className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                    Sintético
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Centros Sintéticos</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  <NumberCounter value={costCenters.filter(c => c.type === 'SYNTHETIC').length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
          <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 550px)', width: "100%", minHeight: '400px' }}>
              <AgGridReact
                ref={gridRef}
                rowData={costCenters}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar" : "Novo"} Centro de Custo
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="1.1.01"
                required
              />
            </div>

            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Veículo ABC-1234"
                required
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "ANALYTIC" | "SYNTHETIC") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANALYTIC">Analítico</SelectItem>
                  <SelectItem value="SYNTHETIC">Sintético</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Centro de Custo Pai (Opcional)</Label>
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
                  <SelectValue placeholder="Nenhum (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (raiz)</SelectItem>
                  {costCenters
                    .filter((cc) => cc.type === "SYNTHETIC")
                    .map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
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

      {/* AI Insight Widget - Assistente Centros de Custo */}
      <AccountingAIWidget screen="cost-centers" defaultMinimized={true} />
    </>
  );
}
