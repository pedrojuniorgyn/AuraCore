"use client";

import { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";

interface KPIs {
  totalRecoverable: string;
  totalIcms: string;
  totalPis: string;
  totalCofins: string;
}

export default function TaxCreditsPage() {
  const [credits, setCredits] = useState([]);
  const [kpis, setKpis] = useState<KPIs>({
    totalRecoverable: "0",
    totalIcms: "0",
    totalPis: "0",
    totalCofins: "0",
  });

  useEffect(() => {
    fetch("/api/financial/tax-credits").then(r => r.json()).then(d => {
      setCredits(d.data || []);
      setKpis(d.kpis || kpis);
    });
  }, []);

  const columnDefs = [
    { field: "invoiceKey", headerName: "Chave NFe", width: 200 },
    { 
      field: "taxType", 
      headerName: "Imposto", 
      width: 100,
      cellRenderer: (p: any) => {
        const colors: any = {
          ICMS: "bg-blue-500",
          PIS: "bg-green-500",
          COFINS: "bg-purple-500",
          IPI: "bg-orange-500",
        };
        return (
          <span className={`px-2 py-1 rounded text-xs text-white ${colors[p.value]}`}>
            {p.value}
          </span>
        );
      },
    },
    { 
      field: "taxValue", 
      headerName: "Valor", 
      width: 130,
      valueFormatter: (p: any) => `R$ ${parseFloat(p.value || 0).toFixed(2)}`
    },
    { 
      field: "isRecoverable", 
      headerName: "Recuperável", 
      width: 120,
      cellRenderer: (p: any) => p.value === "S" ? "✅ Sim" : "❌ Não"
    },
    { field: "recoveredInPeriod", headerName: "Período", width: 100 },
    { 
      field: "createdAt", 
      headerName: "Data", 
      width: 150,
      valueFormatter: (p: any) => new Date(p.value).toLocaleDateString("pt-BR")
    },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
        💵 Impostos Recuperáveis
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-card p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">Total Recuperável</p>
              <p className="text-2xl font-bold text-green-500">
                R$ {parseFloat(kpis.totalRecoverable || "0").toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">ICMS</p>
              <p className="text-2xl font-bold text-blue-500">
                R$ {parseFloat(kpis.totalIcms || "0").toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">PIS</p>
              <p className="text-2xl font-bold text-green-500">
                R$ {parseFloat(kpis.totalPis || "0").toFixed(2)}
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">COFINS</p>
              <p className="text-2xl font-bold text-purple-500">
                R$ {parseFloat(kpis.totalCofins || "0").toFixed(2)}
              </p>
            </div>
          </div>

      <div className="ag-theme-quartz-dark">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={credits}
          pagination
          paginationPageSize={20}
          domLayout="normal"
        />
      </div>
    </div>
  );
}

