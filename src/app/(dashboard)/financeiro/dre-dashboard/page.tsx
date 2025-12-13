"use client";

import { useState, useEffect } from "react";
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
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { RippleButton } from "@/components/ui/ripple-button";
import { NumberCounter } from "@/components/ui/magic-components";
import { TrendingUp, TrendingDown, DollarSign, Truck, Calendar } from "lucide-react";
import { toast } from "sonner";

interface DreData {
  revenues: number;
  operationalCosts: number;
  ownFleetCosts: number;
  thirdPartyCosts: number;
  administrativeCosts: number;
  financialCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export default function DreDashboardPage() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [dreData, setDreData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDre = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial/reports/dre/consolidated?startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();

      if (result.success) {
        // Simular dados para demonstração
        const mockData: DreData = {
          revenues: 150000,
          operationalCosts: 90000,
          ownFleetCosts: 45000,
          thirdPartyCosts: 35000,
          administrativeCosts: 10000,
          financialCosts: 5000,
          grossProfit: 60000,
          netProfit: 45000,
          profitMargin: 30,
        };
        setDreData(mockData);
      }
    } catch (error) {
      console.error("Erro ao buscar DRE:", error);
      toast.error("Erro ao carregar DRE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDre();
  }, []);

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
              Dashboard DRE (Demonstração de Resultados)
            </h1>
            <p className="text-sm text-slate-400">
              Análise Gerencial Completa - Visão 360°
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Filtros */}
      <FadeIn delay={0.15}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Filtros de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <RippleButton onClick={fetchDre} className="w-full">
                  {loading ? "Carregando..." : "Atualizar"}
                </RippleButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {dreData && (
        <>
          {/* KPIs Principais */}
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <TrendingUp className="h-4 w-4" />
                      Receitas Totais
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberCounter value={dreData.revenues} duration={2} decimals={0} prefix="R$ " />
                    </div>
                    <div className="text-xs opacity-75">
                      {formatCurrency(dreData.revenues)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <TrendingDown className="h-4 w-4" />
                      Custos Operacionais
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberCounter value={dreData.operationalCosts} duration={2} decimals={0} prefix="R$ " />
                    </div>
                    <div className="text-xs opacity-75">
                      {formatCurrency(dreData.operationalCosts)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <DollarSign className="h-4 w-4" />
                      Lucro Líquido
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberCounter value={dreData.netProfit} duration={2} decimals={0} prefix="R$ " />
                    </div>
                    <div className="text-xs opacity-75">
                      {formatCurrency(dreData.netProfit)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <Truck className="h-4 w-4" />
                      Margem Líquida
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberCounter value={dreData.profitMargin} duration={2} decimals={1} suffix="%" />
                    </div>
                    <div className="text-xs opacity-75">
                      Rentabilidade
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeIn>

          {/* DRE Detalhado */}
          <FadeIn delay={0.25}>
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Receitas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">
                    (+) Receitas Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span>Receitas de Frete</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(dreData.revenues)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="font-semibold">Receita Bruta</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(dreData.revenues)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Custos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">
                    (-) Custos Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span>Frota Própria</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(dreData.ownFleetCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span>Terceiros/Agregados</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(dreData.thirdPartyCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="font-semibold">Total Custos</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(dreData.operationalCosts)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeIn>

          {/* Resultado Final */}
          <FadeIn delay={0.3}>
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-2xl text-blue-600">
                  Resultado Final do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
                    <span className="text-lg">Receitas</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(dreData.revenues)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
                    <span className="text-lg">(-) Custos</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(dreData.operationalCosts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
                    <span className="text-lg">(=) Lucro Bruto</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(dreData.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
                    <span className="text-lg">(-) Despesas Administrativas</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(dreData.administrativeCosts)}
                    </span>
                  </div>
                  <div className="h-px bg-blue-300 my-4"></div>
                  <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-lg text-white">
                    <span className="text-2xl font-bold">(=) LUCRO LÍQUIDO</span>
                    <span className="text-3xl font-bold">
                      {formatCurrency(dreData.netProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </>
      )}
    </PageTransition>
  );
}



