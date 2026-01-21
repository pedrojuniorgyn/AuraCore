"use client";

import { useState, useEffect } from "react";
import { Settings, AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";

interface FiscalSettings {
  nfeEnvironment: string;
  cteEnvironment: string;
  cteSeries: string;
  autoImportEnabled: string;
  autoImportInterval: number;
  lastAutoImport?: string;
}

export default function FiscalConfigPage() {
  const { currentBranch } = useTenant();
  const [settings, setSettings] = useState<FiscalSettings>({
    nfeEnvironment: "production",
    cteEnvironment: "homologacao",
    cteSeries: "1",
    autoImportEnabled: "S",
    autoImportInterval: 1,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentBranch?.id) return;
      
      setLoading(true);
      try {
        const res = await fetch("/api/fiscal/settings", {
          headers: { "x-branch-id": currentBranch.id.toString() },
        });
        
        if (res.ok) {
          const data = await res.json();
          setSettings(data.data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentBranch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/fiscal/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-branch-id": currentBranch?.id.toString() || "",
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações Fiscais
          </h2>
          <p className="text-muted-foreground">
            Filial: {currentBranch?.name || "Carregando..."}
          </p>
        </div>
      </div>

      {/* Ambiente NFe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📥 Ambiente NFe (Importação Sefaz)
          </CardTitle>
          <CardDescription>
            Define o ambiente usado para importar NFes via DFe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="nfe-env" className="text-base font-semibold">
                Ambiente de Importação
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.nfeEnvironment === "production" 
                  ? "✅ Produção - Importando NFes REAIS da SEFAZ"
                  : "⚠️ Homologação - Importando NFes de TESTE"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Homologação</span>
              <Switch
                id="nfe-env"
                checked={settings.nfeEnvironment === "production"}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, nfeEnvironment: checked ? "production" : "homologacao" })
                }
              />
              <span className="text-sm font-medium">Produção</span>
            </div>
          </div>

          {settings.nfeEnvironment === "production" ? (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-green-600">Modo Produção Ativo</p>
                <p className="text-muted-foreground">
                  NFes REAIS serão importadas da SEFAZ. Use este modo em operação normal.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-600">Modo Homologação Ativo</p>
                <p className="text-muted-foreground">
                  Apenas NFes de TESTE serão importadas. Use para validações.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ambiente CTe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📤 Ambiente CTe (Emissão)
          </CardTitle>
          <CardDescription>
            Define o ambiente usado para emitir CTes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="cte-env" className="text-base font-semibold">
                Ambiente de Emissão
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.cteEnvironment === "production" 
                  ? "✅ Produção - Emitindo CTes REAIS na SEFAZ"
                  : "⚠️ Homologação - Emitindo CTes de TESTE"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Homologação</span>
              <Switch
                id="cte-env"
                checked={settings.cteEnvironment === "production"}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, cteEnvironment: checked ? "production" : "homologacao" })
                }
              />
              <span className="text-sm font-medium">Produção</span>
            </div>
          </div>

          {settings.cteEnvironment === "production" ? (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-600">⚠️ ATENÇÃO: Modo Produção Ativo</p>
                <p className="text-muted-foreground">
                  CTes serão enviados para a SEFAZ OFICIAL e terão validade fiscal. Use apenas após validação completa.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-600">Modo Homologação Ativo (Recomendado para Testes)</p>
                <p className="text-muted-foreground">
                  CTes serão enviados para ambiente de TESTES da SEFAZ. Ideal para validações e treinamento.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importação Automática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Importação Automática de NFes
          </CardTitle>
          <CardDescription>
            Sistema importa automaticamente NFes da Sefaz em intervalos regulares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-import" className="text-base font-semibold">
                Ativar Importação Automática
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.autoImportEnabled === "S"
                  ? "✅ Sistema está importando automaticamente"
                  : "⏸️ Importação manual apenas"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Desativado</span>
              <Switch
                id="auto-import"
                checked={settings.autoImportEnabled === "S"}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoImportEnabled: checked ? "S" : "N" })
                }
              />
              <span className="text-sm font-medium">Ativado</span>
            </div>
          </div>

          {settings.autoImportEnabled === "S" && (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    Intervalo de Importação
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sistema verifica a Sefaz a cada {settings.autoImportInterval} hora(s)
                  </p>
                </div>
                <select
                  value={settings.autoImportInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, autoImportInterval: parseInt(e.target.value) })
                  }
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value={1}>A cada 1 hora</option>
                  <option value={2}>A cada 2 horas</option>
                  <option value={4}>A cada 4 horas</option>
                  <option value={6}>A cada 6 horas</option>
                  <option value={12}>A cada 12 horas</option>
                  <option value={24}>A cada 24 horas</option>
                </select>
              </div>

              {settings.lastAutoImport && (
                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-600">Última Importação Automática</p>
                    <p className="text-muted-foreground">
                      {new Date(settings.lastAutoImport).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-600">Importação Automática Ativa</p>
                  <p className="text-muted-foreground">
                    O sistema verificará a Sefaz automaticamente a cada {settings.autoImportInterval} hora(s) e importará novas NFes sem necessidade de ação manual.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

