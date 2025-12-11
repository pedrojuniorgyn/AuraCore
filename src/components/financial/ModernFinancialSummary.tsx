/**
 * Modern Financial Summary
 * 
 * Versão modernizada do componente de resumo financeiro
 * Com animações, efeitos visuais e contador animado
 */

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { HoverCard } from "@/components/ui/glassmorphism-card";
import { NumberCounter, GradientText } from "@/components/ui/magic-components";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated-wrappers";

interface FinancialSummaryData {
  totalOpen: number;
  totalOverdue: number;
  totalPaid: number;
  countOpen?: number;
  countOverdue?: number;
  countPaid?: number;
}

export function ModernFinancialSummary({ type }: { type: "payable" | "receivable" }) {
  const { data, isLoading } = useQuery<FinancialSummaryData>({
    queryKey: [`${type}s-summary`],
    queryFn: async () => {
      const response = await fetch(`/api/financial/${type}s/summary`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar resumo");
      return response.json();
    },
  });

  const cards = [
    {
      title: type === "payable" ? "Em Aberto" : "A Receber",
      value: data?.totalOpen || 0,
      count: data?.countOpen || 0,
      icon: Clock,
      color: "text-blue-400",
      bgGradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/10",
    },
    {
      title: type === "payable" ? "Vencido" : "Atrasado",
      value: data?.totalOverdue || 0,
      count: data?.countOverdue || 0,
      icon: AlertCircle,
      color: "text-red-400",
      bgGradient: "from-red-500/20 to-orange-500/20",
      iconBg: "bg-red-500/10",
    },
    {
      title: type === "payable" ? "Pago" : "Recebido",
      value: data?.totalPaid || 0,
      count: data?.countPaid || 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgGradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-slate-700" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 rounded bg-slate-700" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <StaggerItem key={card.title}>
          <FadeIn delay={index * 0.1} direction="up">
            <HoverCard>
              <Card className="relative overflow-hidden border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    {card.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${card.iconBg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className={`text-3xl font-bold ${card.color}`}>
                        R${" "}
                        <NumberCounter
                          value={card.value}
                          decimals={2}
                          duration={1.5}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {card.count} {card.count === 1 ? "título" : "títulos"}
                      </p>
                    </div>

                    {/* Trend indicator */}
                    {index === 0 && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>+12%</span>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <TrendingDown className="h-3 w-3" />
                        <span>-8%</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-700/50">
                    <div
                      className={`h-full bg-gradient-to-r ${card.bgGradient.replace("/20", "")} transition-all duration-1000`}
                      style={{
                        width: `${Math.min(
                          (card.value / (data?.totalOpen + data?.totalOverdue + data?.totalPaid || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </FadeIn>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}











