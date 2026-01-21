"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Truck } from "lucide-react";
import { TmsAIWidget } from "@/components/tms";

interface DashboardKPIs {
  tripsInProgress: number;
  onTimeDelivery: number;
  delayedDeliveries: number;
  openOccurrences: number;
  avgDeliveryTime: number;
}

export default function CockpitPage() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    tripsInProgress: 0,
    onTimeDelivery: 0,
    delayedDeliveries: 0,
    openOccurrences: 0,
    avgDeliveryTime: 0,
  });

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        const response = await fetch("/api/tms/cockpit/kpis");
        const data = await response.json();
        setKpis(prev => data.data || prev);
      } catch (error) {
        console.error("Erro ao carregar KPIs:", error);
      }
    };

    // Usar setTimeout para evitar setState síncrono em effect
    const timeoutId = setTimeout(() => {
      loadKPIs();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
          ✈️ Cockpit TMS
        </h1>
        <p className="text-slate-400">Visão executiva das operações</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Viagens em Andamento</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.tripsInProgress}</div>
            <p className="text-xs text-muted-foreground">Ativas agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregas no Prazo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">On-Time Delivery (OTD)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregas Atrasadas</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.delayedDeliveries}</div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ocorrências Abertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.openOccurrences}</div>
            <p className="text-xs text-muted-foreground">Pendentes de resolução</p>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Adicionar gráficos e mapa */}
      <Card>
        <CardHeader>
          <CardTitle>Gráficos e Mapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted rounded">
            <p className="text-muted-foreground">
              TODO: Implementar gráficos (Recharts) e mapa de calor (Google Maps)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Insight Widget - Assistente TMS */}
      <TmsAIWidget screen="cockpit" />
    </div>
  );
}
