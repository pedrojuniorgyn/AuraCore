"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Shield, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface Branch {
  id: number;
  version?: number;
  name: string;
  document: string;
  certificateExpiry?: string | null;
  lastNsu?: string | null;
  environment?: string | null;
}

export default function BranchConfigPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isResettingNsu, setIsResettingNsu] = useState(false);

  // Form state
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  
  // Sefaz config state
  const [environment, setEnvironment] = useState<string>("HOMOLOGATION");
  const [lastNsu, setLastNsu] = useState<string>("0");

  // Carrega dados da filial
  useEffect(() => {
    async function fetchBranch() {
      try {
        const response = await fetch(`/api/branches/${branchId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar filial");
        }

        const data = await response.json();
        setBranch(data.data);
        
        // Carrega configurações Sefaz
        setEnvironment(data.data.environment || "HOMOLOGATION");
        setLastNsu(data.data.lastNsu || "0");
      } catch (error: any) {
        toast.error("Erro ao carregar filial", {
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBranch();
  }, [branchId]);

  // Upload do certificado
  const handleUploadCertificate = async () => {
    if (!certificateFile || !certificatePassword) {
      toast.error("Preencha todos os campos", {
        description: "Selecione o arquivo .pfx e informe a senha.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("pfx", certificateFile);
      formData.append("password", certificatePassword);

      const response = await fetch(`/api/branches/${branchId}/certificate`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao fazer upload");
      }

      const result = await response.json();

      toast.success("Certificado instalado com sucesso!", {
        description: `Válido até ${new Date(result.data.expiryDate).toLocaleDateString("pt-BR")}`,
      });

      // Limpa form
      setCertificateFile(null);
      setCertificatePassword("");

      // Recarrega dados
      window.location.reload();
    } catch (error: any) {
      toast.error("Erro ao instalar certificado", {
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Testa conexão com Sefaz
  const handleTestConnection = async () => {
    setIsTesting(true);

    try {
      const response = await fetch("/api/sefaz/download-nfes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: parseInt(branchId) }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }

      const result = await response.json();

      toast.success("Conexão com Sefaz bem-sucedida! 🎉", {
        description: result.message,
        duration: 5000,
      });

      console.log("📊 Resultado da consulta:", result.data);
    } catch (error: any) {
      toast.error("Falha ao conectar com Sefaz", {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Salva configuração Sefaz (ambiente)
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);

    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          version: branch?.version,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao salvar configuração");
      }

      const result = await response.json();

      toast.success("Configuração salva com sucesso!", {
        description: `Ambiente: ${environment}`,
      });

      // Atualiza dados locais
      setBranch(result.data || result);
      
      // Recarrega dados
      window.location.reload();
    } catch (error: any) {
      toast.error("Erro ao salvar configuração", {
        description: error.message,
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Reseta NSU (zera para recomeçar download)
  const handleResetNsu = async () => {
    if (!confirm("Tem certeza que deseja resetar o NSU?\n\nIsso fará o sistema baixar TODAS as notas novamente desde o início.")) {
      return;
    }

    setIsResettingNsu(true);

    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastNsu: "0",
          version: branch?.version,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao resetar NSU");
      }

      const result = await response.json();

      toast.success("NSU resetado com sucesso!", {
        description: "O próximo download buscará desde o início",
      });

      // Atualiza dados locais
      setBranch(result.data || result);
      setLastNsu("0");
    } catch (error: any) {
      toast.error("Erro ao resetar NSU", {
        description: error.message,
      });
    } finally {
      setIsResettingNsu(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex-1 p-8 pt-6">
        <Card className="p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Filial não encontrada</h3>
          <Button className="mt-4" onClick={() => router.push("/configuracoes/filiais")}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  // Status do certificado
  const hasCertificate = !!branch.certificateExpiry;
  const certificateExpiry = branch.certificateExpiry ? new Date(branch.certificateExpiry) : null;
  const isExpired = certificateExpiry ? certificateExpiry < new Date() : false;
  const expiresIn30Days = certificateExpiry
    ? certificateExpiry.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Configuração da Filial
          </h2>
          <p className="text-muted-foreground mt-1">
            {branch.name} - CNPJ: {branch.document}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/configuracoes/filiais/edit/${branchId}`)}>
            Editar dados
          </Button>
          <Button variant="outline" onClick={() => router.push("/configuracoes/filiais")}>
            Voltar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="certificado" className="space-y-4">
        <TabsList>
          <TabsTrigger value="certificado">
            <Shield className="h-4 w-4 mr-2" />
            Certificado Digital
          </TabsTrigger>
          <TabsTrigger value="sefaz">Configurações Sefaz</TabsTrigger>
        </TabsList>

        {/* ABA: Certificado Digital */}
        <TabsContent value="certificado" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status do Certificado Digital
            </h3>

            {/* Status Atual */}
            <div className="mb-6 p-4 border rounded-lg">
              {hasCertificate ? (
                <>
                  {isExpired ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Certificado Expirado</span>
                    </div>
                  ) : expiresIn30Days ? (
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-semibold">Certificado Próximo do Vencimento</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Certificado Válido</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Validade: {certificateExpiry?.toLocaleDateString("pt-BR")}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-5 w-5" />
                  <span>Nenhum certificado instalado</span>
                </div>
              )}
            </div>

            {/* Formulário de Upload */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="certificate-file">Arquivo .pfx (A1)</Label>
                <Input
                  id="certificate-file"
                  type="file"
                  accept=".pfx"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione o arquivo de certificado digital padrão ICP-Brasil (A1)
                </p>
              </div>

              <div>
                <Label htmlFor="certificate-password">Senha do Certificado</Label>
                <Input
                  id="certificate-password"
                  type="password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  placeholder="Digite a senha do .pfx"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUploadCertificate}
                  disabled={isUploading || !certificateFile || !certificatePassword}
                >
                  {isUploading ? "Instalando..." : "Salvar Certificado"}
                </Button>

                {hasCertificate && (
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      "Testar Conexão Sefaz"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: Configurações Sefaz */}
        <TabsContent value="sefaz" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configurações da Sefaz</h3>

            <div className="space-y-6">
              {/* SELETOR DE AMBIENTE */}
              <div>
                <Label htmlFor="environment">Ambiente da Sefaz</Label>
                <div className="flex gap-2 mt-2">
                  <select
                    id="environment"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="HOMOLOGATION">Homologação (Teste)</option>
                    <option value="PRODUCTION">Produção (Real)</option>
                  </select>
                  
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig || environment === (branch?.environment || "HOMOLOGATION")}
                  >
                    {isSavingConfig ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {environment === "PRODUCTION"
                    ? "⚠️ Ambiente de produção: Notas fiscais REAIS serão baixadas"
                    : "✅ Ambiente de homologação: Apenas notas de TESTE"}
                </p>
              </div>

              {/* ÚLTIMO NSU */}
              <div>
                <Label>Último NSU Processado</Label>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm font-mono bg-muted px-3 py-2 rounded border">
                    {lastNsu}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetNsu}
                    disabled={isResettingNsu || lastNsu === "0"}
                  >
                    {isResettingNsu ? "Resetando..." : "Resetar NSU"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Número Sequencial Único da última nota baixada. Resetar fará o download desde o início.
                </p>
              </div>

              {/* INFORMAÇÕES ADICIONAIS */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">ℹ️ Informações Importantes:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Ao trocar de ambiente, recomenda-se resetar o NSU</li>
                  <li>O download automático usa o último NSU como referência</li>
                  <li>Em Homologação, você pode fazer testes sem riscos</li>
                  <li>Em Produção, todas as NFes destinadas à sua empresa serão baixadas</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

