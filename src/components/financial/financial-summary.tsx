"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, CheckCircle } from "lucide-react";

interface FinancialSummaryProps {
  totalOpen: number;
  countOpen: number;
  totalOverdue: number;
  countOverdue: number;
  totalPaid: number;
  countPaid: number;
  type?: "payable" | "receivable"; // Para ajustar cores
}

export function FinancialSummary({
  totalOpen,
  countOpen,
  totalOverdue,
  countOverdue,
  totalPaid,
  countPaid,
  type = "payable",
}: FinancialSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const openColor = type === "payable" ? "text-yellow-600" : "text-blue-600";
  const overdueColor = "text-red-600";
  const paidColor = "text-green-600";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Em Aberto */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {type === "payable" ? "A Pagar" : "A Receber"}
          </CardTitle>
          <DollarSign className={`h-4 w-4 ${openColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${openColor}`}>
            {formatCurrency(totalOpen)}
          </div>
          <p className="text-xs text-muted-foreground">
            {countOpen} {countOpen === 1 ? "título" : "títulos"} em aberto
          </p>
        </CardContent>
      </Card>

      {/* Vencidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${overdueColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${overdueColor}`}>
            {formatCurrency(totalOverdue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {countOverdue} {countOverdue === 1 ? "título vencido" : "títulos vencidos"}
          </p>
        </CardContent>
      </Card>

      {/* Pagos (Este Mês) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {type === "payable" ? "Pago" : "Recebido"} (Este Mês)
          </CardTitle>
          <CheckCircle className={`h-4 w-4 ${paidColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${paidColor}`}>
            {formatCurrency(totalPaid)}
          </div>
          <p className="text-xs text-muted-foreground">
            {countPaid} {countPaid === 1 ? "título" : "títulos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

