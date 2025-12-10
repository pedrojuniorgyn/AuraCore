"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, AlertTriangle } from "lucide-react";

interface Trip {
  id: number;
  tripNumber: string;
  status: string;
  scheduledEnd: Date;
  estimatedEnd: Date;
  slaStatus: string;
  checkpoints: any[];
}

export default function TorreControlePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const response = await fetch("/api/tms/control-tower");
      const data = await response.json();
      setTrips(data.data || []);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSLABadge = (slaStatus: string) => {
    const config: Record<string, any> = {
      ON_TIME: { label: "No Prazo", variant: "default", color: "text-green-600" },
      AT_RISK: { label: "Em Risco", variant: "secondary", color: "text-orange-600" },
      DELAYED: { label: "Atrasado", variant: "destructive", color: "text-red-600" },
    };
    const c = config[slaStatus] || config.ON_TIME;
    return <Badge variant={c.variant} className={c.color}>{c.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
          🗼 Torre de Controle
        </h1>
        <p className="text-slate-400">Monitor de entregas em tempo real</p>
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{trip.tripNumber}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge>{trip.status}</Badge>
                  {getSLABadge(trip.slaStatus)}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Prev: {new Date(trip.scheduledEnd).toLocaleString()}
                </div>
              </div>
            </div>

            {/* TODO: Timeline visual */}
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">
                TODO: Timeline de checkpoints
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


