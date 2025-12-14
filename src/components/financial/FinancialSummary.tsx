"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";

interface SummaryProps {
  type: "payables" | "receivables";
}

export function FinancialSummary({ type }: SummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["financial-summary", type],
    queryFn: async () => {
      const response = await fetch(`/api/financial/${type}/summary`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar resumo");
      return response.json();
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const isPayables = type === "payables";
  const totalLabel = isPayables ? "Total em Aberto" : "Total a Receber";
  const overdueLabel = isPayables ? "Vencidas" : "Atrasadas";
  const paidLabel = isPayables ? "Pagas Este Mês" : "Recebidas Este Mês";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total em Aberto */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{totalLabel}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data?.totalOpen || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.countOpen || 0} título(s)
          </p>
        </CardContent>
      </Card>

      {/* Vencidas/Atrasadas */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
            {overdueLabel}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data?.totalOverdue || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.countOverdue || 0} título(s) atrasado(s)
          </p>
        </CardContent>
      </Card>

      {/* Pagas/Recebidas Este Mês */}
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
            {paidLabel}
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(data?.totalPaidThisMonth || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.countPaidThisMonth || 0} título(s) pagos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

















