"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIInsightWidget } from "@/components/ai";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

export default function FluxoCaixaPage() {
  const [data, setData] = useState<{ income: Array<{ date: string; amount: number }>; expenses: Array<{ date: string; amount: number }> } | null>(null);
  const [monthsAhead, setMonthsAhead] = useState<3 | 6 | 12 | 24 | 36 | 60>(3);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsAhead]);

  const loadData = async () => {
    try {
      const response = await fetch(`/api/financial/cash-flow?monthsAhead=${monthsAhead}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const chartData = (() => {
    if (!data) return [];
    const map = new Map<string, { date: string; entradas: number; saidas: number; liquido: number }>();

    for (const x of data.income ?? []) {
      const key = new Date(String(x.date)).toISOString().slice(0, 10);
      const row = map.get(key) ?? { date: key, entradas: 0, saidas: 0, liquido: 0 };
      row.entradas += Number(x.amount ?? 0);
      map.set(key, row);
    }
    for (const x of data.expenses ?? []) {
      const key = new Date(String(x.date)).toISOString().slice(0, 10);
      const row = map.get(key) ?? { date: key, entradas: 0, saidas: 0, liquido: 0 };
      row.saidas += Number(x.amount ?? 0);
      map.set(key, row);
    }

    const rows = Array.from(map.values()).map((r) => ({ ...r, liquido: r.entradas - r.saidas }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  })();

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
        💰 Fluxo de Caixa Projetado
      </h1>
      
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Horizon: próximos {monthsAhead} meses</CardTitle>
            <Select value={String(monthsAhead)} onValueChange={(v) => setMonthsAhead(Number(v) as 3 | 6 | 12 | 24 | 36 | 60)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Horizonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
                <SelectItem value="36">36 meses</SelectItem>
                <SelectItem value="60">60 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted/20 rounded p-2">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number | string) =>
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0))
                    }
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#22c55e" opacity={0.8} />
                  <Bar dataKey="saidas" name="Saídas" fill="#ef4444" opacity={0.8} />
                  <Line dataKey="liquido" name="Líquido" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados no período.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insight Widget - Assistente Fluxo de Caixa */}
      <AIInsightWidget
        agentType="financial"
        context={{
          module: 'financial',
          screen: 'cashflow',
        }}
        suggestedPrompts={[
          'Qual a projeção de caixa para os próximos 30 dias?',
          'Teremos saldo negativo em algum momento?',
          'Qual o melhor dia para pagamentos?',
          'Analise a sazonalidade do fluxo',
          'Compare fluxo realizado vs projetado',
        ]}
        title="Assistente Fluxo de Caixa"
        position="bottom-right"
        defaultMinimized={false}
      />
    </div>
  );
}
