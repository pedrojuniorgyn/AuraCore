"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { Badge } from "@/components/ui/badge";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { ActionCellRenderer, BooleanCellRenderer } from "@/components/ag-grid/renderers/aurora-renderers";
import { Plus, Layers, Target, Truck, Building2 } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function GestaoCC3DPage() {
  const gridRef = useRef<any>(null);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const response = await fetch('/api/cost-centers/3d');
      const result = await response.json();
      if (result.success) {
        setCostCenters(result.data);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = [
    { field: 'code', headerName: 'Código', width: 180, pinned: 'left', filter: 'agTextColumnFilter', floatingFilter: true },
    { field: 'name', headerName: 'Nome', flex: 2, filter: 'agTextColumnFilter', floatingFilter: true },
    { 
      field: 'service_type', 
      headerName: 'Tipo Serviço (D2)',
      cellRenderer: (params: any) => {
        const types: any = {
          FTL: { label: 'Lotação', color: 'bg-purple-500/20 text-purple-400' },
          LTL: { label: 'Fracionado', color: 'bg-blue-500/20 text-blue-400' },
          ARMAZ: { label: 'Armazenagem', color: 'bg-green-500/20 text-green-400' },
          DISTR: { label: 'Distribuição', color: 'bg-yellow-500/20 text-yellow-400' }
        };
        const type = types[params.value] || { label: '-', color: 'bg-gray-500/20' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
      filter: 'agSetColumnFilter',
      width: 150
    },
    { 
      field: 'linked_object_type', 
      headerName: 'Objeto (D3)',
      cellRenderer: (params: any) => params.value ? <Badge className="aurora-badge">{params.value}</Badge> : '-',
      filter: 'agSetColumnFilter',
      width: 120
    },
    { field: 'linked_object_id', headerName: 'ID Objeto', width: 120 },
    { field: 'is_analytical', headerName: 'Analítico', cellRenderer: BooleanCellRenderer, filter: 'agSetColumnFilter', width: 120 },
    { field: 'branch_name', headerName: 'Filial (D1)', filter: 'agTextColumnFilter', width: 150 },
    { field: 'actions', headerName: 'Ações', cellRenderer: ActionCellRenderer, cellRendererParams: { onEdit: (data: any) => console.log('Edit', data), onDelete: (data: any) => console.log('Delete', data) }, width: 120, pinned: 'right' }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">Gestão de Centros de Custo 3D</GradientText>
              <p className="text-gray-400">Dimensões: Filial + Serviço + Objeto de Custo</p>
            </div>
            <RippleButton>
              <Plus className="w-4 h-4 mr-2" />Novo CC 3D
            </RippleButton>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Layers className="w-10 h-10 text-purple-400" />
                <div>
                  <NumberCounter value={245} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Total CCs 3D</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Building2 className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={3} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Filiais (D1)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Truck className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={4} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Tipos Serviço (D2)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="pulsating hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Target className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={1856} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Objetos (D3)</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">Centros de Custo Tridimensionais</GradientText>
            
            <div className="ag-theme-quartz-dark" style={{ height: '600px' }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={costCenters}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                sideBar={{ toolPanels: ['columns', 'filters'] }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                theme={auraTheme}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


