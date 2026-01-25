"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef, ICellRendererParams } from "ag-grid-community";
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
import { fetchAPI } from "@/lib/api";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface CostCenter3D {
  code: string;
  name: string;
  service_type: 'FTL' | 'LTL' | 'ARMAZ' | 'DISTR';
  linked_object_type?: string;
  linked_object_id?: string;
  is_analytical: boolean;
  branch_name: string;
}

export default function GestaoCC3DPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [costCenters, setCostCenters] = useState<CostCenter3D[]>([]);
  const [loading, setLoading] = useState(true);

  // Calcular stats a partir dos dados carregados
  const stats = useMemo(() => {
    if (costCenters.length === 0) {
      return { totalCCs: 0, branches: 0, serviceTypes: 0, objects: 0 };
    }
    
    const uniqueBranches = new Set(costCenters.map(cc => cc.branch_name));
    const uniqueServiceTypes = new Set(costCenters.map(cc => cc.service_type));
    const objectsCount = costCenters.filter(cc => cc.linked_object_id).length;
    
    return {
      totalCCs: costCenters.length,
      branches: uniqueBranches.size,
      serviceTypes: uniqueServiceTypes.size,
      objects: objectsCount
    };
  }, [costCenters]);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const result = await fetchAPI<{ success: boolean; data: CostCenter3D[] }>('/api/cost-centers/3d');
      if (result.success) {
        setCostCenters(result.data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'code', headerName: 'Código', width: 180, pinned: 'left', filter: 'agTextColumnFilter', floatingFilter: true },
    { field: 'name', headerName: 'Nome', flex: 2, filter: 'agTextColumnFilter', floatingFilter: true },
    { 
      field: 'service_type', 
      headerName: 'Tipo Serviço (D2)',
      cellRenderer: (params: ICellRendererParams<CostCenter3D>) => {
        const types: Record<string, { label: string; color: string }> = {
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
      cellRenderer: (params: ICellRendererParams<CostCenter3D>) => params.value ? <Badge className="aurora-badge">{params.value}</Badge> : '-',
      filter: 'agSetColumnFilter',
      width: 120
    },
    { field: 'linked_object_id', headerName: 'ID Objeto', width: 120 },
    { field: 'is_analytical', headerName: 'Analítico', cellRenderer: BooleanCellRenderer, filter: 'agSetColumnFilter', width: 120 },
    { field: 'branch_name', headerName: 'Filial (D1)', filter: 'agTextColumnFilter', width: 150 },
    { field: 'actions', headerName: 'Ações', cellRenderer: ActionCellRenderer, cellRendererParams: { onEdit: (data: CostCenter3D) => console.log('Edit', data), onDelete: (data: CostCenter3D) => console.log('Delete', data) }, width: 120, pinned: 'right' }
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
                  <NumberCounter value={stats.totalCCs} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Total CCs 3D</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Building2 className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={stats.branches} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Filiais (D1)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Truck className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={stats.serviceTypes} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Tipos Serviço (D2)</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className={`hover:scale-105 transition-transform ${stats.objects > 0 ? 'pulsating' : ''}`}>
              <div className="flex items-center gap-4">
                <Target className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={stats.objects} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Objetos (D3)</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <GradientText className="text-2xl mb-4">Centros de Custo Tridimensionais</GradientText>
            
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)" }}>
              <AgGridReact
                ref={gridRef}
                
                rowData={costCenters}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                sideBar={{ toolPanels: ['columns', 'filters'] }}
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


