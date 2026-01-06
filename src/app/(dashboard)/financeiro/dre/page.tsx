"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { RippleButton } from "@/components/ui/ripple-button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

interface ExpenseItem {
  code: string;
  name: string;
  total: number;
}

interface DREConsolidatedData {
  expenses: ExpenseItem[];
  revenue?: number;
  netIncome?: number;
}

interface DREByPlateItem {
  costCenterName: string;
  costCenterCode: string;
  margin: number;
  netProfit: number;
  revenue?: number;
  expenses?: number;
}

interface DREByDimensionItem {
  dimension: string;
  margin: number;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
}

interface DREData {
  type: string;
  period: { startDate: string; endDate: string };
  data: DREConsolidatedData | DREByPlateItem[] | DREByDimensionItem[];
}

export default function DREPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportType, setReportType] = useState<
    "consolidated" | "by_plate" | "by_dimension"
  >("consolidated");
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecione o período!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/financial/reports/dre?type=${reportType}&startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();

      if (result.success) {
        setDreData(result);
        toast.success("DRE gerado com sucesso!");
      } else {
        toast.error(result.error || "Erro ao gerar DRE");
      }
    } catch (error) {
      console.error("Erro ao gerar DRE:", error);
      toast.error("Erro ao gerar DRE");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              📊 DRE - Demonstração de Resultado
            </h1>
            <p className="text-sm text-slate-400">
              Relatórios gerenciais multi-dimensionais
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Filtros */}
      <FadeIn delay={0.2}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Tipo de Relatório</Label>
                <Select
                  value={reportType}
                  onValueChange={(
                    value: "consolidated" | "by_plate" | "by_dimension"
                  ) => setReportType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consolidated">Consolidado</SelectItem>
                    <SelectItem value="by_plate">Por Placa</SelectItem>
                    <SelectItem value="by_dimension">Por Dimensão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <RippleButton
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {isLoading ? "Processando..." : "Gerar DRE"}
                </RippleButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Resultados */}
      {dreData && (
        <>
          {/* DRE Consolidado */}
          {dreData.type === "consolidated" && (
            <FadeIn delay={0.3}>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Receita Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <NumberCounter
                        value={dreData.data.totalRevenue}
                        className="text-2xl font-bold text-green-600"
                        prefix="R$ "
                        decimals={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Despesa Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <NumberCounter
                        value={dreData.data.totalExpense}
                        className="text-2xl font-bold text-red-600"
                        prefix="R$ "
                        decimals={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Lucro Líquido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign
                        className={`h-5 w-5 ${
                          dreData.data.netProfit >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      />
                      <NumberCounter
                        value={dreData.data.netProfit}
                        className={`text-2xl font-bold ${
                          dreData.data.netProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                        prefix="R$ "
                        decimals={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Margem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-bold text-blue-600">
                        {dreData.data.margin.toFixed(2)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Despesas por Conta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(dreData.data as DREConsolidatedData).expenses.map((exp: ExpenseItem, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 border-b"
                      >
                        <div>
                          <span className="font-medium">{exp.code}</span> -{" "}
                          {exp.name}
                        </div>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(exp.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* DRE por Placa */}
          {dreData.type === "by_plate" && (
            <FadeIn delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle>Resultado por Placa (Frota Própria)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dreData.data as DREByPlateItem[]).map((item: DREByPlateItem, idx: number) => (
                      <Card key={idx} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg">
                              {item.costCenterName}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              {item.costCenterCode}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              Margem
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                item.margin >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.margin.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Receita
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(item.revenue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Despesa
                            </div>
                            <div className="text-lg font-semibold text-red-600">
                              {formatCurrency(item.expense)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Lucro
                            </div>
                            <div
                              className={`text-lg font-semibold ${
                                item.netProfit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(item.netProfit)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* DRE por Dimensão */}
          {dreData.type === "by_dimension" && (
            <FadeIn delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Resultado por Dimensão (Frota Própria vs Terceiros)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(dreData.data as DREByDimensionItem[]).map((item: DREByDimensionItem, idx: number) => (
                      <Card key={idx} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg capitalize">
                              {item.dimension.replace("_", " ")}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              Margem
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                item.margin >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.margin.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Receita
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(item.revenue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Despesa
                            </div>
                            <div className="text-lg font-semibold text-red-600">
                              {formatCurrency(item.expense)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Lucro
                            </div>
                            <div
                              className={`text-lg font-semibold ${
                                item.netProfit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(item.netProfit)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </>
      )}
    </PageTransition>
  );
}

