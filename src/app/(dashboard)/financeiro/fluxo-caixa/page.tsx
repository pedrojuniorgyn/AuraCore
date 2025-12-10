"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FluxoCaixaPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch("/api/financial/cash-flow");
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
        💰 Fluxo de Caixa Projetado
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Próximos 90 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted rounded">
            <p className="text-muted-foreground">
              TODO: Gráfico Recharts (Entradas vs Saídas)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


