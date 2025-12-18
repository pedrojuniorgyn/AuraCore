/**
 * AG Grid v34.3 - Integrated Charts
 * 
 * Componente de gráficos financeiros usando AG Charts integrado ao AG Grid
 */

"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { CurrencyCellRenderer } from "@/lib/ag-grid/cell-renderers";

ModuleRegistry.registerModules([AllCommunityModule]);

interface CategoryData {
  category: string;
  total: number;
  count: number;
  avgValue: number;
}

export const FinancialCharts: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("pie");

  // Dados de exemplo (em produção, viria da API)
  const categoryData: CategoryData[] = useMemo(
    () => [
      {
        category: "Fornecedores (NFe)",
        total: 45230.5,
        count: 12,
        avgValue: 3769.21,
      },
      {
        category: "Salários",
        total: 28500.0,
        count: 8,
        avgValue: 3562.5,
      },
      {
        category: "Combustível",
        total: 15780.0,
        count: 22,
        avgValue: 717.27,
      },
      {
        category: "Manutenção",
        total: 8950.0,
        count: 5,
        avgValue: 1790.0,
      },
      {
        category: "Aluguel",
        total: 6500.0,
        count: 2,
        avgValue: 3250.0,
      },
      {
        category: "Impostos",
        total: 12340.0,
        count: 4,
        avgValue: 3085.0,
      },
    ],
    []
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "category",
        headerName: "Categoria",
        flex: 1,
        chartDataType: "category",
      },
      {
        field: "total",
        headerName: "Total",
        width: 150,
        cellRenderer: CurrencyCellRenderer,
        type: "numericColumn",
        chartDataType: "series",
        aggFunc: "sum",
      },
      {
        field: "count",
        headerName: "Qtde",
        width: 100,
        type: "numericColumn",
        chartDataType: "series",
        aggFunc: "sum",
      },
      {
        field: "avgValue",
        headerName: "Média",
        width: 140,
        cellRenderer: CurrencyCellRenderer,
        type: "numericColumn",
        chartDataType: "series",
        aggFunc: "avg",
      },
    ],
    []
  );

  // Cria gráfico programaticamente
  const createChart = useCallback((type: "bar" | "pie" | "line") => {
    const gridApi = gridRef.current?.api;
    if (!gridApi) return;

    setChartType(type);

    // Remove gráficos anteriores
    const chartModels = gridApi.getChartModels();
    chartModels?.forEach((model) => {
      gridApi.destroyChart(model.chartId);
    });

    // Cria novo gráfico
    const chartRangeParams: any = {
      cellRange: {
        columns: type === "pie" 
          ? ["category", "total"] 
          : ["category", "total", "count"],
      },
      chartType: type === "pie" ? "pie" : type === "line" ? "line" : "bar",
      chartThemeOverrides: {
        common: {
          padding: {
            top: 20,
            right: 20,
            bottom: 40,
            left: 20,
          },
          legend: {
            position: "bottom",
          },
        },
      },
      unlinkChart: false,
    };

    gridApi.createRangeChart(chartRangeParams);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Despesas por Categoria
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => createChart("pie")}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Pizza
            </Button>
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => createChart("bar")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Barras
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => createChart("line")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Linha
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 500, width: "100%" }}>
          <AgGridReact
            ref={gridRef}
            rowData={categoryData}
            columnDefs={columnDefs}
            theme={auraTheme}
            // 📊 Charts Configuration
            enableCharts={true}
            enableRangeSelection={true}
            // 🎨 Auto-Size
            autoSizeStrategy={{
              type: "fitGridWidth",
              defaultMinWidth: 100,
            }}
            // 📊 Aggregation
            groupIncludeTotalFooter={true}
            grandTotalRow="bottom"
            // 🌐 Localização
            localeText={{
              noRowsToShow: "Nenhum dado disponível",
              sum: "Total",
              avg: "Média",
            }}
            // 🎯 Callbacks
            onFirstDataRendered={(params) => {
              // Cria gráfico de pizza automaticamente ao carregar
              setTimeout(() => createChart("pie"), 500);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};



















