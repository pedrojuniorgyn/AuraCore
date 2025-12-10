"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Package, FileText, DollarSign } from "lucide-react";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter, BentoGrid, BentoGridItem } from "@/components/ui/magic-components";
import { HoverCard } from "@/components/ui/glassmorphism-card";
import { DotPattern } from "@/components/ui/animated-background";

export default function DashboardPage() {
  const kpis = [
    {
      title: "Receita Total",
      value: 245231.89,
      change: "+20.1%",
      icon: DollarSign,
      color: "text-emerald-400",
      bgGradient: "from-emerald-500/20 to-green-500/20",
    },
    {
      title: "Parceiros Ativos",
      value: 156,
      change: "+12.5%",
      icon: Users,
      color: "text-blue-400",
      bgGradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Produtos",
      value: 1284,
      change: "+8.3%",
      icon: Package,
      color: "text-purple-400",
      bgGradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "NFes Processadas",
      value: 89,
      change: "+15.7%",
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
                      value={245231.89}
                      decimals={2}
                      duration={2}
                    />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Meta: R$ 200.000,00 (122.6%)
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
                    <NumberCounter value={89} decimals={0} duration={1.5} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    +15 esta semana
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
                    <NumberCounter value={23} decimals={0} duration={1} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    R$ 45.230,50 em aberto
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
                    <NumberCounter value={12} decimals={0} duration={1} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    156 parceiros ativos no total
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
                    <NumberCounter value={1284} decimals={0} duration={2} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    +47 novos produtos
                  </p>
                </div>
              </BentoGridItem>
            </BentoGrid>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
