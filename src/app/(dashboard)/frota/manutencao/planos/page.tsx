"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, Calendar, Gauge, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FleetAIWidget } from "@/components/fleet";
import { fetchAPI } from "@/lib/api";

interface MaintenancePlan {
  id: number;
  service_name: string;
  service_description: string;
  vehicle_model: string;
  trigger_type: string;
  mileage_interval: number;
  time_interval_months: number;
  advance_warning_km: number;
  advance_warning_days: number;
  is_active: string;
}

export default function MaintenancePlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleEdit = (data: MaintenancePlan) => {
    router.push(`/frota/manutencao/planos/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    try {
      await fetchAPI(`/api/fleet/maintenance-plans/${id}`, { method: "DELETE" });
      toast({ title: "Sucesso", description: "Excluído com sucesso!" });
      fetchPlans();
    } catch {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  const fetchPlans = useCallback(async () => {
    try {
      const data = await fetchAPI<{ success: boolean; plans: MaintenancePlan[] }>("/api/fleet/maintenance-plans");
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar planos de manutenção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleModel: "",
    serviceName: "",
    serviceDescription: "",
    triggerType: "MILEAGE",
    mileageInterval: "",
    timeIntervalMonths: "",
    advanceWarningKm: "",
    advanceWarningDays: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await fetchAPI<{ success: boolean }>("/api/fleet/maintenance-plans", {
        method: "POST",
        body: formData,
      });

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Plano de manutenção criado com sucesso",
        });
        setShowForm(false);
        fetchPlans();
        setFormData({
          vehicleModel: "",
          serviceName: "",
          serviceDescription: "",
          triggerType: "MILEAGE",
          mileageInterval: "",
          timeIntervalMonths: "",
          advanceWarningKm: "",
          advanceWarningDays: "",
        });
      }
    } catch (error) {
      console.error("Erro ao criar plano:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar plano de manutenção",
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
            📅 Planos de Manutenção Preventiva
          </h1>
          <p className="text-slate-400 mt-1">
            Configure alertas automáticos por KM ou tempo
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Novo Plano de Manutenção</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Modelo do Veículo (opcional)
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleModel: e.target.value })
                  }
                  placeholder="Ex: Mercedes-Benz Axor 2544"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={formData.serviceName}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceName: e.target.value })
                  }
                  placeholder="Ex: Troca de Óleo"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.serviceDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceDescription: e.target.value })
                  }
                  placeholder="Descreva o serviço..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de Gatilho *
                </label>
                <select
                  value={formData.triggerType}
                  onChange={(e) =>
                    setFormData({ ...formData, triggerType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="MILEAGE">Por Quilometragem</option>
                  <option value="TIME">Por Tempo</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>

              {(formData.triggerType === "MILEAGE" ||
                formData.triggerType === "BOTH") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Intervalo (KM)
                    </label>
                    <input
                      type="number"
                      value={formData.mileageInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, mileageInterval: e.target.value })
                      }
                      placeholder="Ex: 20000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Alerta Antecipado (KM)
                    </label>
                    <input
                      type="number"
                      value={formData.advanceWarningKm}
                      onChange={(e) =>
                        setFormData({ ...formData, advanceWarningKm: e.target.value })
                      }
                      placeholder="Ex: 1000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              {(formData.triggerType === "TIME" ||
                formData.triggerType === "BOTH") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Intervalo (Meses)
                    </label>
                    <input
                      type="number"
                      value={formData.timeIntervalMonths}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeIntervalMonths: e.target.value,
                        })
                      }
                      placeholder="Ex: 6"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Alerta Antecipado (Dias)
                    </label>
                    <input
                      type="number"
                      value={formData.advanceWarningDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          advanceWarningDays: e.target.value,
                        })
                      }
                      placeholder="Ex: 15"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit">Salvar Plano</Button>
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

      {/* Lista de Planos */}
      <div className="grid gap-4">
        {plans.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Nenhum plano de manutenção cadastrado
            </p>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{plan.service_name}</h3>
                  {plan.service_description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {plan.service_description}
                    </p>
                  )}
                  {plan.vehicle_model && (
                    <p className="text-sm text-gray-500 mt-1">
                      Modelo: {plan.vehicle_model}
                    </p>
                  )}

                  <div className="flex gap-4 mt-3">
                    {plan.mileage_interval && (
                      <div className="flex items-center gap-2 text-sm">
                        <Gauge className="w-4 h-4 text-blue-600" />
                        <span>
                          A cada {plan.mileage_interval.toLocaleString()} km
                        </span>
                        {plan.advance_warning_km && (
                          <span className="text-gray-500">
                            (alerta {plan.advance_warning_km.toLocaleString()} km
                            antes)
                          </span>
                        )}
                      </div>
                    )}

                    {plan.time_interval_months && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span>A cada {plan.time_interval_months} meses</span>
                        {plan.advance_warning_days && (
                          <span className="text-gray-500">
                            (alerta {plan.advance_warning_days} dias antes)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plan.is_active === "S"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {plan.is_active === "S" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Insight Widget - Assistente de Planos */}
      <FleetAIWidget screen="manutencao-planos" defaultMinimized={true} />
    </div>
  );
}
