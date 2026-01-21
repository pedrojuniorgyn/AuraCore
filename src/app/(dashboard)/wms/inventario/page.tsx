"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, PackageSearch, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { WmsAIWidget } from "@/components/wms";

interface InventoryCount {
  id: number;
  count_number: string;
  count_date: string;
  count_type: string;
  status: string;
  started_by: string;
  completed_at: string;
  notes: string;
}

const COUNT_TYPE_LABELS: { [key: string]: string } = {
  FULL: "Inventário Completo",
  CYCLE: "Inventário Cíclico",
  SPOT: "Inventário Pontual",
};

const STATUS_LABELS: { [key: string]: string } = {
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default function InventoryPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    warehouseId: "1",
    countType: "FULL",
    notes: "",
  });

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/wms/inventory/counts");
      const data = await res.json();
      if (data.success) {
        setCounts(data.counts);
      }
    } catch (error) {
      console.error("Erro ao carregar contagens:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar contagens de inventário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/wms/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso",
          description: `Contagem ${data.count.count_number} iniciada com sucesso`,
        });
        setShowForm(false);
        fetchCounts();
        setFormData({
          warehouseId: "1",
          countType: "FULL",
          notes: "",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Erro ao iniciar contagem:", error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar contagem de inventário",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const stats = {
    inProgress: counts.filter((c) => c.status === "IN_PROGRESS").length,
    completed: counts.filter((c) => c.status === "COMPLETED").length,
    total: counts.length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            📦 Inventário de Estoque
          </h1>
          <p className="text-slate-400 mt-1">
            Contagens periódicas e ajustes de estoque
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Contagem
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Andamento</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.inProgress}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Concluídas</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.completed}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Nova Contagem de Inventário</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de Contagem *
                </label>
                <select
                  value={formData.countType}
                  onChange={(e) =>
                    setFormData({ ...formData, countType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="FULL">Inventário Completo</option>
                  <option value="CYCLE">Inventário Cíclico</option>
                  <option value="SPOT">Inventário Pontual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Armazém *
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouseId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="1">Armazém Principal</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Observações sobre a contagem..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Iniciar Contagem</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Tipos de Inventário
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>Completo:</strong> Conta todos os produtos do armazém
          </li>
          <li>
            <strong>Cíclico:</strong> Conta produtos de forma rotativa (ABC)
          </li>
          <li>
            <strong>Pontual:</strong> Conta produtos específicos
          </li>
        </ul>
      </div>

      {/* Lista de Contagens */}
      <div className="grid gap-4">
        {counts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <PackageSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Nenhuma contagem de inventário realizada
            </p>
          </div>
        ) : (
          counts.map((count) => (
            <div
              key={count.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {count.count_number}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        count.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : count.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[count.status]}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Tipo:</span>{" "}
                    {COUNT_TYPE_LABELS[count.count_type]}
                  </p>

                  {count.notes && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Observações:</span>{" "}
                      {count.notes}
                    </p>
                  )}

                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>
                      Iniciada:{" "}
                      {new Date(count.count_date).toLocaleDateString("pt-BR")}
                    </span>
                    {count.completed_at && (
                      <span>
                        Concluída:{" "}
                        {new Date(count.completed_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Insight Widget - Assistente de Inventário */}
      <WmsAIWidget screen="inventario" defaultMinimized={true} />
    </div>
  );
}
