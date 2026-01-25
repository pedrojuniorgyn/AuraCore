"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, ICellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([AllEnterpriseModule]);
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GridPattern } from "@/components/ui/animated-background";
import { RippleButton } from "@/components/ui/ripple-button";
import { CommercialAIWidget } from "@/components/commercial";
import { Plus, Edit, Trash2, Table2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { fetchAPI } from "@/lib/api";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface FreightTable {
  id: number;
  name: string;
  type: string;
  transportType: string;
  status: string;
}

interface Route {
  originUf: string;
  destinationUf: string;
  prices: Price[];
}

interface Price {
  minWeight: string;
  maxWeight: string;
  price: string;
  excessPrice: string;
}

interface Generality {
  name: string;
  type: string;
  value: string;
  minValue: string;
  incidence: string;
  isActive: boolean;
}

export default function FreightTablesPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [tables, setTables] = useState<FreightTable[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [, setCurrentId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "GENERAL",
    transportType: "FTL_LOTACAO",
    calculationType: "WEIGHT_RANGE",
    minFreightValue: "0.00",
    validFrom: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [routes, setRoutes] = useState<Route[]>([{
    originUf: "SP",
    destinationUf: "RJ",
    prices: [{ minWeight: "0", maxWeight: "100", price: "100.00", excessPrice: "1.50" }],
  }]);

  const [generalities, setGeneralities] = useState<Generality[]>([
    { name: "Ad Valorem", type: "PERCENTAGE", value: "0.30", minValue: "10.00", incidence: "ON_VALUE", isActive: true },
    { name: "GRIS", type: "PERCENTAGE", value: "0.15", minValue: "5.00", incidence: "ON_VALUE", isActive: true },
  ]);

  const columnDefs: ColDef[] = [
    {
      field: "name",
      headerName: "Nome",
      width: 250,
      filter: "agTextColumnFilter",
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 150,
      cellRenderer: (params: ICellRendererParams) => (
        <span className={`px-2 py-1 rounded text-xs ${
          params.value === "GENERAL" 
            ? "bg-blue-100 text-blue-700" 
            : "bg-purple-100 text-purple-700"
        }`}>
          {params.value === "GENERAL" ? "Geral" : "Cliente Específico"}
        </span>
      ),
    },
    {
      field: "transportType",
      headerName: "Transporte",
      width: 150,
      cellRenderer: (params: ICellRendererParams) => (
        <span className={`px-2 py-1 rounded text-xs ${
          params.value === "FTL_LOTACAO" 
            ? "bg-green-100 text-green-700" 
            : "bg-orange-100 text-orange-700"
        }`}>
          {params.value === "FTL_LOTACAO" ? "Lotação" : "Fracionado"}
        </span>
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
      width: 150,
      cellRenderer: (params: ICellRendererParams) => (
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

  const fetchTables = async () => {
    try {
      const result = await fetchAPI<{ success: boolean; data: FreightTable[] }>("/api/commercial/freight-tables");
      if (result.success) {
        setTables(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar tabelas:", error);
      toast.error("Erro ao carregar tabelas de frete");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTables();
  }, []);

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: "",
      code: "",
      type: "GENERAL",
      transportType: "FTL_LOTACAO",
      calculationType: "WEIGHT_RANGE",
      minFreightValue: "0.00",
      validFrom: new Date().toISOString().split("T")[0],
      description: "",
    });
    setRoutes([{
      originUf: "SP",
      destinationUf: "RJ",
      prices: [{ minWeight: "0", maxWeight: "100", price: "100.00", excessPrice: "1.50" }],
    }]);
    setIsDialogOpen(true);
  };

  const handleEdit = (data: FreightTable) => {
    setIsEditing(true);
    setCurrentId(data.id);
    // TODO: Carregar dados completos
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta tabela?")) return;

    try {
      await fetchAPI(`/api/commercial/freight-tables/${id}`, {
        method: "DELETE",
      });
      toast.success("Tabela excluída!");
      fetchTables();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir tabela");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetchAPI("/api/commercial/freight-tables", {
        method: "POST",
        body: {
          ...formData,
          routes,
          generalities,
        },
      });

      toast.success("Tabela criada com sucesso!");
      setIsDialogOpen(false);
      fetchTables();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar tabela");
    }
  };

  const addRoute = () => {
    setRoutes([
      ...routes,
      {
        originUf: "SP",
        destinationUf: "RJ",
        prices: [{ minWeight: "0", maxWeight: "100", price: "100.00", excessPrice: "1.50" }],
      },
    ]);
  };

  const addPriceToRoute = (routeIndex: number) => {
    const newRoutes = [...routes];
    newRoutes[routeIndex].prices.push({
      minWeight: "0",
      maxWeight: "100",
      price: "100.00",
      excessPrice: "1.50",
    });
    setRoutes(newRoutes);
  };

  return (
    <>
      <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent animate-gradient">
              💰 Tabelas de Frete
            </h1>
            <p className="text-sm text-slate-400">
              Gestão de Preços e Rotas Geográficas
            </p>
          </div>
          <RippleButton onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tabela
          </RippleButton>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div>
          <div className="space-y-4 mb-4">
            <h2 className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Tabelas Cadastradas ({tables.length})
            </h2>
          </div>
          <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div style={{ height: "calc(100vh - 300px)", width: "100%" }} className="ag-theme-quartz-dark">
              <AgGridReact
                ref={gridRef}
                
                rowData={tables}
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
        </div>
      </FadeIn>

      {/* Dialog Master-Detail */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar" : "Nova"} Tabela de Frete
            </DialogTitle>
            <DialogDescription>
              Configure rotas, faixas de peso e generalidades
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="rotas">Rotas & Preços</TabsTrigger>
                <TabsTrigger value="generalidades">Generalidades</TabsTrigger>
              </TabsList>

              {/* Aba 1: Geral */}
              <TabsContent value="geral" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Código</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                        <SelectItem value="GENERAL">Geral</SelectItem>
                        <SelectItem value="CLIENT_SPECIFIC">Cliente Específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Transporte</Label>
                    <Select
                      value={formData.transportType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, transportType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FTL_LOTACAO">Lotação</SelectItem>
                        <SelectItem value="LTL_FRACIONADO">Fracionado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Frete Mínimo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minFreightValue}
                      onChange={(e) =>
                        setFormData({ ...formData, minFreightValue: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Vigência Inicial *</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </TabsContent>

              {/* Aba 2: Rotas */}
              <TabsContent value="rotas" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Rotas Configuradas</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addRoute}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Rota
                  </Button>
                </div>

                {routes.map((route, routeIndex) => (
                  <Card key={routeIndex}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RouteIcon className="h-4 w-4" />
                        Rota #{routeIndex + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>UF Origem</Label>
                          <Select
                            value={route.originUf}
                            onValueChange={(value) => {
                              const newRoutes = [...routes];
                              newRoutes[routeIndex].originUf = value;
                              setRoutes(newRoutes);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UFS.map((uf) => (
                                <SelectItem key={uf} value={uf}>
                                  {uf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>UF Destino</Label>
                          <Select
                            value={route.destinationUf}
                            onValueChange={(value) => {
                              const newRoutes = [...routes];
                              newRoutes[routeIndex].destinationUf = value;
                              setRoutes(newRoutes);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UFS.map((uf) => (
                                <SelectItem key={uf} value={uf}>
                                  {uf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Faixas de Peso</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addPriceToRoute(routeIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Faixa
                          </Button>
                        </div>

                        {route.prices.map((price, priceIndex) => (
                          <div
                            key={priceIndex}
                            className="grid grid-cols-4 gap-2 mb-2 p-2 bg-muted/50 rounded"
                          >
                            <Input
                              type="number"
                              placeholder="Min (kg)"
                              value={price.minWeight}
                              onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[routeIndex].prices[priceIndex].minWeight =
                                  e.target.value;
                                setRoutes(newRoutes);
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Max (kg)"
                              value={price.maxWeight}
                              onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[routeIndex].prices[priceIndex].maxWeight =
                                  e.target.value;
                                setRoutes(newRoutes);
                              }}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Preço"
                              value={price.price}
                              onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[routeIndex].prices[priceIndex].price =
                                  e.target.value;
                                setRoutes(newRoutes);
                              }}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Excedente"
                              value={price.excessPrice}
                              onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[routeIndex].prices[priceIndex].excessPrice =
                                  e.target.value;
                                setRoutes(newRoutes);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Aba 3: Generalidades */}
              <TabsContent value="generalidades" className="space-y-4">
                <h4 className="font-semibold">Taxas Extras</h4>
                {generalities.map((gen, index) => (
                  <div key={index} className="p-4 border rounded">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Nome</Label>
                        <Input value={gen.name} readOnly />
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={gen.value}
                          onChange={(e) => {
                            const newGen = [...generalities];
                            newGen[index].value = e.target.value;
                            setGeneralities(newGen);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Mínimo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={gen.minValue}
                          onChange={(e) => {
                            const newGen = [...generalities];
                            newGen[index].minValue = e.target.value;
                            setGeneralities(newGen);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end mt-6">
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
      
      {/* AI Assistant Widget - FORA do PageTransition (FIXED-001) */}
      <CommercialAIWidget screen="price-tables" defaultMinimized={true} />
    </>
  );
}
