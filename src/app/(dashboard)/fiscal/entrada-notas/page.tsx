"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Plus, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  CurrencyCellRenderer,
  DateCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

// Registra módulos do AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

interface IInboundInvoice {
  id: number;
  accessKey: string;
  issueDate: string;
  totalNfe: string;
  status: string;
  partnerName: string | null;
}

interface UploadResult {
  success: boolean;
  message: string;
  data?: {
    invoiceId: number;
    accessKey: string;
    issuer: string;
    totalItems: number;
    linkedProducts: number;
    newProducts: number;
    newPartnerCreated: boolean;
  };
  error?: string;
}

export default function InboundInvoicesPage() {
  const router = useRouter();
  const { currentBranch } = useTenant();
  const gridRef = useRef<AgGridReact>(null);
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  
  // List state
  const [invoices, setInvoices] = useState<IInboundInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sefaz DFe import state
  const [isImportingSefaz, setIsImportingSefaz] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    totalDocuments: number;
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  // Busca NFes importadas
  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const response = await fetch("/api/inbound-invoices?_start=0&_end=100", {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar NFes");
        return;
      }

      const result = await response.json();
      setInvoices(result.data || []);
    } catch (error) {
      console.error("❌ Erro ao buscar NFes:", error);
      toast.error("Erro ao carregar NFes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Importar NFes da Sefaz via DFe
  const handleImportFromSefaz = async () => {
    if (!currentBranch?.id) {
      toast.error("Selecione uma filial primeiro");
      return;
    }

    setIsImportingSefaz(true);
    setImportProgress(null);

    try {
      toast.info("📡 Consultando Sefaz DFe...");

      const response = await fetch("/api/sefaz/download-nfes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch_id: currentBranch.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const processing = data.data?.processing;
        
        setImportProgress({
          totalDocuments: data.data?.totalDocuments || 0,
          imported: processing?.imported || 0,
          duplicates: processing?.duplicates || 0,
          errors: processing?.errors || 0,
        });

        if (processing?.imported > 0) {
          toast.success(`✅ ${processing.imported} NFe(s) importada(s) com sucesso!`);
          // Recarregar lista
          await fetchInvoices();
        } else if (processing?.duplicates > 0) {
          toast.info(`ℹ️ ${processing.duplicates} NFe(s) já estavam importadas`);
        } else if (data.data?.totalDocuments === 0) {
          toast.info("📭 Nenhuma NFe nova encontrada na Sefaz");
        } else {
          toast.success(data.message || "Consulta concluída");
        }
      } else {
        const errorMsg = data.error || "Erro ao importar da Sefaz";
        const hint = data.hint;
        
        toast.error(errorMsg);
        
        if (hint) {
          toast.info(hint);
        }
      }
    } catch (error: any) {
      console.error("Erro ao importar da Sefaz:", error);
      toast.error("Erro ao conectar com Sefaz");
    } finally {
      setIsImportingSefaz(false);
    }
  };

  // Upload handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const xmlFile = files.find(file => file.name.endsWith('.xml'));

    if (!xmlFile) {
      toast.error("Por favor, envie um arquivo XML válido");
      return;
    }

    await processXMLFile(xmlFile);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast.error("Por favor, selecione um arquivo XML");
      return;
    }

    await processXMLFile(file);
  }, []);

  const processXMLFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadResult(null);

      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const formData = new FormData();
      formData.append("xml", file);

      const response = await fetch("/api/inbound-invoices/upload", {
        method: "POST",
        headers: {
          "x-branch-id": branchId,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setUploadResult({
          success: false,
          message: result.error || "Erro ao importar NFe",
          error: result.details,
        });

        if (result.code === "DUPLICATE_INVOICE") {
          toast.error("Esta NFe já foi importada anteriormente");
        } else {
          toast.error(result.error || "Erro ao processar XML");
        }
        return;
      }

      setUploadResult(result);

      toast.success("NFe importada com sucesso!", {
        description: `${result.data.totalItems} itens processados`,
      });

      // Atualiza a lista
      fetchInvoices();

    } catch (error: any) {
      console.error("❌ Erro ao fazer upload:", error);
      setUploadResult({
        success: false,
        message: "Erro ao fazer upload do arquivo",
        error: error.message,
      });
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  // AG Grid columns
  const columnDefs: ColDef<IInboundInvoice>[] = [
    {
      headerName: "#ID",
      field: "id",
      width: 80,
      sortable: true,
    },
    {
      headerName: "Data Emissão",
      field: "issueDate",
      width: 140,
      sortable: true,
      cellRenderer: DateCellRenderer,
    },
    {
      headerName: "Fornecedor",
      field: "partnerName",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Chave de Acesso",
      field: "accessKey",
      width: 180,
      cellRenderer: (params: any) => {
        const key = params.value || "";
        return (
          <span
            className="font-mono text-xs"
            title={key}
          >
            {key.substring(0, 4)}...{key.substring(key.length - 4)}
          </span>
        );
      },
    },
    {
      headerName: "Valor Total",
      field: "totalNfe",
      width: 140,
      sortable: true,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
    },
    {
      headerName: "Status",
      field: "status",
      width: 140,
      sortable: true,
      cellRenderer: StatusCellRenderer,
      cellRenderer: (params: any) => {
        const status = params.value;
        let variant: "default" | "secondary" | "destructive" = "default";
        let label = "";

        switch (status) {
          case "DRAFT":
            variant = "secondary";
            label = "Rascunho";
            break;
          case "IMPORTED":
            variant = "default";
            label = "Importada";
            break;
          case "CANCELED":
            variant = "destructive";
            label = "Cancelada";
            break;
          default:
            label = status;
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      headerName: "Ações",
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <button
            onClick={() => router.push(`/fiscal/entrada-notas/${params.data.id}`)}
            className="text-primary hover:text-primary/80"
            title="Ver Detalhes"
          >
            📋
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="relative flex-1 space-y-4 p-8 pt-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" />
                <GradientText>NFe - Notas Fiscais de Entrada</GradientText>
              </h2>
              <p className="text-muted-foreground">
                Filial: {currentBranch?.name || "Carregando..."}
              </p>
            </div>
            
            {/* Botão Importar da Sefaz */}
            <Button
              onClick={handleImportFromSefaz}
              disabled={isImportingSefaz}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/20"
            >
              {isImportingSefaz ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar da Sefaz
                </>
              )}
            </Button>
          </div>
        </FadeIn>

        {/* Progress Card */}
        {importProgress && (
          <FadeIn delay={0.1}>
            <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Resultado da Importação Sefaz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {importProgress.totalDocuments}
                    </p>
                    <p className="text-xs text-zinc-400">Total Consultado</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {importProgress.imported}
                    </p>
                    <p className="text-xs text-zinc-400">Importadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {importProgress.duplicates}
                    </p>
                    <p className="text-xs text-zinc-400">Duplicadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {importProgress.errors}
                    </p>
                    <p className="text-xs text-zinc-400">Erros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">📋 Listagem de NFes</TabsTrigger>
          <TabsTrigger value="upload">⬆️ Importar XML</TabsTrigger>
        </TabsList>

        {/* Tab: Listagem */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  theme={auraTheme}
                  rowData={invoices}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    resizable: true,
                  }}
                  // 📊 Auto-Size Escalável
                  autoSizeStrategy={{
                    type: "fitGridWidth",
                    defaultMinWidth: 100,
                  }}
                  // 🎯 Seleção e Interação
                  rowSelection={{ mode: "multiRow" }}
                  suppressCellFocus={true}
                  suppressRowClickSelection={true}
                  // 📊 Paginação
                  pagination={true}
                  paginationPageSize={20}
                  paginationPageSizeSelector={[10, 20, 50, 100]}
                  // 🎨 Animações
                  animateRows={true}
                  loading={isLoading}
                  // 🌐 Localização
                  localeText={{
                    noRowsToShow: "Nenhuma NFe importada",
                    page: "Página",
                    of: "de",
                    to: "até",
                    more: "mais",
                    next: "Próxima",
                    previous: "Anterior",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Upload */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload de XML da NFe</CardTitle>
              <CardDescription>
                Arraste e solte o arquivo XML da Nota Fiscal Eletrônica ou clique para selecionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center transition-all
                  ${isDragging 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-primary/50"
                  }
                  ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                `}
              >
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />

                <div className="flex flex-col items-center gap-4">
                  {isUploading ? (
                    <>
                      <Upload className="h-12 w-12 text-primary animate-pulse" />
                      <div>
                        <p className="text-lg font-semibold">Processando XML...</p>
                        <p className="text-sm text-muted-foreground">
                          Aguarde enquanto extraímos os dados da NFe
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold">
                          {isDragging ? "Solte o arquivo aqui" : "Arraste o XML ou clique para selecionar"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Arquivos XML de NFe (modelo 55)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Resultado */}
              {uploadResult && (
                <div className={`
                  mt-6 p-4 rounded-lg border
                  ${uploadResult.success 
                    ? "bg-green-500/10 border-green-500" 
                    : "bg-red-500/10 border-red-500"
                  }
                `}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    
                    <div className="flex-1">
                      <p className="font-semibold">{uploadResult.message}</p>
                      
                      {uploadResult.success && uploadResult.data && (
                        <div className="mt-3 space-y-1 text-sm">
                          <p>
                            <strong>Fornecedor:</strong> {uploadResult.data.issuer}
                            {uploadResult.data.newPartnerCreated && (
                              <span className="ml-2 text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                                Novo
                              </span>
                            )}
                          </p>
                          <p><strong>Chave:</strong> {uploadResult.data.accessKey}</p>
                          <p>
                            <strong>Itens:</strong> {uploadResult.data.totalItems} total
                            ({uploadResult.data.linkedProducts} vinculados, {uploadResult.data.newProducts} novos)
                          </p>
                          
                          <div className="mt-4">
                            <Button
                              size="sm"
                              onClick={() => router.push(`/fiscal/entrada-notas/${uploadResult.data?.invoiceId}`)}
                            >
                              Ver NFe Importada
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {!uploadResult.success && uploadResult.error && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {uploadResult.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-blue-500">O que acontece ao importar?</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>✅ Fornecedor é cadastrado automaticamente (se não existir)</li>
                      <li>✅ Produtos são vinculados quando possível (por código)</li>
                      <li>✅ Dados fiscais (NCM, CFOP, CST) são extraídos</li>
                      <li>✅ XML original é armazenado para auditoria</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageTransition>
  );
}
