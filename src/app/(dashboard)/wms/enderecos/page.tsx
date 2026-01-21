"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { WmsAIWidget } from "@/components/wms";

interface Location {
  location: {
    id: number;
    code: string;
    locationType: string;
    status: string;
  };
  zone: {
    zoneName: string;
    zoneType: string;
  };
}

export default function WmsEnderecosPage() {
  const [locations, setLocations] = useState<Location[]>([]);

  const loadLocations = async () => {
    try {
      const response = await fetch("/api/wms/locations");
      const data = await response.json();
      setLocations(data.data || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  useEffect(() => {
    // Usar setTimeout para evitar setState síncrono em effect
    const timeoutId = setTimeout(() => {
      loadLocations();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            📍 Endereçamento WMS
          </h1>
          <p className="text-slate-400">Zonas e posições de armazenagem</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Endereço
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {locations.map((loc) => (
          <Card key={loc.location.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{loc.location.code}</CardTitle>
                <Badge variant={loc.location.status === "AVAILABLE" ? "default" : "secondary"}>
                  {loc.location.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Zona: {loc.zone?.zoneName}</p>
                <p className="text-muted-foreground">Tipo: {loc.location.locationType}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insight Widget - Assistente de Endereços */}
      <WmsAIWidget screen="enderecos" defaultMinimized={true} />
    </div>
  );
}
