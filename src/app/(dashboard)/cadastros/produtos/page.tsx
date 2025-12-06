"use client";

import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";

// Registra módulos do AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

interface IProduct {
  id: number;
  sku: string;
  name: string;
  unit: string;
  ncm: string;
  weightKg: number | null;
  priceSale: number | null;
  status: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { currentBranch } = useTenant();
  const gridRef = useRef<AgGridReact>(null);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<IProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Busca produtos da API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch(`/api/products?_start=0&_end=100`, {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar produtos");
        return;
      }

      const result = await response.json();

      console.log("✅ Produtos carregados:", result);

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("❌ Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega ao montar
  useEffect(() => {
    fetchProducts();
  }, []);

  /**
   * Formata NCM para exibição
   */
  const formatNCM = (ncm: string) => {
    if (!ncm || ncm.length !== 8) return ncm;
    return `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6)}`;
  };

  /**
   * Formata preço BRL
   */
  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  /**
   * Formata peso
   */
  const formatWeight = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return `${value.toFixed(3)} kg`;
  };

  /**
   * Handler de Delete (Soft Delete)
   */
  const handleDelete = async (productId: number, productName: string) => {
    if (!confirm(`Confirma a exclusão de "${productName}"?`)) return;

    try {
      const branchId = localStorage.getItem("auracore:current-branch") || "1";
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao excluir produto");
        return;
      }

      toast.success("Produto inativado com sucesso!");
      fetchProducts(); // Recarrega a lista
    } catch (error) {
      console.error("❌ Erro ao deletar:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  // Definição das colunas do AG Grid
  const columnDefs: ColDef<IProduct>[] = useMemo(
    () => [
      {
        headerName: "#ID",
        field: "id",
        width: 80,
        sortable: true,
      },
      {
        headerName: "SKU",
        field: "sku",
        width: 150,
        sortable: true,
        filter: true,
        cellStyle: { fontWeight: "600", fontFamily: "monospace" },
      },
      {
        headerName: "Nome do Produto",
        field: "name",
        flex: 1,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => (
          <button
            onClick={() => router.push(`/cadastros/produtos/edit/${params.data.id}`)}
            className="text-left hover:text-primary hover:underline"
          >
            {params.value}
          </button>
        ),
      },
      {
        headerName: "Unidade",
        field: "unit",
        width: 100,
        sortable: true,
      },
      {
        headerName: "NCM",
        field: "ncm",
        width: 150,
        sortable: true,
        valueFormatter: (params) => formatNCM(params.value),
        cellStyle: { fontFamily: "monospace" },
      },
      {
        headerName: "Peso (kg)",
        field: "weightKg",
        width: 120,
        sortable: true,
        valueFormatter: (params) => formatWeight(params.value),
        cellStyle: { textAlign: "right" },
      },
      {
        headerName: "Preço Venda",
        field: "priceSale",
        width: 140,
        sortable: true,
        valueFormatter: (params) => formatPrice(params.value),
        cellStyle: { textAlign: "right", fontWeight: "600" },
      },
      {
        headerName: "Status",
        field: "status",
        width: 120,
        sortable: true,
        cellRenderer: (params: any) => {
          const variant = params.value === "ACTIVE" ? "default" : "secondary";
          const label = params.value === "ACTIVE" ? "Ativo" : "Inativo";
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        headerName: "Ações",
        width: 120,
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-2 h-full">
            <button
              onClick={() => router.push(`/cadastros/produtos/edit/${params.data.id}`)}
              className="text-primary hover:text-primary/80"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(params.data.id, params.data.name)}
              className="text-destructive hover:text-destructive/80"
              title="Excluir"
            >
              🗑️
            </button>
          </div>
        ),
      },
    ],
    [router]
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
    }),
    []
  );

  // Tema Dark do AG Grid
  const darkTheme = themeQuartz.withParams({
    backgroundColor: "hsl(var(--card))",
    foregroundColor: "hsl(var(--card-foreground))",
    borderColor: "hsl(var(--border))",
    headerBackgroundColor: "hsl(var(--muted))",
    headerTextColor: "hsl(var(--muted-foreground))",
    oddRowBackgroundColor: "hsl(var(--card))",
    rowHoverColor: "hsl(var(--accent))",
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Produtos
          </h2>
          <p className="text-muted-foreground">
            Filial: {currentBranch?.name || "Carregando..."}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchProducts()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={() => router.push("/cadastros/produtos/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por SKU ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Busque por SKU, nome ou descrição
          </p>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : (
            <div style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={darkTheme}
                rowData={data}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                loading={false}
                animateRows={true}
                rowSelection={{ mode: "multiRow" }}
                suppressCellFocus={true}
                enableCellTextSelection={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



