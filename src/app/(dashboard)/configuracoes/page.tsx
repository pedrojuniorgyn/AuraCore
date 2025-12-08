"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { Bell, Moon, Globe, Database, Shield, Palette } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  const handleToggle = (setting: string, value: boolean) => {
    toast.success(`${setting} ${value ? "ativado" : "desativado"}`);
  };

  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Configurações</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Personalize sua experiência no Aura Core
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Settings Cards */}
        <div className="grid gap-6">
          {/* Notificações */}
          <FadeIn delay={0.2}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure como você recebe alertas e notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificações do Sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas sobre eventos importantes
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={(value) => {
                      setNotifications(value);
                      handleToggle("Notificações", value);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba resumos diários por email
                    </p>
                  </div>
                  <Switch id="email-notifications" disabled />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Aparência */}
          <FadeIn delay={0.3}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
                <CardDescription>
                  Personalize a interface do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Interface escura para reduzir cansaço visual
                    </p>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={(value) => {
                      setDarkMode(value);
                      handleToggle("Modo Escuro", value);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Sistema */}
          <FadeIn delay={0.4}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Sistema
                </CardTitle>
                <CardDescription>
                  Configurações avançadas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-save">Salvamento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Salva alterações automaticamente
                    </p>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={autoSave}
                    onCheckedChange={(value) => {
                      setAutoSave(value);
                      handleToggle("Salvamento Automático", value);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics">Analytics e Telemetria</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajude-nos a melhorar o sistema
                    </p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={analytics}
                    onCheckedChange={(value) => {
                      setAnalytics(value);
                      handleToggle("Analytics", value);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Segurança */}
          <FadeIn delay={0.5}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Segurança e Privacidade
                </CardTitle>
                <CardDescription>
                  Proteja sua conta e dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="2fa">Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança (Em breve)
                    </p>
                  </div>
                  <Switch id="2fa" disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="activity-log">Log de Atividades</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitore acessos à sua conta (Em breve)
                    </p>
                  </div>
                  <Switch id="activity-log" disabled />
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Regional */}
          <FadeIn delay={0.6}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional
                </CardTitle>
                <CardDescription>
                  Configurações de idioma e formato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <p className="text-sm font-medium">Português (Brasil)</p>
                  <p className="text-xs text-muted-foreground">
                    Mais idiomas em breve
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <p className="text-sm font-medium">America/Sao_Paulo (UTC-3)</p>
                </div>

                <div className="space-y-2">
                  <Label>Formato de Moeda</Label>
                  <p className="text-sm font-medium">Real Brasileiro (R$)</p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}

