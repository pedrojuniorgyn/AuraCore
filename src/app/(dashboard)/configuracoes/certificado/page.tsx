"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Upload, Shield, CheckCircle, XCircle, AlertCircle, FileKey } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";

export default function CertificadoDigitalPage() {
  const { currentBranch } = useTenant();
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [certificateInfo, setCertificateInfo] = useState<any>(null);

  // Carregar certificado existente ao abrir a página
  useEffect(() => {
    if (currentBranch?.id) {
      loadExistingCertificate();
    } else {
      setIsLoading(false);
    }
  }, [currentBranch?.id]);

  const loadExistingCertificate = async () => {
    if (!currentBranch?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/branches/${currentBranch.id}`);
      
      if (response.ok) {
        const result = await response.json();
        const branch = result.data || result; // API retorna { data: branch }
        
        // Se tiver certificado, extrair informações
        if (branch.certificatePfx && branch.certificateExpiry) {
          setCertificateInfo({
            valid: new Date(branch.certificateExpiry) > new Date(),
            subject: branch.name, // CN da filial
            validFrom: new Date(branch.createdAt).toLocaleDateString('pt-BR'),
            validTo: new Date(branch.certificateExpiry).toLocaleDateString('pt-BR'),
            issuer: "Certificadora (AC)",
            serialNumber: "********", // Oculto por segurança
            branchName: branch.name,
          });
        } else {
          // Limpar se não tiver certificado
          setCertificateInfo(null);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar certificado:", error);
      toast.error("Erro ao carregar informações do certificado");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
        setCertificateFile(file);
        toast.success(`Arquivo selecionado: ${file.name}`);
      } else {
        toast.error("Por favor, selecione um arquivo .pfx ou .p12");
      }
    }
  };

  const handleUpload = async () => {
    if (!certificateFile || !password) {
      toast.error("Selecione um certificado e digite a senha");
      return;
    }

    if (!currentBranch?.id) {
      toast.error("Selecione uma filial primeiro");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("pfx", certificateFile); // Nome correto do campo
      formData.append("password", password);

      const response = await fetch(`/api/branches/${currentBranch.id}/certificate`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Certificado instalado com sucesso!");
        setPassword("");
        setCertificateFile(null);
        
        // Recarregar informações do certificado
        await loadExistingCertificate();
      } else {
        toast.error(data.error || "Erro ao carregar certificado");
      }
    } catch (error) {
      toast.error("Erro ao enviar certificado");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="h-5 w-5 text-green-400" />
    ) : (
      <XCircle className="h-5 w-5 text-red-400" />
    );
  };

  return (
    <PageTransition>
      <div className="relative min-h-screen">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <GridPattern />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <GradientText>Certificado Digital A1</GradientText>
                </h1>
                <p className="text-zinc-400">
                  Configure o certificado digital para integração com Sefaz
                </p>
                {currentBranch && (
                  <p className="text-sm text-purple-400 mt-2">
                    📍 Filial: <span className="font-semibold">{currentBranch.name}</span>
                  </p>
                )}
              </div>
              <Shield className="h-12 w-12 text-indigo-400 opacity-50" />
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Card */}
            <FadeIn delay={0.1}>
              <Card className="border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-indigo-400" />
                    Upload de Certificado
                  </CardTitle>
                  <CardDescription>
                    Envie seu certificado digital A1 (.pfx ou .p12)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Input */}
                  <div className="space-y-2">
                    <Label htmlFor="certificate">Arquivo do Certificado</Label>
                    <div className="relative">
                      <Input
                        id="certificate"
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleFileChange}
                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                      />
                      {certificateFile && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          {certificateFile.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha do Certificado</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha do certificado"
                      className="bg-slate-800/50 border-white/10"
                    />
                  </div>

                  {/* Upload Button */}
                  <ShimmerButton
                    onClick={handleUpload}
                    disabled={!certificateFile || !password || isUploading}
                    background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <span className="animate-pulse">Carregando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Certificado
                      </>
                    )}
                  </ShimmerButton>

                  {/* Info Box */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <p className="font-semibold mb-1">Atenção:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                          <li>Certifique-se de que o certificado está válido</li>
                          <li>A senha será criptografada e armazenada com segurança</li>
                          <li>O certificado é usado para assinar XMLs (NFe, CTe, MDFe)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Certificate Info Card */}
            <FadeIn delay={0.2}>
              <Card className="border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileKey className="h-5 w-5 text-emerald-400" />
                    Informações do Certificado
                  </CardTitle>
                  <CardDescription>
                    Dados do certificado digital configurado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                      <p className="text-zinc-500">Carregando certificado...</p>
                    </div>
                  ) : certificateInfo ? (
                    <div className="space-y-4">
                      {/* Status */}
                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-sm font-medium text-zinc-300">Status</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(certificateInfo.valid)}
                          <span className={certificateInfo.valid ? "text-green-400" : "text-red-400"}>
                            {certificateInfo.valid ? "Válido" : "Expirado"}
                          </span>
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-500">Titular (CN)</Label>
                        <p className="text-sm text-white font-mono bg-slate-800/50 p-2 rounded">
                          {certificateInfo.subject || "N/A"}
                        </p>
                      </div>

                      {/* Validity */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Válido de</Label>
                          <p className="text-sm text-emerald-400">
                            {certificateInfo.validFrom || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Válido até</Label>
                          <p className="text-sm text-amber-400">
                            {certificateInfo.validTo || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Issuer */}
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-500">Emissor</Label>
                        <p className="text-sm text-white font-mono bg-slate-800/50 p-2 rounded">
                          {certificateInfo.issuer || "N/A"}
                        </p>
                      </div>

                      {/* Serial */}
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-500">Número de Série</Label>
                        <p className="text-sm text-white font-mono bg-slate-800/50 p-2 rounded break-all">
                          {certificateInfo.serialNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Shield className="h-16 w-16 text-zinc-600 mb-4" />
                      <p className="text-zinc-500 mb-1">Nenhum certificado configurado</p>
                      <p className="text-sm text-zinc-600">
                        Faça upload de um certificado para ver as informações
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Usage Info */}
          <FadeIn delay={0.3}>
            <Card className="border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  Onde o Certificado é Utilizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <FileKey className="h-8 w-8 text-blue-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1">NFe - Consulta Sefaz</h3>
                    <p className="text-sm text-blue-300/80">
                      Importação automática de notas fiscais via DFe
                    </p>
                  </div>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <FileKey className="h-8 w-8 text-purple-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1">CTe - Assinatura</h3>
                    <p className="text-sm text-purple-300/80">
                      Assinatura digital de Conhecimentos de Transporte
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <FileKey className="h-8 w-8 text-emerald-400 mb-2" />
                    <h3 className="font-semibold text-white mb-1">MDFe - Manifesto</h3>
                    <p className="text-sm text-emerald-300/80">
                      Assinatura digital de Manifestos de Documentos Fiscais
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}

