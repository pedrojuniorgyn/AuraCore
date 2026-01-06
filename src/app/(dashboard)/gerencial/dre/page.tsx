"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef, ICellRendererParams } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { Badge } from "@/components/ui/badge";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { 
  VarianceCellRenderer,
  currencyFormatter,
  ActionCellRenderer
} from "@/components/ag-grid/renderers/aurora-renderers";
import { 
  FileSpreadsheet,
  FileText,
  BarChart3,
  TrendingUp,
  DollarSign,
  PiggyBank,
  TrendingDown
} from "lucide-react";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface DREItem {
  accountCode: string;
  currentMonth: number;
}

export default function DREGerencialPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [dreData, setDreData] = useState<DREItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    receitaLiquida: 0,
    custosVariaveis: 0,
    margemContribuicao: 0,
    ebitda: 0
  });

  useEffect(() => {
    fetchDREData();
  }, []);

  const fetchDREData = async () => {
    try {
      const period = new Date().toISOString().slice(0, 7);
      const response = await fetch(`/api/management/dre?period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setDreData(result.data);
        calculateKPIs(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar DRE:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (data: DREItem[]) => {
    const revenue = data.filter(d => d.accountCode.startsWith('3.1')).reduce((sum, d) => sum + d.currentMonth, 0);
    const costs = data.filter(d => d.accountCode.startsWith('4.1')).reduce((sum, d) => sum + Math.abs(d.currentMonth), 0);
    const margin = revenue - costs;
    const ebitda = margin * 0.6; // Simplificado

    setKpis({
      receitaLiquida: revenue,
      custosVariaveis: costs,
      margemContribuicao: margin,
      ebitda
    });
  };

  const exportExcel = () => {
    gridRef.current?.api?.exportDataAsExcel({
      fileName: `DRE_Gerencial_${new Date().toISOString().slice(0,10)}.xlsx`
    });
  };

  const columnDefs: ColDef[] = [
    { 
      field: 'accountCode', 
      headerName: 'Código',
      width: 150,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams) => (
        <Badge className="aurora-badge bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 border-purple-500/30">
          {params.value}
        </Badge>
      ),
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'accountName', 
      headerName: 'Descrição',
      flex: 2,
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'currentMonth', 
      headerName: 'Mês Atual',
      valueFormatter: currencyFormatter,
      cellStyle: { fontWeight: 'bold', fontSize: '1.05em' },
      filter: 'agNumberColumnFilter',
      floatingFilter: true,
      aggFunc: 'sum'
    },
    { 
      field: 'lastMonth', 
      headerName: 'Mês Anterior',
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
      aggFunc: 'sum'
    },
    { 
      field: 'variance', 
      headerName: 'Var. %',
      cellRenderer: VarianceCellRenderer,
      filter: 'agNumberColumnFilter',
      width: 150
    },
    { 
      field: 'ytd', 
      headerName: 'Acumulado Ano',
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
      aggFunc: 'sum'
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                Dashboard DRE Gerencial
              </GradientText>
              <p className="text-gray-400">
                Visão Executiva de Resultados
              </p>
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="aurora-purple-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-xl">
                  <DollarSign className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Receita Líquida</p>
                  <div className="flex items-baseline gap-2">
                    <NumberCounter 
                      value={kpis.receitaLiquida} 
                      prefix="R$ "
                      duration={2}
                      className="text-2xl font-bold text-purple-300"
                    />
                  </div>
                  <Badge variant="success" className="mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12.5%
                  </Badge>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-blue-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-600/30 to-cyan-600/30 rounded-xl">
                  <TrendingDown className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Custos Variáveis</p>
                  <NumberCounter 
                    value={kpis.custosVariaveis} 
                    prefix="R$ "
                    duration={2}
                    className="text-2xl font-bold text-blue-300"
                  />
                  <Badge variant="warning" className="mt-1">
                    61.2% da receita
                  </Badge>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-green-shadow hover:scale-105 transition-transform pulsating">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-600/30 to-emerald-600/30 rounded-xl">
                  <PiggyBank className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Margem Contribuição</p>
                  <NumberCounter 
                    value={kpis.margemContribuicao} 
                    prefix="R$ "
                    duration={2}
                    className="text-2xl font-bold text-green-300"
                  />
                  <Badge variant="success" className="mt-1">
                    38.8%
                  </Badge>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-gold-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-yellow-600/30 to-orange-600/30 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">EBITDA Gerencial</p>
                  <NumberCounter 
                    value={kpis.ebitda} 
                    prefix="R$ "
                    duration={2}
                    className="text-2xl font-bold text-yellow-300"
                  />
                  <Badge className="mt-1 bg-yellow-500/20 text-yellow-400">
                    21.8% margem
                  </Badge>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        {/* Grid DRE */}
        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <div className="flex justify-between items-center mb-4">
              <GradientText className="text-2xl">
                DRE Gerencial Consolidado
              </GradientText>
              <div className="flex gap-2">
                <RippleButton onClick={exportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </RippleButton>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)", width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={dreData}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true
                }}
                enableRangeSelection={true}
                enableCharts={true}
                pagination={true}
                paginationPageSize={50}
                sideBar={{
                  toolPanels: [
                    'columns',
                    'filters',
                    {
                      id: 'advanced',
                      labelKey: 'Filtros Avançados',
                      toolPanel: 'agFiltersToolPanel'
                    }
                  ] as unknown as string[]
                }}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


