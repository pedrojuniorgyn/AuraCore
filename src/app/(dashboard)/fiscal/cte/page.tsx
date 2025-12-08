"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { toast } from "sonner";

interface Cte {
  id: number;
  cteNumber: number;
  serie: string;
  cteKey: string;
  issueDate: string;
  takerId: number;
  serviceValue: string;
  totalValue: string;
  icmsValue: string;
  status: string;
  protocolNumber?: string;
  rejectionMessage?: string;
}

export default function CtePage() {
  const gridRef = useRef<AgGridReact>(null);
  const [ctes, setCtes] = useState<Cte[]>([]);

  const columnDefs: ColDef[] = [
    {
      field: "cteNumber",
      headerName: "Número",
      width: 100,
      cellRenderer: (params: any) => (
        <span className="font-semibold">{params.value}</span>
      ),
    },
    {
      field: "serie",
      headerName: "Série",
      width: 80,
    },
    {
      field: "cteKey",
      headerName: "Chave de Acesso",
      width: 200,
      cellRenderer: (params: any) => (
        <span className="font-mono text-xs">{params.value || "-"}</span>
      ),
    },
    {
      field: "issueDate",
      headerName: "Emissão",
      width: 120,
      cellRenderer: (params: any) =>
        params.value ? new Date(params.value).toLocaleDateString() : "-",
    },
    {
      field: "serviceValue",
      headerName: "Valor Serviço",
      width: 130,
      cellRenderer: (params: any) => (
        <span className="font-semibold">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "icmsValue",
      headerName: "ICMS",
      width: 110,
      cellRenderer: (params: any) => (
        <span className="text-red-600">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "totalValue",
      headerName: "Total",
      width: 130,
      cellRenderer: (params: any) => (
        <span className="font-bold text-blue-600">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status SEFAZ",
      width: 150,
      cellRenderer: (params: any) => {
        const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
          DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-700", icon: Clock },
          SIGNED: { label: "Assinado", color: "bg-blue-100 text-blue-700", icon: FileText },
          SENT: { label: "Enviado", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
          AUTHORIZED: { label: "Autorizado", color: "bg-green-100 text-green-700", icon: CheckCircle },
          REJECTED: { label: "Rejeitado", color: "bg-red-100 text-red-700", icon: XCircle },
          CANCELLED: { label: "Cancelado", color: "bg-gray-100 text-gray-700", icon: XCircle },
        };

        const config = statusConfig[params.value] || statusConfig.DRAFT;
        const Icon = config.icon;

        return (
          <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      field: "protocolNumber",
      headerName: "Protocolo",
      width: 140,
      cellRenderer: (params: any) => (
        <span className="font-mono text-xs">{params.value || "-"}</span>
      ),
    },
    {
      headerName: "Ações",
      width: 150,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          {params.data.status === "AUTHORIZED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadXml(params.data.id)}
              >
                <Download className="h-4 w-4 mr-1" />
                XML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf(params.data.id)}
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </>
          )}
          {params.data.status === "REJECTED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => alert(params.data.rejectionMessage || "Sem detalhes")}
            >
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const fetchCtes = async () => {
    try {
      const response = await fetch("/api/fiscal/cte");
      const result = await response.json();
      if (result.success) {
        setCtes(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar CTes:", error);
      toast.error("Erro ao carregar CTes");
    }
  };

  useEffect(() => {
    fetchCtes();
  }, []);

  const handleDownloadXml = async (id: number) => {
    toast.info("Download de XML será implementado em produção");
  };

  const handleDownloadPdf = async (id: number) => {
    toast.info("Geração de DACTE (PDF) será implementada em produção");
  };

  const statusCounts = {
    total: ctes.length,
    draft: ctes.filter((c) => c.status === "DRAFT").length,
    authorized: ctes.filter((c) => c.status === "AUTHORIZED").length,
    rejected: ctes.filter((c) => c.status === "REJECTED").length,
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <GradientText className="text-3xl font-bold mb-2">
              Conhecimentos de Transporte Eletrônico (CTe)
            </GradientText>
            <p className="text-sm text-muted-foreground">
              Gestão de Documentos Fiscais de Saída
            </p>
          </div>
        </div>
      </FadeIn>

      {/* KPIs */}
      <FadeIn delay={0.15}>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total CTes</p>
                  <p className="text-2xl font-bold">{statusCounts.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rascunhos</p>
                  <p className="text-2xl font-bold">{statusCounts.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Autorizados</p>
                  <p className="text-2xl font-bold">{statusCounts.authorized}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejeitados</p>
                  <p className="text-2xl font-bold">{statusCounts.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Grid */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CTes Emitidos ({ctes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={ctes}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                }}
                pagination={true}
                paginationPageSize={20}
                domLayout="normal"
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}

