"use client";

import { useEffect, useState, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { Plus, Download, RefreshCw, Save, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { auraTheme } from "@/lib/ag-grid/theme";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface NCMCategory {
  id: number;
  ncmCode: string;
  financialCategoryId: number;
  financialCategoryName: string;
  chartAccountId: number;
  chartAccountCode: string;
  chartAccountName: string;
}

export default function NCMCategoriasPage() {
  const router = useRouter();
  const [rowData, setRowData] = useState<NCMCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);
  const gridRef = useRef<AgGridReact>(null);

  const handleEdit = (data: NCMCategory) => {
    router.push(`/fiscal/ncm-categorias/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      const res = await fetch(`/api/fiscal/ncm-categories/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      fetchData();
    } catch (error) { toast.error("Erro ao excluir"); }
  };

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fiscal/ncm-categories");
      if (response.ok) {
        const data = await response.json();
        setRowData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar NCM:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [catRes, coaRes] = await Promise.all([
        fetch("/api/financial/categories"),
        fetch("/api/fiscal/chart-of-accounts"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }
      if (coaRes.ok) {
        const coaData = await coaRes.json();
        setChartAccounts(Array.isArray(coaData) ? coaData : []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados mestres:", error);
    }
  };

  const handleSeedNCMs = async () => {
    if (!confirm("Importar 40 NCMs padrão do transporte?")) return;

    try {
      const response = await fetch("/api/admin/seed-ncm-categories", {
        method: "POST",
      });

      if (response.ok) {
        alert("NCMs importados com sucesso!");
        fetchData();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao importar NCMs:", error);
      alert("Erro ao importar NCMs");
    }
  };

  const handleExport = () => {
    gridRef.current?.api?.exportDataAsExcel({
      fileName: `ncm_categorias_${new Date().toISOString().split("T")[0]}.xlsx`,
    });
  };

  const columnDefs: ColDef[] = [
    {
      field: "ncmCode",
      headerName: "NCM",
      width: 130,
      filter: "agSetColumnFilter",
      editable: false,
      pinned: "left",
    },
    {
      field: "financialCategoryName",
      headerName: "Categoria Financeira",
      width: 250,
      filter: "agSetColumnFilter",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: categories.map((c) => c.name),
      },
      editable: true,
    },
    {
      field: "chartAccountCode",
      headerName: "Conta",
      width: 120,
      filter: "agTextColumnFilter",
      editable: false,
    },
    {
      field: "chartAccountName",
      headerName: "Nome da Conta",
      flex: 1,
      filter: "agTextColumnFilter",
      editable: false,
    },
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                <GradientText>Categorização de NCMs</GradientText>
              </h1>
              <p className="text-white/60 mt-2">
                Configure a categorização automática por NCM
              </p>
            </div>
            <div className="flex gap-3">
              <RippleButton variant="secondary" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </RippleButton>
              <RippleButton variant="secondary" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </RippleButton>
              <RippleButton onClick={handleSeedNCMs}>
                <Plus className="mr-2 h-4 w-4" />
                Importar NCMs Padrão
              </RippleButton>
            </div>
          </div>
        </FadeIn>

        <GlassmorphismCard className="p-6">
          <div
            className="ag-theme-quartz-dark"
            style={{ height: "calc(100vh - 280px)", width: "100%" }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: true,
              }}
              
              modules={[AllEnterpriseModule]}
              pagination={true}
              paginationPageSize={50}
              loading={loading}
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
            />
          </div>
        </GlassmorphismCard>

        <div className="text-sm text-white/50">
          💡 <strong>Dica:</strong> Ao importar NCMs padrão, você terá 40 categorias pré-configuradas
          para transporte (combustível, pneus, peças, etc.)
        </div>
      </div>
    </PageTransition>
  );
}

