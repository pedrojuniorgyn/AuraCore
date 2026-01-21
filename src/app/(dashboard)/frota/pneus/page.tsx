"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FleetAIWidget } from "@/components/fleet";

// Evita pré-render em build (dependências usam hooks de URL / CSR bailout)
export const dynamic = "force-dynamic";

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
  const router = useRouter();
  const [tires, setTires] = useState<Tire[]>([]);

  const loadTires = async () => {
    try {
      const response = await fetch("/api/fleet/tires");
      const data = await response.json();
      setTires(data.data || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  useEffect(() => {
    // Usar setTimeout para evitar setState síncrono em effect
    const timeoutId = setTimeout(() => {
      loadTires();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleEdit = (data: Tire) => {
    router.push(`/frota/pneus/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este pneu?")) return;
    try {
      const res = await fetch(`/api/fleet/tires/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      loadTires();
    } catch (error) { toast.error("Erro ao excluir"); }
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

      {/* AI Insight Widget - Assistente de Pneus */}
      <FleetAIWidget screen="pneus" defaultMinimized={true} />
    </div>
  );
}
