"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wrench, AlertTriangle, CheckCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";

interface WorkOrder {
  id: number;
  wo_number: string;
  vehicle_id: number;
  plate: string;
  vehicle_model_name: string;
  wo_type: string;
  priority: string;
  reported_issue: string;
  status: string;
  opened_at: string;
  started_at: string;
  completed_at: string;
  total_cost: number;
}

const WO_TYPE_LABELS: { [key: string]: string } = {
  PREVENTIVE: "Preventiva",
  CORRECTIVE: "Corretiva",
  PREDICTIVE: "Preditiva",
};

const PRIORITY_LABELS: { [key: string]: string } = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baixa",
};

const STATUS_LABELS: { [key: string]: string } = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em Andamento",
  WAITING_PARTS: "Aguardando Peças",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const handleEdit = (data: WorkOrder) => {
    router.push(`/frota/manutencao/ordens/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta ordem?")) return;
    try {
      const res = await fetch(`/api/fleet/maintenance/work-orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: "Excluído com sucesso!" });
      fetchOrders();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter]);

  const fetchWorkOrders = async () => {
    try {
      const url =
        statusFilter === "all"
          ? "/api/fleet/maintenance/work-orders"
          : `/api/fleet/maintenance/work-orders?status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.workOrders);
      }
    } catch (error) {
      console.error("Erro ao carregar O.S.:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar ordens de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "WAITING_PARTS":
        return "bg-purple-100 text-purple-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    open: workOrders.filter((wo) => wo.status === "OPEN").length,
    inProgress: workOrders.filter((wo) => wo.status === "IN_PROGRESS").length,
    completed: workOrders.filter((wo) => wo.status === "COMPLETED").length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
            🔧 Ordens de Serviço
          </h1>
          <p className="text-slate-400 mt-1">Gestão de manutenções da frota</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova O.S.
        </Button>
      </div>

      {/* KPI Cards Premium */}
      <StaggerContainer>
        <div className="grid grid-cols-4 gap-6">
          {/* Abertas */}
          <FadeIn delay={0.1}>
            <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                    Abertas
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Ordens Abertas</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.open} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Em Andamento */}
          <FadeIn delay={0.15}>
            <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                    <Wrench className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                    🔧 Andamento
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Em Andamento</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.inProgress} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Concluídas */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
              <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                    ✅ Concluídas
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Concluídas (30d)</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.completed} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Total */}
          <FadeIn delay={0.25}>
            <GlassmorphismCard className="border-slate-500/30 hover:border-slate-400/50 transition-all hover:shadow-lg hover:shadow-slate-500/20">
              <div className="p-6 bg-gradient-to-br from-slate-900/10 to-slate-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-slate-500/20 to-gray-500/20 rounded-xl shadow-inner">
                    <Wrench className="h-6 w-6 text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-300 font-semibold px-3 py-1 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-full border border-slate-400/30">
                    Total
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Ordens</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-slate-400 to-gray-400 bg-clip-text text-transparent">
                  <NumberCounter value={workOrders.length} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </StaggerContainer>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
        >
          Todas
        </Button>
        <Button
          variant={statusFilter === "OPEN" ? "default" : "outline"}
          onClick={() => setStatusFilter("OPEN")}
        >
          Abertas
        </Button>
        <Button
          variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
          onClick={() => setStatusFilter("IN_PROGRESS")}
        >
          Em Andamento
        </Button>
        <Button
          variant={statusFilter === "COMPLETED" ? "default" : "outline"}
          onClick={() => setStatusFilter("COMPLETED")}
        >
          Concluídas
        </Button>
      </div>

      {/* Lista de O.S. */}
      <div className="grid gap-4">
        {workOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma ordem de serviço encontrada</p>
          </div>
        ) : (
          workOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{wo.wo_number}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                        wo.priority
                      )}`}
                    >
                      {PRIORITY_LABELS[wo.priority]}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        wo.status
                      )}`}
                    >
                      {STATUS_LABELS[wo.status]}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Veículo:</span> {wo.plate} -{" "}
                    {wo.vehicle_model_name}
                  </p>

                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Tipo:</span>{" "}
                    {WO_TYPE_LABELS[wo.wo_type]}
                  </p>

                  {wo.reported_issue && (
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Problema:</span>{" "}
                      {wo.reported_issue}
                    </p>
                  )}

                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>
                      Aberta:{" "}
                      {new Date(wo.opened_at).toLocaleDateString("pt-BR")}
                    </span>
                    {wo.completed_at && (
                      <span>
                        Concluída:{" "}
                        {new Date(wo.completed_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                {wo.total_cost > 0 && (
                  <div className="ml-4 text-right">
                    <p className="text-sm text-gray-600">Custo Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      R$ {wo.total_cost.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

