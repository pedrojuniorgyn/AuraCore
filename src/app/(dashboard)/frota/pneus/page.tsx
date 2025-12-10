"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface Tire {
  id: number;
  serialNumber: string;
  model: string;
  size: string;
  status: string;
  totalKmUsed: number;
  purchasePrice: string;
}

export default function PneusPage() {
  const [tires, setTires] = useState<Tire[]>([]);

  useEffect(() => {
    loadTires();
  }, []);

  const loadTires = async () => {
    try {
      const response = await fetch("/api/fleet/tires");
      const data = await response.json();
      setTires(data.data || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const calculateCPK = (tire: Tire) => {
    if (!tire.totalKmUsed || tire.totalKmUsed === 0) return 0;
    return parseFloat(tire.purchasePrice) / tire.totalKmUsed;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
            🛞 Gestão de Pneus
          </h1>
          <p className="text-slate-400">Controle de vida útil e CPK</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Pneu
        </Button>
      </div>

      <div className="grid gap-4">
        {tires.map((tire) => (
          <Card key={tire.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{tire.serialNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {tire.model} - {tire.size}
                  </p>
                </div>
                <Badge>{tire.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">KM Rodado</p>
                  <p className="font-semibold">{tire.totalKmUsed?.toLocaleString() || 0} km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço</p>
                  <p className="font-semibold">R$ {parseFloat(tire.purchasePrice || "0").toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPK (Custo/Km)</p>
                  <p className="font-semibold text-green-600">
                    R$ {calculateCPK(tire).toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


