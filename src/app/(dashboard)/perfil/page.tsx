"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { useTenant } from "@/contexts/tenant-context";
import { User, Mail, Briefcase, Building2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, currentBranch } = useTenant();

  const getInitials = (name: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSave = () => {
    toast.success("Perfil atualizado com sucesso!");
  };

  if (!user) {
    return null;
  }

  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                👤 Meu Perfil
              </h1>
              <p className="text-slate-400 mt-1">
                Gerencie suas informações pessoais e preferências
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Profile Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Avatar Card */}
          <FadeIn delay={0.2}>
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>Sua identificação no sistema</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" disabled>
                  Alterar Foto (Em breve)
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Personal Info */}
          <FadeIn delay={0.3} className="md:col-span-2">
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Seus dados cadastrais no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      <User className="inline h-4 w-4 mr-2" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      value={user.name || ""}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">
                      <Briefcase className="inline h-4 w-4 mr-2" />
                      Cargo/Função
                    </Label>
                    <Input
                      id="role"
                      value={user.role}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch">
                      <Building2 className="inline h-4 w-4 mr-2" />
                      Filial Atual
                    </Label>
                    <Input
                      id="branch"
                      value={currentBranch?.tradeName || currentBranch?.name || "-"}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSave} disabled>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações (Em breve)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Additional Info */}
        <FadeIn delay={0.4}>
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>Detalhes técnicos do seu acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">ID do Usuário</Label>
                  <p className="font-mono text-sm mt-1">{user.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ID da Organização</Label>
                  <p className="font-mono text-sm mt-1">{user.organizationId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}



