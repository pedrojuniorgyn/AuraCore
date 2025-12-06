"use client";

import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";

// Registra módulos do AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

// Tema escuro personalizado do AG Grid v34
const darkTheme = themeQuartz.withParams({
  accentColor: "#3b82f6",
  backgroundColor: "#0a0a0a",
  foregroundColor: "#fafafa",
  borderColor: "#262626",
  headerBackgroundColor: "#171717",
});

/**
 * 🤝 LISTAGEM DE PARCEIROS DE NEGÓCIO
 * 
 * Tela de listagem com AG Grid:
 * - Busca em tempo real
 * - Filtros por tipo e status
 * - Ordenação e paginação
 * - Ações: Editar e Inativar (Soft Delete)
 * - Badge coloridas por tipo e status
 */

export default function BusinessPartnersPage() {
  const router = useRouter();
  const { currentBranch } = useTenant();
  const gridRef = useRef<AgGridReact>(null);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Busca dados da API
  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";
      
      const response = await fetch(`/api/business-partners?_start=0&_end=100`, {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar parceiros");
        return;
      }

      const result = await response.json();
      
      console.log("✅ Dados carregados:", result);
      
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("❌ Erro ao buscar parceiros:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega ao montar
  useEffect(() => {
    fetchPartners();
  }, []);

  /**
   * Formata CNPJ/CPF para exibição
   */
  const formatDocument = (doc: string): string => {
    if (!doc) return "";
    const cleaned = doc.replace(/\D/g, "");
    
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return doc;
  };

  /**
   * Badge colorida por tipo
   */
  const TypeBadge = ({ type }: { type: string }) => {
    const variants: Record<string, any> = {
      CLIENT: { variant: "info" as const, label: "Cliente" },
      PROVIDER: { variant: "success" as const, label: "Fornecedor" },
      CARRIER: { variant: "warning" as const, label: "Transportadora" },
      BOTH: { variant: "default" as const, label: "Cliente e Fornecedor" },
    };

    const config = variants[type] || { variant: "outline", label: type };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  /**
   * Badge por status
   */
  const StatusBadge = ({ status }: { status: string }) => {
    return status === "ACTIVE" ? (
      <Badge variant="success">Ativo</Badge>
    ) : (
      <Badge variant="outline">Inativo</Badge>
    );
  };

  /**
   * Botões de ação (Editar e Inativar)
   */
  const ActionButtons = ({ data }: { data: any }) => {
    const handleEdit = () => {
      router.push(`/cadastros/parceiros/edit/${data.id}`);
    };

    const handleDelete = async () => {
      if (confirm(`Confirma a exclusão de "${data.name}"?`)) {
        try {
          const branchId = localStorage.getItem("auracore:current-branch") || "1";
          const response = await fetch(`/api/business-partners/${data.id}`, {
            method: "DELETE",
            headers: {
              "x-branch-id": branchId,
            },
          });

          if (!response.ok) {
            toast.error("Erro ao excluir parceiro");
            return;
          }

          toast.success("Parceiro inativado com sucesso!");
          fetchPartners(); // Recarrega a lista
        } catch (error) {
          console.error("❌ Erro ao deletar:", error);
          toast.error("Erro ao excluir parceiro");
        }
      }
    };

    return (
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEdit}
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          title="Inativar"
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  /**
   * Definição de colunas do AG Grid
   */
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "#ID",
        field: "id",
        width: 80,
        sortable: true,
      },
      {
        headerName: "Tipo",
        field: "type",
        width: 180,
        cellRenderer: (params: any) => <TypeBadge type={params.value} />,
      },
      {
        headerName: "Documento",
        field: "document",
        width: 180,
        valueFormatter: (params: any) => formatDocument(params.value),
      },
      {
        headerName: "Razão Social",
        field: "name",
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: any) => (
          <button
            onClick={() => router.push(`/cadastros/parceiros/edit/${params.data.id}`)}
            className="text-blue-500 hover:underline text-left"
          >
            {params.value}
          </button>
        ),
      },
      {
        headerName: "Cidade/UF",
        field: "cityName",
        width: 200,
        valueFormatter: (params: any) =>
          params.data.cityName && params.data.state
            ? `${params.data.cityName}/${params.data.state}`
            : "",
      },
      {
        headerName: "Status",
        field: "status",
        width: 120,
        cellRenderer: (params: any) => <StatusBadge status={params.value} />,
      },
      {
        headerName: "Ações",
        field: "actions",
        width: 120,
        cellRenderer: (params: any) => <ActionButtons data={params.data} />,
        sortable: false,
        filter: false,
      },
    ],
    [router]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Parceiros de Negócio</h2>
          <p className="text-muted-foreground">
            Filial: {currentBranch?.tradeName || "Todas"}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchPartners()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={() => router.push("/cadastros/parceiros/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Parceiro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque por nome, documento ou cidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input
              placeholder="Buscar por nome, documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Carregando parceiros...</p>
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

