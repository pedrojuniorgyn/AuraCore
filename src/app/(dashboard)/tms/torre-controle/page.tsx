"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface Trip {
  id: number;
  tripNumber: string;
  status: string;
  scheduledEnd: string | null;
  slaStatus: string;
  checkpoints: Array<{
    id: number;
    checkpointType: string;
    description: string | null;
    locationAddress: string | null;
    recordedAt: string;
  }>;
}

export default function TorreControlePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTripId, setSavingTripId] = useState<number | null>(null);

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

  const addCheckpoint = async (tripId: number, checkpointType: string) => {
    setSavingTripId(tripId);
    try {
      const res = await fetch(`/api/tms/trips/${tripId}/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointType }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? "Falha ao registrar checkpoint");
      }
      await loadTrips();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTripId(null);
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

      <div className="flex justify-end">
        <Button variant="secondary" onClick={loadTrips} disabled={loading}>
          Atualizar
        </Button>
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
                  Prev: {trip.scheduledEnd ? new Date(trip.scheduledEnd).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={savingTripId === trip.id}
                onClick={() => addCheckpoint(trip.id, "PICKED")}
              >
                Coletado
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={savingTripId === trip.id}
                onClick={() => addCheckpoint(trip.id, "IN_TRANSIT")}
              >
                Em trânsito
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={savingTripId === trip.id}
                onClick={() => addCheckpoint(trip.id, "DELIVERED")}
              >
                Entregue
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={savingTripId === trip.id}
                onClick={() => addCheckpoint(trip.id, "ISSUE")}
              >
                Ocorrência
              </Button>
            </div>

            <div className="mt-4 rounded border bg-muted/30 p-3">
              <div className="text-sm font-medium mb-2">Timeline</div>
              {trip.checkpoints?.length ? (
                <ol className="space-y-3">
                  {trip.checkpoints.map((cp, idx) => (
                    <li key={cp.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 mt-1.5" />
                        {idx < trip.checkpoints.length - 1 ? (
                          <div className="w-px flex-1 bg-slate-300/50 mt-1" />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{cp.checkpointType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(cp.recordedAt).toLocaleString()}
                          </span>
                        </div>
                        {cp.description ? (
                          <div className="text-sm mt-1">{cp.description}</div>
                        ) : null}
                        {cp.locationAddress ? (
                          <div className="text-xs text-muted-foreground mt-1">{cp.locationAddress}</div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-muted-foreground">Sem checkpoints ainda.</div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


