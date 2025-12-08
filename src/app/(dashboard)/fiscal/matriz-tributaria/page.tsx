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
import { Plus, Edit, Calculator, FileSpreadsheet } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { StatusCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { toast } from "sonner";

interface TaxRule {
  id: number;
  originUf: string;
  destinationUf: string;
  icmsRate: string;
  icmsStRate?: string;
  cfopInternal?: string;
  cfopInterstate?: string;
  regime: string;
  status: string;
}

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function MatrizTributariaPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    originUf: "SP",
    destinationUf: "RJ",
    icmsRate: "12.00",
    icmsStRate: "",
    cfopInternal: "5353",
    cfopInterstate: "6353",
    regime: "NORMAL",
  });

  const [testParams, setTestParams] = useState({
    originUf: "SP",
    destinationUf: "RJ",
    serviceValue: "1000",
  });

  const columnDefs: ColDef[] = [
    {
      field: "originUf",
      headerName: "Origem",
      width: 100,
      filter: "agTextColumnFilter",
    },
    {
      field: "destinationUf",
      headerName: "Destino",
      width: 100,
      filter: "agTextColumnFilter",
    },
    {
      field: "icmsRate",
      headerName: "ICMS %",
      width: 100,
      cellRenderer: (params: any) => (
        <span className="font-semibold">{parseFloat(params.value).toFixed(2)}%</span>
      ),
    },
    {
      field: "cfopInterstate",
      headerName: "CFOP",
      width: 100,
      cellRenderer: (params: any) => params.value || params.data.cfopInternal || "-",
    },
    {
      field: "regime",
      headerName: "Regime",
      width: 150,
      cellRenderer: (params: any) => (
        <span className={`px-2 py-1 rounded text-xs ${
          params.value === "NORMAL" 
            ? "bg-blue-100 text-blue-700" 
            : "bg-green-100 text-green-700"
        }`}>
          {params.value}
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
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(params.data)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/fiscal/tax-matrix");
      const result = await response.json();
      if (result.success) {
        setRules(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar matriz:", error);
      toast.error("Erro ao carregar matriz tributária");
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      originUf: "SP",
      destinationUf: "RJ",
      icmsRate: "12.00",
      icmsStRate: "",
      cfopInternal: "5353",
      cfopInterstate: "6353",
      regime: "NORMAL",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (data: TaxRule) => {
    setIsEditing(true);
    setCurrentId(data.id);
    setFormData({
      originUf: data.originUf,
      destinationUf: data.destinationUf,
      icmsRate: data.icmsRate,
      icmsStRate: data.icmsStRate || "",
      cfopInternal: data.cfopInternal || "5353",
      cfopInterstate: data.cfopInterstate || "6353",
      regime: data.regime,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = isEditing
        ? `/api/fiscal/tax-matrix/${currentId}`
        : "/api/fiscal/tax-matrix";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          icmsRate: parseFloat(formData.icmsRate),
          icmsStRate: formData.icmsStRate ? parseFloat(formData.icmsStRate) : null,
          validFrom: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(isEditing ? "Regra atualizada!" : "Regra criada!");
        setIsDialogOpen(false);
        fetchRules();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar regra");
    }
  };

  const handleTest = async () => {
    try {
      const response = await fetch(
        `/api/fiscal/tax-matrix/calculate?originUf=${testParams.originUf}&destUf=${testParams.destinationUf}&serviceValue=${testParams.serviceValue}`
      );
      const result = await response.json();
      
      if (result.success) {
        setTestResult(result.data);
        toast.success("Cálculo realizado!");
      } else {
        toast.error(result.error || "Erro ao calcular");
      }
    } catch (error) {
      console.error("Erro ao testar:", error);
      toast.error("Erro ao testar cálculo");
    }
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Matriz Tributária
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Alíquotas de ICMS por UF (27x27 = 729 rotas)
            </p>
          </div>
          <ShimmerButton onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </ShimmerButton>
        </div>
      </FadeIn>

      {/* Calculadora de Teste */}
      <FadeIn delay={0.15}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de ICMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>UF Origem</Label>
                <Select
                  value={testParams.originUf}
                  onValueChange={(value) =>
                    setTestParams({ ...testParams, originUf: value })
                  }
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
                  value={testParams.destinationUf}
                  onValueChange={(value) =>
                    setTestParams({ ...testParams, destinationUf: value })
                  }
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
                <Label>Valor do Serviço</Label>
                <Input
                  type="number"
                  value={testParams.serviceValue}
                  onChange={(e) =>
                    setTestParams({ ...testParams, serviceValue: e.target.value })
                  }
                />
              </div>

              <div className="flex items-end">
                <ShimmerButton onClick={handleTest} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular
                </ShimmerButton>
              </div>
            </div>

            {/* Resultado do Teste */}
            {testResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Resultado:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Rota:</span>
                    <span className="ml-2 font-semibold">{testResult.route}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Alíquota ICMS:</span>
                    <span className="ml-2 font-semibold">
                      {testResult.taxInfo.icmsRate.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CFOP:</span>
                    <span className="ml-2 font-semibold">{testResult.taxInfo.cfop}</span>
                  </div>
                  {testResult.icmsCalculation && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Base ICMS:</span>
                        <span className="ml-2 font-semibold">
                          R$ {testResult.icmsCalculation.base.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor ICMS:</span>
                        <span className="ml-2 font-semibold text-red-600">
                          R$ {testResult.icmsCalculation.value.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taxa Efetiva:</span>
                        <span className="ml-2 font-semibold">
                          {testResult.icmsCalculation.effectiveRate.toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Grid de Regras */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Matriz Completa ({rules.length} regras)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={rules}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                }}
                pagination={true}
                paginationPageSize={50}
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
              {isEditing ? "Editar" : "Nova"} Regra Fiscal
            </DialogTitle>
            <DialogDescription>
              Configure ICMS e CFOP para uma rota específica
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>UF Origem *</Label>
                <Select
                  value={formData.originUf}
                  onValueChange={(value) =>
                    setFormData({ ...formData, originUf: value })
                  }
                  disabled={isEditing}
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
                <Label>UF Destino *</Label>
                <Select
                  value={formData.destinationUf}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destinationUf: value })
                  }
                  disabled={isEditing}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alíquota ICMS (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.icmsRate}
                  onChange={(e) =>
                    setFormData({ ...formData, icmsRate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label>ICMS-ST (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.icmsStRate}
                  onChange={(e) =>
                    setFormData({ ...formData, icmsStRate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CFOP Interno</Label>
                <Input
                  value={formData.cfopInternal}
                  onChange={(e) =>
                    setFormData({ ...formData, cfopInternal: e.target.value })
                  }
                  maxLength={4}
                />
              </div>

              <div>
                <Label>CFOP Interestadual</Label>
                <Input
                  value={formData.cfopInterstate}
                  onChange={(e) =>
                    setFormData({ ...formData, cfopInterstate: e.target.value })
                  }
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label>Regime Tributário</Label>
              <Select
                value={formData.regime}
                onValueChange={(value) =>
                  setFormData({ ...formData, regime: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                </SelectContent>
              </Select>
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

