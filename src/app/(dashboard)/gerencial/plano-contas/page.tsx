"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { 
  TypeCellRenderer,
  AllocationRuleCellRenderer,
  AllocationBaseCellRenderer,
  BooleanCellRenderer,
  ActionCellRenderer
} from "@/components/ag-grid/renderers/aurora-renderers";
import { Plus, FileText, BookOpen, Settings } from "lucide-react";
import { fetchAPI } from "@/lib/api";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface ChartAccount {
  code: string;
  name: string;
  type: string;
  legal_account_code?: string;
  legal_account_id?: number;
  allocation_rule?: string;
  allocation_base?: string;
  is_analytical: boolean;
}

export default function GestaoPCGPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    analytical: 0,
    mapped: 0,
    rules: 0
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await fetchAPI<{ success: boolean; data: ChartAccount[] }>('/api/management/chart-accounts');
        
        if (result.success) {
          setAccounts(result.data);
          calculateStats(result.data);
        }
      } catch (error) {
        console.error("Erro ao buscar contas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const calculateStats = (data: ChartAccount[]) => {
    setStats({
      total: data.length,
      analytical: data.filter(a => a.is_analytical).length,
      mapped: data.filter(a => a.legal_account_id).length,
      rules: data.filter(a => a.allocation_rule && a.allocation_rule !== 'MANUAL').length
    });
  };

  const columnDefs: ColDef[] = [
    { 
      field: 'code', 
      headerName: 'Código',
      width: 180,
      pinned: 'left',
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'name', 
      headerName: 'Nome da Conta',
      flex: 2,
      filter: 'agTextColumnFilter',
      floatingFilter: true
    },
    { 
      field: 'type', 
      headerName: 'Tipo',
      cellRenderer: TypeCellRenderer,
      filter: 'agSetColumnFilter',
      width: 130
    },
    { 
      field: 'legal_account_code', 
      headerName: 'Conta Legal (PCC)',
      width: 150
    },
    { 
      field: 'allocation_rule', 
      headerName: 'Regra Alocação',
      cellRenderer: AllocationRuleCellRenderer,
      filter: 'agSetColumnFilter',
      width: 150
    },
    { 
      field: 'allocation_base', 
      headerName: 'Base',
      cellRenderer: AllocationBaseCellRenderer,
      width: 150
    },
    { 
      field: 'is_analytical', 
      headerName: 'Analítica',
      cellRenderer: BooleanCellRenderer,
      filter: 'agSetColumnFilter',
      width: 120
    },
    { 
      field: 'actions', 
      headerName: 'Ações',
      cellRenderer: ActionCellRenderer,
      cellRendererParams: {
        onEdit: (data: ChartAccount) => console.log('Edit', data),
        onDelete: (data: ChartAccount) => console.log('Delete', data)
      },
      width: 120,
      pinned: 'right'
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                Gestão de Plano Gerencial (PCG)
              </GradientText>
              <p className="text-gray-400">
                Contas Gerenciais para DRE Customizado
              </p>
            </div>
            <RippleButton>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta Gerencial
            </RippleButton>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <BookOpen className="w-10 h-10 text-purple-400" />
                <div>
                  <NumberCounter value={stats.total} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Contas Gerenciais</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <FileText className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={stats.analytical} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Contas Analíticas</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Settings className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={stats.mapped} suffix="%" className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Mapeadas (PCC↔PCG)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform pulsating">
              <div className="flex items-center gap-4">
                <Settings className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={stats.rules} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Regras de Alocação</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">
              Plano de Contas Gerencial
            </GradientText>
            
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)", width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                
                rowData={accounts}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true
                }}
                sideBar={{
                  toolPanels: ['columns', 'filters']
                }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


