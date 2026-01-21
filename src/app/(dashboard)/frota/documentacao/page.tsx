"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgGridReact } from "ag-grid-react";
import { ColDef, CellStyle } from "ag-grid-community";
import { FleetAIWidget } from "@/components/fleet";

export default function FleetDocsPage() {
  const router = useRouter();
  const [vehicleDocs, setVehicleDocs] = useState([]);
  const [driverDocs, setDriverDocs] = useState([]);

  const handleEdit = (data: { id: number }) => {
    router.push(`/frota/documentacao/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      const res = await fetch(`/api/fleet/documents/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      // Recarregar dados
      fetch("/api/fleet/documents?type=vehicle").then(r => r.json()).then(d => setVehicleDocs(d.data || []));
      fetch("/api/fleet/documents?type=driver").then(r => r.json()).then(d => setDriverDocs(d.data || []));
    } catch { toast.error("Erro ao excluir"); }
  };

  useEffect(() => {
    fetch("/api/fleet/documents?type=vehicle").then(r => r.json()).then(d => setVehicleDocs(d.data || []));
    fetch("/api/fleet/documents?type=driver").then(r => r.json()).then(d => setDriverDocs(d.data || []));
  }, []);

  const vehicleColumns: ColDef[] = [
    { field: "vehicleId", headerName: "Veículo ID", width: 120 },
    { field: "documentType", headerName: "Tipo", width: 150 },
    { field: "documentNumber", headerName: "Número", width: 150 },
    { 
      field: "expiryDate", 
      headerName: "Vencimento", 
      width: 130,
      valueFormatter: (p) => new Date(p.value).toLocaleDateString("pt-BR"),
      cellStyle: ((p: { value: string | Date }) => {
        const diff = new Date(p.value).getTime() - Date.now();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 0) return { backgroundColor: "#ef4444", color: "white" };
        if (days < 30) return { backgroundColor: "#f59e0b", color: "white" };
        return {};
      }) as unknown as CellStyle,
    },
    { field: "status", headerName: "Status", width: 120 },
  ];

  const driverColumns: ColDef[] = [
    { field: "driverId", headerName: "Motorista ID", width: 140 },
    { field: "documentType", headerName: "Tipo", width: 150 },
    { field: "documentNumber", headerName: "Número", width: 150 },
    { 
      field: "expiryDate", 
      headerName: "Vencimento", 
      width: 130,
      valueFormatter: (p) => new Date(p.value).toLocaleDateString("pt-BR"),
      cellStyle: ((p: { value: string | Date }) => {
        const diff = new Date(p.value).getTime() - Date.now();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 0) return { backgroundColor: "#ef4444", color: "white" };
        if (days < 30) return { backgroundColor: "#f59e0b", color: "white" };
        return {};
      }) as unknown as CellStyle,
    },
    { field: "status", headerName: "Status", width: 120 },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
        📋 Documentação de Frota
      </h1>

      <Tabs defaultValue="vehicles" className="flex-1">
        <TabsList>
          <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="drivers">Motoristas</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="ag-theme-quartz-dark">
          <AgGridReact 
            columnDefs={vehicleColumns} 
            rowData={vehicleDocs} 
            pagination 
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
                { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
              ],
              defaultToolPanel: "",
            }}
            enableRangeSelection={true}
            rowGroupPanelShow="always"
            groupDisplayType="groupRows"
            paginationPageSizeSelector={[10, 20, 50, 100]}
          />
        </TabsContent>

        <TabsContent value="drivers" className="ag-theme-quartz-dark">
          <AgGridReact 
            columnDefs={driverColumns} 
            rowData={driverDocs} 
            pagination 
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
                { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
              ],
              defaultToolPanel: "",
            }}
            enableRangeSelection={true}
            rowGroupPanelShow="always"
            groupDisplayType="groupRows"
            paginationPageSizeSelector={[10, 20, 50, 100]}
          />
        </TabsContent>
      </Tabs>

      {/* AI Insight Widget - Assistente de Documentos */}
      <FleetAIWidget screen="documentacao" defaultMinimized={true} />
    </div>
  );
}
