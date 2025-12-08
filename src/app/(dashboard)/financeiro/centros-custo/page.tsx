"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Plus, Edit, Trash2, FolderTree } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
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
      cellRenderer: (params: any) => {
        const indent = "  ".repeat(params.data.level || 0);
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
      cellRenderer: (params: any) => (
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
      cellRenderer: (params: any) =>
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
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(params.data)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(params.data.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const fetchCostCenters = async () => {
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
  };

  useEffect(() => {
    fetchCostCenters();
  }, []);

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
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Centros de Custo
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Estrutura hierárquica para controle de custos
            </p>
          </div>
          <ShimmerButton onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Centro de Custo
          </ShimmerButton>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Árvore de Centros de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={costCenters}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                }}
                pagination={true}
                paginationPageSize={20}
                domLayout="normal"
              />
            </div>
          </CardContent>
        </Card>
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
  );
}

