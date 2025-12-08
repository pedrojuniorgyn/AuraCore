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
import { Switch } from "@/components/ui/switch";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { StatusCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { toast } from "sonner";

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
      width: 120,
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = {
          REVENUE: "bg-green-100 text-green-700",
          EXPENSE: "bg-red-100 text-red-700",
          ASSET: "bg-blue-100 text-blue-700",
          LIABILITY: "bg-orange-100 text-orange-700",
          EQUITY: "bg-purple-100 text-purple-700",
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${colors[params.value] || ""}`}>
            {params.value}
          </span>
        );
      },
    },
    {
      field: "category",
      headerName: "Categoria",
      width: 180,
      cellRenderer: (params: any) => params.value || "-",
    },
    {
      field: "requiresCostCenter",
      headerName: "Exige CC",
      width: 100,
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="text-red-600 font-semibold">Sim</span>
        ) : (
          "-"
        ),
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

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/financial/chart-accounts");
      const result = await response.json();
      if (result.success) {
        setAccounts(result.data.flat);
      }
    } catch (error) {
      console.error("Erro ao buscar plano de contas:", error);
      toast.error("Erro ao carregar plano de contas");
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

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
      const response = await fetch(`/api/financial/chart-accounts/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Conta excluída!");
        fetchAccounts();
      } else {
        toast.error(result.error || "Erro ao excluir");
      }
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          category: formData.category || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(isEditing ? "Conta atualizada!" : "Conta criada!");
        setIsDialogOpen(false);
        fetchAccounts();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar conta");
    }
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Plano de Contas
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Estrutura contábil hierárquica
            </p>
          </div>
          <ShimmerButton onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </ShimmerButton>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Árvore de Contas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={accounts}
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
  );
}

