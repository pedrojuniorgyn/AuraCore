"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Package, FileText, DollarSign, Loader2 } from "lucide-react";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter, BentoGrid, BentoGridItem } from "@/components/ui/magic-components";
import { HoverCard } from "@/components/ui/glassmorphism-card";
import { DotPattern } from "@/components/ui/animated-background";

interface DashboardStats {
  receita: number;
  parceiros: number;
  produtos: number;
  nfes: number;
  contasAberto: number;
  novosParceiros: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        const data = await response.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const kpis = [
    {
      title: "Receita Total",
      value: stats?.receita ?? 0,
      change: "+0%",
      icon: DollarSign,
      color: "text-emerald-400",
      bgGradient: "from-emerald-500/20 to-green-500/20",
    },
    {
      title: "Parceiros Ativos",
      value: stats?.parceiros ?? 0,
      change: "+0%",
      icon: Users,
      color: "text-blue-400",
      bgGradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Produtos",
      value: stats?.produtos ?? 0,
      change: "+0%",
      icon: Package,
      color: "text-purple-400",
      bgGradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "NFes Processadas",
      value: stats?.nfes ?? 0,
      change: "+0%",
      icon: FileText,
      color: "text-amber-400",
      bgGradient: "from-amber-500/20 to-orange-500/20",
    },
  ];

  return (
    <PageTransition>
      <div className="relative">
        {/* Background Pattern */}
        <DotPattern className="opacity-20" />

        {/* Header */}
        <FadeIn>
          <div className="relative z-10 mb-8">
            <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              🏠 Dashboard
            </h2>
            <p className="mt-2 text-lg text-slate-400">
              Visão geral da operação logística - Aura Core Enterprise
            </p>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer className="relative z-10 mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => (
            <StaggerItem key={kpi.title}>
              <FadeIn delay={index * 0.1} direction="up">
                <HoverCard>
                  <Card className="relative overflow-hidden border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                    {/* Background gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bgGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-slate-400">
                        {kpi.title}
                      </CardTitle>
                      <div className="rounded-lg bg-slate-800/50 p-2">
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      </div>
                    </CardHeader>

                    <CardContent className="relative">
                      <div className={`text-3xl font-bold ${kpi.color}`}>
                        {kpi.title.includes("Receita") ? (
                          <>
                            R${" "}
                            <NumberCounter
                              value={kpi.value}
                              decimals={2}
                              duration={1.5}
                            />
                          </>
                        ) : (
                          <NumberCounter
                            value={kpi.value}
                            decimals={0}
                            duration={1.5}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>{kpi.change} desde o último mês</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-700/50">
                        <div
                          className={`h-full bg-gradient-to-r ${kpi.bgGradient.replace("/20", "")} transition-all duration-1000`}
                          style={{ width: "70%" }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </HoverCard>
              </FadeIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bento Grid */}
        <FadeIn delay={0.4}>
          <div className="relative z-10">
            <h3 className="mb-4 text-2xl font-semibold text-white">
              Resumo de Operações
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <span className="ml-2 text-slate-400">Carregando dados...</span>
              </div>
            ) : !stats ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-slate-800 p-4 mb-4">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-200">Nenhum dado encontrado</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Cadastre parceiros, produtos e importe NFes para ver os dados aqui.
                </p>
              </div>
            ) : (
              <BentoGrid>
                <BentoGridItem
                  title="Vendas do Mês"
                  description="Acompanhamento de receitas"
                  icon="📊"
                  span={2}
                >
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-emerald-400">
                      R${" "}
                      <NumberCounter
                        value={stats.receita}
                        decimals={2}
                        duration={2}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {stats.receita > 0 ? "Receita acumulada" : "Sem receitas no período"}
                    </p>
                  </div>
                </BentoGridItem>

                <BentoGridItem
                  title="NFes Importadas"
                  description="Últimos 30 dias"
                  icon="📄"
                >
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-blue-400">
                      <NumberCounter value={stats.nfes} decimals={0} duration={1.5} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Documentos processados
                    </p>
                  </div>
                </BentoGridItem>

                <BentoGridItem
                  title="Contas a Pagar"
                  description="Pendentes"
                  icon="💰"
                >
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-amber-400">
                      <NumberCounter value={stats.contasAberto ?? 0} decimals={0} duration={1} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Títulos em aberto
                    </p>
                  </div>
                </BentoGridItem>

                <BentoGridItem
                  title="Novos Parceiros"
                  description="Este mês"
                  icon="👥"
                  span={2}
                >
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-purple-400">
                      <NumberCounter value={stats.novosParceiros ?? 0} decimals={0} duration={1} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {stats.parceiros} parceiros ativos no total
                    </p>
                  </div>
                </BentoGridItem>

                <BentoGridItem
                  title="Produtos Cadastrados"
                  description="Catálogo completo"
                  icon="📦"
                >
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-cyan-400">
                      <NumberCounter value={stats.produtos} decimals={0} duration={2} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Total cadastrado
                    </p>
                  </div>
                </BentoGridItem>
              </BentoGrid>
            )}
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
